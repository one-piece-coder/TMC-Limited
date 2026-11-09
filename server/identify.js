import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATALOG, CATALOG_IDS } from "../public/data/catalog.js";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // API limit per image

export const IdentificationSchema = z.object({
  is_appliance: z.boolean().describe("False if the photo does not show a home appliance or fixture"),
  catalog_id: z.enum([...CATALOG_IDS, "other"]).describe("Closest catalog entry, or 'other'"),
  appliance_name: z.string().describe("Plain name, e.g. 'Top-load washing machine'"),
  brand: z.string().describe("Brand if visible, otherwise empty string"),
  model_number: z.string().describe("Model number if legible on a label, otherwise empty string"),
  confidence: z.enum(["high", "medium", "low"]),
  observations: z.array(z.string()).describe("What in the photo supports the identification, or visible damage"),
  suggested_repair_ids: z
    .array(z.string())
    .describe("Ids of catalog repairs that match the user's described problem or visible issues"),
  extra_suggestions: z
    .array(
      z.object({
        symptom: z.string(),
        likely_cause: z.string(),
        fix_summary: z.string(),
        difficulty: z.enum(["easy", "moderate", "advanced"]),
        call_a_pro: z.boolean(),
        video_search_query: z.string(),
      }),
    )
    .describe("Additional repair ideas not covered by the catalog repairs"),
  safety_notes: z.array(z.string()),
  label_tip: z.string().describe("Where the user can find the model/serial label on this appliance"),
});

const catalogSummary = CATALOG.map(
  (a) => `- ${a.id} (${a.name}): ${a.repairs.map((r) => `${r.id} = "${r.symptom}"`).join("; ")}`,
).join("\n");

const SYSTEM_PROMPT = `You help do-it-yourself homeowners identify household appliances and fixtures from photos and pick safe, practical repairs.

The app has this repair catalog (appliance id: repair id = symptom):
${catalogSummary}

Identify the appliance in the photo. Map it to a catalog_id when one fits; otherwise use "other". Read brand and model numbers only when they are actually legible — leave them empty rather than guessing. Put matching catalog repair ids in suggested_repair_ids (only ids from the list above, and only for the identified appliance). Use extra_suggestions for likely repairs the catalog doesn't cover, including for "other" appliances.

Be honest about limits: mark call_a_pro true for refrigerant work, gas lines or gas valves, internal electrical panels, or anything structural. Always include brief, specific safety notes. If the photo isn't an appliance or fixture, set is_appliance false and explain in observations.`;

let client;
export function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export class InputError extends Error {}

export function validateImageInput({ image, mediaType }) {
  if (typeof image !== "string" || !image) throw new InputError("An image is required.");
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    throw new InputError(`Unsupported image type. Use one of: ${ALLOWED_MEDIA_TYPES.join(", ")}.`);
  }
  const data = image.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(data)) throw new InputError("Image must be base64 encoded.");
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) throw new InputError("Image is larger than 5 MB. Try a smaller photo.");
  return data;
}

// Remove repair ids that don't belong to the identified appliance.
export function sanitizeResult(result) {
  const appliance = CATALOG.find((a) => a.id === result.catalog_id);
  const valid = new Set(appliance ? appliance.repairs.map((r) => r.id) : []);
  return { ...result, suggested_repair_ids: result.suggested_repair_ids.filter((id) => valid.has(id)) };
}

export async function identifyAppliance({ image, mediaType, problem }) {
  const data = validateImageInput({ image, mediaType });
  const userText = problem?.trim()
    ? `The homeowner describes the problem as: """${problem.trim().slice(0, 1000)}"""`
    : "The homeowner didn't describe a problem yet. Suggest the most common repairs for this appliance.";

  const response = await getClient().messages.parse(
    {
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: { effort: "medium", format: zodOutputFormat(IdentificationSchema) },
      // Server-side refusal fallback: re-runs a declined request on a recommended model.
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: userText },
          ],
        },
      ],
    },
    { headers: { "anthropic-beta": "server-side-fallback-2026-07-01" } },
  );

  if (response.stop_reason === "refusal") {
    throw new InputError("This photo couldn't be analyzed. Try a different photo of the appliance.");
  }
  if (!response.parsed_output) {
    throw new Error(`Identification returned no result (stop_reason: ${response.stop_reason}).`);
  }
  return sanitizeResult(response.parsed_output);
}
