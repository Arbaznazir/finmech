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
import modelHintsRoutes from './routes/model-hints.js';
import tierHintsRoutes from './routes/tier-hints.js';
import faqsRoutes from './routes/faqs.js';
import smartResultPointsRoutes from './routes/smart-result-points.js';
import { getRazorpayStatus } from './lib/razorpay.js';
import prisma from './lib/prisma.js';

const REQUIRED_PRISMA_MODELS = ['faq', 'smartResultPoint'];
for (const model of REQUIRED_PRISMA_MODELS) {
  if (!prisma[model]) {
    console.error(
      `Prisma client missing model "${model}". Run: cd backend && npx prisma generate && restart the server.`
    );
    process.exit(1);
  }
}

const app = express();

const STATIC_CORS_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'https://finmech.co',
  'https://www.finmech.co',
];

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (STATIC_CORS_ORIGINS.includes(origin)) return true;
  if (process.env.CORS_ORIGINS) {
    const extra = process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
    if (extra.includes(origin)) return true;
  }
  try {
    const { port } = new URL(origin);
    // Same EC2: frontend container is always published on 3000
    if (port === '3000') return true;
  } catch {
    return false;
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    callback(null, isAllowedCorsOrigin(origin));
  },
  credentials: true,
}));
app.use(helmet());
app.use(morgan('dev'));

// Some deployments proxy /auth/* instead of /api/auth/* — accept both.
app.use((req, _res, next) => {
  const path = req.url.split('?')[0];
  if (path === '/api' || path.startsWith('/api/')) {
    return next();
  }
  const API_ROOTS = [
    '/auth',
    '/models',
    '/calculations',
    '/user',
    '/saved-models',
    '/payments',
    '/admin',
    '/pricing',
    '/model-hints',
    '/tier-hints',
    '/faqs',
    '/smart-result-points',
    '/health',
  ];
  if (API_ROOTS.some((root) => path === root || path.startsWith(`${root}/`))) {
    req.url = `/api${req.url}`;
  }
  next();
});

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
app.use('/api/model-hints', modelHintsRoutes);
app.use('/api/tier-hints', tierHintsRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/smart-result-points', smartResultPointsRoutes);

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
