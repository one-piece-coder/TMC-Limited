import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG, findRepair, searchCatalog } from "../public/data/catalog.js";
import { InputError, sanitizeResult, validateImageInput } from "../server/identify.js";
import { createApp } from "../server/index.js";

test("catalog entries are complete and ids are unique", () => {
  const ids = new Set();
  for (const a of CATALOG) {
    assert.ok(a.id && a.name && a.icon && a.category, `appliance ${a.id} missing fields`);
    assert.ok(a.repairs.length > 0);
    for (const r of a.repairs) {
      assert.ok(!ids.has(r.id), `duplicate repair id ${r.id}`);
      ids.add(r.id);
      assert.ok([1, 2, 3].includes(r.difficulty));
      assert.ok(r.steps.length >= 3, `${r.id} needs steps`);
      assert.ok(r.videos.length >= 1, `${r.id} needs a video`);
      for (const v of r.videos) assert.ok(v.youtubeId || v.query, `${r.id} video needs id or query`);
    }
  }
});

test("search finds relevant repairs", () => {
  const [top] = searchCatalog("dryer not heating");
  assert.equal(top.appliance.id, "dryer");
  assert.equal(findRepair("toilet", "toilet-running").id, "toilet-running");
});

test("image validation", () => {
  assert.throws(() => validateImageInput({ image: "", mediaType: "image/png" }), InputError);
  assert.throws(() => validateImageInput({ image: "abcd", mediaType: "image/tiff" }), InputError);
  assert.throws(() => validateImageInput({ image: "not base64!", mediaType: "image/png" }), InputError);
  assert.equal(validateImageInput({ image: "data:image/png;base64,aGVsbG8=", mediaType: "image/png" }), "aGVsbG8=");
});

test("sanitizeResult drops repair ids from other appliances", () => {
  const out = sanitizeResult({ catalog_id: "dryer", suggested_repair_ids: ["dryer-no-heat", "toilet-running", "bogus"] });
  assert.deepEqual(out.suggested_repair_ids, ["dryer-no-heat"]);
});

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test("API reports config and returns 503 without a key", async () => {
  await withServer(createApp({ isAiConfigured: () => false }), async (base) => {
    assert.deepEqual(await (await fetch(`${base}/api/config`)).json(), { aiEnabled: false, model: null });
    const res = await fetch(`${base}/api/identify`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(res.status, 503);
  });
});

test("API returns identification results and maps input errors to 400", async () => {
  const identify = async ({ image }) => {
    if (!image) throw new InputError("An image is required.");
    return { is_appliance: true, catalog_id: "dryer" };
  };
  await withServer(createApp({ isAiConfigured: () => true, identify }), async (base) => {
    const post = (body) =>
      fetch(`${base}/api/identify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await post({})).status, 400);
    const ok = await post({ image: "aGVsbG8=", mediaType: "image/png" });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).catalog_id, "dryer");
    const page = await fetch(`${base}/repair/dryer/dryer-no-heat`);
    assert.match(await page.text(), /FixIt Home/);
  });
});
