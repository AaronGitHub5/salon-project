require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =============================================
// UTILITY FUNCTIONS
// =============================================

// Check for booking conflicts (FR-04)
async function checkBookingConflict(stylistId, startTime, endTime, excludeBookingId = null) {
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('stylist_id', stylistId)
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.length > 0;
}

// 🆕 UPDATED PRICING LOGIC: Friday (5) & Saturday (6) are PEAK
function calculatePrice(basePrice, stylistMultiplier, bookingTime) {
  const date = new Date(bookingTime);
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const hour = date.getHours();

  let price = basePrice * stylistMultiplier;

  // Peak Rules:
  // 1. Friday or Saturday
  // 2. Any day after 5 PM (17:00)
  const isPeakDay = dayOfWeek === 5 || dayOfWeek === 6; 
  const isEvening = hour >= 17;

  if (isPeakDay || isEvening) {
    price *= 1.15; // +15% Surcharge
  }

  return Math.round(price * 100) / 100;
}

// =============================================
// API ROUTES
// =============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- SERVICES ROUTES ---
app.get('/api/services', async (req, res) => {
  const { data, error } = await supabase.from('services').select('*').order('category').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/services', async (req, res) => {
  const { name, base_price, duration_minutes, category } = req.body;
  const { data, error } = await supabase.from('services').insert([{ 
    name, base_price, duration_minutes, category 
  }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, base_price, duration_minutes, category } = req.body;
  const { data, error } = await supabase.from('services').update({ 
    name, base_price, duration_minutes, category 
  }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Service Deleted' });
});

// --- STYLISTS ROUTES ---
app.get('/api/stylists', async (req, res) => {
  const { data, error } = await supabase.from('stylists').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- BOOKINGS ROUTES ---
// Admin View: All bookings
app.get('/api/bookings', async (req, res) => {
  const { data, error } = await supabase.from('bookings').select(`
    *, services(name, base_price), stylists(name), profiles(full_name, email), guests(full_name, phone_number, email)
  `).order('start_time');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Customer Booking
app.post('/api/bookings', async (req, res) => {
  const { customer_id, service_id, stylist_id, start_time } = req.body;
  
  try {
    const { data: service } = await supabase.from('services').select('duration_minutes, base_price').eq('id', service_id).single();
    const { data: stylist } = await supabase.from('stylists').select('price_multiplier, name').eq('id', stylist_id).single();
    
    const start = new Date(start_time);
    const end = new Date(start.getTime() + service.duration_minutes * 60000);

    // Conflict Check
    if (await checkBookingConflict(stylist_id, start.toISOString(), end.toISOString())) {
      return res.status(409).json({ error: 'Time slot unavailable.' });
    }

    const finalPrice = calculatePrice(service.base_price, stylist.price_multiplier, start_time);

    const { data, error } = await supabase.from('bookings').insert([{
      customer_id, service_id, stylist_id, start_time: start, end_time: end, status: 'confirmed'
    }]).select().single();

    if (error) throw error;

    res.status(201).json({ message: 'Booking Confirmed!', booking: data, price: finalPrice });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Guest/Shadow Booking (Admin Feature)
app.post('/api/bookings/guest', async (req, res) => {
  const { guestName, guestPhone, guestEmail, serviceId, stylistId, startTime } = req.body;
  try {
    // 1. Create Guest
    const { data: guest } = await supabase.from('guests').insert([{ full_name: guestName, phone_number: guestPhone, email: guestEmail }]).select().single();
    
    // 2. Calculate details
    const { data: service } = await supabase.from('services').select('duration_minutes, base_price').eq('id', serviceId).single();
    const { data: stylist } = await supabase.from('stylists').select('price_multiplier').eq('id', stylistId).single();

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.duration_minutes * 60000);

    // 3. Conflict Check
    if (await checkBookingConflict(stylistId, start.toISOString(), end.toISOString())) {
      await supabase.from('guests').delete().eq('id', guest.id); // Cleanup guest if booking fails
      return res.status(409).json({ error: 'Time slot unavailable.' });
    }

    const finalPrice = calculatePrice(service.base_price, stylist.price_multiplier, startTime);

    // 4. Create Booking
    const { data: booking } = await supabase.from('bookings').insert([{
      guest_id: guest.id, service_id: serviceId, stylist_id: stylistId, start_time: start, end_time: end, status: 'confirmed'
    }]).select().single();

    res.status(201).json({ message: 'Shadow Booking Created', guest, booking, price: finalPrice });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- AVAILABILITY ROUTES (FR-03) ---
app.get('/api/availability/:stylistId/:date', async (req, res) => {
  const { stylistId, date } = req.params;
  const { serviceId } = req.query;

  try {
    let serviceDuration = 60;
    if (serviceId) {
      const { data: s } = await supabase.from('services').select('duration_minutes').eq('id', serviceId).single();
      if (s) serviceDuration = s.duration_minutes;
    }

    const dayOfWeek = new Date(date).getDay();
    // Fetch Schedule (Shift)
    const { data: shift } = await supabase.from('shifts').select('start_time, end_time').eq('stylist_id', stylistId).eq('day_of_week', dayOfWeek).single();

    if (!shift) return res.json({ available: false, slots: [], message: 'Stylist off duty' });

    // Fetch Existing Bookings
    const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);

    const { data: bookings } = await supabase.from('bookings').select('start_time, end_time')
      .eq('stylist_id', stylistId).gte('start_time', dayStart.toISOString()).lte('start_time', dayEnd.toISOString());

    // Generate Slots
    const slots = [];
    const [sH, sM] = shift.start_time.split(':');
    const [eH, eM] = shift.end_time.split(':');
    
    const slotStart = new Date(date); slotStart.setHours(sH, sM, 0, 0);
    const shiftEnd = new Date(date); shiftEnd.setHours(eH, eM, 0, 0);

    // 30-min intervals
    while (slotStart.getTime() + serviceDuration * 60000 <= shiftEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
      
      // Is there a collision?
      const isBooked = bookings?.some(b => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (!isBooked) {
        slots.push({ start: slotStart.toISOString() });
      }
      slotStart.setMinutes(slotStart.getMinutes() + 30);
    }

    res.json({ available: true, slots });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ANALYTICS ROUTES (FR-07) ---
app.get('/api/analytics', async (req, res) => {
  try {
    const today = new Date();
    const lastMonth = new Date(); lastMonth.setMonth(today.getMonth() - 1);
    
    const { data: bookings } = await supabase.from('bookings')
      .select('start_time, services(base_price), stylists(name)')
      .gte('start_time', lastMonth.toISOString());

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.services?.base_price || 0), 0);
    
    const stylistCounts = {};
    const dailyData = {};

    bookings.forEach(b => {
      const name = b.stylists?.name || 'Unknown';
      stylistCounts[name] = (stylistCounts[name] || 0) + 1;
      
      const dateStr = b.start_time.split('T')[0];
      dailyData[dateStr] = (dailyData[dateStr] || 0) + 1;
    });

    const topStylist = Object.entries(stylistCounts).sort((a,b) => b[1] - a[1])[0] || ['None', 0];
    const chartData = Object.keys(dailyData).sort().map(date => ({ date, bookings: dailyData[date] }));

    res.json({ totalRevenue, totalBookings: bookings.length, topStylist: topStylist[0], chartData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});