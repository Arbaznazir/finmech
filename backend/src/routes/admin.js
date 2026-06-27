import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePricingSeeded, BUNDLE_PLAN_KEYS } from '../lib/pricing.js';
import { MODELS } from '../data/models.js';
import {
  HINT_TIERS,
  listModelsByTier,
  mergeHintsForModel,
  getCatalogEntry,
  TIER_OVERVIEW_SLUG,
} from '../data/model-hint-catalog.js';
import {
  FAQ_TIERS,
  listModelsForFaqAdmin,
  getDefaultFaqs,
} from '../data/faq-catalog.js';
import {
  SMART_RESULT_TIERS,
  OPERATORS,
  PRESET_COLORS,
  listModelsForSmartResultAdmin,
  getOutputFieldsForModel,
  getTemplatesForModel,
  SIMPLE_COMPARISONS,
} from '../data/smart-result-catalog.js';

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

/**
 * Get all pricing config (admin)
 * GET /api/admin/pricing
 */
router.get('/pricing', authenticate, requireAdmin, async (req, res) => {
  try {
    await ensurePricingSeeded();
    const [plans, modelPrices] = await Promise.all([
      prisma.planPrice.findMany({
        where: { planKey: { in: BUNDLE_PLAN_KEYS } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.modelPrice.findMany({ orderBy: { modelName: 'asc' } }),
    ]);
    res.json({ success: true, plans, modelPrices });
  } catch (err) {
    console.error('Admin get pricing error:', err);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

/**
 * Update bundle plan pricing
 * PUT /api/admin/pricing/plans/:planKey
 */
router.put('/pricing/plans/:planKey', authenticate, requireAdmin, async (req, res) => {
  try {
    const { planKey } = req.params;
    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      priceOneTime,
      discountPercent,
      discountLabel,
      isActive,
      sortOrder,
    } = req.body;

    const plan = await prisma.planPrice.update({
      where: { planKey },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(priceMonthly !== undefined && { priceMonthly: priceMonthly === null ? null : Number(priceMonthly) }),
        ...(priceYearly !== undefined && { priceYearly: priceYearly === null ? null : Number(priceYearly) }),
        ...(priceOneTime !== undefined && { priceOneTime: priceOneTime === null ? null : Number(priceOneTime) }),
        ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
        ...(discountLabel !== undefined && { discountLabel }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });

    res.json({ success: true, plan });
  } catch (err) {
    console.error('Admin update plan price error:', err);
    res.status(500).json({ error: 'Failed to update plan pricing' });
  }
});

/**
 * Update single model pricing
 * PUT /api/admin/pricing/models/:modelSlug
 */
router.put('/pricing/models/:modelSlug', authenticate, requireAdmin, async (req, res) => {
  try {
    const { modelSlug } = req.params;
    const { priceOneTime, discountPercent, discountLabel, isActive, modelName } = req.body;

    const model = await prisma.modelPrice.update({
      where: { modelSlug },
      data: {
        ...(priceOneTime !== undefined && { priceOneTime: Number(priceOneTime) }),
        ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
        ...(discountLabel !== undefined && { discountLabel }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(modelName !== undefined && { modelName }),
      },
    });

    res.json({ success: true, model });
  } catch (err) {
    console.error('Admin update model price error:', err);
    res.status(500).json({ error: 'Failed to update model pricing' });
  }
});

/**
 * Sync model price rows for all standalone models
 * POST /api/admin/pricing/sync-models
 */
router.post('/pricing/sync-models', authenticate, requireAdmin, async (req, res) => {
  try {
    await ensurePricingSeeded();
    const modelPrices = await prisma.modelPrice.findMany();
    res.json({ success: true, count: modelPrices.length, modelPrices });
  } catch (err) {
    console.error('Admin sync model prices error:', err);
    res.status(500).json({ error: 'Failed to sync model prices' });
  }
});

// ── Model field hints (admin-editable (i) tooltips) ──

/**
 * List tiers + models available for hint editing
 * GET /api/admin/model-hints
 */
router.get('/model-hints', authenticate, requireAdmin, async (req, res) => {
  try {
    const tiers = HINT_TIERS.map((t) => ({
      ...t,
      models: listModelsByTier(t.id),
    }));
    const tierOverviewEntry = getCatalogEntry(TIER_OVERVIEW_SLUG);
    res.json({
      success: true,
      tiers,
      tierOverview: tierOverviewEntry
        ? {
            modelSlug: TIER_OVERVIEW_SLUG,
            name: tierOverviewEntry.name,
            fieldCount: tierOverviewEntry.fields.length,
          }
        : null,
    });
  } catch (err) {
    console.error('Admin list model hints error:', err);
    res.status(500).json({ error: 'Failed to list model hints' });
  }
});

/**
 * Full field list for one model (defaults + overrides)
 * GET /api/admin/model-hints/:modelSlug
 */
router.get('/model-hints/:modelSlug', authenticate, requireAdmin, async (req, res) => {
  try {
    const merged = await mergeHintsForModel(prisma, req.params.modelSlug);
    if (!merged) {
      return res.status(404).json({ error: 'Model not in hint catalog' });
    }
    res.json({ success: true, ...merged });
  } catch (err) {
    console.error('Admin get model hints error:', err);
    res.status(500).json({ error: 'Failed to fetch model hints' });
  }
});

/**
 * Save / update hint for one field
 * PUT /api/admin/model-hints/:modelSlug/:fieldKey
 */
router.put('/model-hints/:modelSlug/:fieldKey', authenticate, requireAdmin, async (req, res) => {
  try {
    const { modelSlug, fieldKey } = req.params;
    const { what, why, how } = req.body;

    const catalog = getCatalogEntry(modelSlug);
    if (!catalog) {
      return res.status(404).json({ error: 'Model not in hint catalog' });
    }
    const def = catalog.fields.find((f) => f.key === fieldKey);
    if (!def) {
      return res.status(404).json({ error: 'Field not found in catalog' });
    }
    if (!what?.trim() || !why?.trim()) {
      return res.status(400).json({ error: 'what and why are required' });
    }

    const row = await prisma.modelFieldHint.upsert({
      where: { modelSlug_fieldKey: { modelSlug, fieldKey } },
      create: {
        modelSlug,
        fieldKey,
        what: what.trim(),
        why: why.trim(),
        how: how?.trim() || null,
      },
      update: {
        what: what.trim(),
        why: why.trim(),
        how: how?.trim() || null,
      },
    });

    res.json({ success: true, hint: row });
  } catch (err) {
    console.error('Admin save model hint error:', err);
    res.status(500).json({ error: 'Failed to save field hint' });
  }
});

/**
 * Revert field to catalog default (remove override)
 * DELETE /api/admin/model-hints/:modelSlug/:fieldKey
 */
router.delete('/model-hints/:modelSlug/:fieldKey', authenticate, requireAdmin, async (req, res) => {
  try {
    const { modelSlug, fieldKey } = req.params;
    await prisma.modelFieldHint.deleteMany({ where: { modelSlug, fieldKey } });
    const merged = await mergeHintsForModel(prisma, modelSlug);
    res.json({ success: true, field: merged?.fields.find((f) => f.fieldKey === fieldKey) });
  } catch (err) {
    console.error('Admin delete model hint error:', err);
    res.status(500).json({ error: 'Failed to reset field hint' });
  }
});

// ── FAQs (admin-managed) ──

router.get('/faqs/meta', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      tiers: FAQ_TIERS,
      models: listModelsForFaqAdmin(),
    });
  } catch (err) {
    console.error('Admin FAQ meta error:', err);
    res.status(500).json({ error: 'Failed to load FAQ metadata' });
  }
});

router.get('/faqs', authenticate, requireAdmin, async (req, res) => {
  try {
    const scope = req.query.scope || 'global';
    const where = { scope };
    if (scope === 'tier') where.tierSlug = req.query.tier || null;
    if (scope === 'model') where.modelSlug = req.query.modelSlug || null;
    if (scope === 'global') {
      where.tierSlug = null;
      where.modelSlug = null;
    }

    const rows = await prisma.faq.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({ success: true, faqs: rows });
  } catch (err) {
    console.error('Admin list FAQs error:', err);
    res.status(500).json({ error: 'Failed to list FAQs' });
  }
});

router.post('/faqs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { scope, tierSlug, modelSlug, question, answer, isPublished } = req.body;
    if (!scope || !question?.trim() || !answer?.trim()) {
      return res.status(400).json({ error: 'scope, question, and answer are required' });
    }
    if (scope === 'tier' && !tierSlug) {
      return res.status(400).json({ error: 'tierSlug required for tier scope' });
    }
    if (scope === 'model' && !modelSlug) {
      return res.status(400).json({ error: 'modelSlug required for model scope' });
    }

    const where = { scope };
    if (scope === 'tier') where.tierSlug = tierSlug;
    if (scope === 'model') where.modelSlug = modelSlug;
    if (scope === 'global') {
      where.tierSlug = null;
      where.modelSlug = null;
    }

    const maxOrder = await prisma.faq.aggregate({
      where,
      _max: { sortOrder: true },
    });

    const row = await prisma.faq.create({
      data: {
        scope,
        tierSlug: scope === 'tier' ? tierSlug : null,
        modelSlug: scope === 'model' ? modelSlug : null,
        question: question.trim(),
        answer: answer.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isPublished: isPublished !== false,
      },
    });

    res.json({ success: true, faq: row });
  } catch (err) {
    console.error('Admin create FAQ error:', err);
    const msg =
      err?.code === 'P2021' || String(err?.message || '').includes('Faq')
        ? 'FAQ table missing — run: cd backend && npx prisma migrate deploy'
        : 'Failed to create FAQ';
    res.status(500).json({ error: msg });
  }
});

router.put('/faqs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { question, answer, isPublished, sortOrder } = req.body;
    const data = {};
    if (question !== undefined) data.question = question.trim();
    if (answer !== undefined) data.answer = answer.trim();
    if (isPublished !== undefined) data.isPublished = Boolean(isPublished);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);

    const row = await prisma.faq.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, faq: row });
  } catch (err) {
    console.error('Admin update FAQ error:', err);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

router.delete('/faqs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.faq.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete FAQ error:', err);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

router.post('/faqs/reorder', authenticate, requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array required' });
    }
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        prisma.faq.update({ where: { id }, data: { sortOrder: Number(sortOrder) } })
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin reorder FAQs error:', err);
    res.status(500).json({ error: 'Failed to reorder FAQs' });
  }
});

// ── Smart Result Points ─────────────────────────────────────────────────────

router.get('/smart-result-points/meta', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      tiers: SMART_RESULT_TIERS,
      models: listModelsForSmartResultAdmin(),
      operators: OPERATORS,
      colors: PRESET_COLORS,
      simpleComparisons: SIMPLE_COMPARISONS,
    });
  } catch (err) {
    console.error('Admin smart result meta error:', err);
    res.status(500).json({ error: 'Failed to load metadata' });
  }
});

router.get('/smart-result-points/fields/:modelSlug', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      fields: getOutputFieldsForModel(req.params.modelSlug),
      templates: getTemplatesForModel(req.params.modelSlug),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load fields' });
  }
});

router.get('/smart-result-points', authenticate, requireAdmin, async (req, res) => {
  try {
    const { modelSlug } = req.query;
    if (!modelSlug) {
      return res.status(400).json({ error: 'modelSlug is required' });
    }
    const rows = await prisma.smartResultPoint.findMany({
      where: { modelSlug },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const points = rows.map((row) => {
      let conditions = [];
      try {
        conditions = JSON.parse(row.conditions);
      } catch {
        conditions = [];
      }
      return { ...row, conditions };
    });
    res.json({ success: true, points });
  } catch (err) {
    console.error('Admin list smart result points error:', err);
    res.status(500).json({ error: 'Failed to list points' });
  }
});

router.post('/smart-result-points', authenticate, requireAdmin, async (req, res) => {
  try {
    const { modelSlug, message, color, conditions, combineMode, isPublished } = req.body;
    if (!modelSlug || !message?.trim()) {
      return res.status(400).json({ error: 'modelSlug and message are required' });
    }
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({ error: 'At least one condition is required' });
    }

    const maxOrder = await prisma.smartResultPoint.aggregate({
      where: { modelSlug },
      _max: { sortOrder: true },
    });

    const row = await prisma.smartResultPoint.create({
      data: {
        modelSlug,
        message: message.trim(),
        color: color || '#16a34a',
        conditions: JSON.stringify(conditions),
        combineMode: combineMode === 'any' ? 'any' : 'all',
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isPublished: isPublished !== false,
      },
    });

    res.json({
      success: true,
      point: { ...row, conditions: JSON.parse(row.conditions) },
    });
  } catch (err) {
    console.error('Admin create smart result point error:', err);
    const msg =
      err?.code === 'P2021' || String(err?.message || '').includes('SmartResultPoint')
        ? 'Table missing — run: cd backend && npx prisma migrate deploy'
        : 'Failed to create point';
    res.status(500).json({ error: msg });
  }
});

router.put('/smart-result-points/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { message, color, conditions, combineMode, isPublished, sortOrder } = req.body;
    const data = {};
    if (message !== undefined) data.message = message.trim();
    if (color !== undefined) data.color = color;
    if (conditions !== undefined) data.conditions = JSON.stringify(conditions);
    if (combineMode !== undefined) data.combineMode = combineMode === 'any' ? 'any' : 'all';
    if (isPublished !== undefined) data.isPublished = Boolean(isPublished);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);

    const row = await prisma.smartResultPoint.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      point: { ...row, conditions: JSON.parse(row.conditions) },
    });
  } catch (err) {
    console.error('Admin update smart result point error:', err);
    res.status(500).json({ error: 'Failed to update point' });
  }
});

router.delete('/smart-result-points/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.smartResultPoint.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete smart result point error:', err);
    res.status(500).json({ error: 'Failed to delete point' });
  }
});

router.post('/smart-result-points/reorder', authenticate, requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array required' });
    }
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        prisma.smartResultPoint.update({ where: { id }, data: { sortOrder: Number(sortOrder) } })
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin reorder smart result points error:', err);
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

export default router;
