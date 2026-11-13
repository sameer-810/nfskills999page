// Paste into the sheet: Extensions > Apps Script. Setup steps are in README.txt.
// Replace the value below with SHEET_WEBHOOK_SECRET from your .env file.
const SECRET = 'PASTE_SHEET_WEBHOOK_SECRET_HERE';
const HEADERS = ['Customer Name', 'Phone Number', 'Current Location', 'Amount Paid', 'Payment ID / Transaction ID', 'Payment Date', 'Payment Status', 'Invoice Number'];
const PAYMENT_ID_COLUMN = 5;

function reply(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    const { secret, paymentId, row } = JSON.parse(event.postData.contents);
    if (secret !== SECRET) return reply({ ok: false, error: 'unauthorized' });
    lock.waitLock(3000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    const ids = sheet.getRange(1, PAYMENT_ID_COLUMN, sheet.getLastRow()).getDisplayValues().flat();
    if (ids.includes(paymentId)) return reply({ ok: true, duplicate: true });
    // The leading apostrophe stores each value as text, so a name can never run as a formula.
    sheet.appendRow(row.map((value) => `'${value}`));
    return reply({ ok: true });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}
