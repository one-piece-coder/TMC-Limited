# FixIt Home

A DIY home-repair web app for homeowners. It can:

- **Identify appliances from a photo.** Snap or upload a picture and Claude (vision) names the appliance, reads the brand and model number when they're legible, and tells you where to find the model label.
- **Suggest repairs.** Describe the problem and get matching step-by-step guides from the built-in catalog, plus extra AI suggestions for problems the catalog doesn't cover, with flags for when to call a pro.
- **Show video tutorials.** Every guide links to tutorial videos, and curated videos can be embedded right in the guide.
- **Track projects.** Users check off steps as they go. Signed-in users get their projects synced across devices.
- **Accounts and Pro subscriptions.** Free accounts get 3 photo scans a month. Pro (Stripe subscription) raises that to 100.
- **Earn from parts.** Every part and tool in a guide links to retailer search results. When the user's model number is known, from a scan or typed in, it's added to the search so results fit. Links carry your affiliate tags.

Guides, the guided identifier, and video links are free and need no account. Photo scans require an account, so nobody can run up your Claude bill anonymously.

## Run it

```bash
npm install
cp .env.example .env    # then fill in the keys you have
npm start               # http://localhost:3000
npm test
```

Node 22.13 or newer is required (it uses Node's built-in SQLite). `npm start` doesn't read `.env` by itself. Export the variables in your shell, or run `node --env-file=.env --disable-warning=ExperimentalWarning server/index.js`.

Every feature turns on only when its keys are set. With no keys at all, the app still runs with guides, accounts and project sync.

## Configuration

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables photo identification |
| `CLAUDE_MODEL` | Model for scans (default `claude-opus-5-5`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_PRICE_ID` | The recurring Price for Pro (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint (`whsec_...`) |
| `PRO_PRICE_LABEL` | Price shown on the upgrade button (default `$4.99/month`). Keep it in sync with the Stripe price. |
| `FREE_SCANS_PER_MONTH` / `PRO_SCANS_PER_MONTH` | Monthly scan limits (defaults 3 and 100) |
| `AMAZON_ASSOCIATE_TAG` | Your Amazon Associates tracking id, added to every Amazon link |
| `PARTS_RETAILERS` | JSON array of extra retailers: `[{"name":"PartsCo","template":"https://partsco.example/search?q={query}&aff=123"}]` |
| `APP_URL` | Public URL, used for Stripe redirect links (e.g. `https://fixithome.app`) |
| `DATABASE_PATH` | SQLite file (default `data/fixit.db`). Put it on a persistent disk and back it up. |
| `TRUST_PROXY` | Set to `1` behind one reverse proxy/load balancer so rate limits see real client IPs |
| `NODE_ENV=production` | Marks login cookies `Secure` (HTTPS only) |

## Setting up Stripe

1. In the Stripe dashboard, create a Product "FixIt Pro" with a recurring Price. Copy the `price_...` id into `STRIPE_PRICE_ID`.
2. Add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` that sends the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Turn on the Customer Portal (Settings → Billing → Customer portal). The "Manage subscription" button uses it to let users cancel or update their card.
4. Test locally with the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then pay with card `4242 4242 4242 4242`.

## Affiliate programs

- **Amazon Associates:** sign up, then set `AMAZON_ASSOCIATE_TAG`. Without a tag the links still work but earn nothing.
- **Appliance-parts retailers:** many run affiliate programs, often through networks like Impact, CJ or Rakuten. Once approved, add each one's search URL with your affiliate id to `PARTS_RETAILERS`, using `{query}` where the search text goes.
- The app shows a commission disclosure next to shopping links and marks them `rel="sponsored"`, as the FTC and the affiliate programs require. Check each program's own rules too. Amazon, for example, restricts how prices may be shown.

## Still needed before a public launch

- Password reset and email verification. These need an email-sending service.
- Terms of Service and Privacy Policy pages, then a "you agree to..." line on sign-up.
- Run on one server process, or move rate limiting to a shared store like Redis before running several.

## Project layout

| Path | What it is |
|---|---|
| `public/data/catalog.js` | Appliances, repair guides, safety info, and video links (shared by the browser and the server) |
| `public/app.js` | Single-page app: home, search, browse, guides, identify, and My Projects |
| `server/identify.js` | Claude vision call with a structured-output schema |
| `public/data/parts.js` | Builds retailer and affiliate shopping links |
| `server/index.js` | Express server: routes and wiring |
| `server/auth.js` | Password hashing, session cookies, CSRF guard |
| `server/billing.js` | Scan quotas, Stripe Checkout, Customer Portal, webhooks |
| `server/db.js` | SQLite storage: users, sessions, scans, projects |
| `server/rateLimit.js` | In-memory rate limiter |
| `server/config.js` | Environment configuration |
| `test/` | `node --test` suite |

## Adding repairs and videos

Add an entry to the appliance's `repairs` array in `public/data/catalog.js`. Each video needs either:

- `query`, which opens a YouTube search for that repair, or
- `youtubeId`, the 11-character id from a video URL, which embeds that video in the guide (it uses `youtube-nocookie.com`).

The catalog ships with search queries. Swap in `youtubeId`s for videos you've watched and approved, or for your own branded tutorials. Photo identification picks up new catalog entries automatically.

## Disclaimer

The guides are general DIY guidance. Users should follow their appliance's manual, cut power, water, and gas before working, and call a licensed professional for gas, refrigerant, or electrical-panel work.
