import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

function normalizeRow(row) {
  let conditions = [];
  try {
    conditions = JSON.parse(row.conditions);
  } catch {
    conditions = [];
  }
  return {
    id: row.id,
    modelSlug: row.modelSlug,
    message: row.message,
    color: row.color,
    conditions,
    combineMode: row.combineMode,
    sortOrder: row.sortOrder,
  };
}

/**
 * GET /api/smart-result-points?modelSlug=revenue-model
 */
router.get('/', async (req, res) => {
  try {
    const { modelSlug } = req.query;
    if (!modelSlug) {
      return res.status(400).json({ error: 'modelSlug is required' });
    }

    const rows = await prisma.smartResultPoint.findMany({
      where: { modelSlug, isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({ success: true, points: rows.map(normalizeRow) });
  } catch (err) {
    console.error('Get smart result points error:', err);
    res.status(500).json({ error: 'Failed to fetch smart result points' });
  }
});

export default router;
