import { findAppliance, findRepair } from "../public/data/catalog.js";

export const LEAD_STATUSES = ["new", "contacted", "scheduled", "won", "lost"];

const clean = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

// Returns { lead } or { error }.
export function validateLead(input = {}) {
  const lead = {
    name: clean(input.name, 80),
    phone: clean(input.phone, 30),
    email: clean(input.email, 254).toLowerCase(),
    zip: clean(input.zip, 12),
    applianceId: clean(input.applianceId, 60),
    repairId: clean(input.repairId, 80),
    message: typeof input.message === "string" ? input.message.trim().slice(0, 2000) : "",
    preferredTime: clean(input.preferredTime, 80),
    source: clean(input.source, 200),
  };
  if (!lead.name) return { error: "Please enter your name." };
  if (lead.phone.replace(/\D/g, "").length < 7) return { error: "Please enter a phone number we can reach you at." };
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return { error: "That email doesn't look right." };
  if (lead.applianceId && !findAppliance(lead.applianceId)) lead.applianceId = "";
  if (!lead.applianceId || (lead.repairId && !findRepair(lead.applianceId, lead.repairId))) lead.repairId = "";
  if (!input.consent) return { error: "Please confirm we can contact you about this request." };
  return { lead };
}

export function describeLead(lead) {
  const appliance = findAppliance(lead.appliance_id);
  const repair = findRepair(lead.appliance_id, lead.repair_id);
  return {
    applianceName: appliance?.name || "",
    repairTitle: repair?.title || "",
  };
}

export function leadEmail({ lead, businessName, dashboardUrl }) {
  const { applianceName, repairTitle } = describeLead(lead);
  const lines = [
    `New service request for ${businessName}`,
    "",
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email && `Email: ${lead.email}`,
    lead.zip && `ZIP: ${lead.zip}`,
    applianceName && `Appliance: ${applianceName}`,
    repairTitle && `They were reading: ${repairTitle}`,
    lead.preferred_time && `Best time: ${lead.preferred_time}`,
    "",
    lead.message && `Problem:\n${lead.message}`,
    "",
    `Manage it in your dashboard: ${dashboardUrl}`,
  ].filter((l) => l !== false && l !== undefined && l !== null);
  return {
    subject: `New repair request: ${lead.name}${applianceName ? ` (${applianceName})` : ""}`,
    text: lines.join("\n"),
    replyTo: lead.email || undefined,
  };
}

// Spreadsheet programs run cells that start with = + - @ as formulas; neutralize them.
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function leadsToCsv(leads) {
  const header = ["Date", "Status", "Name", "Phone", "Email", "ZIP", "Appliance", "Guide", "Best time", "Problem", "Notes"];
  const rows = leads.map((l) => {
    const { applianceName, repairTitle } = describeLead(l);
    return [new Date(l.created_at).toISOString().slice(0, 16).replace("T", " "), l.status, l.name, l.phone, l.email, l.zip, applianceName, repairTitle, l.preferred_time, l.message, l.notes];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
