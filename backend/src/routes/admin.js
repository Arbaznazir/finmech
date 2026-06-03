import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Admin middleware - check if user is admin
const requireAdmin = async (req, res, next) => {
  // Hardcoded admin check - admin@finmech.com is the admin
  if (req.user.email !== 'admin@finmech.com') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

/**
 * Get all users with subscription info
 * GET /api/admin/users
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            calculations: true,
            savedModels: true,
          },
        },
      },
    });

    // Format dates and calculate days remaining
    const formattedUsers = users.map(user => {
      const now = new Date();
      const isActive = user.subscriptionStatus === 'active' && 
        (!user.subscriptionEnd || new Date(user.subscriptionEnd) > now);
      
      return {
        ...user,
        createdAt: user.createdAt.toISOString().split('T')[0],
        subscriptionStart: user.subscriptionStart ? user.subscriptionStart.toISOString().split('T')[0] : null,
        subscriptionEnd: user.subscriptionEnd ? user.subscriptionEnd.toISOString().split('T')[0] : null,
        isActive,
        daysRemaining: user.subscriptionEnd && isActive
          ? Math.max(0, Math.ceil((new Date(user.subscriptionEnd) - now) / (1000 * 60 * 60 * 24)))
          : 0,
        totalCalculations: user._count.calculations,
        totalSavedModels: user._count.savedModels,
      };
    });

    res.json({
      success: true,
      count: users.length,
      users: formattedUsers,
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get all payments/invoices across all users
 * GET /api/admin/invoices
 */
router.get('/invoices', authenticate, requireAdmin, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const formattedPayments = payments.map((payment, index) => ({
      id: payment.id,
      invoiceNumber: `INV-${new Date(payment.createdAt).getFullYear()}-${String(index + 1).padStart(4, '0')}`,
      date: payment.createdAt.toISOString().split('T')[0],
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      plan: payment.plan,
      billingCycle: payment.billingCycle,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      user: {
        id: payment.user.id,
        email: payment.user.email,
        name: payment.user.name,
      },
    }));

    // Calculate totals
    const totalRevenue = formattedPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const paidCount = formattedPayments.filter(p => p.status === 'paid').length;
    const pendingCount = formattedPayments.filter(p => p.status === 'created').length;
    const failedCount = formattedPayments.filter(p => p.status === 'failed').length;

    res.json({
      success: true,
      count: payments.length,
      totalRevenue,
      paidCount,
      pendingCount,
      failedCount,
      invoices: formattedPayments,
    });
  } catch (err) {
    console.error('Admin get invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * Get dashboard stats
 * GET /api/admin/stats
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeSubscribers,
      totalCalculations,
      totalSavedModels,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          subscriptionStatus: 'active',
        },
      }),
      prisma.calculation.count(),
      prisma.savedModel.count(),
    ]);

    // Plan distribution
    const planDistribution = await prisma.user.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });

    // Revenue by plan
    const payments = await prisma.payment.findMany({
      where: { status: 'paid' },
      select: { plan: true, amount: true },
    });

    const revenueByPlan = payments.reduce((acc, payment) => {
      const amount = payment.amount / 100;
      acc[payment.plan] = (acc[payment.plan] || 0) + amount;
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeSubscribers,
        totalCalculations,
        totalSavedModels,
        conversionRate: totalUsers > 0 ? ((activeSubscribers / totalUsers) * 100).toFixed(2) : 0,
        planDistribution: planDistribution.map(p => ({
          plan: p.plan,
          count: p._count.plan,
        })),
        revenueByPlan,
        totalRevenue: Object.values(revenueByPlan).reduce((a, b) => a + b, 0),
      },
    });
  } catch (err) {
    console.error('Admin get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Update user plan manually
 * PUT /api/admin/users/:id/plan
 */
router.put('/users/:id/plan', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, subscriptionStatus, subscriptionEnd } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        plan,
        subscriptionStatus: subscriptionStatus || 'active',
        subscriptionPlan: plan,
        subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
      },
    });

    res.json({
      success: true,
      message: 'User plan updated successfully',
      user: {
        ...user,
        subscriptionEnd: user.subscriptionEnd?.toISOString().split('T')[0],
      },
    });
  } catch (err) {
    console.error('Admin update user plan error:', err);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting admin
    const user = await prisma.user.findUnique({ where: { id } });
    if (user.email === 'admin@finmech.com') {
      return res.status(400).json({ error: 'Cannot delete admin user' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
