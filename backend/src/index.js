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

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/saved-models', savedModelRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FinMech API running on port ${PORT}`);
});
