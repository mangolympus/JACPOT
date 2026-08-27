// GET /api/status — quick health check: is VAPID configured, how many
// devices are currently registered. Used by the app's "Save & Test
// Connection" button in Settings > Notifications.
const { loadSubs, withCors } = require('./_kv');

module.exports = async (req, res) => {
  withCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const subs = await loadSubs();
  res.status(200).json({
    ok: true,
    deviceCount: subs.length,
    vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  });
};
