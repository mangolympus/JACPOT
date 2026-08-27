# Zero — Deployment & Setup Guide

## What's in this bundle

**Front-end (static, host anywhere that serves files):**

| File | Purpose |
|---|---|
| `command-centre-v3.html` | The app itself |
| `manifest.json` | PWA manifest — what makes "Install App" possible |
| `sw.js` | Service worker — required for install eligibility, and now also displays real push notifications when they arrive |
| `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` | App icons (currently a plain "0" placeholder — swap these once you've generated a real logo from the earlier prompt) |

**Backend (a real, small Node.js server — needed only for multi-device push):**

| File | Purpose |
|---|---|
| `server/server.js` | The push server — subscribe/broadcast endpoints |
| `server/generate-vapid-keys.js` | Run once to create the keys the push system needs |
| `server/package.json` | Its dependencies (Express, web-push, cors) |
| `server/.gitignore` | Keeps real subscriber data and secrets out of git |

**All five front-end files must be uploaded together, in the same folder**, so their relative paths resolve. If you ever rename `command-centre-v3.html`, update `start_url` in `manifest.json` to match.

---

## Read this first: what changed since the last version

Previously, "Send Notification to All Devices" was honestly labeled as reaching only the device that clicked it — there was no backend. **That backend now exists** (`server/`). Once you deploy it and connect the app to it (Parts 3–6 below), the broadcast button, the morning digest, and the red-flag alerts genuinely reach every device that's registered — not just the one in front of Umang.

Until you do that, the app works exactly as before: local-only notifications, clearly labeled as such in Settings → Notifications ("Local-only mode").

Client data itself still lives only in browser memory and resets on reload — only the notification path gets a real, persistent backend in this update.

---

## Part 1 — Host the front-end

Pick one. Both are free and give you a permanent HTTPS URL.

### Option A: Netlify Drop — fastest, no account strictly required

1. Put the five front-end files in one folder on your computer.
2. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)** in a browser.
3. Drag that folder straight onto the page.
4. Netlify uploads it and gives you a live URL immediately, like `https://random-name-12345.netlify.app`.
5. **To keep it permanently**: click "Claim this site" on the confirmation screen and create a free Netlify account. Otherwise the link can expire.
6. Open the URL it gives you — the app should load exactly as it does here.

To update later: go to your Netlify site's dashboard → **Deploys** → drag the updated folder in again.

### Option B: GitHub Pages — more control, good if you already use GitHub

1. Create a new repository (e.g., `zero-compliance`). Free plan requires the repo be **public**.
2. Upload the five front-end files to the repository root (GitHub's web UI → **Add file → Upload files**, no command line needed).
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
5. GitHub gives you a URL like `https://yourusername.github.io/zero-compliance/command-centre-v3.html` — wait a minute or two for the first deploy.

### Custom domain (optional, either option)

Both platforms support pointing your own domain (e.g., `zero.yourfirm.com`) at the site — add a CNAME record in your domain's DNS pointing to the URL they gave you, then add the domain in that platform's site settings.

---

## Part 2 — Verify the PWA works

1. Open the hosted URL (not a local file) in Chrome or Edge.
2. DevTools (F12) → **Application → Manifest**. Confirm no red errors and all three icons show up.
3. **Application → Service Workers** — confirm `sw.js` shows "activated and running".
4. **Android (Chrome)**: an "Install App" button should appear in the app's header, or in Settings → Install App.
5. **iPhone (Safari)**: no automatic prompt — tap Share → **Add to Home Screen**. The app shows this exact instruction on iPhone automatically.

---

## Part 3 — Deploy the push server

The server needs somewhere that runs Node.js continuously — static hosts like Netlify/GitHub Pages can't run it. **Render** is the easiest free option for this.

1. Create a free account at **[render.com](https://render.com)**.
2. Put the `server/` folder into its own GitHub repository (e.g., `zero-push-server`) — Render deploys from a git repo.
3. In Render: **New → Web Service**, connect that repository.
4. Settings Render will ask for:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Before the first deploy, generate your VAPID keys **locally** (you need Node.js installed on your own computer for this one-time step):
   ```
   cd server
   npm install
   npm run generate-vapid
   ```
   This prints a `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` — copy both.
6. Back in Render, under **Environment**, add these variables:
   - `VAPID_PUBLIC_KEY` — paste the value
   - `VAPID_PRIVATE_KEY` — paste the value
   - `ADMIN_KEY` — make up your own secret string (e.g., a long random password) — this is what gates the broadcast endpoint so a stranger can't spam your team
7. Deploy. Render gives you a URL like `https://zero-push-server.onrender.com`.
8. Confirm it's alive: open `https://zero-push-server.onrender.com/api/status` in a browser — you should see `{"ok":true,"deviceCount":0,"vapidConfigured":true}`.

**Note on Render's free tier**: free web services "spin down" after inactivity and take roughly 30–60 seconds to wake up on the next request. For a firm-internal tool this is usually a non-issue (the first broadcast after a quiet period is just a bit slower); Render's cheapest paid tier removes the spin-down if it ever matters.

---

## Part 4 — Connect the app to the push server (Admin: Umang)

1. Log in as **UMANG** (password `demo123`).
2. Go to **Settings → Notifications** → scroll to **Push Server (Multi-Device)**.
3. **Push Server URL**: paste the Render URL from Part 3 (e.g., `https://zero-push-server.onrender.com`).
4. **Admin Key**: the same `ADMIN_KEY` you set in Render's environment variables.
5. Click **Save & Test Connection** — a toast confirms how many devices are currently registered (0, the first time).
6. The Notifications page now shows **"Multi-device (server connected)"** instead of local-only.

This setting lives in the browser's memory only — if Umang reloads the page, it resets to blank and needs re-entering. If that becomes a real annoyance, that's a small, specific follow-up (store it server-side instead of client-side).

---

## Part 5 — Each person registers their device

Once the server is connected (Part 4), everyone needs to individually opt in — same as before, but now it actually reaches them from anywhere:

1. Log in as themselves (Ravi, Anushka, or Jyoti).
2. Go to **Settings → Notifications** (or the Dashboard's notification button).
3. Click **Enable My Notifications** → **Allow** when the browser asks.
4. Behind the scenes, this device registers itself with the push server. A toast confirms "This device is registered for push notifications."

Do this on every device someone wants notified on (phone *and* laptop, if both) — each registers separately, which is exactly right: a notification should reach wherever that person actually is.

---

## Part 6 — Prove it: send a real multi-device broadcast

1. As Umang, with the server connected and at least one other person's device registered (Part 5), go to **Settings → Notifications**.
2. Click **Send Test Notification to All Devices**.
3. Every registered device gets a real OS-level notification within a few seconds — including devices where the app isn't even open, because the service worker (`sw.js`) wakes up specifically to handle it.
4. The toast reports exactly how many devices it reached, and how many stale/expired ones it cleaned up automatically.

The same mechanism drives the **automatic** morning digest and red-flag alerts (Settings → Notifications → Admin Controls toggles) — once someone's device is registered, those reach them the same way, not just the manual test button.

---

## Part 7 — Updating things later

- **Front-end changes** (the app itself): re-upload the changed file(s) via whichever static host you picked in Part 1.
- **Backend changes** (`server/`): if Render is connected to a GitHub repo, just push updated files to that repo and it redeploys automatically. If you uploaded manually, redeploy through Render's dashboard.
- **New logo**: once you've generated one from the earlier prompt, send it to me and I'll regenerate `icon-192.png` / `icon-512.png` / `icon-512-maskable.png` and swap the header/login "0" placeholder for the real mark.

---

## What's still honestly out of scope

- **No persistent database for compliance data.** Client records, statuses, and the push-server URL/admin-key setting all live in browser memory and reset on reload. The push *server* does persist subscriptions durably (in a JSON file) — that part doesn't reset — but the compliance data itself still isn't saved anywhere.
- **Render's free tier sleeps.** A broadcast sent right after a quiet period may take up to a minute to go out while the server wakes. Fine for a small firm; upgrade the Render plan if this matters.
- **The `ADMIN_KEY` is a shared secret, not real per-user authentication** on the server side — it stops casual misuse of the broadcast endpoint, it isn't bank-grade access control. Matches the same honesty as the front-end's own demo login.
