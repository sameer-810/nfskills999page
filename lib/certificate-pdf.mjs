import { createHash } from 'node:crypto';
import { CERT_HEIGHT, CERT_JPEG, CERT_WIDTH } from './certificate-template.mjs';
import { imagePdf } from './receipt-pdf.mjs';

// A4 landscape page whose background is the blank certificate; name, date and ID are drawn on top.
const PAGE_WIDTH = 842;
const SCALE = PAGE_WIDTH / CERT_WIDTH;
const PAGE_HEIGHT = CERT_HEIGHT * SCALE;
const NAVY = '0.173 0.208 0.337'; // #2C3556
const GREY = '0.333 0.392 0.478'; // #55647a
const NAME_MAX_WIDTH = 640; // template px, the width of the line under the name

// Helvetica-Bold advance widths (also used by Helvetica-BoldOblique) for ASCII 32-126, per 1000 units.
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722,
  667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611,
  389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
// Regular Helvetica is close to 0.556 per character for the ID line; it only needs to look centred.
const width = (value, size) => [...value].reduce((sum, c) => sum + (BOLD[c.charCodeAt(0) - 32] ?? 611), 0) / 1000 * size;

const pdfText = (value) => String(value).replace(/[\\()]/g, '\\$&');

// x is the centre of the text in template px; y its baseline.
function centred(x, y, value, size, font, color, measure = width) {
  const left = x * SCALE - measure(value, size) / 2;
  return `${color} rg BT /${font} ${size} Tf ${left.toFixed(2)} ${(PAGE_HEIGHT - y * SCALE).toFixed(2)} Td (${pdfText(value)}) Tj ET`;
}

export const LATIN_NAME = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]{1,59}$/;

// Same name and date always give the same ID, so a re-issued certificate matches the first one.
export function certificateId(name, isoDate) {
  const digest = createHash('sha256').update(`${name.toLowerCase()}|${isoDate}`).digest('hex').slice(0, 6).toUpperCase();
  return `NF/CERT/${isoDate.slice(0, 4)}/${digest}`;
}

export function certificatePdf({ name, isoDate }) {
  const date = new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const nameSize = Math.min(36, (NAME_MAX_WIDTH * SCALE) / (width(name, 1)));
  const ops = [
    centred(800, 566, name, Number(nameSize.toFixed(2)), 'F3', NAVY),
    centred(355, 895, date, 13.5, 'F2', NAVY),
    centred(800, 1067, `Certificate ID: ${certificateId(name, isoDate)}`, 9, 'F1', GREY, (v, s) => v.length * 0.53 * s),
  ];
  return imagePdf(PAGE_WIDTH, PAGE_HEIGHT, { width: CERT_WIDTH, height: CERT_HEIGHT, jpeg: CERT_JPEG }, ops.join('\n'));
}
