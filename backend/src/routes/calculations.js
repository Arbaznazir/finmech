import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { MODELS } from '../data/models.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { modelSlug, inputs, outputs } = req.body;
    const model = MODELS[modelSlug];

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const calculation = await prisma.calculation.create({
      data: {
        userId: req.user.id,
        modelSlug,
        modelName: model.name,
        tier: model.tier,
        inputs: JSON.stringify(inputs),
        outputs: JSON.stringify(outputs),
      },
    });

    // Keep only the latest 60 calculations total per user across all models
    const all = await prisma.calculation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (all.length > 60) {
      const idsToDelete = all.slice(60).map(c => c.id);
      await prisma.calculation.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    res.status(201).json(calculation);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2003') {
      return res.status(401).json({ error: 'User account not found. Please sign up or log in again.' });
    }
    res.status(500).json({ error: 'Failed to save calculation' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, modelSlug } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (modelSlug) where.modelSlug = modelSlug;

    const [calculations, total] = await Promise.all([
      prisma.calculation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.calculation.count({ where }),
    ]);

    res.json({
      calculations: calculations.map(c => ({
        ...c,
        inputs: JSON.parse(c.inputs),
        outputs: JSON.parse(c.outputs),
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch calculations' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const calculation = await prisma.calculation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!calculation) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.json({
      ...calculation,
      inputs: JSON.parse(calculation.inputs),
      outputs: JSON.parse(calculation.outputs),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch calculation' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const calculation = await prisma.calculation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!calculation) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    await prisma.calculation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Calculation deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete calculation' });
  }
});

export default router;
