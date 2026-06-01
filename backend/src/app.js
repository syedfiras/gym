import express from 'express';
import dotenv from 'dotenv';
import db from './models/index.js';
import authRoutes from './routes/auth.routes.js';
import ownerRoutes from './routes/owner.routes.js';
// import memberRoutes from './routes/member.routes.js'; // REMOVED
import publicRoutes from './routes/public.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import cors from 'cors';
import internalRoutes from './routes/internal.routes.js';
// import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
dotenv.config();

const app = express();

// Security and performance middleware
// app.use(helmet());
app.use(compression());

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// Stricter limit for sensitive endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many uploads, please try again later.' }
});
app.use(/^\/api\/owner\/members\/[^/]+\/photo$/, uploadLimiter);
app.use(/^\/api\/owner\/staff\/[^/]+\/photo$/, uploadLimiter);
app.use('/api/owner/profile/photo', uploadLimiter);

// WhatsApp test message limiter removed

app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  // Future production domains
  'http://gymnetsolutions.netlify.app',
  'https://gymnetsolutions.netlify.app',

  // Local dev / Ionic browser
  'http://localhost:8100',
  'http://127.0.0.1:8100',
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',        // IMPORTANT for Capacitor WebView on device
  'https://localhost:8100',

  // Ionic / Capacitor mobile
  'capacitor://localhost',
  'ionic://localhost'
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Database connection
// try {
//   await db.sequelize.authenticate();
//   console.log('Database connected successfully');
//   // In development, you might use sync({ alter: true }) to auto-update schema:
//   // await db.sequelize.sync({ alter: true });
//   // ^ Only use this in development! In production, use migrations.
//   // In production, run migrations manually with: npm run migrate
//   startMembershipExpiryJob();
// } catch (error) {
//   console.error('Database connection failed:', error);
// }

// Database connection
try {
  await db.sequelize.authenticate();
  console.log('Database connected successfully');

  // if (process.env.NODE_ENV === 'development') {
  //   // await db.sequelize.sync({ alter: true });
  //   await db.WhatsAppTemplate.sync({ alter: true });
  //   console.log('WhatsAppTemplate model synchronized with Supabase (dev mode)');
  // }
} catch (error) {
  console.error('Database connection failed:', error);
}


//For development, alter: true is convenient as it automatically updates your database schema when you change your Sequelize models. This is perfectly fine for your current stage.
// Important for Production: For production environments, alter: true is generally not recommended. It can lead to data loss or unexpected behavior on large databases, especially with complex schema changes.
//  In production, you would typically use dedicated database migration tools (like Sequelize's CLI or Flyway/Liquibase) to manage schema changes explicitly. Just keep this in mind for when your app grows.

const __dirname = path.resolve();
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', publicRoutes);
app.use('/api/internal', internalRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});