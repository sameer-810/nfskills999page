// Run with: node --test
// Razorpay is replaced by an in-memory fake at the fetch boundary, so every backend check runs for real.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { beforeEach, test } from 'node:test';
import { handle } from '../lib/payments.mjs';

const SECRET = 'test_secret_value';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = SECRET;

const student = { name: 'Asha Rao', phone: '9812345678', location: 'Pune, MH' };
const SHEET_URL = 'https://sheet.test/exec';
const WEBHOOK_SECRET = 'webhook_secret_value';
let orders;
let payments;
let sheet;
let sheetDown;

const reply = (status, body) => Response.json(body, { status });

beforeEach(() => {
  orders = new Map();
  payments = new Map();
  sheet = new Map();
  sheetDown = false;
  delete process.env.PAYMENT_AMOUNT_RUPEES;
  process.env.SHEET_WEBHOOK_URL = SHEET_URL;
  process.env.SHEET_WEBHOOK_SECRET = 'sheet_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/testinvite';
  globalThis.fetch = async (url, init = {}) => {
    if (url === SHEET_URL) {
      if (sheetDown) throw new Error('sheet offline');
      const { secret, paymentId, row } = JSON.parse(init.body);
      assert.equal(secret, 'sheet_secret');
      if (!sheet.has(paymentId)) sheet.set(paymentId, row);
      return reply(200, { ok: true });
    }
    const { pathname, searchParams } = new URL(url);
    const path = pathname.replace('/v1', '');
    const body = init.body ? JSON.parse(init.body) : null;
    const expectedAuth = `Basic ${Buffer.from(`rzp_test_key:${SECRET}`).toString('base64')}`;
    assert.equal(init.headers.Authorization, expectedAuth);
    if (path === '/orders' && init.method === 'POST') {
      if ([...orders.values()].some((order) => order.receipt === body.receipt)) return reply(400, { error: { description: 'duplicate receipt' } });
      const order = { id: `order_fake${orders.size}abc`, status: 'created', ...body };
      orders.set(order.id, order);
      return reply(200, order);
    }
    if (path === '/orders') {
      return reply(200, { items: [...orders.values()].filter((order) => order.receipt.includes(searchParams.get('receipt'))) });
    }
    const orderPayments = path.match(/^\/orders\/(.+)\/payments$/);
    if (orderPayments) return reply(200, { items: [...payments.values()].filter((p) => p.order_id === orderPayments[1]) });
    const orderMatch = path.match(/^\/orders\/(.+)$/);
    if (orderMatch) {
      const order = orders.get(orderMatch[1]);
      if (!order) return reply(400, { error: { description: 'no order' } });
      if (init.method === 'PATCH') order.notes = body.notes;
      return reply(200, order);
    }
    const capture = path.match(/^\/payments\/(.+)\/capture$/);
    if (capture) {
      const payment = payments.get(capture[1]);
      payment.status = 'captured';
      return reply(200, payment);
    }
    const paymentMatch = path.match(/^\/payments\/(.+)$/);
    if (paymentMatch) {
      const payment = payments.get(paymentMatch[1]);
      return payment ? reply(200, payment) : reply(400, { error: { description: 'no payment' } });
    }
    throw new Error(`unexpected Razorpay call ${path}`);
  };
});

const call = async (action, body) => {
  const res = await handle(new Request(`http://site.test/api/pay?action=${action}`, { method: 'POST', body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};
const order = (details = student) => call('order', details);

function pay(orderId, overrides = {}) {
  const id = `pay_fake${payments.size}abcdef`;
  const payment = { id, order_id: orderId, amount: 99900, currency: 'INR', status: 'captured', created_at: 1793000000, ...overrides };
  payments.set(id, payment);
  const stored = orders.get(orderId);
  if (stored && payment.status === 'captured') stored.status = 'paid';
  else if (stored) stored.status = 'attempted';
  return payment;
}
const sign = (orderId, paymentId) => createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const verify = (orderId, paymentId, signature = sign(orderId, paymentId)) => call('verify', { orderId, paymentId, signature });
const download = (paymentId, token) =>
  handle(new Request(`http://site.test/api/pay?action=receipt&payment_id=${paymentId}&token=${token}`));

test('missing and invalid details are rejected before any order exists', async () => {
  const { status, body } = await order({ name: ' ', phone: '12345', location: 'नागपुर' });
  assert.equal(status, 422);
  assert.deepEqual(Object.keys(body.errors).sort(), ['location', 'name', 'phone']);
  assert.equal(orders.size, 0);
});

test('the amount is fixed by the server and the student travels with the order', async () => {
  const { status, body } = await order({ ...student, phone: '+91 98123-45678', amount: 1 });
  assert.equal(status, 201);
  assert.equal(body.data.amount, 99900);
  assert.equal(JSON.stringify(body).includes(SECRET), false);
  assert.deepEqual(orders.get(body.data.orderId).notes, student);
});

test('successful flow produces an invoice with the real payment and student', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  const verified = await verify(body.data.orderId, payment.id);
  assert.equal(verified.status, 200);

  const res = await download(payment.id, verified.body.data.token);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  const pdf = Buffer.from(await res.arrayBuffer()).toString('latin1');
  assert.ok(pdf.startsWith('%PDF-1.4') && pdf.trimEnd().endsWith('%%EOF'));
  for (const expected of ['Asha Rao', '+91 98123 45678', '999.00', 'Production Deployment Accelerator', '+91 97690 73820', verified.body.data.invoiceNo]) {
    assert.ok(pdf.includes(expected), `PDF is missing ${expected}`);
  }
  for (const removed of [payment.id, body.data.orderId, 'Not provided', 'Email']) assert.equal(pdf.includes(removed), false, `PDF still shows ${removed}`);
  assert.match(res.headers.get('content-disposition'), /Invoice-AA-INV-\d{4}-[A-Z0-9]{6}.pdf/);
  assert.equal(verified.body.data.groupUrl.startsWith('https://chat.whatsapp.com/'), true);
  assert.deepEqual(sheet.get(payment.id), ['Asha Rao', '9812345678', 'Pune, MH', '999.00', payment.id, verified.body.data.paymentDate, 'PAID', verified.body.data.invoiceNo]);
});

test('authorized payments are captured by the backend before they count', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId, { status: 'authorized' });
  assert.equal((await verify(body.data.orderId, payment.id)).status, 200);
  assert.equal(payments.get(payment.id).status, 'captured');
});

test('a forged signature is refused even when the payment exists', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  assert.equal((await verify(body.data.orderId, payment.id, 'a'.repeat(64))).status, 400);
});

test('a signature for one order cannot be replayed with a payment from another', async () => {
  const first = await order();
  const paid = pay(first.body.data.orderId);
  const second = await order({ ...student, phone: '9123456780' });
  const forged = await verify(second.body.data.orderId, paid.id, sign(second.body.data.orderId, paid.id));
  assert.equal(forged.status, 400);
});

test('a failed payment gets no receipt and the student can retry with a new order', async () => {
  const first = await order();
  const failed = pay(first.body.data.orderId, { status: 'failed' });
  assert.equal((await verify(first.body.data.orderId, failed.id)).status, 402);

  const retry = await order();
  assert.equal(retry.status, 201);
  assert.notEqual(retry.body.data.orderId, first.body.data.orderId);
  assert.equal((await verify(retry.body.data.orderId, pay(retry.body.data.orderId).id)).status, 200);
});

test('a cancelled checkout reuses the open order with corrected details', async () => {
  const first = await order();
  const retry = await order({ ...student, name: 'Asha K Rao' });
  assert.equal(retry.body.data.orderId, first.body.data.orderId);
  assert.equal(orders.get(first.body.data.orderId).notes.name, 'Asha K Rao');
  assert.equal(orders.size, 1);
});

test('an underpaid payment is refused', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId, { amount: 100 });
  assert.equal((await verify(body.data.orderId, payment.id)).status, 402);
});

test('duplicate protection: repeat verify is stable and a paid phone cannot pay again', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  const once = await verify(body.data.orderId, payment.id);
  const twice = await verify(body.data.orderId, payment.id);
  assert.deepEqual(twice.body.data, once.body.data);

  const again = await order();
  assert.equal(again.status, 409);
  assert.equal(orders.size, 1);
});

test('an in-flight payment blocks a second order for the same phone', async () => {
  const { body } = await order();
  orders.get(body.data.orderId).status = 'attempted';
  pay(body.data.orderId, { status: 'authorized' });
  assert.equal((await order()).status, 409);
  assert.equal(orders.size, 1);
});

test('receipts need a valid token and stop working after a refund', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  const { token } = (await verify(body.data.orderId, payment.id)).body.data;
  assert.equal((await download(payment.id, 'b'.repeat(64))).status, 403);
  payment.status = 'refunded';
  assert.equal((await download(payment.id, token)).status, 402);
});

test('find my receipt needs the matching phone number', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  assert.equal((await call('find', { paymentId: payment.id, phone: '9000000000' })).status, 404);
  const found = await call('find', { paymentId: payment.id, phone: student.phone });
  assert.equal(found.status, 200);
  assert.equal((await download(payment.id, found.body.data.token)).status, 200);
});

test('a failed Razorpay call reports 502 without leaking details', async () => {
  globalThis.fetch = async () => reply(401, { error: { description: 'Authentication failed with key rzp_test_key' } });
  const { status, body } = await order();
  assert.equal(status, 502);
  assert.equal(JSON.stringify(body).includes('rzp_test_key'), false);
});

test('the whatsapp invite only comes back after verified payment', async () => {
  const { body } = await order();
  assert.equal(JSON.stringify(body).includes('chat.whatsapp.com'), false);
});

test('test prices from 1 to 999 rupees work and anything else falls back to the fee', async () => {
  process.env.PAYMENT_AMOUNT_RUPEES = '1';
  const { body } = await order();
  assert.equal(body.data.amount, 100);
  const payment = pay(body.data.orderId, { amount: 100 });
  assert.equal((await verify(body.data.orderId, payment.id)).body.data.amount, 'INR 1.00');

  for (const value of ['0', '1000', '1.555', 'free']) {
    process.env.PAYMENT_AMOUNT_RUPEES = value;
    assert.equal((await order({ ...student, phone: `900000000${value.length}` })).body.data.amount, 99900);
  }
});

test('an open order at an old price is not reused after the price changes', async () => {
  process.env.PAYMENT_AMOUNT_RUPEES = '1';
  const first = await order();
  delete process.env.PAYMENT_AMOUNT_RUPEES;
  const second = await order();
  assert.notEqual(second.body.data.orderId, first.body.data.orderId);
  assert.equal(second.body.data.amount, 99900);
});

const webhook = async (paymentId, { secret = WEBHOOK_SECRET, type = 'payment.captured' } = {}) => {
  const raw = JSON.stringify({ event: type, payload: { payment: { entity: { id: paymentId } } } });
  const res = await handle(new Request('http://site.test/api/pay?action=webhook', {
    method: 'POST',
    body: raw,
    headers: { 'x-razorpay-signature': createHmac('sha256', secret).update(raw).digest('hex') },
  }));
  return res.status;
};

test('a sheet outage never fails the student and the webhook retry fills the row', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  sheetDown = true;
  assert.equal((await verify(body.data.orderId, payment.id)).status, 200);
  assert.equal(sheet.size, 0);
  assert.equal(await webhook(payment.id), 502);

  sheetDown = false;
  assert.equal(await webhook(payment.id), 200);
  assert.equal(sheet.size, 1);
});

test('verify, repeat verify and webhook together leave one row per payment', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  await verify(body.data.orderId, payment.id);
  await verify(body.data.orderId, payment.id);
  await webhook(payment.id);
  assert.equal(sheet.size, 1);
});

test('the webhook covers a student who closed the page after paying', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  assert.equal(await webhook(payment.id), 200);
  assert.equal(sheet.get(payment.id)[4], payment.id);
});

test('webhooks with a bad signature or an unrelated event change nothing', async () => {
  const { body } = await order();
  const payment = pay(body.data.orderId);
  assert.equal(await webhook(payment.id, { secret: 'wrong' }), 400);
  assert.equal(await webhook(payment.id, { type: 'order.notification.delivered' }), 200);
  const unpaid = pay((await order({ ...student, phone: '9123456780' })).body.data.orderId, { status: 'failed' });
  assert.equal(await webhook(unpaid.id), 200);
  assert.equal(sheet.size, 0);
});
