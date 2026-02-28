# CLAUDE.md

## What is this?

KAPOW! is an original rummy-style card game (2-player, 10 rounds, lowest score wins) built in vanilla HTML/CSS/JavaScript with an AI opponent named "Kai". It's a mobile-first PWA deployed on GitHub Pages.

## Quick Start

```bash
npm install                          # Install Vitest
git config core.hooksPath hooks      # Enable pre-commit hooks
python3 -m http.server 8000          # Serve at http://localhost:8000
```

No build step. Edit -> refresh -> test -> commit.

## Commands

```bash
npm test              # Run tests once (Vitest, 133 tests across 7 modules)
npm run test:watch    # Watch mode
```

## Architecture

### Production vs. Modular Split

The game runs from a single IIFE bundle: **`js/kapow.js`** (~5,400 lines). This is the only JS file loaded by `index.html`. It contains everything: deck, hand, triads, scoring, rules, game state, AI, UI, tutorial, banter, action log.

Separate ES module files exist for **testing only** and are not loaded by the game:

| Module | Purpose |
|--------|---------|
| `js/deck.js` | Card creation, shuffle, deal, draw, replenish |
| `js/hand.js` | Position values, powerset stacking, reveal/replace/swap |
| `js/triad.js` | Completion detection (sets, runs), KAPOW value solver |
| `js/scoring.js` | Hand scoring, first-out penalty, round scores |
| `js/rules.js` | Valid actions by phase, powerset/KAPOW/go-out rules |
| `js/gameState.js` | State machine: setup -> firstTurn -> playing -> finalTurns -> scoring -> gameOver |
| `js/ai.js` | Simplified AI for testing (~300 lines; full AI is ~1,600 lines in kapow.js) |

**When changing game logic, update both `kapow.js` and the corresponding modular file.**

### Other Key Files

- `js/sound.js` - Web Audio API synthesized sound effects (no HTTP requests)
- `js/telemetry.js` - GA4 events, player consent, analytics pipeline
- `js/ui.js` - DOM rendering helpers, modals, animations
- `css/styles.css` - All styles, mobile-first with `@media (min-width: 768px)` for desktop
- `sw.js` - Service worker for offline caching (bump `CACHE_VERSION` to bust cache)
- `dashboard.html` - Analytics dashboard with Chart.js

## Game Mechanics (need-to-know)

- **118-card deck**: 96 fixed (0-12), 16 power cards (+-1, +-2 modifiers), 6 KAPOW wilds
- **4 triads per hand**: 3 cards each (top/middle/bottom). Complete = score 0.
- **Triad completion**: Set (all equal) or run (ascending/descending consecutive)
- **Power cards**: Stack beneath face cards as modifiers to change effective value
- **KAPOW cards**: Wild, assign any value 0-12. Unfrozen KAPOW = 25 point penalty
- **Going out**: First player out gets score doubled if not strictly lowest

## Pre-Commit Hook

Runs automatically on `git commit` (requires `git config core.hooksPath hooks`):

1. Runs all tests - blocks commit on failure
2. Auto-bumps version (`MM-DD-YYYY vN` in index.html) - don't bump manually
3. Blocks if CHANGELOG.md wasn't updated (skip with `--no-verify`)
4. Syncs "Latest Version" footer in CHANGELOG.md

## Conventions

- **JS style**: camelCase functions/variables, no classes, pure functions for game logic
- **Section headers** in kapow.js: `// ======== SECTION NAME ========`
- **Tests**: `tests/{module}.test.js` mirrors `js/{module}.js`, Vitest with `describe`/`test`/`expect`
- **CSS**: Mobile-first, single breakpoint at 768px
- **Versioning**: `MM-DD-YYYY vN` format, auto-bumped by pre-commit hook

## Deployment

GitHub Pages auto-deploys on push to `main`. Live at https://epheterson.github.io/Kapow/. No build step - serves `index.html` directly. Live within ~60 seconds of push.

## PLAN.md

**Read `PLAN.md` at the start of every session. Update it live throughout — every request, decision, change, and shipped item gets logged as it happens.**

## Recovery

- Deleted `master` branch (02-28-2026): restore with `git push origin d59e5b8:refs/heads/master`

## Contributors

- **Chuck** (cpheterson) - Game design + full AI engine
- **Eric** (epheterson) - Mobile UI, animations, sounds, tutorial, PWA, monetization
