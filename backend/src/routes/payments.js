import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import {
  resolveOrderAmount,
  applyPaymentToUser,
  PLAN_KEYS,
} from '../lib/pricing.js';
import {
  getRazorpayClient,
  getPublicKeyId,
  isRazorpayConfigured,
  getRazorpayStatus,
  verifyPaymentSignature,
  ensureRazorpayCustomer,
  createRazorpayOrder,
  fetchRazorpayPayment,
  issueRazorpayInvoice,
} from '../lib/razorpay.js';

const router = express.Router();

const VALID_PLANS = [
  'standalone_model',
  PLAN_KEYS.STANDALONE_ALL,
  PLAN_KEYS.STANDALONE_STANDARD,
  PLAN_KEYS.ALL_MODELS_PRO,
  'investor',
];

/**
 * Public payment gateway config (Key ID only — safe to expose).
 * GET /api/payments/config
 */
router.get('/config', (_req, res) => {
  const status = getRazorpayStatus();
  res.json({
    success: true,
    paymentsEnabled: status.configured || status.mockPaymentsAllowed,
    configured: status.configured,
    mode: status.mode,
    keyId: status.keyId,
    companyName: status.companyName,
    mockMode: status.mockPaymentsAllowed && !status.configured,
  });
});

/**
 * Create Razorpay Order
 * POST /api/payments/create-order
 */
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly', modelSlug } = req.body;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const status = getRazorpayStatus();
    if (!status.configured && !status.mockPaymentsAllowed) {
      return res.status(503).json({
        error: 'Payment gateway not configured. Add Razorpay credentials to backend .env',
      });
    }

    const user = req.user;

    let orderPricing;
    try {
      orderPricing = await resolveOrderAmount({ plan, billingCycle, modelSlug });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const {
      amount,
      billingCycle: resolvedCycle,
      planName,
      modelSlug: resolvedSlug,
      userPlanOnSuccess,
    } = orderPricing;

    const razorpay = await getRazorpayClient();
    const razorpayCustomerId = await ensureRazorpayCustomer(razorpay, user, prisma);

    const orderOptions = {
      amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${user.id.slice(0, 8)}`,
      notes: {
        userId: user.id,
        plan,
        billingCycle: resolvedCycle,
        modelSlug: resolvedSlug || '',
        userEmail: user.email,
      },
    };

    if (razorpayCustomerId) {
      orderOptions.customer_id = razorpayCustomerId;
    }

    const order = await createRazorpayOrder(razorpay, orderOptions);

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        amount,
        currency: 'INR',
        status: 'created',
        plan,
        billingCycle: resolvedCycle,
        modelSlug: resolvedSlug,
        metadata: JSON.stringify({
          planName,
          userPlanOnSuccess,
          receipt: order.receipt,
        }),
      },
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      key: getPublicKeyId() || 'rzp_test_mock_key',
      paymentId: payment.id,
      mockMode: !isRazorpayConfigured(),
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({
      error: 'Failed to create order',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

/**
 * Verify Payment
 * POST /api/payments/verify
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_id,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !payment_id) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    const user = req.user;

    const payment = await prisma.payment.findFirst({
      where: {
        id: payment_id,
        userId: user.id,
        razorpayOrderId: razorpay_order_id,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    if (payment.status === 'paid') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        plan: payment.plan,
      });
    }

    const razorpay = await getRazorpayClient();

    if (razorpay) {
      if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      try {
        const razorpayPayment = await fetchRazorpayPayment(razorpay, razorpay_payment_id);
        if (razorpayPayment.status !== 'captured') {
          return res.status(400).json({
            error: 'Payment not captured',
            status: razorpayPayment.status,
          });
        }
      } catch (err) {
        console.error('Failed to fetch payment from Razorpay:', err.message);
      }
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Payment gateway not configured' });
    } else {
      console.warn('Mock payment verification (no Razorpay keys)');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        updatedAt: new Date(),
      },
    });

    const activation = await applyPaymentToUser(user.id, payment);

    // Best-effort invoice
    if (razorpay && user.razorpayCustomerId) {
      const meta = payment.metadata ? JSON.parse(payment.metadata) : {};
      const invoice = await issueRazorpayInvoice(razorpay, {
        customerId: user.razorpayCustomerId,
        amountPaise: payment.amount,
        planName: meta.planName || payment.plan,
        billingCycle: payment.billingCycle,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });

      if (invoice) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            metadata: JSON.stringify({
              ...meta,
              razorpayInvoiceId: invoice.id,
              invoiceShortUrl: invoice.shortUrl,
            }),
          },
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      plan: activation.plan,
      billingCycle: payment.billingCycle,
      subscriptionEnd: activation.subscriptionEnd,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({
      error: 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

/**
 * Get Payment History
 * GET /api/payments/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        plan: true,
        billingCycle: true,
        createdAt: true,
        razorpayPaymentId: true,
      },
    });

    const formattedPayments = payments.map((p) => ({
      ...p,
      amount: p.amount / 100,
      amountDisplay: `₹${(p.amount / 100).toFixed(2)}`,
      date: p.createdAt.toISOString().split('T')[0],
    }));

    res.json({ success: true, payments: formattedPayments });
  } catch (err) {
    console.error('Get payment history error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

/**
 * Get Invoices
 * GET /api/payments/invoices
 */
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const razorpay = await getRazorpayClient();

    let razorpayInvoices = [];
    if (razorpay && user.razorpayCustomerId) {
      try {
        const invoices = await razorpay.invoices.fetchAll({
          customer_id: user.razorpayCustomerId,
        });
        razorpayInvoices = invoices.items || [];
      } catch (err) {
        console.error('Failed to fetch invoices from Razorpay:', err.message);
      }
    }

    const payments = await prisma.payment.findMany({
      where: { userId: user.id, status: 'paid' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        plan: true,
        billingCycle: true,
        createdAt: true,
        razorpayPaymentId: true,
        razorpayOrderId: true,
        metadata: true,
      },
    });

    const invoices = payments.map((payment, index) => {
      const meta = payment.metadata ? JSON.parse(payment.metadata) : {};
      const razorpayInvoice = razorpayInvoices.find(
        (inv) => inv.id === meta.razorpayInvoiceId || inv.order_id === payment.razorpayOrderId
      );

      return {
        id: payment.id,
        invoiceNumber: `INV-${new Date(payment.createdAt).getFullYear()}-${String(index + 1).padStart(4, '0')}`,
        date: payment.createdAt.toISOString().split('T')[0],
        amount: payment.amount / 100,
        currency: payment.currency,
        plan: payment.plan,
        billingCycle: payment.billingCycle,
        status: payment.status,
        description: meta.planName || payment.plan,
        razorpayInvoiceId: meta.razorpayInvoiceId || razorpayInvoice?.id || null,
        downloadUrl: meta.invoiceShortUrl || razorpayInvoice?.short_url || null,
      };
    });

    res.json({ success: true, invoices });
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * Download Invoice
 * GET /api/payments/invoices/:id/download
 */
router.get('/invoices/:id/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const payment = await prisma.payment.findFirst({
      where: { id, userId: user.id, status: 'paid' },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const meta = payment.metadata ? JSON.parse(payment.metadata) : {};

    if (meta.invoiceShortUrl) {
      return res.json({
        success: true,
        downloadUrl: meta.invoiceShortUrl,
        invoiceId: meta.razorpayInvoiceId,
      });
    }

    const razorpay = await getRazorpayClient();
    if (razorpay && user.razorpayCustomerId) {
      try {
        const invoices = await razorpay.invoices.fetchAll({
          customer_id: user.razorpayCustomerId,
        });
        const razorpayInvoice = invoices.items?.find(
          (inv) => inv.order_id === payment.razorpayOrderId || inv.id === meta.razorpayInvoiceId
        );
        if (razorpayInvoice?.short_url) {
          return res.json({
            success: true,
            downloadUrl: razorpayInvoice.short_url,
            invoiceId: razorpayInvoice.id,
          });
        }
      } catch (err) {
        console.error('Failed to fetch Razorpay invoice:', err.message);
      }
    }

    const invoiceData = {
      invoiceNumber: `INV-${new Date(payment.createdAt).getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`,
      date: payment.createdAt.toISOString().split('T')[0],
      customer: { name: user.name, email: user.email },
      items: [
        {
          description: meta.planName || payment.plan,
          billingCycle: payment.billingCycle,
          amount: payment.amount / 100,
        },
      ],
      subtotal: payment.amount / 100,
      tax: 0,
      total: payment.amount / 100,
      currency: payment.currency,
    };

    res.json({ success: true, invoiceData });
  } catch (err) {
    console.error('Download invoice error:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

/**
 * Get Current Subscription Status
 * GET /api/payments/subscription
 */
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        razorpayCustomerId: true,
      },
    });

    const now = new Date();
    let isActive = user.subscriptionStatus === 'active';

    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < now) {
      isActive = false;
      if (user.subscriptionStatus !== 'expired') {
        await prisma.user.update({
          where: { id: req.user.id },
          data: { subscriptionStatus: 'expired' },
        });
      }
    }

    res.json({
      success: true,
      subscription: {
        plan: user.plan,
        status: isActive ? user.subscriptionStatus : 'expired',
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        isActive,
        daysRemaining: user.subscriptionEnd
          ? Math.max(0, Math.ceil((new Date(user.subscriptionEnd) - now) / (1000 * 60 * 60 * 24)))
          : 0,
      },
    });
  } catch (err) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * Cancel Subscription
 * POST /api/payments/cancel
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (user.subscriptionStatus !== 'active') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    const razorpay = await getRazorpayClient();
    if (razorpay && user.subscriptionId) {
      try {
        await razorpay.subscriptions.cancel(user.subscriptionId, { cancel_at_cycle_end: 1 });
      } catch (err) {
        console.error('Razorpay subscription cancel failed:', err.message);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'cancelled' },
    });

    res.json({
      success: true,
      message: 'Subscription cancelled. You will have access until the end of your billing period.',
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
