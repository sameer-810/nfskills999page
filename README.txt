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
public/images/testimonials/   Student photos.
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
A list with one object per student. An empty list [] hides the whole Student reviews section.
  {
    "name": "Student Name",
    "program": "10-Day Production Deployment Accelerator",
    "feedback": "What the student wrote, in their own words.",
    "rating": 5,
    "photo": "student-name.jpg",
    "googleReviewUrl": "https://g.page/r/...",
    "googleVerified": false,
    "linkedinUrl": "https://www.linkedin.com/in/...",
    "featured": false
  }
- Required: name and feedback. Everything else is optional; leave it out or use "" to hide it.
- featured: true puts the card first and full width.
- rating: a number from 1 to 5, drawn as stars. Leave it out to show no stars.
- Add: copy an object into the list (commas between objects). Edit: change the text. Remove: delete the object.
- Photos: put the image in public/images/testimonials/ and write only the file name in "photo".
  Allowed: .jpg .jpeg .png .webp .avif. Use a square image about 200x200 px (it is shown at 52x52).
  No photo, or a missing file, shows the first letter of the name instead.
- Google review: put the review link in googleReviewUrl. The "Verified on Google" badge appears only when
  googleVerified is true AND googleReviewUrl is set. Set it to true only after you opened that review on
  Google and confirmed it is real and belongs to that student. Otherwise keep false.
- LinkedIn: put the profile URL in linkedinUrl, only with the student's permission.
- Use only real feedback that the student gave you.
- NOTE: the file currently holds ONE entry named "Demo Student" (DEMO ONLY text). Replace or delete it
  before you go live.

TRUST INDICATORS (public/data/site-config.json)
  "studentCount": "10,000+"      Text in the top banner: "Trusted by 10,000+ Students". "" hides it.
  "rating": {
    "show": true,                Master switch for the "Rated 4.95/5 Stars" chip.
    "value": 4.95,               Rating from 0 to 5.
    "reviewCount": null,         Your real number of reviews behind the rating.
    "source": "Google reviews",  Used in the screen-reader label.
    "sourceUrl": ""              Optional https link to your public reviews page; makes the chip a link.
  }
The rating chip shows ONLY when show is true AND reviewCount is a number above 0. It is hidden now because
reviewCount is null. When you have genuine review data, enter the true value and count.
The student count is a claim you supply; keep it accurate.

ADMISSION INFO (public/data/site-config.json)
  "admission": {
    "startDate": "2026-11-07",   YYYY-MM-DD, or null.
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
about 200x200 px, under about 30 KB. The hero poster (images/Banner.png) and trainer photo (images/face.png)
are large (1.2 MB and 1.9 MB); converting them to WebP would speed up the page.

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
- "Verified on Google" missing: both googleVerified: true and googleReviewUrl must be set.
- A photo does not show: the name in "photo" must match the file in public/images/testimonials/ exactly
  (including capitals) and end in .jpg/.jpeg/.png/.webp/.avif. The first letter shows until it is fixed.
- A link does not show: it must start with https://.
- Logo slider missing: check logos.json for JSON errors. It appears when you scroll near it.
- A logo is blank: the path in "src" does not match the file in public/assets/logos/.
- Slider not moving: your device has "reduce motion" turned on. This is intended.
- Changes not visible after deploying: hard-refresh (Ctrl+F5). The data files are fetched fresh, but files in
  public/images are cached for a year, so give a replaced image a new name.
