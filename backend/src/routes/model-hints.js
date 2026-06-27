import express from 'express';
import prisma from '../lib/prisma.js';
import { mergeHintsForModel } from '../data/model-hint-catalog.js';

const router = express.Router();

/**
 * Public: merged field hints for a model (catalog + admin overrides)
 * GET /api/model-hints/:modelSlug
 */
router.get('/:modelSlug', async (req, res) => {
  try {
    const { modelSlug } = req.params;
    const merged = await mergeHintsForModel(prisma, modelSlug);
    if (!merged) {
      return res.status(404).json({ error: 'No field hints configured for this model' });
    }
    res.json({
      success: true,
      modelSlug: merged.modelSlug,
      hints: merged.hints,
    });
  } catch (err) {
    console.error('Get model hints error:', err);
    res.status(500).json({ error: 'Failed to fetch model hints' });
  }
});

export default router;
