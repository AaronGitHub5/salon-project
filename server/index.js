const analyticsRouter = require('./routes/analytics.routes');
 
const app = express();
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
app.use('/api/availability', availabilityRouter);
app.use('/api/analytics', analyticsRouter);
 
initMail();
 
app.listen(port, () => console.log(`Server running on port ${port}`));