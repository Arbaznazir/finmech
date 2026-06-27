import express from 'express';
import prisma from '../lib/prisma.js';
import { mergeTierOverviewHints } from '../data/model-hint-catalog.js';

const router = express.Router();

/**
 * Public: (i) guide copy for Models page tier tiles
 * GET /api/tier-hints
 */
router.get('/', async (req, res) => {
  try {
    const merged = await mergeTierOverviewHints(prisma);
    if (!merged) {
      return res.status(404).json({ error: 'Tier hints not configured' });
    }
    res.json({
      success: true,
      hints: merged.hints,
    });
  } catch (err) {
    console.error('Get tier hints error:', err);
    res.status(500).json({ error: 'Failed to fetch tier hints' });
  }
});

export default router;
