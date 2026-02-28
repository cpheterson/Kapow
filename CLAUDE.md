# CLAUDE.md

## What is this?

KAPOW! is an original rummy-style card game (2-player, 10 rounds, lowest score wins) built in vanilla HTML/CSS/JavaScript with an AI opponent named "Kai". It's a mobile-first PWA deployed on GitHub Pages.

## Quick Start

```bash
npm install                          # Install Vitest
git config core.hooksPath hooks      # Enable pre-commit hooks (REQUIRED after every clone)
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
- `sw.js` - Service worker for offline caching (bump `CACHE_NAME` to bust cache)
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

**IMPORTANT:** After cloning, you MUST run `git config core.hooksPath hooks` or the hook won't run. This is easy to forget and means versions won't auto-bump and tests won't gate commits.

## Conventions

- **JS style**: camelCase functions/variables, no classes, pure functions for game logic
- **Section headers** in kapow.js: `// ======== SECTION NAME ========`
- **Tests**: `tests/{module}.test.js` mirrors `js/{module}.js`, Vitest with `describe`/`test`/`expect`
- **CSS**: Mobile-first, single breakpoint at 768px
- **Versioning**: `MM-DD-YYYY vN` format, auto-bumped by pre-commit hook
- **CHANGELOG**: Every commit needs a CHANGELOG.md entry (hook enforces this). Tag entries with `[Eric]` or `[Chuck]` to indicate contributor.

## Deployment

GitHub Pages auto-deploys on push to `main`. Live at https://cpheterson.github.io/Kapow/. No build step - serves `index.html` directly. Live within ~60 seconds of push.

## PLAN.md

**Read `PLAN.md` at the start of every session. Update it live throughout — every request, decision, change, and shipped item gets logged as it happens.**

## Common Mistakes to Avoid

1. **Forgetting `git config core.hooksPath hooks`** — without this, commits skip tests and don't auto-bump versions. Run it once after every fresh clone.
2. **Editing modular files but not kapow.js (or vice versa)** — the game loads `kapow.js`, tests load the modular files. They must stay in sync for game logic changes.
3. **Manually bumping the version in index.html** — the pre-commit hook does this. Manual bumps can cause conflicts between contributors.
4. **Forgetting to update CHANGELOG.md** — the hook will block your commit. Add an entry describing what changed.
5. **Not bumping `CACHE_NAME` in sw.js** — when shipping significant changes, bump it so returning users get the new version. This is NOT auto-bumped.
6. **Testing only on desktop** — this is a mobile-first game. Always check mobile viewport (375px width) after UI changes. Add to iPhone home screen for true PWA testing.
7. **Breaking the AI explanation modal** — `buildAiExplanation()` in kapow.js builds HTML that shows in the "Understand Kai's Move" modal. If you change AI logic, make sure the explanation still makes sense.

## Two Contributors, One Repo

Chuck and Eric both push to this repo. To avoid conflicts:

- **Always `git pull` before starting work** — the other person may have pushed since your last session.
- **Always `git push` when done** — don't leave unpushed commits sitting locally.
- **CHANGELOG entries tagged `[Eric]` or `[Chuck]`** — so we know who did what.
- **Version bumps handle conflicts automatically** — the pre-commit hook compares against `origin/main` and picks the higher version number.

## Recovery

- Deleted `master` branch (02-28-2026): restore with `git push origin d59e5b8:refs/heads/master`

## Contributors

- **Chuck** (cpheterson) - Game design + full AI engine
- **Eric** (epheterson) - Mobile UI, animations, sounds, tutorial, PWA, monetization
