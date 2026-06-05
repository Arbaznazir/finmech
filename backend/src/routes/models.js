import express from 'express';
import { MODELS, TIERS } from '../data/models.js';
import { optionalAuth } from '../middleware/auth.js';
import { canAccessModel } from '../lib/pricing.js';
import prisma from '../lib/prisma.js';

const router = express.Router();

async function getUserForAccess(req) {
  if (!req.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      plan: true,
      purchasedModels: true,
      subscriptionStatus: true,
      subscriptionEnd: true,
    },
  });
}

router.get('/', optionalAuth, async (req, res) => {
  const user = await getUserForAccess(req);
  const models = Object.values(MODELS).map((model) => ({
    ...model,
    accessible: canAccessModel(user, model),
    calculate: undefined,
  }));

  res.json({ models, tiers: TIERS });
});

router.get('/tier/:tier', optionalAuth, async (req, res) => {
  const { tier } = req.params;
  if (!TIERS[tier]) {
    return res.status(404).json({ error: 'Tier not found' });
  }

  const user = await getUserForAccess(req);
  const models = Object.values(MODELS)
    .filter((m) => m.tier === tier)
    .map((model) => ({
      ...model,
      accessible: canAccessModel(user, model),
      calculate: undefined,
    }));

  res.json({ tier: TIERS[tier], models });
});

router.get('/:slug', optionalAuth, async (req, res) => {
  const model = MODELS[req.params.slug];
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const user = await getUserForAccess(req);

  res.json({
    ...model,
    accessible: canAccessModel(user, model),
    calculate: undefined,
  });
});

export default router;
