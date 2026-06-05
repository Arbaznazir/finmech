import crypto from 'crypto';

/** @type {import('razorpay').default | null} */
let client = null;

export function getRazorpayConfig() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '',
    companyName: process.env.RAZORPAY_COMPANY_NAME?.trim() || 'FinMech',
  };
}

export function isRazorpayConfigured() {
  const { keyId, keySecret } = getRazorpayConfig();
  return Boolean(keyId && keySecret);
}

export function isWebhookConfigured() {
  return Boolean(getRazorpayConfig().webhookSecret);
}

/** @returns {'test' | 'live' | 'mock'} */
export function getRazorpayMode() {
  const { keyId } = getRazorpayConfig();
  if (!keyId) return 'mock';
  if (keyId.startsWith('rzp_live_')) return 'live';
  return 'test';
}

export function getPublicKeyId() {
  return getRazorpayConfig().keyId;
}

export async function getRazorpayClient() {
  if (!isRazorpayConfigured()) return null;
  if (client) return client;

  const Razorpay = (await import('razorpay')).default;
  const { keyId, keySecret } = getRazorpayConfig();
  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret || !signature) return false;

  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  return expected === signature;
}

export function verifyWebhookSignature(rawBody, signature) {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret || !signature) return false;

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return expected === signature;
}

export async function ensureRazorpayCustomer(razorpay, user, prisma) {
  if (user.razorpayCustomerId) return user.razorpayCustomerId;
  if (!razorpay) return null;

  try {
    const customer = await razorpay.customers.create({
      name: user.name,
      email: user.email,
      notes: { userId: user.id },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { razorpayCustomerId: customer.id },
    });

    return customer.id;
  } catch (err) {
    console.error('Failed to create Razorpay customer:', err.message);
    return null;
  }
}

export async function createRazorpayOrder(razorpay, orderOptions) {
  if (!razorpay) {
    return {
      id: `order_mock_${Date.now()}`,
      amount: orderOptions.amount,
      currency: orderOptions.currency || 'INR',
      receipt: orderOptions.receipt,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  return razorpay.orders.create(orderOptions);
}

export async function fetchRazorpayPayment(razorpay, paymentId) {
  if (!razorpay) return { status: 'captured' };
  return razorpay.payments.fetch(paymentId);
}

/**
 * Issue a Razorpay invoice for a completed payment (best-effort).
 * Returns invoice id + short_url or null on failure.
 */
export async function issueRazorpayInvoice(razorpay, {
  customerId,
  amountPaise,
  planName,
  billingCycle,
  orderId,
  paymentId,
}) {
  if (!razorpay || !customerId) return null;

  const { companyName } = getRazorpayConfig();
  const cycleLabel =
    billingCycle === 'yearly'
      ? 'Annual'
      : billingCycle === 'one_time'
        ? 'One-time'
        : 'Monthly';

  try {
    const draft = await razorpay.invoices.create({
      type: 'invoice',
      description: `${planName} — ${cycleLabel}`,
      customer_id: customerId,
      currency: 'INR',
      line_items: [
        {
          name: planName,
          description: `FinMech ${cycleLabel} purchase`,
          amount: amountPaise,
          currency: 'INR',
          quantity: 1,
        },
      ],
      notes: {
        order_id: orderId,
        payment_id: paymentId,
        company: companyName,
      },
      sms_notify: 0,
      email_notify: 1,
    });

    const issued = await razorpay.invoices.issue(draft.id);
    return {
      id: issued.id,
      shortUrl: issued.short_url || null,
    };
  } catch (err) {
    console.error('Failed to issue Razorpay invoice:', err.message);
    return null;
  }
}

export function getRazorpayStatus() {
  const configured = isRazorpayConfigured();
  const mode = getRazorpayMode();

  return {
    configured,
    mode,
    webhookConfigured: isWebhookConfigured(),
    keyId: configured ? getPublicKeyId() : null,
    companyName: getRazorpayConfig().companyName,
    mockPaymentsAllowed: !configured && process.env.NODE_ENV !== 'production',
  };
}
