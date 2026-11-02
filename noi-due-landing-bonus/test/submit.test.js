'use strict';
const test = require('node:test');
const assert = require('node:assert');
const handler = require('../api/submit.js');

function mkRes() {
  const r = { code: 200, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
const OK = { nome: 'Anna', cognome: 'Rossi', email: 'Anna@Example.com', consenso: true, sito: '' };
const BONUS = 'https://drive.example/BONUS_SEGRETO';
function env() {
  process.env.GOOGLE_SCRIPT_URL = 'https://script.example/exec';
  process.env.APPS_SCRIPT_SECRET = 'segreto-test';
  process.env.BONUS_DRIVE_URL = BONUS;
  delete process.env.BONUS_URL;
}
let calls;
function mockFetch(impl) { calls = []; global.fetch = async (u, o) => { calls.push([u, o]); return impl(u, o); }; }
const jsonOk = (b) => ({ ok: true, json: async () => b });

test('successo: restituisce il link solo dopo ok:true dello script', async () => {
  env(); mockFetch(() => jsonOk({ ok: true }));
  const res = mkRes(); await handler({ method: 'POST', body: OK }, res);
  assert.strictEqual(res.code, 200); assert.strictEqual(res.body.ok, true); assert.strictEqual(res.body.bonusUrl, BONUS);
  assert.strictEqual(calls.length, 1);
  const sent = JSON.parse(calls[0][1].body);
  assert.strictEqual(sent.email, 'anna@example.com'); assert.strictEqual(sent.secret, 'segreto-test');
});

test('script risponde ok:false: nessun link', async () => {
  env(); mockFetch(() => jsonOk({ ok: false }));
  const res = mkRes(); await handler({ method: 'POST', body: OK }, res);
  assert.strictEqual(res.code, 502); assert.ok(!JSON.stringify(res.body).includes('BONUS_SEGRETO'));
});

test('script irraggiungibile (fetch lancia): nessun link', async () => {
  env(); mockFetch(() => { throw new Error('rete'); });
  const res = mkRes(); await handler({ method: 'POST', body: OK }, res);
  assert.strictEqual(res.code, 502); assert.ok(!JSON.stringify(res.body).includes('BONUS_SEGRETO'));
});

test('risposta non JSON dallo script: nessun link', async () => {
  env(); mockFetch(() => ({ ok: true, json: async () => { throw new Error('html'); } }));
  const res = mkRes(); await handler({ method: 'POST', body: OK }, res);
  assert.strictEqual(res.code, 502); assert.ok(!JSON.stringify(res.body).includes('BONUS_SEGRETO'));
});

for (const [nome, body] of [
  ['email malformata', { ...OK, email: 'non-una-email' }],
  ['email senza dominio', { ...OK, email: 'a@b' }],
  ['nome vuoto', { ...OK, nome: '  ' }],
  ['cognome mancante', { nome: 'A', email: 'a@b.it' }],
  ['consenso mancante', { ...OK, consenso: undefined }],
  ['consenso false', { ...OK, consenso: false }],
  ['consenso stringa', { ...OK, consenso: 'true' }],
  ['body mancante', undefined],
]) {
  test('non valido (' + nome + '): non chiama lo script, nessun link', async () => {
    env(); mockFetch(() => jsonOk({ ok: true }));
    const res = mkRes(); await handler({ method: 'POST', body }, res);
    assert.strictEqual(res.code, 400); assert.strictEqual(calls.length, 0);
    assert.ok(!JSON.stringify(res.body).includes('BONUS_SEGRETO'));
  });
}

test('honeypot compilato: non chiama lo script, nessun link', async () => {
  env(); mockFetch(() => jsonOk({ ok: true }));
  const res = mkRes(); await handler({ method: 'POST', body: { ...OK, sito: 'http://spam' } }, res);
  assert.strictEqual(calls.length, 0); assert.strictEqual(res.body.bonusUrl, undefined);
});

test('env mancanti: errore gestito, mai crash né link', async () => {
  for (const k of ['GOOGLE_SCRIPT_URL', 'APPS_SCRIPT_SECRET', 'BONUS_DRIVE_URL']) {
    env(); delete process.env[k]; mockFetch(() => jsonOk({ ok: true }));
    const res = mkRes(); await handler({ method: 'POST', body: OK }, res);
    assert.strictEqual(res.code, 500); assert.strictEqual(calls.length, 0);
    assert.ok(!JSON.stringify(res.body).includes('BONUS_SEGRETO'));
  }
});

test('metodo GET rifiutato', async () => {
  env(); mockFetch(() => jsonOk({ ok: true }));
  const res = mkRes(); await handler({ method: 'GET' }, res);
  assert.strictEqual(res.code, 405);
});

test('body stringa JSON accettato', async () => {
  env(); mockFetch(() => jsonOk({ ok: true }));
  const res = mkRes(); await handler({ method: 'POST', body: JSON.stringify(OK) }, res);
  assert.strictEqual(res.body.ok, true);
});
