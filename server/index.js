require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initMail } = require('./services/email.service');

const servicesRouter = require('./routes/services.routes');
const bookingsRouter = require('./routes/bookings.routes');
const stylistsRouter = require('./routes/stylists.routes');
const availabilityRouter = require('./routes/availability.routes');
const analyticsRouter = require('./routes/analytics.routes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/stylists', stylistsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/analytics', analyticsRouter);

initMail();

app.listen(port, () => console.log(`Server running on port ${port}`));