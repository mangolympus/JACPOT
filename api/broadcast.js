// POST /api/broadcast — the Admin-only "send to all devices" route.
// Expired subscriptions (410/404 — the browser or OS discarded them) are
// quietly dropped from storage; anything else (a transient failure) is
// left in place so the next broadcast tries again.
const webpush = require('web-push');
const { loadSubs, saveSubs, withCors, requireAdmin } = require('./_kv');

module.exports = async (req, res) => {
  withCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { title, body, url } = req.body || {};
  const subs = await loadSubs();
  const payload = JSON.stringify({ title: title || 'JACPOT', body: body || '', url: url || '/' });

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
  await saveSubs(stillValid);

  res.status(200).json({ ok: true, sent, removed, totalDevices: stillValid.length });
};
