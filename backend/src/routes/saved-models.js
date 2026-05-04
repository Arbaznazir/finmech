import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { MODELS } from '../data/models.js';

const router = express.Router();

// GET /api/saved-models/:modelSlug — load saved state for a model
router.get('/:modelSlug', authenticate, async (req, res) => {
  try {
    const { modelSlug } = req.params;

    const saved = await prisma.savedModel.findUnique({
      where: { userId_modelSlug: { userId: req.user.id, modelSlug } },
    });

    if (!saved) {
      return res.json(null);
    }

    res.json({
      id: saved.id,
      modelSlug: saved.modelSlug,
      modelName: saved.modelName,
      data: JSON.parse(saved.data),
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load saved model' });
  }
});

// PUT /api/saved-models/:modelSlug — upsert saved state for a model
router.put('/:modelSlug', authenticate, async (req, res) => {
  try {
    const { modelSlug } = req.params;
    const { data } = req.body;
    const model = MODELS[modelSlug];
    const modelName = model?.name || modelSlug;

    if (!data) {
      return res.status(400).json({ error: 'Missing data field' });
    }

    const saved = await prisma.savedModel.upsert({
      where: { userId_modelSlug: { userId: req.user.id, modelSlug } },
      update: { data: JSON.stringify(data), modelName },
      create: {
        userId: req.user.id,
        modelSlug,
        modelName,
        data: JSON.stringify(data),
      },
    });

    res.json({
      id: saved.id,
      modelSlug: saved.modelSlug,
      modelName: saved.modelName,
      data: JSON.parse(saved.data),
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save model state' });
  }
});

// GET /api/saved-models — list all saved models for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const savedModels = await prisma.savedModel.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, modelSlug: true, modelName: true, updatedAt: true },
    });

    res.json(savedModels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list saved models' });
  }
});

// DELETE /api/saved-models/:modelSlug — remove saved state
router.delete('/:modelSlug', authenticate, async (req, res) => {
  try {
    const { modelSlug } = req.params;
    const existing = await prisma.savedModel.findUnique({
      where: { userId_modelSlug: { userId: req.user.id, modelSlug } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved model not found' });
    }

    await prisma.savedModel.delete({ where: { userId_modelSlug: { userId: req.user.id, modelSlug } } });
    res.json({ message: 'Saved model deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete saved model' });
  }
});

export default router;
