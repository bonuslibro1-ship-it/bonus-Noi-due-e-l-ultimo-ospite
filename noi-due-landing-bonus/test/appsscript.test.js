'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
const envEx = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');

function makeEnv() {
  const rows = []; // rows[0] = header
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: (r) => { rows.push(r.slice()); },
    setFrozenRows: () => {},
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push((rows[r - 1 + i] || [])[c - 1 + j]); o.push(row); } return o; },
      getValue: () => (rows[r - 1] || [])[c - 1],
      setValue: (v) => { rows[r - 1][c - 1] = v; },
    }),
  };
  let tab = null;
  const sandbox = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => (tab === n ? sheet : null), insertSheet: (n) => { tab = n; return sheet; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    JSON, String, Number, Date,
  };
  vm.createContext(sandbox);
  vm.runInContext(code + '\nthis.__SECRET = SHARED_SECRET; this.__doPost = doPost;', sandbox);
  const post = (obj) => JSON.parse(sandbox.__doPost({ postData: { contents: JSON.stringify(obj) } }).s);
  return { rows, post, secret: sandbox.__SECRET, getTab: () => tab };
}

test('il secret di Code.gs e di .env.example combaciano', () => {
  const m = envEx.match(/^APPS_SCRIPT_SECRET=(.+)$/m);
  assert.ok(m);
  const { secret } = makeEnv();
  assert.strictEqual(m[1].trim(), secret);
  assert.ok(secret.length >= 24 && secret !== '__SECRET__');
});

test('crea la scheda Lead con intestazione e la prima riga', () => {
  const e = makeEnv();
  const r = e.post({ secret: e.secret, nome: 'Anna', cognome: 'Rossi', email: 'Anna@Example.com', libro: 'L', consenso: true });
  assert.deepStrictEqual(r, { ok: true });
  assert.strictEqual(e.getTab(), 'Lead');
  assert.strictEqual(e.rows.length, 2);
  assert.strictEqual(e.rows[0][3], 'Email');
  assert.strictEqual(e.rows[1][3], 'anna@example.com');
  assert.strictEqual(e.rows[1][5], 'Sì');
  assert.strictEqual(e.rows[1][6], 1);
});

test('secret errato: rifiutato senza scrivere', () => {
  const e = makeEnv();
  const r = e.post({ secret: 'sbagliato', nome: 'A', cognome: 'B', email: 'a@b.it' });
  assert.strictEqual(r.ok, false); assert.strictEqual(e.rows.length, 0); assert.strictEqual(e.getTab(), null);
});

test('email duplicata: aggiorna la riga, non duplica', () => {
  const e = makeEnv();
  e.post({ secret: e.secret, nome: 'Anna', cognome: 'Rossi', email: 'anna@example.com', consenso: true });
  e.post({ secret: e.secret, nome: 'Anna Maria', cognome: 'Rossi', email: 'ANNA@example.com', consenso: true });
  assert.strictEqual(e.rows.length, 2);
  assert.strictEqual(e.rows[1][1], 'Anna Maria'); assert.strictEqual(e.rows[1][6], 2);
  e.post({ secret: e.secret, nome: 'Luca', cognome: 'Bianchi', email: 'luca@example.com', consenso: true });
  assert.strictEqual(e.rows.length, 3);
});

test('dati non validi: rifiutati', () => {
  const e = makeEnv();
  assert.strictEqual(e.post({ secret: e.secret, nome: '', cognome: 'B', email: 'a@b.it', consenso: true }).ok, false);
  assert.strictEqual(e.post({ secret: e.secret, nome: 'A', cognome: 'B', email: 'xx', consenso: true }).ok, false);
  assert.strictEqual(e.rows.length, 0);
});

test('senza consenso: rifiutato senza scrivere', () => {
  const e = makeEnv();
  assert.strictEqual(e.post({ secret: e.secret, nome: 'A', cognome: 'B', email: 'a@b.it' }).ok, false);
  assert.strictEqual(e.post({ secret: e.secret, nome: 'A', cognome: 'B', email: 'a@b.it', consenso: false }).ok, false);
  assert.strictEqual(e.rows.length, 0);
});
