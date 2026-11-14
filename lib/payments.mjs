import { createHmac, timingSafeEqual } from 'node:crypto';
import { receiptPdf } from './receipt-pdf.mjs';

const API = 'https://api.razorpay.com/v1';
const MIN_FEE_PAISE = 100;
const FEE_PAISE = 99900;
const CURRENCY = 'INR';
const COURSE = { name: 'Production Deployment Accelerated Training Program', detail: '10-Day Online Training | 20 Hours' };
const WHATSAPP_CONTACT_URL = 'https://wa.me/919769073820';
const CONTACT_NUMBER = '+91 97690 73820';
const MAX_ORDERS_PER_PHONE = 20;
const SHEET_TIMEOUT_MS = 4000;
const LATIN_TEXT = /^[\x20-\x7EÀ-ÿ]+$/;
const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,32}$/;
const ORDER_ID = /^order_[A-Za-z0-9]{6,32}$/;
const TIME_ZONE = 'Asia/Kolkata';

class HttpError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const json = (status, message, data = null, errors = null) =>
  Response.json({ success: status < 400, message, data, errors }, { status, headers: { 'Cache-Control': 'no-store' } });

const hmac = (value, key = process.env.RAZORPAY_KEY_SECRET) => createHmac('sha256', key).update(value).digest('hex');

function sameHex(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

// PAYMENT_AMOUNT_RUPEES is server-only, for test payments between ₹1 and ₹999. Unset means the full fee.
function currentFee() {
  const paise = Number(process.env.PAYMENT_AMOUNT_RUPEES) * 100;
  return Number.isInteger(paise) && paise >= MIN_FEE_PAISE && paise <= FEE_PAISE ? paise : FEE_PAISE;
}

async function razorpay(path, { method = 'GET', body } = {}) {
  const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret } = process.env;
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error?.description ?? `Razorpay responded ${res.status}`);
    error.razorpayStatus = res.status;
    throw error;
  }
  return data;
}

function parseStudent(input) {
  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const student = {
    name: clean(input.name),
    phone: clean(input.phone).replace(/[\s-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, ''),
    location: clean(input.location),
  };
  const errors = {};
  for (const [field, label] of [['name', 'full name'], ['location', 'current location']]) {
    if (student[field].length < 2 || student[field].length > 80) errors[field] = `Enter your ${label} (2-80 characters).`;
    else if (!LATIN_TEXT.test(student[field])) errors[field] = 'Please use English letters so it prints correctly on your invoice.';
  }
  if (!/^[6-9]\d{9}$/.test(student.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (Object.keys(errors).length) throw new HttpError(422, 'Please correct the highlighted fields.', errors);
  return student;
}

// Razorpay requires a unique receipt per order and a new order after a failed attempt, so
// each phone walks pda-<hash>-0, -1, ... until it reaches a paid, reusable or unused slot.
async function createOrder(student) {
  const phoneKey = hmac(`phone:${student.phone}`).slice(0, 16);
  const amount = currentFee();
  for (let attempt = 0; attempt < MAX_ORDERS_PER_PHONE; attempt += 1) {
    const receipt = `pda-${phoneKey}-${attempt}`;
    const { items } = await razorpay(`/orders?receipt=${receipt}`);
    const order = items.find((item) => item.receipt === receipt);
    if (!order) {
      try {
        return await razorpay('/orders', { method: 'POST', body: { amount, currency: CURRENCY, receipt, notes: student } });
      } catch (error) {
        if (error.razorpayStatus === 400) throw new HttpError(409, 'A payment for this number just started. Please wait a moment and try again.');
        throw error;
      }
    }
    if (order.status === 'paid') {
      throw new HttpError(409, 'This phone number has already paid. Use "Find my invoice" with your Razorpay payment ID.');
    }
    if (order.status === 'created' && order.amount === amount) {
      return razorpay(`/orders/${order.id}`, { method: 'PATCH', body: { notes: student } });
    }
    const { items: payments } = await razorpay(`/orders/${order.id}/payments`);
    if (payments.some((payment) => ['authorized', 'captured'].includes(payment.status))) {
      throw new HttpError(409, 'A payment for this number is already being processed. Please wait a few minutes before trying again.');
    }
  }
  throw new HttpError(429, 'Too many payment attempts for this number. Please contact us on WhatsApp.');
}

async function fetchPayment(paymentId) {
  if (!PAYMENT_ID.test(String(paymentId))) throw new HttpError(404, 'Payment not found.');
  try {
    return await razorpay(`/payments/${paymentId}`);
  } catch (error) {
    if (error.razorpayStatus === 400 || error.razorpayStatus === 404) throw new HttpError(404, 'Payment not found.');
    throw error;
  }
}

// The single gate for every invoice: Razorpay itself must report the money as captured for this order.
async function loadVerifiedPayment(payment) {
  const order = await razorpay(`/orders/${payment.order_id}`);
  const genuine = payment.status === 'captured' && payment.amount === order.amount && payment.currency === CURRENCY
    && order.amount >= MIN_FEE_PAISE && order.amount <= FEE_PAISE && order.notes?.phone;
  if (!genuine) throw new HttpError(402, 'This payment has not been completed.');
  const paidAt = new Date(payment.created_at * 1000);
  // Razorpay IDs start with a time prefix, so the random tail is the unique part.
  const shortId = payment.id.slice(-6).toUpperCase();
  return {
    invoiceNo: `NF/INV/${paidAt.toLocaleDateString('en-IN', { timeZone: TIME_ZONE, year: 'numeric' })}/${shortId}`,
    invoiceDate: paidAt.toLocaleDateString('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }),
    paymentDate: paidAt.toLocaleString('en-IN', { timeZone: TIME_ZONE, dateStyle: 'long', timeStyle: 'short' }),
    transactionId: payment.id,
    amountPaise: payment.amount,
    amount: `INR ${(payment.amount / 100).toFixed(2)}`,
    course: COURSE,
    contact: CONTACT_NUMBER,
    student: { name: order.notes.name, phone: order.notes.phone, location: order.notes.location },
  };
}

// The Apps Script receiver skips a payment ID it already has, so calling this twice is safe.
async function addToSheet(invoice) {
  const { SHEET_WEBHOOK_URL: url, SHEET_WEBHOOK_SECRET: secret } = process.env;
  if (!url) return;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    signal: AbortSignal.timeout(SHEET_TIMEOUT_MS),
    body: JSON.stringify({
      secret,
      paymentId: invoice.transactionId,
      row: [invoice.student.name, invoice.student.phone, invoice.student.location, (invoice.amountPaise / 100).toFixed(2),
        invoice.transactionId, invoice.paymentDate, 'PAID', invoice.invoiceNo],
    }),
  });
  const result = await res.json();
  if (!result.ok) throw new Error(`Sheet rejected the row: ${result.error}`);
}

const invoiceSummary = (invoice) => ({
  invoiceNo: invoice.invoiceNo,
  paymentId: invoice.transactionId,
  paymentDate: invoice.paymentDate,
  amount: invoice.amount,
  token: hmac(`receipt:${invoice.transactionId}`),
  groupUrl: process.env.WHATSAPP_GROUP_URL || WHATSAPP_CONTACT_URL,
});

async function verifyPayment({ orderId, paymentId, signature }) {
  if (!ORDER_ID.test(String(orderId)) || !PAYMENT_ID.test(String(paymentId))
    || !sameHex(hmac(`${orderId}|${paymentId}`), signature)) {
    throw new HttpError(400, 'Payment verification failed.');
  }
  let payment = await fetchPayment(paymentId);
  if (payment.order_id !== orderId) throw new HttpError(400, 'Payment verification failed.');
  if (payment.status === 'authorized') {
    const order = await razorpay(`/orders/${orderId}`);
    if (payment.amount === order.amount) {
      await razorpay(`/payments/${paymentId}/capture`, { method: 'POST', body: { amount: payment.amount, currency: CURRENCY } })
        .catch((error) => console.warn('Capture skipped, re-reading payment:', error.message));
      payment = await fetchPayment(paymentId);
    }
  }
  const invoice = await loadVerifiedPayment(payment);
  // A sheet failure must never cost the student their confirmation; the webhook retries it.
  await addToSheet(invoice).catch((error) => console.error('Sheet update failed for', paymentId, error.message));
  return invoiceSummary(invoice);
}

// Razorpay retries a failed webhook for 24 hours, which covers sheet outages and students who close the page.
async function handleWebhook(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const body = await req.text();
  if (!secret || !sameHex(hmac(body, secret), req.headers.get('x-razorpay-signature') ?? '')) {
    throw new HttpError(400, 'Invalid webhook signature.');
  }
  const event = JSON.parse(body);
  if (event.event !== 'payment.captured') return json(200, 'Ignored.');
  const payment = await fetchPayment(event.payload?.payment?.entity?.id);
  if (!payment.order_id) return json(200, 'Ignored.');
  const invoice = await loadVerifiedPayment(payment).catch((error) => {
    if (error instanceof HttpError) return null;
    throw error;
  });
  if (invoice) await addToSheet(invoice);
  return json(200, 'Processed.');
}

async function findInvoice({ paymentId, phone }) {
  const notFound = new HttpError(404, 'No completed payment matches those details.');
  const payment = await fetchPayment(paymentId).catch(() => { throw notFound; });
  const invoice = await loadVerifiedPayment(payment).catch(() => { throw notFound; });
  const digits = String(phone ?? '').replace(/\D/g, '').slice(-10);
  if (digits !== invoice.student.phone) throw notFound;
  return invoiceSummary(invoice);
}

async function downloadInvoice(url) {
  const paymentId = url.searchParams.get('payment_id') ?? '';
  if (!sameHex(hmac(`receipt:${paymentId}`), url.searchParams.get('token') ?? '')) throw new HttpError(403, 'Invalid invoice link.');
  const invoice = await loadVerifiedPayment(await fetchPayment(paymentId));
  return new Response(receiptPdf(invoice), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNo.replaceAll('/', '-')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

const readJson = (req) => req.json().catch(() => { throw new HttpError(400, 'Invalid request.'); });

export async function handle(req) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new HttpError(503, 'Online payment is not available right now. Please contact us on WhatsApp.');
    }
    const url = new URL(req.url);
    const route = `${req.method} ${url.searchParams.get('action')}`;
    if (route === 'POST order') {
      // Optional ISO time (e.g. 2026-11-18T12:00:00+05:30); unset or invalid keeps registration open.
      if (Date.parse(process.env.REGISTRATION_CLOSES_AT ?? '') <= Date.now()) {
        throw new HttpError(410, 'Registration for this batch has closed. Message us on WhatsApp to hear about the next batch.');
      }
      const order = await createOrder(parseStudent(await readJson(req)));
      return json(201, 'Order created.', { keyId: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency });
    }
    if (route === 'POST verify') return json(200, 'Payment verified.', await verifyPayment(await readJson(req)));
    if (route === 'POST find') return json(200, 'Invoice found.', await findInvoice(await readJson(req)));
    if (route === 'POST webhook') return await handleWebhook(req);
    if (route === 'GET receipt') return await downloadInvoice(url);
    throw new HttpError(404, 'Not found.');
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, error.message, null, error.errors);
    console.error('Payment API error:', error.message);
    return json(502, 'Payment service is unavailable. Please try again shortly.');
  }
}
