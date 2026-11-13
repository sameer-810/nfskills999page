// Run with: node --test
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { handleAdmin } from '../lib/admin.mjs';
import { certificateId } from '../lib/certificate-pdf.mjs';

const PASSWORD = 'correct-horse-battery';
const post = (action, body) => handleAdmin(new Request(`http://site.test/api/admin-login?action=${action}`, { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => { process.env.ADMIN_PASSWORD = PASSWORD; });

test('the admin page is served and kept out of search engines and caches', async () => {
  const res = await handleAdmin(new Request('http://site.test/api/admin-login'));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.match(await res.text(), /Certificate generator/);
});

test('nothing works until a strong ADMIN_PASSWORD is configured', async () => {
  delete process.env.ADMIN_PASSWORD;
  assert.equal((await post('login', { password: '' })).status, 503);
  process.env.ADMIN_PASSWORD = 'short';
  assert.equal((await post('login', { password: 'short' })).status, 503);
});

test('a wrong password gets no certificate', async () => {
  assert.equal((await post('login', { password: 'guess' })).status, 401);
  const res = await post('certificate', { password: 'guess', name: 'Asha Rao', date: '2026-11-25' });
  assert.equal(res.status, 401);
  assert.notEqual(res.headers.get('content-type'), 'application/pdf');
});

test('the right password produces a PDF with the name, date and a stable ID', async () => {
  assert.equal((await post('login', { password: PASSWORD })).status, 200);
  const res = await post('certificate', { password: PASSWORD, name: '  Asha   Rao ', date: '2026-11-25' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.match(res.headers.get('content-disposition'), /NFskills-Certificate-Asha-Rao\.pdf/);
  const pdf = Buffer.from(await res.arrayBuffer()).toString('latin1');
  for (const expected of ['%PDF-1.4', '(Asha Rao)', '(25 November 2026)', certificateId('Asha Rao', '2026-11-25')]) assert.ok(pdf.includes(expected), expected);
  assert.equal(certificateId('asha rao', '2026-11-25'), certificateId('Asha Rao', '2026-11-25'));
});

test('bad names and dates are refused', async () => {
  for (const [name, date] of [['A', '2026-11-25'], ['आशा', '2026-11-25'], ['Asha (Rao)', '2026-11-25'], ['Asha Rao', '2026-02-30'], ['Asha Rao', 'tomorrow']]) {
    assert.equal((await post('certificate', { password: PASSWORD, name, date })).status, 422, `${name} ${date}`);
  }
});
