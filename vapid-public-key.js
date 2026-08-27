// GET /api/vapid-public-key
// Public by design — this is the half of the VAPID key pair that's safe to
// expose; browsers use it to verify a push really came from this server.
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
};
