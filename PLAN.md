# KAPOW! — PLAN.md

The living document. Updated in real-time throughout every session.

---

## Current State (03-02-2026)

**Live at:** cpheterson.github.io/Kapow/ (GitHub Pages, auto-deploys on push to `main`)
**Repo:** github.com/cpheterson/Kapow (single `main` branch, both contributors push here)
**Version:** 03-02-2026 v21

### What's Working
- Full 2-player game vs Kai (AI opponent)
- Interactive tutorial (first game, auto-completes after 7 turns)
- Sound effects (Web Audio API, all synthesized, zero HTTP)
- PWA (home screen app, offline capable)
- Mobile + desktop responsive layout
- Hint system + AI move explanation modal
- Scorecard with notes, share results, export log
- Buy funnel: engagement-tiered CTAs (name screen, game over, round end, footer)
- Google Form email capture
- Dopamine hits: round win celebrations, streak badges, personal best detection
- Leaderboard (top 25 lowest-score winners from telemetry API)
- Game history saved to localStorage (last 50 games)

---

## Session Log (03-01-2026)

### Shipped
- [x] Rewrite How to Play modal — all 5 tabs rewritten with expanded game explanations
- [x] Fix blurry help modal headers on mobile — switched h2/h3 from Bangers to DM Sans
- [x] Update hint text for draw phase
- [x] Make AI go-out decision more conservative
  - Doubled-score cap 30→20, high-score caution 20→15, opponent final-turn estimate 3→5
  - Early/mid game: AI must be strictly ahead to go out (removed +5 margin)
- [x] Redesign turn counter — removed black background, split into two left-aligned lines with numbers vertically aligned via CSS grid
- [x] AI cross-triad KAPOW swap lookahead — placement scoring now considers swapping a KAPOW from another triad to complete the target triad
  - Fixed `aiFindBeneficialSwap()` to check face-down targets for triad completion
  - Updated modular `triad.js` with KAPOW wildcard support in `isTriadComplete()`
  - 2 regression tests added (cross-triad + within-triad scenarios)
- [x] Fix final-turn scoring — AI now sheds maximum points on last turn
  - Modifier/powerset bonuses stripped on final turns (pure point reduction only)
  - Triad completion compared against best replacement by actual points saved
  - 2 regression tests added (R6T26 powerset vs replacement, R4T32 completion vs replacement)

## Session Log (03-02-2026)

### Shipped
- [x] AI evaluates both positive and negative modifiers for power card placement
  - `aiFindModifierOpportunity()` now loops over both modifiers instead of always picking the lowest
  - Fixes cases where +modifier completes a triad (e.g., P1 +1 on 6 in [7,6,7] → [7,7,7])
  - Updated modular `ai.js` with matching logic
  - 1 regression test added (R3T17 scenario)

### In Progress
- [ ] Power card face redesign: minus/plus signs flanking center value, POWER label stays at top

### Blocked

### Next Up

---

## Session Log (02-28-2026)

### Shipped
- [x] Merged PR #1 (epheterson/main → cpheterson/main) — all of Eric's work into canonical
- [x] Merged game logic from `master` branch (AI + KAPOW swap improvements) into `main`
  - AI offensive strategy, discard safety formula, within-triad KAPOW swap fixes
  - Kept main's UI, resolved conflicts (Power card rendering, Kai naming)
- [x] Deleted `master` branch — single `main` branch going forward (recoverable: `d59e5b8`)
- [x] Added `CLAUDE.md` (project-level) — architecture, conventions, game mechanics reference
- [x] Added `~/.claude/CLAUDE.md` (global) — working style preferences
- [x] Set up dev environment: npm install, git hooks, local server
- [x] Status line configured (project / branch / model + context %)
- [x] CHANGELOG updated with master branch AI improvements
- [x] Delay round-end splash until player clicks "Round Over: Continue" button
  - Added `roundEndAcknowledged` flag, gated `showRoundEnd()` in `refreshUI()`, handled click in `onEndTurn()`, reset in `onNextRound()`
- [x] Fix POWERSET label not centered on mobile — conflicting `left`/`right`/`transform` in 480px breakpoint
- [x] Fix FIXED label displaced to bottom-right on mobile — keep all card type labels centered at top
- [x] Shorten round-end button text to "Continue"

---

## Revenue Architecture

**Phase 1 (now):** DTC physical sales via Stripe Payment Links ($19.99 + shipping)
**Phase 2:** $1.99 digital unlock (round 3 paywall, Stripe Payment Links, zero backend)
**Phase 3:** Multiplayer (solo → pass-play → local-table → remote, WebSocket server)
**Phase 4:** Amazon listing for organic discovery

`KAPOW_BUY_MODE` constant controls funnel: `'email'` (pre-launch capture) → `'amazon'` (direct link to Stripe/Amazon)

---

## Tech Debt

- [ ] **IIFE → ES Module refactor** — modular files exist for testing, production still runs from single kapow.js IIFE
- [ ] **Port full AI to modular ai.js** — current test version is simplified (~300 lines vs ~1,600 in production)
- [ ] **App icon / favicon** — current PWA icons are placeholder
- [ ] Desktop layout polish (left/right or better top/down for wide screens)

## AI Improvement Ideas

- [ ] **Cross-turn memory** — track what opponent draws from discard to infer their strategy
- [ ] **Personality system** — difficulty levels via aggressive/conservative/chaotic AI styles
- [x] **Tighter go-out decision** — factor opponent's estimated score + round number more aggressively (shipped 03-01-2026)
- [x] **Cross-triad KAPOW swap lookahead** — AI considers KAPOW swaps from other triads when evaluating placement (shipped 03-01-2026)
- [x] **Final-turn point shedding** — strip powerset/modifier bonuses on last turn, compare all options by actual points saved (shipped 03-01-2026)
- [x] **Both-modifier evaluation** — try both positive and negative modifiers for triad completion (shipped 03-02-2026)

---

*Last updated: 03-02-2026*
