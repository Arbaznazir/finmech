import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, company: true, plan: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const calculationCount = await prisma.calculation.count({ where: { userId: user.id } });
    const savedModelCount = await prisma.savedModel.count({ where: { userId: user.id } });

    res.json({ ...user, calculationCount, savedModelCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, company } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, company },
      select: { id: true, email: true, name: true, company: true, plan: true },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/plan', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'standalone', 'standard', 'investor'];

    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { plan },
      select: { id: true, email: true, name: true, company: true, plan: true },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [totalCalculations, recentCalculations, modelUsage] = await Promise.all([
      prisma.calculation.count({ where: { userId: req.user.id } }),
      prisma.calculation.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, modelName: true, modelSlug: true, createdAt: true },
      }),
      prisma.calculation.groupBy({
        by: ['modelSlug'],
        where: { userId: req.user.id },
        _count: { modelSlug: true },
        orderBy: { _count: { modelSlug: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({ totalCalculations, recentCalculations, modelUsage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
