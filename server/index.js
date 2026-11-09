import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, identifyAppliance, InputError, MODEL } from "./identify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

export function createApp({ identify = identifyAppliance, isAiConfigured = aiConfigured } = {}) {
  const app = express();
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/config", (_req, res) => {
    res.json({ aiEnabled: isAiConfigured(), model: isAiConfigured() ? MODEL : null });
  });

  app.post("/api/identify", async (req, res) => {
    if (!isAiConfigured()) {
      return res.status(503).json({
        error: "Photo identification isn't set up on this server. Use the guided identifier instead.",
      });
    }
    try {
      const result = await identify(req.body || {});
      res.json(result);
    } catch (err) {
      if (err instanceof InputError) return res.status(400).json({ error: err.message });
      if (err instanceof Anthropic.RateLimitError) {
        return res.status(429).json({ error: "Too many requests right now. Please try again in a minute." });
      }
      if (err instanceof Anthropic.APIError) {
        console.error("Claude API error:", err.status, err.message);
        return res.status(502).json({ error: "The identification service is unavailable. Please try again." });
      }
      console.error(err);
      res.status(500).json({ error: "Something went wrong identifying that photo." });
    }
  });

  app.use(express.static(PUBLIC_DIR));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`FixIt Home running at http://localhost:${port}`);
    if (!aiConfigured()) console.log("ANTHROPIC_API_KEY not set — photo identification disabled, guided mode only.");
  });
}
