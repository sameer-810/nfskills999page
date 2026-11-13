import { TEMPLATE_HEIGHT, TEMPLATE_JPEG, TEMPLATE_WIDTH } from './invoice-template.mjs';

// A4 page whose background is the supplied invoice design; only transaction values are drawn on top.
// Helvetica only covers Latin-1, which is why lib/payments.mjs restricts student fields to it.
const PAGE_WIDTH = 595;
const SCALE = PAGE_WIDTH / TEMPLATE_WIDTH;
const PAGE_HEIGHT = TEMPLATE_HEIGHT * SCALE;
const NAVY = '0.1 0.12 0.17';
const WHITE = '1 1 1';
const VALUE_SIZE = 11.6;
const AMOUNT_SIZE = 12;
const NAME_SIZE = 10.9;

const pdfX = (x) => (x * SCALE).toFixed(2);
const pdfY = (y) => (PAGE_HEIGHT - y * SCALE).toFixed(2);
const pdfText = (value) => String(value).replace(/[\\()]/g, '\\$&');
const numberWidth = (value, size) => [...value].reduce((sum, c) => sum + (/\d/.test(c) ? 0.556 : 0.278), 0) * size;
const money = (paise) => (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const text = (x, y, value, { size = VALUE_SIZE, font = 'F1', color = NAVY } = {}) =>
  `${color} rg BT /${font} ${size} Tf ${pdfX(x)} ${pdfY(y)} Td (${pdfText(value)}) Tj ET`;

// Helvetica has no rupee sign, so it is drawn as strokes in the text's colour.
function rupee(x, y, size, color) {
  const point = (dx, dy) => `${(x + dx * size).toFixed(2)} ${(y + dy * size).toFixed(2)}`;
  return [
    `q ${color} RG ${(size * 0.09).toFixed(2)} w`,
    `${point(0, 0.7)} m ${point(0.5, 0.7)} l S`,
    `${point(0, 0.5)} m ${point(0.5, 0.5)} l S`,
    `${point(0.08, 0.7)} m ${point(0.5, 0.7)} ${point(0.5, 0.32)} ${point(0.08, 0.32)} c ${point(0.42, 0)} l S`,
    'Q',
  ].join('\n');
}

function amountRight(rightX, y, paise, { size = AMOUNT_SIZE, color = NAVY, symbol = false } = {}) {
  const value = money(paise);
  const width = numberWidth(value, size);
  const x = rightX * SCALE - width;
  const ops = [`${color} rg BT /F2 ${size} Tf ${x.toFixed(2)} ${pdfY(y)} Td (${value}) Tj ET`];
  if (symbol) ops.push(rupee(x - size * 0.85, Number(pdfY(y)), size, color));
  return ops.join('\n');
}

export function receiptPdf(invoice) {
  const { invoiceNo, invoiceDate, transactionId, amountPaise, course, contact, student } = invoice;
  const nameSize = Math.min(NAME_SIZE, 133 / (student.name.length * 0.55));
  const ops = [
    `q ${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT.toFixed(2)} 0 0 cm /Template Do Q`,
    text(804, 247, invoiceNo, { size: 10 }),
    text(803, 285, invoiceDate),
    text(803, 322, transactionId, { size: Math.min(10, 100 / (transactionId.length * 0.56)) }),
    text(258, 488, student.name, { size: nameSize }),
    text(258, 522, `+91 ${student.phone.slice(0, 5)} ${student.phone.slice(5)}`),
    text(163, 676, course.name, { size: 11.3, font: 'F2' }),
    text(163, 707, course.detail, { size: 11.2 }),
    amountRight(972, 689, amountPaise),
    amountRight(972, 779, amountPaise, { symbol: true }),
    amountRight(972, 832, amountPaise, { size: 16, color: WHITE, symbol: true }),
    text(86, 1242, contact, { size: 10.2, font: 'F2' }),
  ];
  const stream = ops.join('\n');

  const parts = [];
  const offsets = [];
  let length = 0;
  const write = (chunk) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'latin1');
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (body) => {
    offsets.push(length);
    write(`${offsets.length} 0 obj\n${body}\nendobj\n`);
  };

  write('%PDF-1.4\n');
  object('<< /Type /Catalog /Pages 2 0 R >>');
  object('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT.toFixed(2)}] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Template 7 0 R >> >> >>`);
  object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  object(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
  offsets.push(length);
  write(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${TEMPLATE_WIDTH} /Height ${TEMPLATE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${TEMPLATE_JPEG.length} >>\nstream\n`);
  write(TEMPLATE_JPEG);
  write('\nendstream\nendobj\n');

  const xrefAt = length;
  const entries = offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  write(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n${entries}`);
  write(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return Buffer.concat(parts);
}
