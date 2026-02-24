# KAPOW! Card Game - Changelog

## Version History

### 02-24-2026 v4
**Desktop layout fix + smarter AI.**
- Fixed desktop vertical overflow — replaced 146px center strip with compact inline control bar (zero scroll at 820px)
- Hidden redundant section headers and triad labels on desktop, reclaiming ~216px vertical space
- Card height formula now precisely accounts for triad padding, gaps, and borders
- AI now considers KAPOW burial when evaluating powerset placements (prefers positions that enable discarding KAPOW through triad completion)
- Bumped service worker cache (v48→v49)

### 02-24-2026 v2
**Analytics docs + SW cache bump.**
- Added analytics section to CONTRIBUTING.md (events, quick checks, debug tips)
- Bumped service worker cache (v47→v48) to force fresh version for returning users
- Updated CONTRIBUTING.md to reflect changelog enforcement

### 02-24-2026 v1
**Bug fixes + hook enforcement.**
- Fixed powerset log display — stacked power modifiers now show all values (was only showing first)
- Fixed name screen button centering — How to Play / Leaderboard were left of center on desktop
- Changelog check in pre-commit hook now blocks commit (was warn-only)
- Added app icon / favicon to tech debt tracker

### 02-23-2026 v7
**GA4 analytics.**
- Google Analytics 4 wired up with 7 custom events (game_start, tutorial_complete, round_complete, game_over, buy_cta_click, email_submit, feedback_submit)

### 02-23-2026 v6
**Security fixes.**
- XSS fix: game notes escaped via `escapeHTML()` before innerHTML
- Leaderboard score injection fix: `parseInt()` on external data
- Service worker no longer intercepts POST requests (Google Form submissions)

### 02-23-2026 v5
**Developer docs.**
- Added CONTRIBUTING.md — dev setup, architecture, deployment, versioning guide

### 02-23-2026 v4
**Full changelog backfill.**
- Reconstructed complete project history from initial commit (02-08) through current

### 02-23-2026 v3
**Test suite + git hooks infrastructure.**
- Added Vitest test suite: 133 tests across 7 modules (deck, hand, triad, scoring, rules, gameState, ai)
- Pre-commit hook: runs tests, auto-bumps version, enforces changelog updates
- Shared `hooks/` directory — Chuck runs `git config core.hooksPath hooks` once
- CHANGELOG.md backfilled with full project history from initial commit
- PLAN.md updated with AI improvement roadmap

### 02-23-2026 v2
**AI KAPOW swaps, engagement hooks, merge upstream, UI polish.**
- AI within-triad KAPOW swaps with oscillation prevention
- Engagement hooks: challenge-a-friend, global leaderboard (seeded, local-first)
- Powerset value display redesigned — modifiers shown on card face
- Merged upstream/master: AI KAPOW swaps, powerset value fixes
- Fixed cards showing as `?` after merge conflict (missing return)
- Pile selection says "either pile" (was only showing one option)
- Buy CTA updated for direct card sales
- UI polish: glows, badges, buttons, card spacing, loading states

### 02-22-2026 v4
**Email suppression + feedback form.**
- Buy CTAs suppressed once player has given their email
- Feedback form wired to Google Form with email, game log, context
- Reverted price anchoring copy (cards aren't for sale yet)
- Removed "frozen" from user-facing KAPOW card descriptions

### 02-22-2026 v3
**Feedback via Google Form (replaces mailto).**
- Feedback modal submits to Google Form instead of opening mail client
- Includes game log and device context automatically

### 02-22-2026 v2
**Game save/resume + feedback flow.**
- Game save & resume via localStorage — never lose a 30-minute game
- Mailto-based feedback flow (later replaced by Google Form in v3)
- `/play` redirect page for QR code in physical packaging
- Corrected live URL to epheterson.github.io/Kapow/
- AI renamed to "Kai" throughout README

### 02-22-2026 v1
**Buy funnel, email capture, rename AI → Kai, dopamine hits.**
- Buy modal with email capture form
- AI opponent renamed to "Kai" throughout UI
- Big "Start Game" button with breathing glow animation
- Scorecard: notes, share (Web Share API), version tag, tap-to-close
- Desktop layout width constraints, message capped at 480px
- Dopamine hits: round win celebrations, streak badges, personal bests
- Punchier card animations, juicier KAPOW placement effects
- Share crash fix (p.scores → p.roundScores), power card context
- Discard pile no longer hidden behind scorecard on desktop
- Vertically centered game on desktop, timestamped log exports
- How-to-play.txt for Chuck to edit rules text
- Removed Skyjo reference from README
- PLAN.md added as living project document

### 02-21-2026 v7
**Fix desktop piles tucked in: replaced CSS grid with flex+center on play-area.**
- `grid-template-columns: auto 1fr auto` made center column claim full viewport width, pushing piles to screen edges
- New: `display: flex; justify-content: center` — piles sit directly adjacent to cards
- `#center-strip` uses `align-self: stretch` to lock width to hand-grid

### 02-21-2026 v6
**Fix desktop vertical spacing: remove artificial spreading between hands and center strip.**
- Card formula overhead increased 165px → 280px to account for center strip + headers
- Removed fixed height from hands-column, removed `flex: 1` from center-strip
- Cards top out at ~103px on 900px viewports (still reach 130px at ≥1060px)

### 02-21-2026 v5
**Fix desktop center strip button layout: each element on its own row.**
- Message, action buttons (Hint + End Turn), and Understand AI's Move each occupy a full-width row
- `flex: 0 0 100%` enforces single-row-per-element — no horizontal shifting

### 02-21-2026 v4
**Fix piles shifting horizontally and version to footer center.**
- CSS grid (`auto 1fr auto`) locks piles in fixed columns
- Center strip uses `width: fit-content; margin: auto`
- Revision footer moved from bottom-right to bottom-center

### 02-21-2026 v3
**Stack center strip vertically: message on its own row, buttons below.**
- `flex-wrap: wrap` on center-strip, `flex: 0 0 100%` on game-message

### 02-21-2026 v2
**Fix desktop card overflow: viewport-height-based card sizing.**
- Formula: `clamp(68px, (100vh - 165px) / 6, 130px)` — 6 card rows fill available height
- Card width derives from height at fixed 100:140 aspect ratio
- Renamed VERSION_LOG.md → CHANGELOG.md

### 02-21-2026 v1
**Merged Eric's fork: mobile UI, sounds, animations, tutorial, PWA, bug fixes.**
- Mobile-first responsive layout (CSS grid, svh/dvh units, iOS Safari viewport lock)
- PWA / iOS home screen app (manifest.json, service worker, Apple meta tags)
- Sound effects via Web Audio API (flip, draw, place, triad chime, KAPOW hit, round/game end)
- Card animations (3D flip on reveal, slide-in on placement, screen shake on triad, KAPOW glow)
- Interactive tutorial — first game uses stacked deck with coaching messages; replayable from Help
- "How to Play" modal with 5 tabs (Basics, Cards, Turns, Scoring, Tips) + YouTube link
- Hint button — AI-powered best-move suggestion
- "Understand AI's Move" lightbulb tips — contextual strategic insights in explanation modal
- AI banter shown above AI hand on mobile
- Cached player name via localStorage; welcome-back message on return
- TOP row label on first triad for orientation
- XSS fix: player name sanitized with escapeHTML()
- AI deadlock fix: empty draw + discard pile no longer silently freezes the game
- Scoring null guard: applyFirstOutPenalty no longer crashes when nobody went out
- Doubling penalty explanation on round-end screen
- Also merged Chuck's AI fixes: going-out-via-triad-completion detection,
  matched-pair destruction penalty, stronger discard safety (0.4× → 1.0×),
  draw-from-discard going-out guard

### 02-20-2026 v3
**Fixed AI explanation to avoid nonsensical future completion paths when going out.**
- Explanation now focuses on going-out decision when placement triggers going out
- Clarifies why timing was right to end the round

### 02-20-2026 v2
**Strengthened discard safety penalty for opponent-completion cards.**
- Scaling factor for replaced-card discard penalty from 0.4 → 1.0
- Penalty directly proportional to danger level (stronger deterrent)

### 02-20-2026 v1
**Initial revision tracking. Software revision footer added.**
- Revision footer in lower right corner: `02-20-2026 v1`
- Created CHANGELOG.md

---

## Pre-Versioning History

*Commits before version tracking was introduced (02-08 → 02-19). Reconstructed from git log.*

### 02-19-2026
**Powerset completion range fix.**
- Widened triad completion test range to cover powerset effective values outside 0-12 (`539133b`)

### 02-17-2026
**Triad animation + pile improvements.**
- Animate triad discard card-by-card, increase commentary font (`7419984`)
- Replenish empty discard pile with top card from draw pile (`430aa45`)
- Show card count beneath discard pile matching draw pile display (`a3dafb8`)

### 02-16-2026
**AI banter system + KAPOW/Power card rules + explanation enhancements.**
- AI banter system with contextual commentary for 12 game scenarios (`fe8c7d1`)
- Block Power card modifiers and powersets on KAPOW cards (`dcccdfe`)
- KAPOW/Power modal feedback, Release Card button, scoreboard alignment (`6435792`)
- Fix false KAPOW banter, penalize point-shedding in high-value triads (`c5f0e50`)
- Enhance AI explanation modal with educational strategy details (`965e1aa`)
- AI high-value triad building, KAPOW draw valuation, going-out risk assessment (`1396fd1`)

### 02-15-2026
**AI strategic depth: synergy, KAPOW awareness, defensive play.**
- "Understand AI's Move" modal, defensive placement, swap-phase UX (`585b157`)
- Reverse AI hand rendering, position labels, KAPOW/Power path counting (`b15a096`)
- AI penalized for zero-synergy placements next to 1-revealed neighbors (`6d93354`)
- Fix: 1-revealed synergy uses direct paths only, not Power modifier paths (`6d6569e`)
- Scale KAPOW replace bonus by turn, penalize unsafe replacement discards (`f6de25d`)
- Fix AI card-piling, KAPOW awareness, swap loop, matched-pair protection (`3379393`)

### 02-14-2026
**Major AI overhaul: threat awareness, synergy protection, final turn logic.**
- Play-by-play logging, turn counter, AI threat awareness, KAPOW swap rule fix (`15079db`)
- Fix deck.js Power card count to 8 each (118 total) (`b2a2c5a`)
- Fix KAPOW cards staying frozen after triad discard (`95ba223`)
- Penalize AI for breaking existing synergy when replacing revealed cards (`651f23d`)
- AI prefers completing high-value triads over low-value ones (`8dfb041`)
- AI uses pure score-shedding on final turn (`8dd9d7c`)
- Fix round score display showing `+-5` for negative scores (`dfd4297`)
- AI discard safety checks 3-revealed opponent triads (`f560daf`)
- Keep AI placement highlight visible until player takes action (`6a0a6ef`)
- Show "Replace Powerset" label when target is a powerset (`05f564c`)
- AI preserves solo Power cards for potential powerset creation (`ace08ae`)
- Penalize AI for replacing a revealed card with same value (`2e01549`)
- Penalize AI for increasing triad value without gaining paths (`06a9fe1`)
- Scale AI path/synergy penalties by opponent threat level (`3fe284f`)

### 02-10-2026
**AI strategy upgrade.**
- Upgrade AI strategy with scored evaluation, synergy protection, smart going-out (`f852387`)

### 02-09-2026
**KAPOW swap, powerset rules, layout redesign.**
- Educational AI turn visibility with step-by-step actions (`0c18823`)
- Fix Power card count: 8 each type (16 total) per spec (`91dc96c`)
- Redesign layout: piles flank hands, message between players (`7c16278`)
- Implement KAPOW card swap with revealed-target-only logic (`ce414cc`)
- Allow powerset creation when placing any card on a solo power card (`c936a65`)

### 02-08-2026
**Initial commit — fully playable KAPOW card game.**
- Complete 2-player game (human vs AI) with 118-card deck (`51f842e`)
- Card types: 96 fixed (0-12), 16 power (±1/±2 modifiers), 6 KAPOW (wild)
- Triad completion via sets (three-of-a-kind) or runs (ascending/descending)
- 10-round game, first-out doubling penalty, lowest cumulative score wins
- Fix power card layout shift, turn order, modal, card visibility (`f7539f6`, `be7e2bd`)
- Fix AI reveal timing — AI reveals instantly with player (`15a72e1`)
- Restructure first turn: reveal is part of each player's turn (`0dea6c5`)
- Show drawn card in place on source pile with highlight (`f58b684`)
- Keep discard-drawn card visible on discard pile until placed (`472365c`)

---

## Version Numbering Convention

- Format: `MM-DD-YYYY vN` where N resets to 1 each new date
- Pre-commit hook auto-bumps version on every commit
- `scorecard-version` div in `index.html` is the source of truth

## Latest Version: 02-24-2026 v5
