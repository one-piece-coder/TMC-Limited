# Meal Planner

A simple, no-install meal planner for breakfast, lunch, and dinner.

Open `index.html` in any browser — that's it. Your plan is saved automatically in the browser (localStorage).

## Features

- **Day / Week / Month views** — plan breakfast, lunch, and dinner for every day. Click any meal slot to add or change it; click a day in the month view to open it.
- **Meal generator** (✨ Generate meals) — fill a day, week, month, or custom date range automatically:
  - only fill empty slots (keeps what you already planned) or regenerate everything
  - pick which meals to generate (breakfast / lunch / dinner)
  - vegetarian-only and quick-meals-only (≤ 30 min) filters
  - "don't repeat a meal within N days"
  - optional "dinner leftovers become tomorrow's lunch"
- **Meal library** — 70 starter meals; add your own favorites (tag them as breakfast/lunch/dinner, vegetarian, quick) and the generator will use them.
- **🎲 Surprise me** in the meal editor picks a random meal for just that slot.
- **Backup** — export/import your plan and library as JSON (⋯ menu). Choose Sunday or Monday week start.

Keyboard shortcuts: `←` / `→` previous/next, `t` today, `d` / `w` / `m` switch view, `g` open the generator.
