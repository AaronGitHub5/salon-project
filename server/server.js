require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 5000;

// Middleware (Allows the frontend to talk to us)
app.use(cors());
app.use(express.json());

// Connect to Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- API ROUTES ---

// 1. Get All Services (The Menu)
app.get('/api/services', async (req, res) => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('id');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 2. Get All Stylists
app.get('/api/stylists', async (req, res) => {
  const { data, error } = await supabase
    .from('stylists')
    .select('*');
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 5. CREATE SHADOW BOOKING (Admin Only)
app.post('/api/bookings/guest', async (req, res) => {
  const { guestName, guestPhone, guestEmail, serviceId, stylistId, startTime } = req.body; // Added guestEmail

  // A. Create the Shadow Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([{
      full_name: guestName,
      phone_number: guestPhone,
      email: guestEmail, // <--- Saving it here! (It can be null)
      role: 'shadow'
    }])
    .select()
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });

  // B. Calculate End Time
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single();

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  // C. Create the Booking linked to the Shadow Profile
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert([{
      customer_id: profile.id, // Link to the new Shadow ID
      service_id: serviceId,
      stylist_id: stylistId,
      start_time: start.toISOString(),
      end_time: end.toISOString()
    }]);

  if (bookingError) return res.status(500).json({ error: bookingError.message });

  res.json({ message: "Shadow Booking Created", profile, booking });
});



// 6. UPDATE SERVICE
app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, base_price, duration_minutes, category } = req.body;

  const { error } = await supabase
    .from('services')
    .update({ name, base_price, duration_minutes, category })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Service Updated" });
});


// Start the Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});