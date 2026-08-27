// Zero — Push Notification Server
//
// A small, self-contained backend whose only job is: remember which devices
// asked to be notified, and relay a message to all of them on request. This
// is the piece a static HTML file structurally cannot do — someone has to be
// listening even when nobody has the app open, and someone has to hold the
// private key that proves a push really came from this firm's server.
//
// Storage is a single JSON file. That's a deliberate, honest choice for a
// firm this size (a handful of users, a few devices each) — not a shortcut
// that silently breaks at scale. If this firm grows to hundreds of staff,
// swap loadSubs()/saveSubs() for a real database; nothing else needs to change.

const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'subscriptions.json');

function loadSubs() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return []; }
}
function saveSubs(subs) {
  fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2));
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
// Prototype-level admin gate: a shared secret the front-end must send back,
// not real per-user authentication. Matches the demo-auth honesty of the
// front-end's own login system — good enough to stop casual misuse, not a
// substitute for real auth if this firm ever exposes this publicly at scale.
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-before-deploying';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('\n⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.');
  console.warn('   Run: node generate-vapid-keys.js — then set both as environment variables before deploying.\n');
} else {
  webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// The front-end fetches this on startup so the public key never has to be
// hand-copied into the HTML — one source of truth, on the server.
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.get('/api/status', (req, res) => {
  const subs = loadSubs();
  res.json({ ok: true, deviceCount: subs.length, vapidConfigured: !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) });
});

// A device calls this once, right after the browser grants notification
// permission and hands back a push subscription object. Re-subscribing
// (e.g. the same device, permission re-granted later) updates in place
// rather than creating a duplicate — matched by the subscription's endpoint,
// which is unique per browser installation.
app.post('/api/subscribe', (req, res) => {
  const { subscription, userId, userName } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing or invalid subscription object' });
  }
  const subs = loadSubs();
  const idx = subs.findIndex(s => s.subscription.endpoint === subscription.endpoint);
  const record = { subscription, userId: userId || 'unknown', userName: userName || 'Unknown', subscribedAt: new Date().toISOString() };
  if (idx >= 0) subs[idx] = record; else subs.push(record);
  saveSubs(subs);
  res.json({ ok: true, totalDevices: subs.length });
});

app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  const subs = loadSubs().filter(s => s.subscription.endpoint !== endpoint);
  saveSubs(subs);
  res.json({ ok: true, totalDevices: subs.length });
});

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden — missing or incorrect admin key' });
  }
  next();
}

// The one endpoint that actually reaches every registered device. Expired
// subscriptions (410/404 — the browser or OS discarded them, e.g. the app
// was uninstalled) are quietly dropped from storage rather than retried
// forever; anything else (a transient network hiccup) is left in place so
// the next broadcast tries again.
app.post('/api/broadcast', requireAdmin, async (req, res) => {
  const { title, body, url } = req.body || {};
  const subs = loadSubs();
  const payload = JSON.stringify({ title: title || 'Zero', body: body || '', url: url || '/' });
  let sent = 0, removed = 0;
  const stillValid = [];
  for (const record of subs) {
    try {
      await webpush.sendNotification(record.subscription, payload);
      sent++;
      stillValid.push(record);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) removed++;
      else stillValid.push(record);
    }
  }
  saveSubs(stillValid);
  res.json({ ok: true, sent, removed, totalDevices: stillValid.length });
});

// Send to only the devices belonging to one user (e.g. a targeted reminder)
// rather than the whole firm — same mechanics, narrower audience.
app.post('/api/notify-user', requireAdmin, async (req, res) => {
  const { userId, title, body, url } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const subs = loadSubs();
  const targets = subs.filter(s => s.userId === userId);
  const payload = JSON.stringify({ title: title || 'Zero', body: body || '', url: url || '/' });
  let sent = 0;
  for (const record of targets) {
    try { await webpush.sendNotification(record.subscription, payload); sent++; } catch (e) {}
  }
  res.json({ ok: true, sent, targetedDevices: targets.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Zero push server listening on port ${PORT}`));

module.exports = app;
