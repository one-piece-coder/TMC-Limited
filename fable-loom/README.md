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

Open `index.html` in any browser. No build step or server needed.

- Pick a lesson (patience, humility, honesty, courage, perseverance, kindness,
  teamwork, gratitude, prudence, generosity), a hero creature and an optional name,
  or leave them on "Any" for a surprise.
- **Another like this** keeps the lesson and hero and tells a new tale.
- **Read aloud** uses the browser's speech voice.
- **Save to shelf** keeps fables in this browser; **Copy link** shares the exact fable
  (every fable is reproducible from its number and settings).

## Files

- `js/fables.js` – the story engine and all story text (works in the browser and Node)
- `js/illustrations.js` – the stained-glass windows and hero portraits
- `js/app.js` – the page behavior
- `css/style.css` – the book-page design, light and dark

## Check the engine

```
node test/engine.test.js
```
