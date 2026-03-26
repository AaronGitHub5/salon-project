require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { generalLimiter } = require('./middleware/rateLimiter');
const { initMail } = require('./services/email.service');

const servicesRouter = require('./routes/services.routes');
const bookingsRouter = require('./routes/bookings.routes');
const stylistsRouter = require('./routes/stylists.routes');
const shiftsRouter = require('./routes/shifts.routes');
const availabilityRouter = require('./routes/availability.routes');
const analyticsRouter = require('./routes/analytics.routes');
const reviewsRouter = require('./routes/reviews.routes');
const profilesRouter = require('./routes/profiles.routes');
const remindersRouter = require('./routes/reminders.routes');

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());
app.use('/api/', generalLimiter);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/stylists', stylistsRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/reminders', remindersRouter);

initMail();

app.listen(port, () => console.log(`Server running on port ${port}`));