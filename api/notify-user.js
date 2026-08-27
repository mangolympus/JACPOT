// POST /api/notify-user — same mechanics as broadcast, but only to the
// devices belonging to one user (e.g. a targeted reminder).
const webpush = require('web-push');
const { loadSubs, withCors, requireAdmin } = require('./_kv');

module.exports = async (req, res) => {
  withCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  const { userId, title, body, url } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const subs = await loadSubs();
  const targets = subs.filter(s => s.userId === userId);
  const payload = JSON.stringify({ title: title || 'JACPOT', body: body || '', url: url || '/' });

  let sent = 0;
  for (const record of targets) {
    try { await webpush.sendNotification(record.subscription, payload); sent++; } catch (e) {}
  }

  res.status(200).json({ ok: true, sent, targetedDevices: targets.length });
};
