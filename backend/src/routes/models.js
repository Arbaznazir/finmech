import express from 'express';
import { MODELS, TIERS } from '../data/models.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, (req, res) => {
  const userPlan = req.user?.plan || 'free';
  const accessibleTiers = getAccessibleTiers(userPlan);

  const models = Object.values(MODELS).map(model => ({
    ...model,
    accessible: accessibleTiers.includes(model.tier),
    calculate: undefined,
  }));

  res.json({ models, tiers: TIERS });
});

router.get('/tier/:tier', optionalAuth, (req, res) => {
  const { tier } = req.params;
  if (!TIERS[tier]) {
    return res.status(404).json({ error: 'Tier not found' });
  }

  const userPlan = req.user?.plan || 'free';
  const accessibleTiers = getAccessibleTiers(userPlan);

  const models = Object.values(MODELS)
    .filter(m => m.tier === tier)
    .map(model => ({
      ...model,
      accessible: accessibleTiers.includes(model.tier),
      calculate: undefined,
    }));

  res.json({ tier: TIERS[tier], models });
});

router.get('/:slug', optionalAuth, (req, res) => {
  const model = MODELS[req.params.slug];
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const userPlan = req.user?.plan || 'free';
  const accessibleTiers = getAccessibleTiers(userPlan);

  res.json({
    ...model,
    accessible: accessibleTiers.includes(model.tier),
    calculate: undefined,
  });
});

function getAccessibleTiers(plan) {
  const hierarchy = ['free', 'standalone', 'standard', 'investor'];
  const idx = hierarchy.indexOf(plan);
  return hierarchy.slice(0, idx + 1);
}

export default router;
