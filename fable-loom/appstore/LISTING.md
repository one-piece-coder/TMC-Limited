# App Store listing: The Fable Loom

Copy these into App Store Connect. Limits are Apple's; every field below fits.

| Field | Value |
|---|---|
| App name (30) | The Fable Loom |
| Subtitle (30) | Fables with a lesson to keep |
| Bundle ID | `com.tmclimited.fableloom` (change it in `capacitor.config.json` and Xcode if you prefer another) |
| SKU | fableloom-ios-1 |
| Version | 1.0 (build 1) |
| Primary category | Books |
| Secondary category | Education |
| Price | Free |
| Age rating | 4+ (answer "None" to every content question) |
| Copyright | 2026 *your name or company* |
| Privacy policy URL | the hosted `privacy.html` (see "Hosting the privacy policy" below) |
| Support URL | a page where people can reach you, for example this repository's Issues page |

## Promotional text (170)

Every tap weaves a new fable: a flawed hero, a grand quest, and a moral you can carry into everyday life. Each tale comes with its own stained-glass window.

## Keywords (100)

```
fable,fables,story,stories,moral,lesson,bedtime,kids,aesop,tales,virtue,reading,animal,medieval
```

## Description

The Fable Loom weaves a new fable every time you ask.

Choose a lesson, pick a hero from eighteen creatures, give them a name if you like, and the Loom tells a grand tale in the old style. A proud lion, a timid fox or a greedy bear sets out to save a realm in peril. They cross storm-tossed seas and burning peaks, stumble because of their own flaw, face their darkest hour, learn better, and finally stand before a mighty guardian.

Every fable ends with a moral and a short lesson you can use in real life: at work, at school or at home.

TEN LESSONS
Patience, humility, honesty, courage, perseverance, kindness, teamwork, gratitude, prudence and generosity.

A WINDOW FOR EVERY TALE
Each fable comes with its own medieval stained-glass church window: your hero in the centre, framed by their realm, their companion on one side and the prize they seek on the other, with the virtue written in Latin beneath.

YOUR OWN SHELF
Save the fables you love. Each one is bound as a leather book with its own cover, and you can browse your shelf and open any of them again.

READ ALOUD AND SHARE
Have any fable read aloud, or share it with family and friends.

PRIVATE BY DESIGN
No account, no ads, no tracking. Stories are made on your device and the app works offline.

## App Privacy ("nutrition label")

Choose **Data Not Collected**. The app has no analytics, accounts or network calls. Saved fables stay on the device (iOS app storage).

## Notes for App Review

> No sign-in is needed. Every story and illustration is generated on the device from text and drawings built into the app, so it works fully offline. To try it: choose a lesson and hero, tap "Weave a new fable", scroll to the end for the moral, tap "Save to shelf" to see the book cover, and tap "Share" for the share sheet. "About & privacy" at the bottom of the screen shows the privacy policy.

## Screenshots

Ready in `appstore/screenshots/`, at the sizes App Store Connect asks for:

- `iphone-6.9/` 1320 × 2868 (6.9" iPhone display; App Store Connect scales these for smaller iPhones)
- `ipad-13/` 2064 × 2752 (13" iPad display; needed because the app runs on iPad)

Regenerate them with `node scripts/screenshots.js`.

## App icon

`appstore/icon-1024.png` (1024 × 1024, no transparency). It is already installed in the Xcode project. Regenerate the icon and launch image with `node scripts/art.js`.

## Hosting the privacy policy

Apple needs a public web address for the privacy policy. The simplest free option is GitHub Pages:

1. Make sure the repository is public, then open **Settings → Pages** on GitHub.
2. Set the source to the `main` branch, root folder, and save.
3. After it builds, the policy is at `https://<your-github-username>.github.io/<repository>/fable-loom/privacy.html`.
