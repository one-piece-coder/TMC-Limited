# Hi Liam

A tiny web app. Each time you push the button it:

- says **"Hi Liam!"** on screen and out loud
- changes the background and text colors
- changes the font

## How to run

Open `index.html` in a web browser. You don't need to install anything. Turn your sound on to hear it.

## How it works

- `speechSynthesis` is the browser's built-in voice. It reads "Hi Liam!" aloud.
- `colors` is a list of background and text color pairs that are easy to read together.
- `fonts` is a list of Google Fonts.
- `pickNew()` picks a random color pair and font, and never the same one twice in a row.
