import prisma from '../lib/prisma.js';
import { applyPaymentToUser } from '../lib/pricing.js';
import {
  verifyWebhookSignature,
  isWebhookConfigured,
  getRazorpayClient,
  issueRazorpayInvoice,
} from '../lib/razorpay.js';

async function markPaymentPaid(paymentRecord, razorpayPaymentId) {
  if (paymentRecord.status === 'paid') return;

  await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: {
      status: 'paid',
      razorpayPaymentId,
      updatedAt: new Date(),
    },
  });

  await applyPaymentToUser(paymentRecord.userId, paymentRecord);
}

async function maybeIssueInvoice(paymentRecord, razorpayPaymentId) {
  const meta = paymentRecord.metadata ? JSON.parse(paymentRecord.metadata) : {};
  if (meta.razorpayInvoiceId) return;

  const razorpay = await getRazorpayClient();
  if (!razorpay) return;

  const user = await prisma.user.findUnique({ where: { id: paymentRecord.userId } });
  if (!user?.razorpayCustomerId) return;

  const invoice = await issueRazorpayInvoice(razorpay, {
    customerId: user.razorpayCustomerId,
    amountPaise: paymentRecord.amount,
    planName: meta.planName || paymentRecord.plan,
    billingCycle: paymentRecord.billingCycle,
    orderId: paymentRecord.razorpayOrderId,
    paymentId: razorpayPaymentId,
  });

  if (!invoice) return;

  await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: {
      metadata: JSON.stringify({
        ...meta,
        razorpayInvoiceId: invoice.id,
        invoiceShortUrl: invoice.shortUrl,
      }),
    },
  });
}

/**
 * Razorpay Webhook — mounted with express.raw() so signature verification works.
 * POST /api/payments/webhook
 */
export async function handleRazorpayWebhook(req, res) {
  try {
    if (!isWebhookConfigured()) {
      console.warn('Razorpay webhook secret not configured');
      return res.status(503).json({ error: 'Webhook not configured' });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature' });
    }

    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    console.log('Razorpay webhook:', event.event);

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        const ourPayment = await prisma.payment.findFirst({
          where: { razorpayOrderId: payment.order_id },
        });

        if (ourPayment) {
          await markPaymentPaid(ourPayment, payment.id);
          await maybeIssueInvoice(ourPayment, payment.id);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        await prisma.payment.updateMany({
          where: { razorpayOrderId: payment.order_id },
          data: { status: 'failed', updatedAt: new Date() },
        });
        break;
      }

      case 'order.paid': {
        const order = event.payload.order.entity;
        const ourPayment = await prisma.payment.findFirst({
          where: { razorpayOrderId: order.id },
        });
        if (ourPayment && ourPayment.status !== 'paid') {
          const paymentId = order.payments?.[0] || null;
          await markPaymentPaid(ourPayment, paymentId);
          if (paymentId) await maybeIssueInvoice(ourPayment, paymentId);
        }
        break;
      }

      case 'subscription.cancelled': {
        const subscription = event.payload.subscription.entity;
        const user = await prisma.user.findFirst({
          where: { subscriptionId: subscription.id },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: 'cancelled' },
          });
        }
        break;
      }

      case 'subscription.charged': {
        const subscription = event.payload.subscription.entity;
        const payment = event.payload.payment?.entity;
        const user = await prisma.user.findFirst({
          where: { subscriptionId: subscription.id },
        });
        if (user && payment) {
          const now = new Date();
          const end = new Date(now);
          if (subscription.plan_interval === 'yearly') {
            end.setFullYear(end.getFullYear() + 1);
          } else {
            end.setMonth(end.getMonth() + 1);
          }
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: 'active',
              subscriptionEnd: end,
            },
          });
        }
        break;
      }

      default:
        console.log('Unhandled Razorpay webhook event:', event.event);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.json({ received: true, error: err.message });
  }
}
