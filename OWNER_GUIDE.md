# Owner's Guide

This is your own website and app for your repair business. Homeowners use it to:

- **Identify an appliance** from a photo, and read its brand and model number
- **Follow step-by-step DIY repair guides** with tools, parts and videos
- **Request service from you** when a job is too big, too risky, or they'd rather not do it themselves

It earns money three ways:

1. **Job requests:** every guide, scan result and appliance page has a "Request service" button and your phone number. Requests land in your dashboard and your email.
2. **Pro memberships:** customers pay a monthly fee for more photo scans. Payments go to your Stripe account.
3. **Parts commissions:** "Buy" buttons for parts and tools carry your Amazon Associates tag.

You can set it up in an afternoon without writing code. Each step below turns on one feature. Skip any you don't want yet and come back later.

---

## What it costs to run

Prices change, so check each provider's pricing page. As a rough guide:

| What | Typical cost |
|---|---|
| Hosting (Render "Starter" with a 1 GB disk) | About $7–8/month |
| Your web address (domain) | About $10–20/year |
| Email sending (Postmark, SendGrid, etc.) | Free tier for low volume; paid plans from about $15/month |
| Photo identification (Anthropic API) | About 5–8¢ per photo scan. Free members get 3 scans a month, Pro members 100. |
| Stripe | A percentage of each payment (about 2.9% + 30¢ in the US). No monthly fee. |
| Amazon Associates | Free. You earn a commission on qualifying purchases. |

---

## Step 1: Put the site online (about 15 minutes)

1. **Get your own copy of the code.** Create a free [GitHub](https://github.com) account if you don't have one, then make a copy (a "fork") of this repository in your account. Your developer can do this for you.
2. **Create a [Render](https://render.com) account** and connect it to your GitHub account.
3. In Render, click **New → Blueprint** and pick your copy of the repository. Render reads the included `render.yaml` and sets everything up: the app, a disk for your data, and the settings list.
4. Render asks for a few settings. **You can leave them all blank for now** and fill them in later in steps 4–8.
5. Click **Apply**. After a few minutes, Render shows your site's address, something like `https://repair-site.onrender.com`.

> Using a different host (Railway, Fly.io, DigitalOcean, your own server)? A `Dockerfile` is included. Mount a persistent volume at `/data`, and set the same settings listed in `.env.example`.

## Step 2: Claim your site as the owner (2 minutes)

The first account to enter the **setup code** becomes the owner, which is why the code is secret.

1. In Render, open your service → **Environment** and copy the value of **SETUP_CODE**. (On other hosts, the code is printed in the server log when the app starts.)
2. Go to `https://<your-site>/#/setup`.
3. Enter the setup code, your email and a password. You land in your **Owner dashboard**.

After that, the setup page is closed. Sign in normally at **Sign in**, and the menu shows **Dashboard**.

## Step 3: Make it yours (5 minutes)

In **Dashboard → Business settings**:

- **Business name, tagline and logo emoji.** These show on every page, in Google results and in emails.
- **Brand color.** Pick any color. The site adjusts text and buttons automatically so they stay readable.
- **Phone, public email, service area, and what you fix.** These appear on every guide, with tap-to-call on phones.
- **Online job requests:** on or off. Turn it off to show only your phone number.
- **Email new requests to:** where job alerts go. If left blank, they go to your public email, or your owner login email.

Click **Save settings**. Changes appear right away.

## Step 4: Use your own web address

1. Buy a domain (e.g. from Cloudflare, Namecheap or Squarespace).
2. In Render, open your service → **Settings → Custom Domains** and follow the steps there.
3. Set **APP_URL** (Render → Environment) to your domain, e.g. `https://lonestarappliance.com`.

Until you do this, the site uses its Render address, which works fine.

## Step 5: Turn on email (job alerts and password reset)

1. Sign up with an email sending service. [Postmark](https://postmarkapp.com), SendGrid, Mailgun, Amazon SES and Resend all work. Verify your domain with them so emails don't land in spam.
2. They give you SMTP details. Set these in Render → Environment:
   - **SMTP_URL**: `smtps://USERNAME:PASSWORD@SMTP-SERVER:465` (your provider shows the server, username and password)
   - **EMAIL_FROM**: e.g. `Lone Star Appliance Repair <help@lonestarappliance.com>`

Render restarts the app automatically. Check **Dashboard → Setup checklist**: "Email sending" should show ✓.

## Step 6: Turn on photo identification

1. Create an account at [console.anthropic.com](https://console.anthropic.com), add a payment method, and create an API key.
2. Set **ANTHROPIC_API_KEY** in Render → Environment.

Customers need a free account to scan, so nobody can run up your bill anonymously. Your dashboard shows scans this month and an estimated cost.

## Step 7: Sell Pro memberships (Stripe)

1. Create a [Stripe](https://stripe.com) account.
2. **Products → Add product.** Name it e.g. "Pro membership", with a recurring monthly price. Copy the price ID (starts with `price_`).
3. **Developers → Webhooks → Add endpoint:**
   - URL: `https://<your-site>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret (starts with `whsec_`).
4. **Settings → Billing → Customer portal:** turn it on, so members can cancel or update their card themselves.
5. Set these in Render → Environment:
   - **STRIPE_SECRET_KEY** (Developers → API keys, starts with `sk_live_`)
   - **STRIPE_PRICE_ID**
   - **STRIPE_WEBHOOK_SECRET**
   - **PRO_PRICE_LABEL**: e.g. `$4.99/month`. This is just the label on the button, so keep it matching your Stripe price.

Tip: try everything first in Stripe's **test mode** (keys start with `sk_test_`), paying with card `4242 4242 4242 4242`.

## Step 8: Earn on parts (optional)

1. Join [Amazon Associates](https://affiliate-program.amazon.com).
2. Set **AMAZON_ASSOCIATE_TAG** to your tracking ID (e.g. `yourshop-20`).

Every "Buy" and "Shop" button then carries your tag. The site shows the required "we may earn a commission" notice next to these links.

## Step 9: Get found on Google

1. Add your site to [Google Search Console](https://search.google.com/search-console) and submit `https://<your-site>/sitemap.xml`.
2. Do the same in [Bing Webmaster Tools](https://www.bing.com/webmasters), which also covers DuckDuckGo and Yahoo.
3. Link to your site from your **Google Business Profile**, Yelp page, truck wraps and invoices.

Every guide page lists your business name, phone and service area for search engines. That helps local "appliance repair near me" searches. New sites usually take a few weeks to show up.

---

## Day to day: handling job requests

New requests show up in **Dashboard → Job requests** and in your email. Each one shows:

- the customer's name, phone (tap to call), email, ZIP and best time to reach them
- the appliance and the guide they were reading, so you know the likely problem before you call

Move each request along as you work it: **New → Contacted → Scheduled → Job done** (or **Lost**). Add private notes like "Tue 10am, bring thermal fuse." Use **Download spreadsheet** to open every request in Excel or Google Sheets.

## Backups

Everything (members, job requests, settings) lives in one file on your Render disk. Render keeps snapshots of the disk, but keep your own copy too: **Dashboard → Setup checklist → Download backup**. Do this monthly and before big changes. Store the file somewhere safe, like Google Drive. It contains customer details, so don't share it.

## Changing or adding repair guides

The guides live in one file: `public/data/catalog.js`. To edit them without any tools:

1. Open the file in your GitHub copy and click the ✏️ pencil icon.
2. Edit the text, or copy an existing repair block and change it for a new problem. Give it a unique `id` and a `title` worded the way people search ("How to Fix a Microwave That Won't Heat").
3. Click **Commit changes**. Render redeploys automatically within a few minutes.

New guides get their own Google-friendly page and sitemap entry automatically. Your own repair videos work too: put the 11-character YouTube video ID in `youtubeId` to embed it right in the guide.

## Before you go live, check with a professional

- **Terms of Service and Privacy Policy.** You collect customer contact details and photos. A local attorney or an online policy generator can help.
- **Insurance.** Make sure your general liability policy covers publishing DIY repair advice.
- **The guides.** Read through them, since they'll carry your business name. Change anything you'd do differently in your own work.

## Troubleshooting

| Problem | Fix |
|---|---|
| "That setup code isn't right" | Copy SETUP_CODE again from Render → Environment, with no spaces. |
| Lost the owner password | Use "Forgot your password?" on the sign-in page (needs step 5). |
| Checklist item stays ○ after adding a setting | Check for typos in the setting name. Render restarts automatically after a change; other hosts may need a manual restart. |
| Job alert emails not arriving | Check your spam folder, check that your domain is verified with your email provider, and look in Render → Logs for "Couldn't email new lead". |
| Members or requests disappeared after a restart | The disk isn't attached. On Render, the service needs a paid instance type with the disk from `render.yaml`. |
