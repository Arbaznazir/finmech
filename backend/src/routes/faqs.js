import express from 'express';
import prisma from '../lib/prisma.js';
import { getDefaultFaqs } from '../data/faq-catalog.js';

const router = express.Router();

function normalizeRow(row) {
  return {
    id: row.id,
    scope: row.scope,
    tierSlug: row.tierSlug,
    modelSlug: row.modelSlug,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
  };
}

async function fetchPublished(scope, { tierSlug, modelSlug }) {
  const where = { scope, isPublished: true };
  if (scope === 'tier') where.tierSlug = tierSlug ?? null;
  if (scope === 'model') where.modelSlug = modelSlug ?? null;
  if (scope === 'global') {
    where.tierSlug = null;
    where.modelSlug = null;
  }

  const rows = await prisma.faq.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  if (rows.length > 0) return rows.map(normalizeRow);

  const defaults = getDefaultFaqs(scope, { tierSlug, modelSlug });
  return defaults.map((d, i) => ({
    id: `default-${scope}-${tierSlug ?? modelSlug ?? 'global'}-${i}`,
    scope,
    tierSlug: tierSlug ?? null,
    modelSlug: modelSlug ?? null,
    question: d.question,
    answer: d.answer,
    sortOrder: d.sortOrder ?? i,
  }));
}

/**
 * GET /api/faqs?scope=global
 * GET /api/faqs?scope=tier&tier=free
 * GET /api/faqs?scope=model&modelSlug=revenue-model
 */
router.get('/', async (req, res) => {
  try {
    const scope = req.query.scope || 'global';
    if (!['global', 'tier', 'model'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid scope' });
    }
    if (scope === 'tier' && !req.query.tier) {
      return res.status(400).json({ error: 'tier is required for scope=tier' });
    }
    if (scope === 'model' && !req.query.modelSlug) {
      return res.status(400).json({ error: 'modelSlug is required for scope=model' });
    }

    const faqs = await fetchPublished(scope, {
      tierSlug: req.query.tier,
      modelSlug: req.query.modelSlug,
    });

    res.json({ success: true, scope, faqs });
  } catch (err) {
    console.error('Get FAQs error:', err);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

export default router;
