// The repair business that owns this site: its name, look, contact details and
// service area. The owner edits these in the dashboard. Nothing needs a code change.

export const DEFAULT_SETTINGS = {
  businessName: "FixIt Home",
  tagline: "DIY home repair, made simple",
  logoEmoji: "🔧",
  brandColor: "#e8590c",
  phone: "",
  contactEmail: "",
  serviceArea: "",
  services: "Appliance repair",
  bookingEnabled: true,
  leadEmail: "",
  governingState: "",
};

const FIELDS = {
  businessName: { max: 60, required: true },
  tagline: { max: 80 },
  logoEmoji: { max: 8 },
  brandColor: { pattern: /^#[0-9a-f]{6}$/i, message: "Brand color must look like #1a73e8." },
  phone: { max: 30, pattern: /^[0-9+().\-\s]*$/, message: "Phone can only contain digits, spaces and + ( ) - ." },
  contactEmail: { max: 254, pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid contact email." },
  serviceArea: { max: 120 },
  services: { max: 160 },
  leadEmail: { max: 254, pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email for job requests." },
  governingState: { max: 40 },
};

// Returns { values } with only known, cleaned fields, or { error }.
export function validateSettings(input = {}) {
  const values = {};
  for (const [key, rule] of Object.entries(FIELDS)) {
    if (!(key in input)) continue;
    const v = typeof input[key] === "string" ? input[key].trim() : "";
    if (rule.required && !v) return { error: "Business name is required." };
    if (rule.max && v.length > rule.max) return { error: `${key} is too long (max ${rule.max} characters).` };
    if (rule.pattern && !rule.pattern.test(v)) return { error: rule.message };
    values[key] = key === "brandColor" ? v.toLowerCase() : v;
  }
  if ("bookingEnabled" in input) values.bookingEnabled = Boolean(input.bookingEnabled);
  return { values };
}

export function loadSettings(db) {
  return { ...DEFAULT_SETTINGS, ...db.getSettings() };
}

// What visitors' browsers are allowed to see.
export function publicBrand(s) {
  return {
    businessName: s.businessName,
    tagline: s.tagline,
    logoEmoji: s.logoEmoji,
    brandColor: s.brandColor,
    phone: s.phone,
    contactEmail: s.contactEmail,
    serviceArea: s.serviceArea,
    services: s.services,
    bookingEnabled: s.bookingEnabled,
  };
}

export const telHref = (phone) => `tel:${String(phone).replace(/[^0-9+]/g, "")}`;

// ---------- brand color → CSS variables ----------

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
const mix = (hex, withHex, amount) => {
  const a = toRgb(hex);
  const b = toRgb(withHex);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount));
};
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Darkens (or lightens) a color until it reaches the contrast ratio against the background.
function readableOn(color, background, ratio, toward) {
  let c = color;
  for (let i = 0; i < 20 && contrast(c, background) < ratio; i++) c = mix(c, toward, 0.12);
  return c;
}

// CSS overriding the default orange with the business's color, for light and dark mode.
// Text-colored uses of the brand color are adjusted to stay readable (WCAG AA, 4.5:1).
export function brandCss(brandColor) {
  if (!/^#[0-9a-f]{6}$/i.test(brandColor) || brandColor.toLowerCase() === DEFAULT_SETTINGS.brandColor) return "";
  const light = readableOn(brandColor, "#fffaf5", 4.5, "#000000");
  const dark = readableOn(mix(brandColor, "#ffffff", 0.2), "#171412", 4.5, "#ffffff");
  const inkOn = (bg) => (contrast("#ffffff", bg) >= 4.5 ? "#ffffff" : "#1a1a1a");
  const heroStart = readableOn(brandColor, "#ffffff", 4.5, "#000000");
  return `:root{--accent:${light};--accent-ink:${inkOn(light)};--accent-soft:${mix(brandColor, "#ffffff", 0.86)};--hero-gradient:linear-gradient(125deg,${heroStart} 0%,${mix(heroStart, "#000000", 0.35)} 100%)}
@media (prefers-color-scheme: dark){:root{--accent:${dark};--accent-ink:${inkOn(dark)};--accent-soft:${mix(brandColor, "#171412", 0.78)};--hero-gradient:linear-gradient(125deg,${mix(heroStart, "#000000", 0.25)} 0%,${mix(heroStart, "#000000", 0.55)} 100%)}}`;
}
