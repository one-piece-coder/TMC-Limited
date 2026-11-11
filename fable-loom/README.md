# The Fable Loom

A small web app that weaves grand, fable-style stories. Each tale follows a flawed
animal hero through a calamity, escalating trials, a darkest hour, a turning point and
a final guardian, then closes with a moral and a lesson you can apply in real life.

Every fable comes with a medieval stained-glass window set in a church wall: the hero
in the centre lancet before their realm, under a Latin banner naming the virtue
(*Fortitudo*, *Patientia*, ...), the companion on the left and the prize on the right.
The hero also appears in a round rose window beside the moral, the hero picker and the
saved shelf. All art is drawn in code as SVG, so there are no image files.

## Use it

Open `index.html` in any browser. No build step or server needed, and it works offline.

- Pick a lesson (patience, humility, honesty, courage, perseverance, kindness,
  teamwork, gratitude, prudence, generosity), a hero creature and an optional name,
  or leave them on "Any" for a surprise.
- **Another like this** keeps the lesson and hero and tells a new tale.
- **Read aloud** uses the browser's speech voice.
- **Save to shelf** binds the fable as a book with its own cover (leather colored by lesson, the hero in a rose window, the virtue in Latin) and places it on the bookshelf below the story, where you can browse the covers and pick one to read again. Saved fables stay in this browser; **Copy link** shares the exact fable
  (every fable is reproducible from its number and settings).

## Files

- `js/fables.js` – the story engine and all story text (works in the browser and Node)
- `js/illustrations.js` – the stained-glass windows and hero portraits
- `js/app.js` – the page behavior
- `css/style.css` – the book-page design, light and dark
- `css/fonts.css`, `fonts/` – the bundled typefaces (SIL Open Font License)
- `privacy.html` – the privacy policy
- `ios/` – the native iOS app project
- `appstore/` – icon, screenshots and the App Store listing text
- `scripts/` – build, icon and screenshot tools

## iPhone and iPad app

The `ios/` folder is a native iOS app (built with [Capacitor](https://capacitorjs.com)) that
packages these same files. In the app, **Share** opens the iOS share sheet, the shelf is
kept in iOS app storage, saving a fable gives a light haptic tap, and everything works
offline (the fonts are bundled in `fonts/`).

### Release to the App Store

You need a Mac with Xcode 16 or later and a paid Apple Developer Program membership.

1. `npm install`
2. `npm run ios:sync` (copies the web files into the iOS project)
3. `npm run ios:open`, which opens Xcode
4. In Xcode, select the **App** target → **Signing & Capabilities** and choose your team.
   Change the bundle identifier if `com.tmclimited.fableloom` isn't yours.
5. Run it on a simulator or your phone to check it.
6. In App Store Connect, create the app with the same bundle identifier and fill in the
   listing from `appstore/LISTING.md`. Upload the screenshots from `appstore/screenshots/`.
7. In Xcode choose **Product → Archive**, then **Distribute App → App Store Connect**.
8. When the build appears in App Store Connect, attach it to the version and submit for review.

Whenever you change the web files, run `npm run ios:sync` again before archiving.

## Check the engine

```
npm test
```
