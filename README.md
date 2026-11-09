# FixIt Home

A DIY home-repair web app for homeowners. It can:

- **Identify appliances from a photo.** Snap or upload a picture and Claude (vision) names the appliance, reads the brand and model number when they're legible, and tells you where to find the model label.
- **Suggest repairs.** Describe the problem and get matching step-by-step guides from the built-in catalog, plus extra AI suggestions for problems the catalog doesn't cover, with flags for when to call a pro.
- **Show video tutorials.** Every guide links to tutorial videos, and curated videos can be embedded right in the guide.
- **Track projects.** Check off steps as you go; progress is saved in the browser.

When no API key is set, a guided identifier ("Where is it in your home?") takes the place of photo identification, so the rest of the app still works.

## Run it

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # optional, enables photo identification
npm start                              # http://localhost:3000
npm test
```

Optional env vars: `PORT` (default 3000) and `CLAUDE_MODEL` (default `claude-opus-5-5`).

## Project layout

| Path | What it is |
|---|---|
| `public/data/catalog.js` | Appliances, repair guides, safety info, and video links (shared by the browser and the server) |
| `public/app.js` | Single-page app: home, search, browse, guides, identify, and My Projects |
| `server/identify.js` | Claude vision call with a structured-output schema |
| `server/index.js` | Express server: `GET /api/config`, `POST /api/identify`, static files |
| `test/` | `node --test` suite |

## Adding repairs and videos

Add an entry to the appliance's `repairs` array in `public/data/catalog.js`. Each video needs either:

- `query`, which opens a YouTube search for that repair, or
- `youtubeId`, the 11-character id from a video URL, which embeds that video in the guide (it uses `youtube-nocookie.com`).

The catalog ships with search queries. Swap in `youtubeId`s for videos you've watched and approved, or for your own branded tutorials. Photo identification picks up new catalog entries automatically.

## Disclaimer

The guides are general DIY guidance. Users should follow their appliance's manual, cut power, water, and gas before working, and call a licensed professional for gas, refrigerant, or electrical-panel work.
