'use strict';

// Funzione serverless Vercel. È QUI il gate: il link del bonus vive solo nelle
// variabili d'ambiente e torna al browser soltanto dopo che lo script Google
// ha confermato di aver scritto il lead sul foglio.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIBRO = "Noi Due e l'Ultimo Ospite";

const clean = (v, max) =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'metodo' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'dati' });
  }

  // Honeypot: un bot compila il campo nascosto. Finta risposta ok, mai il link.
  if (typeof body.sito === 'string' && body.sito.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const nome = clean(body.nome, 60);
  const cognome = clean(body.cognome, 60);
  const email = clean(body.email, 254).toLowerCase();

  if (!nome || !cognome || !EMAIL_RE.test(email) || body.consenso !== true) {
    return res.status(400).json({ ok: false, error: 'dati' });
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  const bonusUrl = process.env.BONUS_URL || process.env.BONUS_DRIVE_URL;
  if (!scriptUrl || !secret || !bonusUrl) {
    return res.status(500).json({ ok: false, error: 'configurazione' });
  }

  let saved = false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(scriptUrl, {
      method: 'POST',
      // text/plain evita il preflight; Apps Script legge postData.contents
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret,
        nome,
        cognome,
        email,
        consenso: true,
        libro: LIBRO,
        timestamp: new Date().toISOString(),
      }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const data = await r.json();
    saved = !!(data && data.ok === true);
  } catch (e) {
    saved = false;
  } finally {
    clearTimeout(timer);
  }

  if (!saved) {
    return res.status(502).json({ ok: false, error: 'salvataggio' });
  }
  return res.status(200).json({ ok: true, bonusUrl });
};
