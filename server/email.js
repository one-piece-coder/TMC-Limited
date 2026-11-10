import nodemailer from "nodemailer";

// Returns { enabled, send({ to, subject, text, html }) }.
// - With SMTP_URL set (any provider: Postmark, SendGrid, Mailgun, Amazon SES, ...), sends real email.
// - In development without SMTP_URL, prints the email to the server console so you can click the link.
// - In production without SMTP_URL, email is disabled and password reset is hidden.
export function createMailer(config) {
  if (config.smtpUrl) {
    const transport = nodemailer.createTransport(config.smtpUrl);
    return {
      enabled: true,
      send: (msg) => transport.sendMail({ from: config.emailFrom, ...msg }),
    };
  }
  if (!config.production) {
    return {
      enabled: true,
      async send({ to, subject, text }) {
        console.log(`\n--- Email (dev mode, not sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n----------------------------------\n`);
      },
    };
  }
  return { enabled: false, send: async () => {} };
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function passwordResetEmail({ to, link, minutes }) {
  const text = `Someone asked to reset the password for your FixIt Home account.

Reset your password here (the link works for ${minutes} minutes, one time):
${link}

If you didn't ask for this, ignore this email. Your password won't change.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1f1a17">
  <h2 style="color:#e8590c">🔧 FixIt Home</h2>
  <p>Someone asked to reset the password for your FixIt Home account.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#e8590c;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Reset my password</a></p>
  <p style="color:#6b625c;font-size:14px">The link works for ${minutes} minutes, one time. If you didn't ask for this, ignore this email. Your password won't change.</p>
</div>`;
  return { to, subject: "Reset your FixIt Home password", text, html };
}
