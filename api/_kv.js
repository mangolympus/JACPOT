// Shared storage helper. Serverless functions have no reliable local
// filesystem between invocations, so subscriptions live in Vercel's native
// Redis add-on instead of the subscriptions.json file the Render/Express
// version used.
//
// This is standard TCP Redis (a REDIS_URL connection string), not the REST
// API the Upstash-branded integration used — Vercel's own "Redis" product
// works differently, so this talks to it with the standard `redis` npm
// client instead of plain fetch(). Each call opens a connection, does its
// one operation, and closes it again rather than trying to keep a
// connection alive between separate serverless invocations — simpler and
// more robust for this app's actual traffic (a handful of people, occasional
// broadcasts) than optimizing for connection reuse would be.
const { createClient } = require('redis');

const KEY = 'jacpot:subscriptions';

async function withClient(fn) {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      'REDIS_URL is not set. Check Vercel → Storage → your Redis database → ' +
      'the ".env.local" Quickstart tab for the exact variable name, and add ' +
      'it under Settings → Environment Variables if it is missing.'
    );
  }
  const client = createClient({ url });
  client.on('error', () => {}); // swallow here — failures surface through the awaited calls below instead of an unhandled event crashing the function
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.quit();
  }
}

async function loadSubs() {
  return withClient(async client => {
    const raw = await client.get(KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  });
}

async function saveSubs(subs) {
  return withClient(async client => {
    await client.set(KEY, JSON.stringify(subs));
  });
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
