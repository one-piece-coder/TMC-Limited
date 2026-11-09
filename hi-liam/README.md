# Hi Liam

A tiny web app. Each time you push the button it:

- says **"Hi Liam!"** on screen and out loud
- plays a short, happy tune (an original melody)
- changes the background and text colors
- changes the font

## How to run

Open `index.html` in a web browser. You don't need to install anything. Turn your sound on to hear it.

## How it works

- `speechSynthesis` is the browser's built-in voice. It reads "Hi Liam!" aloud, switching between a man's and a lady's voice each time. `bestVoice()` picks the most natural-sounding voice your device has.
- `playTune()` uses the Web Audio API to play the notes in `TUNE`, one "boop" at a time. You can change the notes to write your own song.
- `colors` is a list of background and text color pairs that are easy to read together.
- `fonts` is a list of Google Fonts.
- Two 👋 hands wave on each push. The wave is a CSS animation (`@keyframes wave-left` and `wave-right`).
- `pickNew()` picks a random color pair and font, and never the same one twice in a row.
