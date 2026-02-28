# Contributing to KAPOW!

## Quick Start

```bash
git clone https://github.com/epheterson/Kapow.git
cd Kapow
npm install                          # Install test runner (Vitest)
git config core.hooksPath hooks      # Enable pre-commit hooks
python3 -m http.server 8000          # Serve locally at http://localhost:8000
```

No build tools. No bundler. Edit → refresh → test → commit.

## Deployment

**Hosted on GitHub Pages** — auto-deploys on push to `main`.

Live at: **https://epheterson.github.io/Kapow/**

There's no build step. GitHub Pages serves `index.html` directly. Push to `main` and it's live within ~60 seconds.

## How Things Work

### Production Bundle

The game runs from a single IIFE bundle: `js/kapow.js` (~5,100 lines). This file contains everything — deck, hand, triads, scoring, rules, game state, AI engine, UI, tutorial, banter, action log.

### Modular Files (for testing)

Clean ES module versions of the game logic live alongside the bundle:

| Module | What It Does |
|--------|-------------|
| `js/deck.js` | Card creation, shuffle, deal, draw, replenish |
| `js/hand.js` | Position values, powerset stacking, reveal/replace/swap |
| `js/triad.js` | Completion detection (sets, runs), KAPOW value solver |
| `js/scoring.js` | Hand scoring, first-out penalty, round scores, winner |
| `js/rules.js` | Valid actions by phase, powerset/KAPOW/go-out rules |
| `js/gameState.js` | State machine: setup → firstTurn → playing → finalTurns → scoring |
| `js/ai.js` | AI decision engine (simplified version of production AI) |

These modules are **not loaded by the game** — `index.html` loads `kapow.js` directly. The modules exist for testability and will eventually replace the IIFE when the refactor happens.

### Tests

133 tests across all 7 modules using [Vitest](https://vitest.dev/):

```bash
npm test              # Run once
npm run test:watch    # Watch mode (re-runs on file change)
```

Tests live in `tests/` and mirror the module structure (`tests/deck.test.js`, etc.).

## Pre-Commit Hook

The hook runs automatically on every `git commit` (after running `git config core.hooksPath hooks`):

1. **Runs all tests** — commit blocked if any test fails
2. **Auto-bumps version** — increments `MM-DD-YYYY vN` in `index.html`. New date resets to v1.
3. **Blocks if CHANGELOG.md wasn't updated** — skip with `--no-verify` if truly not needed
4. **Syncs "Latest Version"** in CHANGELOG.md footer

You don't need to manually bump versions. The hook handles it.

## Making Changes

### Game Logic
Edit `js/kapow.js` (the production bundle). If you're changing game logic that's also in a modular file, update both to keep them in sync.

### AI (Kai)
The production AI lives in `js/kapow.js` starting around line 1945 ("AI OPPONENT" section). It's ~1,600 lines of strategic evaluation. The simplified `js/ai.js` is a subset used for testing.

### Styles
All CSS is in `css/styles.css`. Mobile-first with a `@media (min-width: 768px)` breakpoint for desktop.

### Service Worker
`sw.js` caches assets for offline play. Bump the `CACHE_VERSION` constant when you want returning users to get a fresh version.

## Versioning

- Format: `MM-DD-YYYY vN` (e.g., `02-23-2026 v4`)
- New date resets to v1, same date increments
- Pre-commit hook handles this automatically
- Version shows in the scorecard overlay and is tracked in CHANGELOG.md
- See CHANGELOG.md for full history back to initial commit

## Analytics (GA4)

Google Analytics 4 tracks player engagement. Measurement ID: `G-G9DW4L5Y5X`

**Dashboard:** [analytics.google.com](https://analytics.google.com) → KAPOW property

**Custom events tracked:**

| Event | Where | Parameters |
|-------|-------|------------|
| `game_start` | Player hits Play | `games_played` |
| `tutorial_complete` | First game tutorial finishes | — |
| `round_complete` | End of each round | `round`, `player_score`, `kai_score`, `player_won` |
| `game_over` | End of full game | `player_total`, `kai_total`, `player_won`, `rounds_played` |
| `buy_cta_click` | Any "Get KAPOW!" button tap | — |
| `email_submit` | Email captured (leaderboard or form) | `source` |
| `feedback_submit` | Feedback form submitted | — |

**Quick checks:**

```bash
# Verify gtag is loading (from browser console on the live site)
typeof gtag === 'function'  # should be true

# Check realtime: analytics.google.com → Realtime → play a game → watch events appear

# GA4 Debug View: add ?gtm_debug=1 to URL, then check DebugView in GA4 console
```

**Implementation:** gtag snippet in `index.html` `<head>`, `trackEvent()` helper called from `js/kapow.js`. Events are no-ops if gtag fails to load (ad blockers, offline).

## Repo History

| Repo | Role |
|------|------|
| [cpheterson/Kapow](https://github.com/cpheterson/Kapow) | Chuck's original — game design + AI engine |
| [epheterson/Kapow](https://github.com/epheterson/Kapow) | Eric's fork — mobile UI, sounds, animations, tutorial, PWA, monetization |

Plan: merge Eric's fork back into Chuck's canonical repo as the single source of truth.
