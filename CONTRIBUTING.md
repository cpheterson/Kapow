# Contributing to KAPOW!

## Quick Start

```bash
git clone https://github.com/Play-Kapow/Kapow.git
cd Kapow
npm install                          # Install test runner (Vitest)
git config core.hooksPath hooks      # Enable pre-commit hooks
python3 -m http.server 8000          # Serve locally at http://localhost:8000
```

No build tools. No bundler. Edit → refresh → test → commit.

## Branching & Deployment

**Hosted on GitHub Pages** with per-branch preview URLs.

| Branch | URL | Purpose |
|--------|-----|---------|
| `main` | **https://playkapow.com** | Production — the live site |
| `beta` | https://play-kapow.github.io/Kapow/beta/ | Staging — preview before merging to main |
| feature branches | https://play-kapow.github.io/Kapow/{branch}/ | Per-branch previews |

### Workflow

1. **Work on `beta`** — all development happens here
2. **Test at the beta URL** — verify your changes look right
3. **PR to `main`** — open a pull request when ready to go live
4. **Merge = deploy** — push to `main` auto-deploys to playkapow.com within ~60 seconds

```bash
git checkout beta
# make changes, test locally
git add <files> && git commit -m "description"
git push origin beta
# verify at beta URL, then open PR to main
```

There's no build step. GitHub Pages serves `index.html` directly.

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

168 tests across all 7 modules using [Vitest](https://vitest.dev/):

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

### Hook Setup (important!)

After cloning, you **must** run this once:

```bash
git config core.hooksPath hooks
```

Without this, git won't find the pre-commit hook and commits will skip tests + version bumping. If your commits aren't auto-bumping versions, this is why.

## Making Changes

### Game Logic
Edit `js/kapow.js` (the production bundle). If you're changing game logic that's also in a modular file, update both to keep them in sync.

### AI (Kai)
The production AI lives in `js/kapow.js` starting around line 1945 ("AI OPPONENT" section). It's ~1,600 lines of strategic evaluation. The simplified `js/ai.js` is a subset used for testing.

### Styles
All CSS is in `css/styles.css`. Mobile-first with a `@media (min-width: 768px)` breakpoint for desktop.

### Service Worker
Service worker is currently disabled (self-unregisters on load). Was causing path issues with the custom domain. Can be re-enabled later when paths are standardized.

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

## Common Gotchas

1. **Pre-commit hook not running?** Run `git config core.hooksPath hooks` — must be done once after cloning.
2. **CHANGELOG.md not updated?** The hook blocks commits without a CHANGELOG entry. Add one, or skip with `--no-verify` for docs-only changes.
3. **Version didn't bump?** The hook compares against `origin/main`. If your remote is out of date, run `git fetch origin` first.
4. **Seeing stale content?** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R). Service worker is currently disabled.
5. **Tests fail but game works?** The modular files (`js/deck.js`, etc.) may be out of sync with `kapow.js`. Update both when changing game logic.
6. **Game logic changed in kapow.js but tests don't cover it?** The modular `js/ai.js` is a simplified subset (~300 lines) of the full AI (~1,600 lines). Some AI behaviors only exist in the production bundle.

## Repo History

This is the canonical repo under the [Play-Kapow](https://github.com/Play-Kapow) org. Previously at `cpheterson/Kapow`, transferred 2026-03-10.

| Contributor | Role |
|-------------|------|
| **Chuck** (cpheterson) | Game design, full AI engine, game logic |
| **Eric** (epheterson) | Mobile UI, animations, sounds, tutorial, PWA, monetization, telemetry, infra |
