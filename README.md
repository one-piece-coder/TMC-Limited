# FixIt Home

A DIY home-repair web app, built so a repair business can run it under its own brand.

> **Business owners: start with the [Owner's Guide](OWNER_GUIDE.md).** It walks through going live, claiming the site, branding it, and turning on each feature, with no coding.

It can:

- **Identify appliances from a photo.** Snap or upload a picture and Claude (vision) names the appliance, reads the brand and model number when they're legible, and tells you where to find the model label.
- **Suggest repairs.** Describe the problem and get matching step-by-step guides from the built-in catalog, plus extra AI suggestions for problems the catalog doesn't cover, with flags for when to call a pro.
- **Show video tutorials.** Every guide links to tutorial videos, and curated videos can be embedded right in the guide.
- **Track projects.** Users check off steps as they go. Signed-in users get their projects synced across devices.
- **Accounts and Pro subscriptions.** Free accounts get 3 photo scans a month. Pro (Stripe subscription) raises that to 100.
- **Earn from parts.** Every part and tool in a guide links to retailer search results. When the user's model number is known, from a scan or typed in, it's added to the search so results fit. Links carry your affiliate tags.

- **Send jobs to the business that owns it.** Every guide, appliance page and scan result offers "Request service" and tap-to-call. Requests go to an owner dashboard and to the owner's email.
- **Run under the owner's brand.** Name, tagline, logo, color, phone, service area and services are set in the dashboard. No code changes needed.

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
| `APP_URL` | Public URL, used in Stripe redirects and password-reset emails (e.g. `https://fixithome.app`). Required for password reset in production. |
| `SMTP_URL` | Email server for password-reset emails, e.g. `smtps://USER:PASS@smtp.postmarkapp.com:465`. Most providers (Postmark, SendGrid, Mailgun, Amazon SES, Resend) give you SMTP credentials. |
| `EMAIL_FROM` | Sender address, e.g. `FixIt Home <help@fixithome.app>`. It must be a domain you've verified with your email provider. |
| `DATABASE_PATH` | SQLite file (default `data/fixit.db`). Put it on a persistent disk and back it up. |
| `TRUST_PROXY` | Set to `1` behind one reverse proxy/load balancer so rate limits see real client IPs |
| `NODE_ENV=production` | Marks login cookies `Secure` (HTTPS only) |
| `SETUP_CODE` | One-time code to claim the site as owner at `/#/setup`. If unset, a random code is printed in the server log at startup. |

## Owner features

- **First-time setup:** `/#/setup` with the setup code creates the owner account. An existing account can be made owner only with its password. Setup closes once an owner exists.
- **Dashboard** (`/#/admin`, owners only):
  - Stats: new requests, requests this month, members, Pro subscribers, scans with estimated AI cost.
  - **Job requests:** filter by status, tap to call or email, change status, add private notes, download a CSV.
  - **Business settings:** name, tagline, logo, brand color, phone, email, service area, services, booking on/off, where to email requests.
  - **Setup checklist:** shows which integrations are connected, plus a database backup download.
- **Branding:** applied to the app, guide pages, search listings (including local-business data), the install manifest and emails. Text uses of the brand color are adjusted to meet WCAG AA contrast.
- **Job requests:** rate limited, require contact consent, and have a hidden spam trap. Each request records which guide the customer was reading.

## Deploying

- **Render:** `render.yaml` is a Blueprint (New → Blueprint). It creates the service with a 1 GB disk at `/data`, a generated `SETUP_CODE`, a health check, and prompts for the optional keys. `RENDER_EXTERNAL_URL` is used as `APP_URL` until a custom domain is set.
- **Anywhere else:** the `Dockerfile` runs as a non-root user with a volume at `/data`, and includes a health check at `/healthz`.

## Setting up Stripe

1. In the Stripe dashboard, create a Product "FixIt Pro" with a recurring Price. Copy the `price_...` id into `STRIPE_PRICE_ID`.
2. Add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` that sends the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Turn on the Customer Portal (Settings → Billing → Customer portal). The "Manage subscription" button uses it to let users cancel or update their card.
4. Test locally with the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then pay with card `4242 4242 4242 4242`.

## Search-friendly guide pages

Every guide also has its own address that search engines can index. The server builds these pages as complete HTML, so they load fast and need no JavaScript:

| Page | Example |
|---|---|
| All guides | `/guides` |
| One appliance | `/guides/dryer` |
| One repair | `/guides/dryer/dryer-no-heat` |
| Sitemap for search engines | `/sitemap.xml` |
| Crawler rules | `/robots.txt` |

Each repair page has a search-style title ("How to Fix a Dryer That Won't Heat"), a description sized for search results, a canonical link, social-sharing tags, and structured data (HowTo steps plus breadcrumbs). It also includes the steps, safety notes, tools and parts with affiliate links, and videos. A "Start this repair in the app" button opens the interactive version, with checklists, saved progress and exact-fit parts. The app's repair screens have a **Share guide** button that copies the page's address.

**To get listed on Google:**
1. Set `APP_URL` to your real domain. Canonical links and the sitemap use it, so pages never point at the wrong host.
2. Add your site to [Google Search Console](https://search.google.com/search-console) and submit `https://<your-domain>/sitemap.xml`. Do the same in Bing Webmaster Tools, which also covers DuckDuckGo and Yahoo.
3. New sites usually take a few weeks to show up. Search Console shows which searches you appear for. Use it to decide which guides to write next.

New guides added to `public/data/catalog.js` get a page and a sitemap entry automatically. Give each one a `title` worded the way people search.

## Email verification

New accounts get a confirmation link by email, and photo scans unlock once it's clicked. That stops throwaway accounts from farming free scans. The link lasts 7 days and works once. "Send a new link" replaces it, limited to 3 per hour. A password reset also counts as confirming the email.

Verification is only required when the site can send email (the same conditions as password reset). Accounts that existed before this feature are treated as confirmed.

## Privacy Policy, Terms of Service and account deletion

`/privacy` and `/terms` are rendered by `server/legal.js` from the business settings: name, contact email, phone, Pro price, and an optional governing-law state. They're linked from every footer, the sign-up form and the service-request form, and listed in the sitemap. The text matches what the app actually collects and which services it uses. If you change either, update the matching section and `LAST_UPDATED`. Have a lawyer review both before launch.

Members can delete their account from the Account page, after confirming their password. Sessions, scans, projects and emailed links are removed with it (`ON DELETE CASCADE`). Service requests stay as business records, unlinked from the account. Pro members must cancel first, and the owner account can't be deleted.

## Password reset

"Forgot your password?" on the sign-in page emails a reset link. The link works once and expires after an hour, and asking again cancels the previous one. Setting a new password signs the user out on every other device.

- **Development:** with no `SMTP_URL`, the email is printed in the server console instead of being sent, so you can click the link.
- **Production:** set `SMTP_URL`, `EMAIL_FROM` and `APP_URL`. Without all three, the reset option is hidden. `APP_URL` is required because building the link from the incoming request would let an attacker point a victim's reset link at their own site.

## Affiliate programs

- **Amazon Associates:** sign up, then set `AMAZON_ASSOCIATE_TAG`. Without a tag the links still work but earn nothing.
- **Appliance-parts retailers:** many run affiliate programs, often through networks like Impact, CJ or Rakuten. Once approved, add each one's search URL with your affiliate id to `PARTS_RETAILERS`, using `{query}` where the search text goes.
- The app shows a commission disclosure next to shopping links and marks them `rel="sponsored"`, as the FTC and the affiliate programs require. Check each program's own rules too. Amazon, for example, restricts how prices may be shown.

## Still needed before a public launch

- A lawyer's review of the Privacy Policy and Terms of Service.
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
| `server/email.js` | Sends password-reset emails over SMTP (prints them in dev) |
| `server/billing.js` | Scan quotas, Stripe Checkout, Customer Portal, webhooks |
| `server/db.js` | SQLite storage: users, sessions, scans, projects |
| `server/rateLimit.js` | In-memory rate limiter |
| `server/pages.js` | Search-friendly guide pages, sitemap and robots.txt |
| `server/business.js` | Business settings, validation, brand color CSS |
| `server/leads.js` | Service-request validation, owner email, CSV export |
| `server/admin.js` | Owner setup, dashboard API, setup checklist, backups |
| `server/config.js` | Environment configuration |
| `test/` | `node --test` suite |

## Adding repairs and videos

Add an entry to the appliance's `repairs` array in `public/data/catalog.js`. Each video needs either:

- `query`, which opens a YouTube search for that repair, or
- `youtubeId`, the 11-character id from a video URL, which embeds that video in the guide (it uses `youtube-nocookie.com`).

The catalog ships with search queries. Swap in `youtubeId`s for videos you've watched and approved, or for your own branded tutorials. Photo identification picks up new catalog entries automatically.

## Disclaimer

The guides are general DIY guidance. Users should follow their appliance's manual, cut power, water, and gas before working, and call a licensed professional for gas, refrigerant, or electrical-panel work.
