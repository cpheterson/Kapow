# KAPOW! — PLAN.md

The living document. Updated in real-time throughout every session.

---

## Current State (02-28-2026)

**Live at:** epheterson.github.io/Kapow/ (Eric's fork, GitHub Pages)
**Canonical:** github.com/cpheterson/Kapow (Chuck's repo — now synced, single `main` branch)
**Version:** 02-28-2026 v1

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

### In Progress

### Blocked

### Next Up

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
- [ ] **Tighter go-out decision** — factor opponent's estimated score + round number more aggressively

---

*Last updated: 02-28-2026*
