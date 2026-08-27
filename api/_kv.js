// Shared storage helper. Serverless functions have no reliable local
// filesystem between invocations — two calls to the same route can even run
// in different containers — so subscriptions live in Vercel KV (a hosted
// Redis) instead of the subscriptions.json file the Render/Express version
// used. Same data shape either way, just a different place to keep it.
const { kv } = require('@vercel/kv');

const KEY = 'jacpot:subscriptions';

async function loadSubs() {
  const subs = await kv.get(KEY);
  return subs || [];
}

async function saveSubs(subs) {
  await kv.set(KEY, subs);
}

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
}

function requireAdmin(req, res) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'Forbidden — missing or incorrect admin key' });
    return false;
  }
  return true;
}

module.exports = { loadSubs, saveSubs, withCors, requireAdmin };
