import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import Routes
import authRoutes from './routes/auth.js';
import uploadsRoutes from './routes/uploads.js';
import entriesRoutes from './routes/entries.js';
import paymentsRoutes from './routes/payments.js';
import queueRoutes from './routes/queue.js';
import refundsRoutes from './routes/refunds.js';
import adminRoutes from './routes/admin.js';
import webhooksRoutes from './routes/webhooks.js';
import settingsRoutes from './routes/settings.js';
import { connectDB } from './config/db.js';

const app = express();

// Security and CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check (always responds instantly, even before DB is ready)
app.get(['/health', '/api/health', '/v1/health', '/api/v1/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'EthioDV-FillTrack API',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

// Database connection middleware for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Serverless DB connection error:', err.message);
    next(err);
  }
});

// Mount Routes with dual prefixes to support both direct and rewritten proxy requests
const mountAppRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/uploads`, uploadsRoutes);
  app.use(`${prefix}/entries`, entriesRoutes);
  app.use(`${prefix}/payments`, paymentsRoutes);
  app.use(`${prefix}/queue`, queueRoutes);
  app.use(`${prefix}/refunds`, refundsRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/webhooks`, webhooksRoutes);
  app.use(`${prefix}/settings`, settingsRoutes);
};

mountAppRoutes('/api/v1');
mountAppRoutes('/v1');


// Error Handling
app.use(errorHandler);

export default app;
