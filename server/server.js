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

// Start the Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});