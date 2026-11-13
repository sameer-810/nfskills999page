import { createHash, timingSafeEqual } from 'node:crypto';
import { certificatePdf, LATIN_NAME } from './certificate-pdf.mjs';

// GET /api/admin-login         -> the admin page
// POST ?action=login           -> { password } checks the password
// POST ?action=certificate     -> { password, name, date } returns the certificate PDF
// ADMIN_PASSWORD (12+ characters) must be set in the environment; without it everything returns 503.
const MIN_PASSWORD = 12;
const FAILED_LOGIN_DELAY_MS = 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const digest = (value) => createHash('sha256').update(String(value)).digest();
const json = (status, message) => Response.json({ success: status < 400, message }, { status, headers: { 'Cache-Control': 'no-store' } });

async function checkPassword(given) {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (expected.length < MIN_PASSWORD) return 503;
  if (typeof given === 'string' && timingSafeEqual(digest(given), digest(expected))) return 200;
  await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS)); // slows password guessing
  return 401;
}

function validDate(value) {
  if (!ISO_DATE.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) && value >= '2020-01-01' && value <= '2100-12-31';
}

export async function handleAdmin(req) {
  if (req.method === 'GET') {
    return new Response(PAGE, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
      },
    });
  }
  if (req.method !== 'POST') return json(405, 'Method not allowed.');
  const body = await req.json().catch(() => ({}));
  const status = await checkPassword(body.password);
  if (status === 503) return json(503, 'Admin access is not set up. Set ADMIN_PASSWORD (at least 12 characters) on the server.');
  if (status === 401) return json(401, 'Wrong password.');

  const action = new URL(req.url).searchParams.get('action');
  if (action === 'login') return json(200, 'Signed in.');
  if (action !== 'certificate') return json(404, 'Not found.');

  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
  if (!LATIN_NAME.test(name)) return json(422, 'Enter the full name (2-60 characters) using English letters, spaces, dots, hyphens or apostrophes.');
  if (!validDate(body.date)) return json(422, 'Choose a valid date.');
  const file = `NFskills-Certificate-${name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`;
  return new Response(certificatePdf({ name, isoDate: body.date }), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'private, no-store' },
  });
}

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>NFskills Admin</title><link rel="icon" href="/images/nfskills%20fav.png">
<style>
:root{--navy:#2C3556;--orange:#F69125;--accent:#004660;--lb:#EAF4FF;--lg:#F3F5FA;--text:#172B4D;--line:#dfe4ec}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--lg);font:16px/1.5 Arial,sans-serif;color:var(--text)}
main{width:100%;max-width:420px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px;box-shadow:0 10px 30px rgba(44,53,86,.1)}
header{display:flex;align-items:center;gap:12px;margin-bottom:18px}header img{width:48px;height:48px}
h1{margin:0;font-size:22px;color:var(--navy)}h1 small{display:block;font-size:14px;font-weight:400;color:#55647a}
label{display:block;margin:14px 0 6px;font-weight:700;color:var(--navy)}
input{width:100%;padding:11px 12px;border:1px solid #b9c3d1;border-radius:8px;font:inherit}input:focus{outline:2px solid var(--accent);outline-offset:1px}
button{width:100%;margin-top:20px;padding:12px;border:0;border-radius:8px;background:var(--orange);color:var(--navy);font:700 16px Arial,sans-serif;cursor:pointer}
button:disabled{opacity:.6;cursor:wait}.msg{margin:14px 0 0;padding:10px 12px;border-radius:8px}.bad{background:#fdecea;color:#b3261e}.good{background:#e7f6ec;color:#127a43}
.link{background:none;color:var(--accent);margin-top:12px;padding:6px;font-weight:400;text-decoration:underline}[hidden]{display:none!important}
</style></head><body><main>
<header><img src="/images/nfskills.png" alt=""><h1>NFskills Admin<small>Certificate generator</small></h1></header>
<form id="login"><label for="pw">Admin password</label><input id="pw" type="password" autocomplete="current-password" required><button>Sign in</button></form>
<form id="cert" hidden><label for="name">Student full name</label><input id="name" required minlength="2" maxlength="60" autocomplete="off" placeholder="As it should appear on the certificate">
<label for="date">Date of issue</label><input id="date" type="date" required><button>Download certificate (PDF)</button><button type="button" class="link" id="out">Sign out</button></form>
<p class="msg" id="msg" role="status" hidden></p>
</main><script>
var password = '', msg = document.getElementById('msg'), login = document.getElementById('login'), cert = document.getElementById('cert');
function say(text, kind) { msg.textContent = text; msg.className = 'msg ' + kind; msg.hidden = !text; }
function post(action, body) { return fetch('?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
document.getElementById('date').value = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
login.addEventListener('submit', function (e) {
  e.preventDefault(); var b = login.querySelector('button'), pw = document.getElementById('pw').value; b.disabled = true; say('');
  post('login', { password: pw }).then(function (r) { return r.json(); }).then(function (r) {
    if (r.success) { password = pw; login.hidden = true; cert.hidden = false; document.getElementById('name').focus(); } else say(r.message, 'bad');
  }).catch(function () { say('Server not reachable.', 'bad'); }).finally(function () { b.disabled = false; });
});
cert.addEventListener('submit', function (e) {
  e.preventDefault(); var b = cert.querySelector('button'), name = document.getElementById('name').value; b.disabled = true; say('Preparing certificate...', 'good');
  post('certificate', { password: password, name: name, date: document.getElementById('date').value }).then(function (r) {
    if (!r.ok) return r.json().then(function (j) { throw new Error(j.message); });
    var file = (r.headers.get('Content-Disposition') || '').split('filename="')[1] || 'certificate.pdf';
    return r.blob().then(function (blob) {
      var a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = file.replace('"', ''); document.body.append(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000); say('Downloaded certificate for ' + name.trim() + '.', 'good');
    });
  }).catch(function (err) { say(err.message || 'Could not create the certificate.', 'bad'); }).finally(function () { b.disabled = false; });
});
document.getElementById('out').addEventListener('click', function () { password = ''; cert.hidden = true; login.hidden = false; document.getElementById('pw').value = ''; say(''); });
</script></body></html>`;
