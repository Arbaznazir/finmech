import express from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Initialize Razorpay (will be initialized when keys are set)
let razorpay;
try {
  const Razorpay = (await import('razorpay')).default;
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (err) {
  console.warn('Razorpay not initialized - check environment variables');
}

// Plan pricing (in paise - ₹1 = 100 paise)
const PLAN_PRICING = {
  standard: {
    monthly: 9900,   // ₹99
    yearly: 99900,   // ₹999 (2 months free)
  },
  investor: {
    monthly: 19900,  // ₹199
    yearly: 199900,  // ₹1999 (2 months free)
  },
};

// Plan display names
const PLAN_NAMES = {
  standard: 'Standard Tool Package',
  investor: 'Investor Grade',
};

/**
 * Create Razorpay Order
 * POST /api/payments/create-order
 * Security: Authenticated users only
 */
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly' } = req.body;
    
    // Validate input
    if (!plan || !['standard', 'investor'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose standard or investor' });
    }
    
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle. Choose monthly or yearly' });
    }
    
    const user = req.user;
    const amount = PLAN_PRICING[plan][billingCycle];
    
    // Create or get Razorpay customer
    let razorpayCustomerId = user.razorpayCustomerId;
    
    if (!razorpayCustomerId && razorpay) {
      try {
        const customer = await razorpay.customers.create({
          name: user.name,
          email: user.email,
          notes: {
            userId: user.id,
          },
        });
        razorpayCustomerId = customer.id;
        
        // Save customer ID to user
        await prisma.user.update({
          where: { id: user.id },
          data: { razorpayCustomerId },
        });
      } catch (err) {
        console.error('Failed to create Razorpay customer:', err);
        // Continue without customer - order can still be created
      }
    }
    
    // Create order options
    const orderOptions = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}_${user.id.slice(0, 8)}`,
      notes: {
        userId: user.id,
        plan: plan,
        billingCycle: billingCycle,
        userEmail: user.email,
      },
    };
    
    // Add customer if available
    if (razorpayCustomerId) {
      orderOptions.customer_id = razorpayCustomerId;
    }
    
    // Create Razorpay order
    let order;
    if (razorpay) {
      order = await razorpay.orders.create(orderOptions);
    } else {
      // Mock order for testing without Razorpay keys
      order = {
        id: `order_${Date.now()}`,
        amount: amount,
        currency: 'INR',
        receipt: orderOptions.receipt,
        status: 'created',
        created_at: Date.now(),
      };
    }
    
    // Save payment record to database
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        amount: amount,
        currency: 'INR',
        status: 'created',
        plan: plan,
        billingCycle: billingCycle,
        metadata: JSON.stringify({
          planName: PLAN_NAMES[plan],
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
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
      paymentId: payment.id,
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
 * Security: Authenticated users only + Signature verification
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      payment_id // Our internal payment ID
    } = req.body;
    
    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !payment_id) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }
    
    const user = req.user;
    
    // Get payment record from database
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
    
    // If already paid, don't process again
    if (payment.status === 'paid') {
      return res.json({ 
        success: true, 
        message: 'Payment already verified',
        plan: payment.plan,
      });
    }
    
    let isValid = false;
    
    // Verify signature if Razorpay is configured
    if (razorpay && razorpay_signature && process.env.RAZORPAY_KEY_SECRET) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');
      
      isValid = expectedSignature === razorpay_signature;
      
      if (!isValid) {
        console.error('Signature verification failed', {
          expected: expectedSignature,
          received: razorpay_signature,
        });
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    } else {
      // Mock verification for testing
      console.warn('Razorpay not configured - accepting mock payment');
      isValid = true;
    }
    
    // Additional verification: Check payment status from Razorpay
    if (razorpay) {
      try {
        const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
        if (razorpayPayment.status !== 'captured') {
          return res.status(400).json({ 
            error: 'Payment not captured',
            status: razorpayPayment.status,
          });
        }
      } catch (err) {
        console.error('Failed to fetch payment from Razorpay:', err);
        // Continue with local verification if fetch fails
      }
    }
    
    // Calculate subscription dates
    const now = new Date();
    const subscriptionEnd = payment.billingCycle === 'yearly' 
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        updatedAt: new Date(),
      },
    });
    
    // Update user subscription
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: payment.plan,
        subscriptionStatus: 'active',
        subscriptionPlan: payment.plan,
        subscriptionStart: now,
        subscriptionEnd: subscriptionEnd,
      },
    });
    
    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      plan: payment.plan,
      billingCycle: payment.billingCycle,
      subscriptionEnd: subscriptionEnd,
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
 * Razorpay Webhook Handler
 * POST /api/payments/webhook
 * Security: Webhook signature verification
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!webhookSecret) {
      console.warn('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature' });
    }
    
    // Verify webhook signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    const event = req.body;
    
    console.log('Razorpay webhook received:', event.event);
    
    // Handle different event types
    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        
        // Find and update our payment record
        const ourPayment = await prisma.payment.findFirst({
          where: { razorpayOrderId: payment.order_id },
        });
        
        if (ourPayment && ourPayment.status !== 'paid') {
          await prisma.payment.update({
            where: { id: ourPayment.id },
            data: {
              status: 'paid',
              razorpayPaymentId: payment.id,
              updatedAt: new Date(),
            },
          });
          
          // Update user subscription
          const now = new Date();
          const subscriptionEnd = ourPayment.billingCycle === 'yearly'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          await prisma.user.update({
            where: { id: ourPayment.userId },
            data: {
              plan: ourPayment.plan,
              subscriptionStatus: 'active',
              subscriptionPlan: ourPayment.plan,
              subscriptionStart: now,
              subscriptionEnd: subscriptionEnd,
            },
          });
        }
        break;
      }
        
      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        
        await prisma.payment.updateMany({
          where: { razorpayOrderId: payment.order_id },
          data: {
            status: 'failed',
            updatedAt: new Date(),
          },
        });
        break;
      }
        
      case 'subscription.cancelled': {
        const subscription = event.payload.subscription.entity;
        
        // Find user by subscription ID
        const user = await prisma.user.findFirst({
          where: { subscriptionId: subscription.id },
        });
        
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: 'cancelled',
              // Keep plan until subscription end date
            },
          });
        }
        break;
      }
        
      default:
        console.log('Unhandled webhook event:', event.event);
    }
    
    // Always return 200 to acknowledge receipt
    res.json({ received: true });
    
  } catch (err) {
    console.error('Webhook error:', err);
    // Still return 200 to prevent retries
    res.json({ received: true, error: err.message });
  }
});

/**
 * Get Payment History
 * GET /api/payments/history
 * Security: Authenticated users only
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
    
    // Format amounts (convert from paise to rupees)
    const formattedPayments = payments.map(p => ({
      ...p,
      amount: p.amount / 100, // Convert to rupees
      amountDisplay: `₹${(p.amount / 100).toFixed(2)}`,
      date: p.createdAt.toISOString().split('T')[0],
    }));
    
    res.json({
      success: true,
      payments: formattedPayments,
    });
    
  } catch (err) {
    console.error('Get payment history error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

/**
 * Get Current Subscription Status
 * GET /api/payments/subscription
 * Security: Authenticated users only
 */
/**
 * Get Invoices
 * GET /api/payments/invoices
 * Security: Authenticated users only
 */
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch invoices from Razorpay if customer exists
    let razorpayInvoices = [];
    if (razorpay && user.razorpayCustomerId) {
      try {
        const invoices = await razorpay.invoices.fetchAll({
          customer_id: user.razorpayCustomerId,
        });
        razorpayInvoices = invoices.items || [];
      } catch (err) {
        console.error('Failed to fetch invoices from Razorpay:', err);
        // Continue with local data if fetch fails
      }
    }
    
    // Get local payment records with invoice data
    const payments = await prisma.payment.findMany({
      where: { 
        userId: user.id,
        status: 'paid',
      },
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
      },
    });
    
    // Combine and format invoice data
    const invoices = payments.map((payment, index) => {
      const razorpayInvoice = razorpayInvoices.find(
        (inv) => inv.order_id === payment.razorpayOrderId
      );
      
      return {
        id: payment.id,
        invoiceNumber: `INV-${new Date(payment.createdAt).getFullYear()}-${String(index + 1).padStart(4, '0')}`,
        date: payment.createdAt.toISOString().split('T')[0],
        amount: payment.amount / 100, // Convert to rupees
        currency: payment.currency,
        plan: payment.plan,
        billingCycle: payment.billingCycle,
        status: payment.status,
        description: `${payment.plan === 'standard' ? 'Standard Tool Package' : 'Investor Grade'} - ${payment.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        razorpayInvoiceId: razorpayInvoice?.id || null,
        downloadUrl: razorpayInvoice?.short_url || null,
      };
    });
    
    res.json({
      success: true,
      invoices,
    });
    
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * Download Invoice
 * GET /api/payments/invoices/:id/download
 * Security: Authenticated users only
 */
router.get('/invoices/:id/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        id: id,
        userId: user.id,
        status: 'paid',
      },
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // If Razorpay invoice exists, redirect to it
    if (razorpay && payment.razorpayPaymentId) {
      try {
        // Try to fetch invoice from Razorpay
        const invoices = await razorpay.invoices.fetchAll({
          customer_id: user.razorpayCustomerId,
        });
        
        const razorpayInvoice = invoices.items?.find(
          (inv) => inv.order_id === payment.razorpayOrderId
        );
        
        if (razorpayInvoice?.short_url) {
          return res.json({
            success: true,
            downloadUrl: razorpayInvoice.short_url,
            invoiceId: razorpayInvoice.id,
          });
        }
      } catch (err) {
        console.error('Failed to fetch Razorpay invoice:', err);
      }
    }
    
    // Generate local invoice if Razorpay invoice not available
    const invoiceData = {
      invoiceNumber: `INV-${new Date(payment.createdAt).getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`,
      date: payment.createdAt.toISOString().split('T')[0],
      customer: {
        name: user.name,
        email: user.email,
      },
      items: [
        {
          description: `${payment.plan === 'standard' ? 'Standard Tool Package' : 'Investor Grade'} Subscription`,
          billingCycle: payment.billingCycle,
          amount: payment.amount / 100,
        },
      ],
      subtotal: payment.amount / 100,
      tax: 0, // GST handling can be added here
      total: payment.amount / 100,
      currency: payment.currency,
    };
    
    res.json({
      success: true,
      invoiceData,
    });
    
  } catch (err) {
    console.error('Download invoice error:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

/**
 * Get Current Subscription Status
 * GET /api/payments/subscription
 * Security: Authenticated users only
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
    
    // Check if subscription is expired
    const now = new Date();
    let isActive = user.subscriptionStatus === 'active';
    
    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < now) {
      isActive = false;
      // Optionally update user status to expired
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
 * Security: Authenticated users only
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.subscriptionStatus !== 'active') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }
    
    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'cancelled',
      },
    });
    
    // Note: Actual cancellation of Razorpay subscription would go here
    // if using Razorpay's subscription API
    
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
