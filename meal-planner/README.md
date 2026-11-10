# Plate Planner

A simple, no-install meal planner for breakfast, lunch, and dinner.

## Using it

- **Shared link (hosted):** the planner is published as a claude.ai artifact. Anyone you share the link with gets their **own private plan**, saved to their account so it follows them across devices. People who can't save to an account (signed out, view-only access, or outside your organization) can still use it; their plan is kept in their browser.
- **Locally:** open `index.html` in any browser. Your plan is saved in that browser (localStorage).

To rebuild the single-file hosted version after changing the code: `python3 build-artifact.py out.html`.

## Features

- **Day / Week / Month views** — plan breakfast, lunch, and dinner for every day. Click any meal slot to add or change it; click a day in the month view to open it.
- **Meal generator** (✨ Generate meals) — fill a day, week, month, or custom date range automatically:
  - only fill empty slots (keeps what you already planned) or regenerate everything
  - pick which meals to generate (breakfast / lunch / dinner)
  - ⭐ Food Network specialty meals: mix some in (about 1 meal in 4), specialty only, or none
  - diet: any, vegetarian, vegan, or pescatarian
  - fish & seafood: any, fish dishes only, or no fish
  - low calorie (about 450 kcal or less per meal) and quick meals (≤ 30 min)
  - "don't repeat a meal within N days"
  - optional "dinner leftovers become tomorrow's lunch"
- **Grocery list** (🛒) — built from the meals planned for a day, a week, or a custom range. Ingredients are grouped by store aisle, show how many meals need them (×3) and which ones, and can be checked off as you shop. Add extra items, and copy the list to paste into a note or text. Leftover meals are skipped.
- **Calories** — every starter meal has a rough calorie estimate; the day and week views show daily totals.
- **Meal library** — 120 starter meals, including fish, vegan and low-calorie options, each with ingredients. 20 of them are ⭐ Food Network specialty recipes (Ina Garten, Ree Drummond, Giada De Laurentiis, Rachael Ray, Alton Brown, Guy Fieri, Bobby Flay), each linking to the original recipe. Add or edit your own (meal times, vegetarian/vegan/fish/quick tags, calories, ingredients) and the generator and grocery list will use them.
- **🎲 Surprise me** in the meal editor picks a random meal for just that slot.
- **Backup** — export/import your plan and library as JSON (⋯ menu). Choose Sunday or Monday week start.

Keyboard shortcuts: `←` / `→` previous/next, `t` today, `d` / `w` / `m` switch view, `g` open the generator, `l` open the grocery list.
