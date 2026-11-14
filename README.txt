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
Production Deployment Training Program (students deploy their own existing project)
Starts: 18 November 2026
Timing: 8 PM–10 PM IST
Duration: 10 days, 20 hours
Mode: Live online
Fee: ₹999 (shown with ₹4,999 crossed out, 80% OFF)
Recordings: Included
Certificate: After completion
Trainers: listed in public/data/trainer.json

LANDING PAGE SECTIONS (public/index.html, in this order; styles for them are in public/sections.css)
01 hero · 02 logo slider · 03 why join (#why) · 04 what you deploy (#deploy) · 05 localhost vs production
(#compare) · 06 who should join (#audience) · 07 technologies (#technologies) · 08 10-day roadmap (#roadmap)
· 09 deliverables and prerequisites (#deliverables) · 10 trainers (#trainers) · 11 testimonials (#reviews)
· 12 certificate (#certificate) · 13 why deployment matters (#matters) · 14 about (#about) · 15 FAQ (#faq)
· 16 final registration (#register).
Section text is written in index.html so search engines read it without JavaScript. To change the FAQ,
edit the .faq-item blocks; the FAQ data for search engines is built from them automatically.

TRAINERS (public/data/trainer.json, photo in public/assets/trainer/)
  "photo"    file name in public/assets/trainer/
  "intro"    the paragraph under the heading
  "trainers" list of { "name", "role", "bio" }; an empty role or bio is not shown.
Only add experience and qualifications that are true.

=====================================================================
TRUST, SOCIAL PROOF, ADMISSION INFO AND LOGO SLIDER
=====================================================================
(There is no README.md in this project; this file, README.txt, is the project README.)
These parts are plain HTML/CSS/JS that read JSON files. No build step, no new dependencies.
The JSON files are loaded with fetch(), so preview with `netlify dev` or any local server
(for example `python -m http.server` inside public/). Double-clicking index.html will not load them.
If a file is missing or invalid, its section simply stays hidden; the rest of the page is unaffected.

NEW FILES
public/trust.js               Builds the trust banner, admission panel and review cards.
public/trust.css              Styles for those three.
public/logo-slider.js         Builds the two-row logo slider.
public/logo-slider.css        Styles and keyframes for the slider.
public/data/site-config.json  Student count, rating, admission dates and timing.
public/data/testimonials.json Student testimonials.
public/data/logos.json        The logo list (name, category, row, order, local path, source URL, alt text, size).
public/assets/logos/<category>/  The logo image files (companies, marketing, productivity, accounting,
                              development, cloud, infrastructure, ai).
public/assets/testimonials/   Student photos.
LOGO_SOURCES.md               Every logo's local path, direct source URL and licence, plus what could not be sourced.
Changed: public/index.html only. It gained two stylesheet links, two script tags, a trust bar above the
header, an admission section after the hero, a logo slider section after the technologies list, and a
student reviews section before the register section. Existing sections and the payment flow were not changed.

DATA FLOW
index.html loads trust.js and logo-slider.js (deferred). trust.js fetches data/site-config.json and
data/testimonials.json and fills the empty mount points #trustBar, #admission and #reviews.
logo-slider.js fetches data/logos.json when the slider is about to scroll into view and fills #logoRows.
All text is inserted with textContent (never innerHTML) and only https:// links are accepted.

STUDENT TESTIMONIALS (public/data/testimonials.json)
Shown as a carousel of large cards (photo in layered blobs, quote, name with accent bar), one card per
slide, with arrow buttons, swipe and keyboard scrolling. One object per student:
  {
    "id": "asha-rao",                    unique id
    "name": "Student Name",              required
    "designation": "Software Developer", shown under the name
    "photo": "asha-rao.jpg",             file in public/assets/testimonials/ (.jpg .jpeg .png .webp .avif)
    "review": "Their own words.",        required
    "rating": 5,                         1-5 stars, or null for none
    "course": "Production Deployment Training Program",
    "video": "https://...",              optional https link, shows "Watch video review"
    "active": true,                      false hides it without deleting it
    "order": 1                           lower numbers come first
  }
- Add/edit/delete/reorder by editing the list. No active entries hides the whole section.
- Photos: square, about 400x400 px. No photo, or a missing file, shows the first letter of the name.
- NOTE: the file currently holds THREE placeholder entries ("Student Name", placeholder text). Replace them
  with genuine reviews (with the student's permission) or set "active": false before relying on them.

REGISTRATION COUNTDOWN (public/countdown.js, public/countdown.css)
Every element with data-countdown counts to "countdown.deadline" in site-config.json (one place):
  "countdown": { "deadline": "2026-11-18T12:00:00+05:30", "dateLabel": "18 November 2026 · 12:00 PM IST",
                 "heading": "Registration Closing Soon", "closedHeading": "Registration closed",
                 "closedText": "..." }
It recalculates from the clock every second, stops at 00, then shows the closed text, hides the admission
panel and makes every Pay button show the closed message instead of the form.
Server side: set REGISTRATION_CLOSES_AT to the same time (e.g. 2026-11-18T12:00:00+05:30) in .env and in the
Netlify/Vercel environment variables; after it, /api/pay refuses new orders (410). Unset = always open.
For a new batch, change both values.

INVOICE (lib/invoice-template.mjs, lib/receipt-pdf.mjs)
NFskills design; the editable source is integrations/invoice-design.html (render it at exactly 1055x1491 px,
save as JPEG, base64 it into TEMPLATE_JPEG). Shows invoice no. (NF/INV/<year>/<id>), date, Razorpay payment
ID, PAID status, student name and phone, Billed By NFskills, Mumbai - 400088, India, the course line and the
verified amount. No GST row. Check the tax treatment with your accountant before relying on it.

TRUST INDICATORS (public/data/site-config.json)
  "studentCount": "10,000+"      Text in the top banner: "Trusted by 10,000+ Students". "" hides it.
  "rating": {
    "show": true,                Master switch for the "Rated 4.9/5 ★★★★★" pill. false hides it.
    "value": 4.9,                Rating from 0 to 5.
    "reviewCount": null,         Optional: your real number of reviews; added to the screen-reader label.
    "source": "Google reviews",  Used in the screen-reader label alongside reviewCount.
    "sourceUrl": ""              Optional https link to your public reviews page; makes the pill a link.
  }
The rating pill shows next to the student count whenever show is true and value is between 0 and 5.
The student count and the rating are claims you supply; keep them accurate.

ADMISSION INFO (public/data/site-config.json)
  "admission": {
    "startDate": null,   YYYY-MM-DD, or null.
    "closeDate": null,           YYYY-MM-DD, or null. Never shown once it is in the past.
    "timing": "8:00 PM – 10:00 PM IST, live online",
    "status": "",                "" = automatic. Or force: "open", "upcoming", "closed", "waitlist".
    "deadlineWarningDays": 7
  }
How the status is worked out (with the date in India, IST) when status is "":
  today is before startDate             -> "Opens <start date>" (upcoming)
  closeDate is set and already passed   -> "Admissions closed"
  otherwise                             -> "Admissions open"
Labels: "Admission starts" (future) or "Admission started" (past); "Admission closes" only while closeDate
has not passed. An "Admissions close in N days" notice appears only when a real closeDate is within
deadlineWarningDays days ("close today" on the day). Nothing urgent is shown without a real date.
These values do NOT change the hard-coded text elsewhere in index.html (announcement bar, hero "Starts"
row, register box, FAQ, structured data). Update those by hand for a new batch.

LOGO SLIDER (public/data/logos.json, public/assets/logos/)
- Two rows. Row 1 moves right to left, row 2 left to right. Each loops with no gap: the list is repeated
  once and the track moves by exactly half its width. Both rows move at the same speed (45 px per second,
  PX_PER_SECOND in logo-slider.js).
- Hovering a row pauses only that row (CSS animation-play-state: paused); leaving resumes from the same spot.
  On touch screens, holding a row pauses it and releasing resumes it.
- prefers-reduced-motion: the animation stops and the row becomes a manually scrollable strip.
- Images load only when the slider is about to scroll into view. Every image has width/height, so nothing shifts.
- A logo entry:
  { "id": "ibm", "name": "IBM", "category": "companies", "type": "logo",
    "src": "assets/logos/companies/ibm.svg", "sourceUrl": "https://...", "alt": "IBM logo",
    "order": 1, "row": 1, "width": 100, "height": 40 }
  type is "logo" for brands or "concept" for generic icons. row is 1 or 2. order sets the sequence.
  width/height are the image's natural size (the viewBox for SVG); only the ratio matters.
- To add a logo: save a transparent SVG or PNG in the matching folder under public/assets/logos/, add an
  entry to logos.json, and add a line to LOGO_SOURCES.md. Prefer SVG; keep PNGs small (under about 20 KB).
- The company logos are illustrative, and the page shows a note that they imply no partnership or
  endorsement. Keep that note. Seven requested company logos could not be sourced (see LOGO_SOURCES.md).

IMAGES
Use SVG for logos, or PNG/WebP/AVIF with a transparent background. Student photos: JPG or WebP, square,
about 400x400 px, under about 30 KB. The trainer photo is public/assets/trainer/trainer-900.webp (900 px
wide). The old images/Banner.png and images/face.png are no longer used by the page.

SAMPLE COMPLETE site-config.json
  {
    "studentCount": "10,000+",
    "rating": { "show": true, "value": 4.9, "reviewCount": 120, "source": "Google reviews",
                "sourceUrl": "https://g.page/r/your-listing" },
    "admission": { "startDate": "2026-12-01", "closeDate": "2026-12-05",
                   "timing": "8:00 PM – 10:00 PM IST, live online",
                   "status": "", "deadlineWarningDays": 7 }
  }

TROUBLESHOOTING
- Banner, admission panel or reviews do not appear: you opened index.html by double-clicking. Use a local server.
- Reviews section missing: testimonials.json is empty or has a JSON error (a missing comma or quote).
  Check it in your editor or at jsonlint.com.
- Rating chip missing: set rating.show to true and reviewCount to a number above 0.
- A photo does not show: the name in "photo" must match the file in public/assets/testimonials/ exactly
  (including capitals) and end in .jpg/.jpeg/.png/.webp/.avif. The first letter shows until it is fixed.
- A link does not show: it must start with https://.
- Logo slider missing: check logos.json for JSON errors. It appears when you scroll near it.
- A logo is blank: the path in "src" does not match the file in public/assets/logos/.
- Slider not moving: your device has "reduce motion" turned on. This is intended.
- Changes not visible after deploying: hard-refresh (Ctrl+F5). The data files are fetched fresh, but files in
  public/images are cached for a year, so give a replaced image a new name.

CERTIFICATES AND THE ADMIN PAGE (/api/admin-login)
Open https://<your-site>/api/admin-login, sign in with the admin password, type the student's full name and the
date of issue, and the certificate downloads as an A4 landscape PDF named NFskills-Certificate-<Name>.pdf.
- Set ADMIN_PASSWORD (at least 12 characters, keep it private) in .env and in the Netlify/Vercel environment
  variables, then redeploy. Without it the page answers "Admin access is not set up".
- Names: 2-60 characters, English letters, spaces, dots, hyphens, apostrophes (the PDF font is Latin-only).
- Certificate ID: NF/CERT/<year>/<6 characters>, computed from the name and date, so re-issuing the same
  certificate gives the same ID. Nothing is stored; keep your own list of issued certificates.
- The page is not linked from the site, is marked noindex and is never cached. Each wrong password waits 1 s.
- Files: lib/admin.mjs (page + API), lib/certificate-pdf.mjs (drawing), lib/certificate-template.mjs
  (blank background), netlify/functions/admin-login.mjs and api/admin-login.mjs (routes).
- Design: integrations/certificate-design.html. Render #blank at 1600x1131 for lib/certificate-template.mjs and
  #watermark for public/assets/certificates/ (the website sample, covered in a small "NFskills" watermark).
  The batch line "Batch starting 18 November 2026" is part of the design; re-render it for a new batch.
