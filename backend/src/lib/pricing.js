import prisma from './prisma.js';
import { MODELS } from '../data/models.js';

export const PLAN_KEYS = {
  STANDALONE_ALL: 'standalone_all',
  STANDALONE_STANDARD: 'standalone_standard',
  ALL_MODELS_PRO: 'investor', // planKey stays investor for access/tier compatibility
};

/** Only these 3 bundles are sold; Standard tier is included in standalone_standard, not sold alone */
export const BUNDLE_PLAN_KEYS = [
  PLAN_KEYS.STANDALONE_ALL,
  PLAN_KEYS.STANDALONE_STANDARD,
  PLAN_KEYS.ALL_MODELS_PRO,
];

export const DEFAULT_PLAN_PRICES = [
  {
    planKey: PLAN_KEYS.STANDALONE_ALL,
    name: 'All Standalone Models',
    description: 'One-time access to every professional standalone model',
    priceOneTime: 239900,
    priceMonthly: null,
    priceYearly: null,
    discountPercent: 0,
    discountLabel: null,
    sortOrder: 1,
  },
  {
    planKey: PLAN_KEYS.STANDALONE_STANDARD,
    name: 'Standalone All + Standard',
    description: 'All standalone models plus the Standard linked toolkit',
    priceMonthly: 14900,
    priceYearly: 149900,
    priceOneTime: null,
    discountPercent: 0,
    discountLabel: null,
    sortOrder: 2,
  },
  {
    planKey: PLAN_KEYS.ALL_MODELS_PRO,
    name: 'All Models PRO +',
    description: 'Complete access to every model in FinMech — standalone, standard, and investor grade',
    priceMonthly: 19900,
    priceYearly: 199900,
    priceOneTime: null,
    discountPercent: 0,
    discountLabel: null,
    sortOrder: 3,
  },
];

const DEFAULT_MODEL_PRICE_PAISE = 239900; // ₹2,399

export function applyDiscount(amountPaise, discountPercent) {
  if (!discountPercent || discountPercent <= 0) return amountPaise;
  return Math.round(amountPaise * (1 - discountPercent / 100));
}

export function formatRupee(paise) {
  const rupees = paise / 100;
  return rupees % 1 === 0 ? `₹${rupees.toLocaleString('en-IN')}` : `₹${rupees.toFixed(2)}`;
}

export function priceWithDiscount(basePaise, discountPercent) {
  const finalPaise = applyDiscount(basePaise, discountPercent);
  return {
    basePaise,
    finalPaise,
    discountPercent: discountPercent || 0,
    baseDisplay: formatRupee(basePaise),
    finalDisplay: formatRupee(finalPaise),
    hasDiscount: (discountPercent || 0) > 0,
  };
}

export async function ensurePricingSeeded() {
  for (const plan of DEFAULT_PLAN_PRICES) {
    await prisma.planPrice.upsert({
      where: { planKey: plan.planKey },
      create: { ...plan, isActive: true },
      update: {
        name: plan.name,
        description: plan.description,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
    });
  }

  // Retire legacy standalone Standard-only bundle from admin/pricing UI
  await prisma.planPrice.updateMany({
    where: { planKey: 'standard' },
    data: { isActive: false },
  });

  const standaloneModels = Object.values(MODELS).filter((m) => m.tier === 'standalone');
  for (const model of standaloneModels) {
    await prisma.modelPrice.upsert({
      where: { modelSlug: model.slug },
      create: {
        modelSlug: model.slug,
        modelName: model.name,
        priceOneTime: DEFAULT_MODEL_PRICE_PAISE,
        discountPercent: 0,
      },
      update: {},
    });
  }
}

export async function getPublicPricing() {
  await ensurePricingSeeded();

  const [plans, modelPrices] = await Promise.all([
    prisma.planPrice.findMany({
      where: { isActive: true, planKey: { in: BUNDLE_PLAN_KEYS } },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.modelPrice.findMany({
      where: { isActive: true },
      orderBy: { modelName: 'asc' },
    }),
  ]);

  return {
    plans: plans.map((p) => ({
      ...p,
      monthly: p.priceMonthly != null ? priceWithDiscount(p.priceMonthly, p.discountPercent) : null,
      yearly: p.priceYearly != null ? priceWithDiscount(p.priceYearly, p.discountPercent) : null,
      oneTime: p.priceOneTime != null ? priceWithDiscount(p.priceOneTime, p.discountPercent) : null,
    })),
    modelPrices: modelPrices.map((m) => ({
      ...m,
      pricing: priceWithDiscount(m.priceOneTime, m.discountPercent),
    })),
  };
}

export async function resolveOrderAmount({ plan, billingCycle = 'monthly', modelSlug }) {
  await ensurePricingSeeded();

  if (plan === 'standalone_model') {
    if (!modelSlug) throw new Error('modelSlug required for standalone model purchase');
    const mp = await prisma.modelPrice.findUnique({ where: { modelSlug } });
    if (!mp || !mp.isActive) throw new Error('Model not available for purchase');
    const finalPaise = applyDiscount(mp.priceOneTime, mp.discountPercent);
    return {
      amount: finalPaise,
      billingCycle: 'one_time',
      planName: mp.modelName,
      modelSlug,
      userPlanOnSuccess: 'free',
    };
  }

  const planRow = await prisma.planPrice.findUnique({ where: { planKey: plan } });
  if (!planRow || !planRow.isActive) throw new Error('Plan not found');

  let basePaise;
  let cycle = billingCycle;

  const onlyOneTime = planRow.priceOneTime != null && planRow.priceMonthly == null && planRow.priceYearly == null;

  if (billingCycle === 'one_time' || onlyOneTime) {
    if (planRow.priceOneTime == null) throw new Error('Plan does not support one-time purchase');
    basePaise = planRow.priceOneTime;
    cycle = 'one_time';
  } else if (billingCycle === 'yearly') {
    if (planRow.priceYearly == null) throw new Error('Plan does not support yearly billing');
    basePaise = planRow.priceYearly;
  } else {
    if (planRow.priceMonthly == null) throw new Error('Plan does not support monthly billing');
    basePaise = planRow.priceMonthly;
    cycle = 'monthly';
  }

  const finalPaise = applyDiscount(basePaise, planRow.discountPercent);

  const userPlanMap = {
    [PLAN_KEYS.STANDALONE_ALL]: 'standalone_all',
    [PLAN_KEYS.STANDALONE_STANDARD]: 'standalone_standard',
    [PLAN_KEYS.ALL_MODELS_PRO]: 'investor',
  };

  return {
    amount: finalPaise,
    billingCycle: cycle,
    planName: planRow.name,
    modelSlug: null,
    userPlanOnSuccess: userPlanMap[plan] || plan,
  };
}

export function parsePurchasedModels(user) {
  try {
    const parsed = JSON.parse(user.purchasedModels || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function canAccessModel(user, model) {
  if (!model) return false;
  if (model.tier === 'free') return true;

  const plan = user?.plan || 'free';
  const purchased = user ? parsePurchasedModels(user) : [];

  if (purchased.includes(model.slug)) return true;

  if (plan === 'investor') return true;

  if (plan === 'standalone_standard') {
    return model.tier === 'standalone' || model.tier === 'standard' || model.tier === 'free';
  }

  if (plan === 'standalone_all' || plan === 'standalone') {
    return model.tier === 'standalone' || model.tier === 'free';
  }

  if (plan === 'standard') {
    return model.tier === 'standard' || model.tier === 'free';
  }

  return model.tier === 'free';
}

export async function applyPaymentToUser(userId, payment) {
  const meta = payment.metadata ? JSON.parse(payment.metadata) : {};
  const now = new Date();

  if (payment.plan === 'standalone_model' && payment.modelSlug) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const purchased = parsePurchasedModels(user);
    if (!purchased.includes(payment.modelSlug)) {
      purchased.push(payment.modelSlug);
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        purchasedModels: JSON.stringify(purchased),
        subscriptionStatus: 'active',
      },
    });
    return { plan: user?.plan || 'free', purchasedModels: purchased };
  }

  const userPlan = meta.userPlanOnSuccess || payment.plan;
  let subscriptionEnd = null;

  if (payment.billingCycle === 'yearly') {
    subscriptionEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  } else if (payment.billingCycle === 'monthly') {
    subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: userPlan,
      subscriptionStatus: 'active',
      subscriptionPlan: payment.plan,
      subscriptionStart: now,
      subscriptionEnd,
    },
  });

  return { plan: userPlan, subscriptionEnd };
}

export function getAccessibleTiersForUser(user) {
  const plan = user?.plan || 'free';
  const tiers = new Set(['free']);

  if (plan === 'investor') {
    ['free', 'standalone', 'standard', 'investor'].forEach((t) => tiers.add(t));
  } else if (plan === 'standalone_standard') {
    ['free', 'standalone', 'standard'].forEach((t) => tiers.add(t));
  } else if (plan === 'standalone_all' || plan === 'standalone') {
    ['free', 'standalone'].forEach((t) => tiers.add(t));
  } else if (plan === 'standard') {
    ['free', 'standard'].forEach((t) => tiers.add(t));
  }

  const purchased = user ? parsePurchasedModels(user) : [];
  for (const slug of purchased) {
    const m = MODELS[slug];
    if (m) tiers.add(m.tier);
  }

  return [...tiers];
}
