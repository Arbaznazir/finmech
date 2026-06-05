import express from 'express';
import { getPublicPricing } from '../lib/pricing.js';

const router = express.Router();

/**
 * Public pricing (plans, per-model prices, discounts)
 * GET /api/pricing
 */
router.get('/', async (req, res) => {
  try {
    const pricing = await getPublicPricing();
    res.json({ success: true, ...pricing });
  } catch (err) {
    console.error('Get pricing error:', err);
    res.status(500).json({ error: 'Failed to load pricing' });
  }
});

export default router;
