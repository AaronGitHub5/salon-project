require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// EMAIL SETUP
let transporter;
async function initMail() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Mail System Ready (Ethereal Dev Mode)');
  } catch (err) { console.error('Mail setup failed:', err); }
}
initMail();

async function sendEmail(to, subject, html) {
  if (!transporter) return;
  try {
    const info = await transporter.sendMail({ from: '"Hair By Amnesia" <no-reply@amnesia.com>', to, subject, html });
    console.log(`📨 Email Sent! Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (err) { console.error('Error sending email:', err); }
}

// UTILS
async function checkBookingConflict(stylistId, startTime, endTime, excludeBookingId = null) {
  let query = supabase.from('bookings').select('id').eq('stylist_id', stylistId).lt('start_time', endTime).gt('end_time', startTime).neq('status', 'cancelled');
  if (excludeBookingId) query = query.neq('id', excludeBookingId);
  const { data, error } = await query;
  if (error) throw error;
  return data.length > 0;
}

function calculatePrice(basePrice, stylistMultiplier, bookingTime) {
  const date = new Date(bookingTime);
  const day = date.getDay();
  const hour = date.getHours();
  let price = basePrice * stylistMultiplier;
  if (day === 5 || day === 6 || hour >= 17) price *= 1.15;
  return Math.round(price * 100) / 100;
}

// API ROUTES
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/services', async (req, res) => {
  const { data, error } = await supabase.from('services').select('*').order('category');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/services', async (req, res) => {
  const { data, error } = await supabase.from('services').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/services/:id', async (req, res) => {
  const { data, error } = await supabase.from('services').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/services/:id', async (req, res) => {
  const { error } = await supabase.from('services').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted' });
});

app.get('/api/stylists', async (req, res) => {
  const { data, error } = await supabase.from('stylists').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/bookings', async (req, res) => {
  const { data, error } = await supabase.from('bookings').select(`*, services(name, base_price), stylists(name), profiles(full_name, email), guests(full_name)`).order('start_time');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/bookings', async (req, res) => {
  const { customer_id, service_id, stylist_id, start_time } = req.body;
  try {
    const { data: service } = await supabase.from('services').select('name, duration_minutes, base_price').eq('id', service_id).single();
    const { data: stylist } = await supabase.from('stylists').select('name, price_multiplier').eq('id', stylist_id).single();
    const start = new Date(start_time);
    const end = new Date(start.getTime() + service.duration_minutes * 60000);

    if (await checkBookingConflict(stylist_id, start.toISOString(), end.toISOString())) return res.status(409).json({ error: 'Unavailable' });

    const finalPrice = calculatePrice(service.base_price, stylist.price_multiplier, start_time);
    const { data, error } = await supabase.from('bookings').insert([{ customer_id, service_id, stylist_id, start_time: start, end_time: end, status: 'confirmed' }]).select().single();
    if (error) throw error;

    const { data: profile } = await supabase.from('profiles').select('email').eq('id', customer_id).single();
    if (profile?.email) sendEmail(profile.email, 'Booking Confirmed', `<p>Confirmed for £${finalPrice}</p>`);

    res.status(201).json({ message: 'Confirmed', booking: data, price: finalPrice });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/bookings/guest', async (req, res) => {
  const { guestName, guestPhone, guestEmail, serviceId, stylistId, startTime } = req.body;
  try {
    const { data: guest } = await supabase.from('guests').insert([{ full_name: guestName, phone_number: guestPhone, email: guestEmail }]).select().single();
    const { data: service } = await supabase.from('services').select('duration_minutes, base_price').eq('id', serviceId).single();
    const { data: stylist } = await supabase.from('stylists').select('price_multiplier').eq('id', stylistId).single();
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.duration_minutes * 60000);

    if (await checkBookingConflict(stylistId, start.toISOString(), end.toISOString())) {
      await supabase.from('guests').delete().eq('id', guest.id);
      return res.status(409).json({ error: 'Unavailable' });
    }
    const finalPrice = calculatePrice(service.base_price, stylist.price_multiplier, startTime);
    const { data: booking } = await supabase.from('bookings').insert([{ guest_id: guest.id, service_id: serviceId, stylist_id: stylistId, start_time: start, end_time: end, status: 'confirmed' }]).select().single();
    
    if (guestEmail) sendEmail(guestEmail, 'Confirmed', '<p>See you soon</p>');
    res.status(201).json({ message: 'Shadow Booking Created', guest, booking, price: finalPrice });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/bookings/customer/:id', async (req, res) => {
  const { data, error } = await supabase.from('bookings').select(`id, start_time, end_time, status, services (name, base_price), stylists (name)`).eq('customer_id', req.params.id).neq('status', 'cancelled').order('start_time');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/bookings/:id/cancel', async (req, res) => {
  const { data, error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', req.params.id).select(`*, profiles(email), services(name)`).single();
  if (error) return res.status(500).json({ error: error.message });
  if (data?.profiles?.email) sendEmail(data.profiles.email, 'Cancelled', `<p>${data.services.name} cancelled.</p>`);
  res.json({ message: 'Cancelled', data });
});

// LOYALTY
app.put('/api/bookings/:id/complete', async (req, res) => {
  try {
    const { data: booking } = await supabase.from('bookings').select('customer_id, services(base_price)').eq('id', req.params.id).single();
    if (!booking) return res.status(404).json({ error: 'Not found' });

    await supabase.from('bookings').update({ status: 'completed' }).eq('id', req.params.id);

    if (booking.customer_id) {
      const points = Math.floor(booking.services.base_price);
      const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', booking.customer_id).single();
      const newPoints = (profile.loyalty_points || 0) + points;
      await supabase.from('profiles').update({ loyalty_points: newPoints }).eq('id', booking.customer_id);
      return res.json({ message: 'Complete', pointsAdded: points });
    }
    res.json({ message: 'Guest Complete (No Points)' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/availability/:stylistId/:date', async (req, res) => {
  const { serviceId } = req.query;
  const { stylistId, date } = req.params;
  try {
    const { data: s } = await supabase.from('services').select('duration_minutes').eq('id', serviceId).single();
    const duration = s ? s.duration_minutes : 60;
    const day = new Date(date).getDay();
    const { data: shift } = await supabase.from('shifts').select('start_time, end_time').eq('stylist_id', stylistId).eq('day_of_week', day).single();
    
    if (!shift) return res.json({ available: false, slots: [] });

    const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);
    const { data: bookings } = await supabase.from('bookings').select('start_time, end_time').eq('stylist_id', stylistId).gte('start_time', dayStart.toISOString()).lte('start_time', dayEnd.toISOString()).neq('status', 'cancelled');

    const slots = [];
    const [sH, sM] = shift.start_time.split(':');
    const [eH, eM] = shift.end_time.split(':');
    const start = new Date(date); start.setHours(sH, sM, 0, 0);
    const end = new Date(date); end.setHours(eH, eM, 0, 0);

    while (start.getTime() + duration * 60000 <= end.getTime()) {
      const slotEnd = new Date(start.getTime() + duration * 60000);
      const isBooked = bookings.some(b => {
        const bStart = new Date(b.start_time); const bEnd = new Date(b.end_time);
        return start < bEnd && slotEnd > bStart;
      });
      if (!isBooked) slots.push({ start: start.toISOString() });
      start.setMinutes(start.getMinutes() + 30);
    }
    res.json({ available: true, slots });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const today = new Date();
    const lastMonth = new Date(); lastMonth.setMonth(today.getMonth() - 1);
    const { data: bookings } = await supabase.from('bookings').select('start_time, services(base_price), stylists(name)').gte('start_time', lastMonth.toISOString());
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.services?.base_price || 0), 0);
    const stylistCounts = {};
    const dailyData = {};
    bookings.forEach(b => {
      const name = b.stylists?.name || 'Unknown';
      stylistCounts[name] = (stylistCounts[name] || 0) + 1;
      const date = b.start_time.split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });
    const topStylist = Object.entries(stylistCounts).sort((a,b) => b[1]-a[1])[0] || ['None', 0];
    const chartData = Object.keys(dailyData).sort().map(d => ({ date: d, bookings: dailyData[d] }));
    res.json({ totalRevenue, totalBookings: bookings.length, topStylist: topStylist[0], chartData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => console.log(`Server running on port ${port}`));