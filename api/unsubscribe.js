// POST /api/unsubscribe
const { loadSubs, saveSubs, withCors } = require('./_kv');

module.exports = async (req, res) => {
  withCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint } = req.body || {};
  const subs = (await loadSubs()).filter(s => s.subscription.endpoint !== endpoint);
  await saveSubs(subs);

  res.status(200).json({ ok: true, totalDevices: subs.length });
};
