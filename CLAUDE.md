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
npm test              # Run tests once (Vitest, 390 tests across 12 modules)
npm run test:watch    # Watch mode
```

## Architecture

The game uses ES modules loaded via `<script type="module" src="js/main.js">` in `index.html`. No bundler, no build step.

| Module | Purpose |
|--------|---------|
| `js/main.js` | Entry point — game loop, events, AI orchestration |
| `js/gameState.js` | State machine, round management |
| `js/ai.js` | All AI decisions + evaluation |
| `js/aiExplanation.js` | Banter + "Understand Kai's Move" |
| `js/deck.js` | Card/deck operations |
| `js/hand.js` | Hand operations |
| `js/triad.js` | Completion detection |
| `js/scoring.js` | Score calculation |
| `js/rules.js` | Move validation |
| `js/ui.js` | DOM rendering |
| `js/animation.js` | Visual feedback (flip, glow) |
| `js/modals.js` | Modal system |
| `js/logging.js` | Action log + game history |
| `js/sound.js` | Web Audio synthesis |
| `js/telemetry.js` | Analytics + consent |
| `js/shell.js` | Leaderboard, share, buy, notes |

### Other Key Files

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
3. Auto-bumps service worker cache (`CACHE_NAME` in sw.js) - don't bump manually
4. Blocks if CHANGELOG.md wasn't updated (skip with `--no-verify`)
5. Syncs "Latest Version" footer in CHANGELOG.md

**IMPORTANT:** After cloning, you MUST run `git config core.hooksPath hooks` or the hook won't run. This is easy to forget and means versions won't auto-bump and tests won't gate commits.

## Conventions

- **JS style**: camelCase functions/variables, no classes, pure functions for game logic
- **Module headers**: `// ======== KAPOW! - Module Name ========`
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
2. **Manually bumping the version in index.html** — the pre-commit hook does this. Manual bumps can cause conflicts between contributors.
3. **Forgetting to update CHANGELOG.md** — the hook will block your commit. Add an entry describing what changed.
4. **Testing only on desktop** — this is a mobile-first game. Always check mobile viewport (375px width) after UI changes. Add to iPhone home screen for true PWA testing.
5. **Breaking the AI explanation modal** — `buildAiExplanation()` in `js/aiExplanation.js` builds HTML for the "Understand Kai's Move" modal. If you change AI logic, make sure the explanation still makes sense.
6. **Forgetting to export new functions** — every public function needs an `export` keyword. If tests can't find it, you forgot to export.

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
