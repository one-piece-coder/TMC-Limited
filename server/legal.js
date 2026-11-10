// Privacy Policy and Terms of Service, filled in from the business settings.
// They describe what this app actually does. If you change what the app collects or
// which services it uses, update the matching section here and LAST_UPDATED.
import { layout } from "./pages.js";
import { telHref } from "./business.js";

export const LAST_UPDATED = "November 10, 2026";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function contactLines(s) {
  const lines = [
    s.contactEmail && `Email: <a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a>`,
    s.phone && `Phone: <a href="${telHref(s.phone)}">${esc(s.phone)}</a>`,
  ].filter(Boolean);
  return lines.length ? `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>` : `<p>Use the contact details on our home page.</p>`;
}

function page({ title, intro, sections, origin, path, settings }) {
  const toc = sections.map(([h], i) => `<li><a href="#s${i + 1}">${esc(h)}</a></li>`).join("");
  const body = `
    <article class="legal">
      <h1>${esc(title)}</h1>
      <p class="muted">Last updated ${LAST_UPDATED}</p>
      ${intro}
      <nav class="card legal-toc" aria-label="Contents"><strong>Contents</strong><ol>${toc}</ol></nav>
      ${sections.map(([h, html], i) => `<section id="s${i + 1}"><h2>${i + 1}. ${esc(h)}</h2>${html}</section>`).join("")}
    </article>`;
  return layout({
    title: `${title} | ${settings.businessName}`,
    description: `${title} for ${settings.businessName}.`,
    canonical: origin + path,
    body,
    settings,
    activeNav: "",
  });
}

export function renderPrivacyPage({ settings: s, origin }) {
  const name = esc(s.businessName);
  return page({
    title: "Privacy Policy",
    path: "/privacy",
    origin,
    settings: s,
    intro: `<p class="lead">This policy explains what information ${name} ("we", "us") collects when you use this website and app, how we use it, and the choices you have. In short: we collect only what we need to run the app and respond to you, we never sell your personal information, and you can delete your account at any time.</p>`,
    sections: [
      [
        "Information we collect",
        `<h3>When you create an account</h3>
        <ul>
          <li>Your <strong>email address</strong>, and whether you've confirmed it.</li>
          <li>Your <strong>password</strong>, which we store only as a one-way scrambled code (a "hash"). We can't see or recover your actual password.</li>
          <li>Your <strong>membership plan</strong> (Free or Pro).</li>
        </ul>
        <h3>When you identify an appliance from a photo</h3>
        <ul>
          <li>The <strong>photo</strong> and any <strong>problem description</strong> you type are sent to our AI provider to identify the appliance and suggest repairs. <strong>We don't save your photo.</strong></li>
          <li>We record the <strong>date and time of each scan</strong>, so we can apply your monthly scan limit.</li>
          <li>Avoid photographing people, documents or anything else private.</li>
        </ul>
        <h3>When you save repair projects</h3>
        <ul><li>Which repair guides you saved and which steps you checked off. This is stored on your device and, if you're signed in, in your account, so it syncs across your devices.</li></ul>
        <h3>When you request service</h3>
        <ul><li>Your <strong>name, phone number</strong>, and optionally your <strong>email and ZIP code</strong>, plus the appliance, your description of the problem, the best time to reach you, and which guide you were reading.</li></ul>
        <h3>When you buy a Pro membership</h3>
        <ul><li>Payments are handled by Stripe. <strong>We never see or store your card number.</strong> We store a Stripe customer ID and whether your membership is active.</li></ul>
        <h3>Automatically</h3>
        <ul>
          <li>Your <strong>IP address</strong> is used briefly, in memory, to limit repeated requests and prevent abuse. We don't store it in our database.</li>
          <li>Our hosting provider may keep standard server logs, such as IP address, browser type, pages requested and time.</li>
        </ul>`,
      ],
      [
        "Cookies and storage on your device",
        `<p>We use <strong>one cookie</strong>: a sign-in cookie that keeps you logged in. It's removed when you sign out, and it expires after 30 days.</p>
        <p>The app also uses your browser's local storage to remember your saved projects, appliance model numbers, and that you've seen the safety notice. This stays on your device.</p>
        <p>We don't use advertising cookies or third-party analytics.</p>`,
      ],
      [
        "How we use your information",
        `<ul>
          <li>To run the app: your account, photo identification, saved projects and membership.</li>
          <li>To contact you about a service request you sent us.</li>
          <li>To send account emails: confirming your email address and resetting your password. We don't send marketing emails unless you ask for them.</li>
          <li>To process payments, and to prevent fraud and abuse.</li>
          <li>To meet legal obligations.</li>
        </ul>
        <p><strong>We do not sell your personal information</strong>, and we don't share it for targeted advertising.</p>`,
      ],
      [
        "Companies that help us run the app",
        `<p>We share information only with service providers who process it for us, and only as needed:</p>
        <ul>
          <li><strong>Our hosting provider</strong> stores the app and its database.</li>
          <li><strong>Anthropic</strong> receives photos and problem descriptions to identify appliances and suggest repairs. See <a href="https://www.anthropic.com/legal/privacy" rel="noopener">Anthropic's privacy policy</a>.</li>
          <li><strong>Stripe</strong> processes Pro membership payments. See <a href="https://stripe.com/privacy" rel="noopener">Stripe's privacy policy</a>.</li>
          <li><strong>Our email delivery provider</strong> sends account emails and service-request notifications.</li>
        </ul>
        <p>We may also share information if the law requires it, to protect someone's safety, or as part of a sale or transfer of our business. The new owner would then be bound by this policy.</p>`,
      ],
      [
        "Links to other websites",
        `<ul>
          <li><strong>Parts and tools links</strong> go to retailers such as Amazon. Some are affiliate links, so we may earn a commission at no extra cost to you. The retailer may use cookies to credit the purchase, and its own privacy policy applies.</li>
          <li><strong>Video tutorials</strong> open on YouTube, or play from YouTube in its privacy-enhanced mode. YouTube's privacy policy applies to those videos.</li>
        </ul>`,
      ],
      [
        "How long we keep information",
        `<ul>
          <li><strong>Account information, scan records and saved projects:</strong> until you delete your account.</li>
          <li><strong>Service requests:</strong> as business records, for as long as we need them to serve you and run our business, or as the law requires. Ask us and we'll delete yours.</li>
          <li><strong>Backups:</strong> copies of our database may persist for a limited time after deletion, until they're replaced.</li>
        </ul>`,
      ],
      [
        "Your choices and rights",
        `<ul>
          <li><strong>Delete your account</strong> at any time: <a href="/#/account">Account</a> → Delete account. This removes your account, scan records and saved projects. Pro members should cancel their membership first.</li>
          <li><strong>Get a copy, correct, or delete other information</strong>, such as a service request, by contacting us below.</li>
          <li><strong>Clear what's stored on your device</strong> by signing out and clearing this site's data in your browser settings.</li>
        </ul>
        <p>Depending on where you live (for example California, Colorado, Virginia or other US states), you may have additional rights under state privacy law. These include the right to know what we collect, to delete it, to correct it, and to not be discriminated against for using these rights. Contact us to make a request. We may need to verify your identity first.</p>`,
      ],
      [
        "Security",
        `<p>We protect your information with encrypted connections (HTTPS), scrambled password storage, sign-in cookies that scripts can't read, and limits on repeated attempts. No method of storing or sending information is completely secure, so we can't guarantee absolute security. Use a password you don't use anywhere else.</p>`,
      ],
      [
        "Children",
        `<p>This app is meant for adults handling home repairs, and isn't directed at children under 13. We don't knowingly collect information from children under 13. If you believe a child gave us information, contact us and we'll delete it.</p>`,
      ],
      [
        "Changes to this policy",
        `<p>We'll update this page if our practices change, and change the "last updated" date. If we make significant changes, we'll make that clear on the site or by email.</p>`,
      ],
      ["Contact us", `<p>Questions or requests about your privacy? Contact ${name}:</p>${contactLines(s)}`],
    ],
  });
}

export function renderTermsPage({ settings: s, origin, config }) {
  const name = esc(s.businessName);
  const priceLabel = esc(config?.proPriceLabel || "the price shown");
  return page({
    title: "Terms of Service",
    path: "/terms",
    origin,
    settings: s,
    intro: `<p class="lead">These terms are an agreement between you and ${name} ("we", "us") for using this website and app. By using it, or by creating an account, you agree to these terms. If you don't agree, please don't use the app.</p>`,
    sections: [
      [
        "DIY repairs are at your own risk",
        `<p>Our guides, videos, photo identification and suggestions are <strong>general information for do-it-yourself homeowners</strong>. They aren't professional advice for your specific situation, and they can't account for every model, home or condition.</p>
        <p>Appliance and home repair can involve <strong>electricity, natural gas, water, high heat, sharp parts, and heavy equipment</strong>, and can cause injury, property damage or fire. By choosing to do a repair yourself, you accept these risks. Always:</p>
        <ul>
          <li>Read and follow your appliance manufacturer's instructions and warnings.</li>
          <li>Turn off power at the breaker, and shut off gas and water, before working.</li>
          <li>Stop and call a licensed professional if anything is unclear, unsafe, or beyond your skill. That includes any gas leak, refrigerant work, or electrical panel work.</li>
          <li>Check local codes and permit requirements.</li>
        </ul>
        <p>Doing your own repairs may void a manufacturer's or home warranty. Check your warranty first.</p>`,
      ],
      [
        "Photo identification can be wrong",
        `<p>Appliance identification and repair suggestions are produced by artificial intelligence and may be inaccurate or incomplete. <strong>Always confirm the brand, model number and part number</strong> on your appliance's label before buying parts or starting a repair.</p>`,
      ],
      [
        "Your account",
        `<ul>
          <li>Give us accurate information, and keep your password private. You're responsible for activity on your account.</li>
          <li>You must be at least 18 years old, or have a parent's or guardian's permission, to create an account.</li>
          <li>We may suspend or close accounts that break these terms or misuse the app.</li>
          <li>You can delete your account at any time from your Account page.</li>
        </ul>`,
      ],
      [
        "Pro membership",
        `<ul>
          <li>Pro is a <strong>subscription billed in advance</strong> at ${priceLabel}, through our payment processor, Stripe. It <strong>renews automatically</strong> each billing period until you cancel.</li>
          <li><strong>Cancel any time</strong> in Account → Manage subscription. Unless the billing page says otherwise, cancellation takes effect at the end of the current billing period, and you keep Pro until then.</li>
          <li>Payments aren't refundable for partial billing periods, except where the law requires.</li>
          <li>Pro includes a monthly number of photo scans, shown on your Account page. Unused scans don't carry over. If we change prices or features, we'll tell you in advance, and changes apply from your next billing period.</li>
        </ul>`,
      ],
      [
        "Service requests",
        `<p>Sending a service request asks ${name} to contact you. It doesn't book an appointment or create a contract. Any repair work we do for you is covered by a separate quote or agreement between you and ${name}.</p>`,
      ],
      [
        "Parts, tools and other websites",
        `<p>Links to parts and tools go to other retailers. Some are affiliate links, so we may earn a commission at no extra cost to you. We don't sell, ship or warranty those products. The retailer's terms, prices and return policies apply. Videos and other linked websites are run by others, and we're not responsible for their content.</p>`,
      ],
      [
        "Acceptable use",
        `<p>Don't misuse the app. For example, don't try to break or overload it, get around scan limits, scrape content in bulk, access other people's accounts, submit false service requests, or upload unlawful content or other people's private information.</p>`,
      ],
      [
        "Our content",
        `<p>The guides, text and design of this app belong to ${name} or its licensors. You may use them for your own personal, non-commercial repairs. Don't copy or republish them without permission.</p>`,
      ],
      [
        "No warranty",
        `<p>The app and its content are provided <strong>"as is" and "as available"</strong>, without warranties of any kind, whether express or implied. These include warranties of accuracy, fitness for a particular purpose, and uninterrupted service, to the fullest extent the law allows.</p>`,
      ],
      [
        "Limitation of liability",
        `<p>To the fullest extent the law allows, ${name} won't be liable for any indirect, incidental, special, consequential or punitive damages. This includes personal injury or property damage resulting from repairs you choose to do yourself using information from this app. Our total liability for any claim relating to the app is limited to the greater of the amount you paid us for the app in the 12 months before the claim, or $50.</p>
        <p>Some places don't allow certain limitations, so some of these may not apply to you.</p>`,
      ],
      ...(s.governingState
        ? [["Governing law", `<p>These terms are governed by the laws of the State of ${esc(s.governingState)}, without regard to its conflict-of-law rules.</p>`]]
        : []),
      [
        "Changes to these terms",
        `<p>We may update these terms. We'll change the "last updated" date, and for significant changes we'll make that clear on the site or by email. Using the app after a change means you accept the updated terms.</p>`,
      ],
      ["Contact us", `<p>Questions about these terms? Contact ${name}:</p>${contactLines(s)}`],
    ],
  });
}
