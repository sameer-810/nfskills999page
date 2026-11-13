PRODUCTION DEPLOYMENT ACCELERATOR — READY-TO-HOST WEBSITE

IMPORTANT: Plain HTML/CSS/JavaScript plus one small serverless payment function. No React, npm install, build step or dependencies are required.

FOLDERS:
public/          The website (index.html and images). Only this folder is served publicly.
lib/, api/, netlify/  The payment backend. Runs on the server only.
integrations/    The Google Sheet receiver to paste into Apps Script.
test/            Payment tests. Run with: node --test
.env             Your keys for local use. Never share or commit it.

HOW TO PREVIEW:
1. Extract the ZIP.
2. Open the public folder.
3. Double-click index.html. It opens in Chrome/Edge.
   Keep the images folder beside index.html.
   Payment needs the backend, so test it with `netlify dev` from the project folder.

RAZORPAY SETUP:
1. Get your keys: Razorpay Dashboard > Account & Settings > API Keys.
2. For local testing, put them in .env.
3. For the live website, .env is NOT uploaded. Add every value from .env in:
   Netlify: Site configuration > Environment variables
   Vercel: Project Settings > Environment Variables
4. Redeploy.

GOOGLE SHEET SETUP (needed once, takes about 3 minutes):
1. Open the sheet > Extensions > Apps Script.
2. Paste in everything from integrations/google-sheet.gs.
3. Replace PASTE_SHEET_WEBHOOK_SECRET_HERE with SHEET_WEBHOOK_SECRET from .env. Save.
4. Deploy > New deployment > type: Web app. Execute as: Me. Who has access: Anyone. Deploy and approve access.
5. Copy the Web app URL into SHEET_WEBHOOK_URL in .env and in your host's environment variables.
The headers are added automatically if the first tab is empty. Rows go to the first tab, and one payment can only ever add one row.

RAZORPAY WEBHOOK SETUP (retries the sheet if Google fails or a student closes the page):
1. Razorpay Dashboard > Account & Settings > Webhooks > Add New Webhook.
2. URL: https://YOUR-LIVE-SITE/api/pay?action=webhook
3. Secret: RAZORPAY_WEBHOOK_SECRET from .env. Active event: payment.captured.
Razorpay retries for 24 hours. If a sheet outage lasts longer, it emails you and disables the webhook; re-enable it in the Dashboard. Every paid order stays in Razorpay, so missing rows can be recovered from there.

TEST PAYMENTS:
Set PAYMENT_AMOUNT_RUPEES to any whole or decimal amount from 1 to 999. Students are then charged that amount, whatever the page shows.
Remove it and redeploy before opening real sales. Empty means the full fee of ₹999.

HOW TO HOST:
Netlify Drop (drag and drop) does not run the payment function. Use one of these:

NETLIFY:
From the project folder run: netlify deploy --prod
Or connect a Git repository. The publish folder is set in netlify.toml.

VERCEL:
From the project folder run: vercel --prod
Or import a Git repository. Choose Other as framework preset. Settings come from vercel.json.

PAYMENT RECORDS:
Student details are saved on the Razorpay order and appear under Notes on each order in Razorpay Dashboard > Transactions > Orders. The Google Sheet is a copy.
The fee is set once on the server: FEE_PAISE in lib/payments.mjs. Update it together with the prices shown in public/index.html.
Before a new cohort, update COURSE in the same file and WHATSAPP_GROUP_URL in your environment variables.

INVOICES:
A PDF invoice is created only after the backend confirms with Razorpay that the money was captured.
The design comes from the supplied PNG, stored in lib/invoice-template.mjs. Name, phone, invoice number, dates, course, amounts and payment IDs are printed from the real payment.
Set GSTIN in lib/payments.mjs once you have a real registration: invoices then show it, with 18% GST included in the price. While it is empty, invoices show no GSTIN and no tax.
Students can download an invoice again with Find my invoice: from the same browser, or anywhere using their phone number and Razorpay payment ID.

SEO AFTER GOING LIVE (these need the final domain):
1. In public/index.html add <link rel="canonical"> and absolute og:url and og:image tags, and change twitter:card to summary_large_image.
2. Add public/sitemap.xml and a Sitemap line in public/robots.txt.
3. Add the site in Google Search Console and submit the sitemap.
Files in public/images and public/fonts are cached for a year, so give a replaced file a new name.

WHATSAPP:
The WhatsApp buttons connect to +91 97690 73820.
The group invitation is kept in WHATSAPP_GROUP_URL (.env and your host), never in the code, and is only sent to the browser after a verified payment. If it is missing, customers are sent to the WhatsApp number above.

CONFIRMED COURSE DETAILS:
10-Day Production Deployment Accelerator
Starts: 7 November 2026
Timing: 8 PM–10 PM
Duration: 20 hours
Mode: Online
Fee: ₹999
Recordings: Included
Certificate: After completion
Trainers: Shakir Sir, Abdullah Sir, Sadiq Sir
