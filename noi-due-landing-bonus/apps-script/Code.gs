// Incolla questo file così com'è in Google Apps Script (Estensioni > Apps Script).
// Non serve modificare nulla: il secret è già quello di .env.example.

const SHARED_SECRET = 'N2rCizt9mx7G2NqqH9EpvqGUqASwYLvF';
const SHEET_NAME = 'Lead';
const HEADERS = ['Data', 'Nome', 'Cognome', 'Email', 'Libro', 'Consenso', 'Invii', 'Ultimo invio'];
const COL_EMAIL = 4;
const COL_INVII = 7;
const COL_ULTIMO = 8;

function doPost(e) {
  let lock = null;
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data || data.secret !== SHARED_SECRET) {
      return out_({ ok: false, error: 'non autorizzato' });
    }
    const nome = String(data.nome || '').trim();
    const cognome = String(data.cognome || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const libro = String(data.libro || '').trim();
    if (!nome || !cognome || data.consenso !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return out_({ ok: false, error: 'dati non validi' });
    }

    lock = LockService.getScriptLock();
    lock.waitLock(20000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }

    const now = new Date();
    const last = sheet.getLastRow();
    let row = -1;
    if (last > 1) {
      const emails = sheet.getRange(2, COL_EMAIL, last - 1, 1).getValues();
      for (let i = 0; i < emails.length; i++) {
        if (String(emails[i][0]).trim().toLowerCase() === email) { row = i + 2; break; }
      }
    }

    if (row === -1) {
      sheet.appendRow([now, nome, cognome, email, libro, 'Sì', 1, now]);
    } else {
      const count = Number(sheet.getRange(row, COL_INVII).getValue()) || 1;
      sheet.getRange(row, 2).setValue(nome);
      sheet.getRange(row, 3).setValue(cognome);
      sheet.getRange(row, COL_INVII).setValue(count + 1);
      sheet.getRange(row, COL_ULTIMO).setValue(now);
    }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (e2) {} }
  }
}

function doGet() {
  return out_({ ok: true, info: 'attivo' });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
