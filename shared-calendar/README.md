# Shared Calendar

A small calendar that two people (or a few) can both sign in to and add **events** and **appointments** to.
Changes show up live for everyone who has it open. No dependencies — just Node.js 18+.

## Run it

```bash
cd shared-calendar
CALENDAR_USERS="alex:choose-a-password,sam:another-password" npm start
```

Open http://localhost:3000 and sign in as either person.

## Features

- Month view plus an "Upcoming" list
- Click any day (or **+ New**) to add an event or an appointment — title, date (or date range), all-day or start/end time, location, notes
- Click any item to edit or delete it; both people can change anything on the shared calendar
- Each item is colour-coded by who added it, and shows who last edited it
- Live updates: when one person adds or changes something, the other's screen refreshes with a notice
- Works on phones and in dark mode

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `CALENDAR_USERS` | *(required)* | Comma-separated `name:password` pairs |
| `PORT` | `3000` | Port to listen on |
| `DATA_DIR` | `./data` | Where events (`events.json`) and the session key are stored |
| `SESSION_SECRET` | auto-generated | Key used to sign login cookies |

## Sharing it with the other person

Both of you need to reach the same server. Options:

- **Same Wi-Fi:** run it on one computer and have the other person open `http://<that-computer's-IP>:3000`.
- **Anywhere:** deploy to any Node host (Render, Railway, Fly.io, a VPS) with `CALENDAR_USERS` set and a
  persistent disk for `DATA_DIR`. Serve it over HTTPS so passwords aren't sent in plain text.
