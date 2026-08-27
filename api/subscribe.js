// POST /api/subscribe — a device registers itself after the browser grants
// notification permission. Upserts by endpoint so re-subscribing the same
// browser updates in place instead of creating a duplicate.
const { loadSubs, saveSubs, withCors } = require('./_kv');

module.exports = async (req, res) => {
  withCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscription, userId, userName } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing or invalid subscription object' });
  }

  const subs = await loadSubs();
  const idx = subs.findIndex(s => s.subscription.endpoint === subscription.endpoint);
  const record = { subscription, userId: userId || 'unknown', userName: userName || 'Unknown', subscribedAt: new Date().toISOString() };
  if (idx >= 0) subs[idx] = record; else subs.push(record);
  await saveSubs(subs);

  res.status(200).json({ ok: true, totalDevices: subs.length });
};
