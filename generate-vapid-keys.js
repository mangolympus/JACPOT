// Run once: node generate-vapid-keys.js
// Prints a public/private key pair for Web Push (VAPID). The public key goes
// into the front-end (safe to expose — it's how browsers verify pushes came
// from your server). The private key stays on the server only, as an
// environment variable — never commit it, never send it to the browser.
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\nAdd these to your server\'s environment variables:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\nAnd put the public key into the app\'s Settings > Notifications > Push Server URL setup (it will ask for it once you enter a server URL).\n');
