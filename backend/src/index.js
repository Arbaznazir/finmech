import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.js';
import modelRoutes from './routes/models.js';
import calculationRoutes from './routes/calculations.js';
import userRoutes from './routes/user.js';
import savedModelRoutes from './routes/saved-models.js';
import paymentRoutes from './routes/payments.js';
import { handleRazorpayWebhook } from './routes/payments-webhook.js';
import adminRoutes from './routes/admin.js';
import pricingRoutes from './routes/pricing.js';
import { getRazorpayStatus } from './lib/razorpay.js';

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
}));

// Razorpay webhook requires raw body for HMAC signature verification
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/saved-models', savedModelRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pricing', pricingRoutes);

app.get('/api/health', (req, res) => {
  const razorpay = getRazorpayStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    razorpay: {
      configured: razorpay.configured,
      mode: razorpay.mode,
      webhookConfigured: razorpay.webhookConfigured,
    },
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FinMech API running on port ${PORT}`);
});
