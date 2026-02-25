# KAPOW! Card Game - Changelog

## Version History

### 02-24-2026

**v12 [Eric]** Merged VERSION_LOG into CHANGELOG — single history file.

**v11 [Eric]** Fix CSS regression from dad's merge. Restored full desktop layout + UI styling; surgically applied Chuck's two CSS fixes (powerset label position/color, modifier overlap).

**v10 [Eric]** Integrated Chuck's AI strategy overhaul (batch 2): steeper discard safety, KAPOW-swap completion lookahead, simplified within-triad swap, AI hang fixes, powerset value on cards.

**v9 [Chuck]** Steepened discard safety formula further — two-segment: above safety=50 mild positive slope, below 50 steep negative, extra steepness below 40. Prevents gifting triad-completing cards even when placement scores are marginal.

**v8 [Chuck]** KAPOW-swap completion lookahead in `aiScorePlacement` — awards +80 + existingPoints when placement + one within-triad swap completes triad. Fixed bonus inflation bug (was including placed card's value=25 in existingPoints). Top-position penalty now exempt when placement completes.

**v7 [Chuck]** Power card modifier overlap fix (CSS: absolute positioning). Powerset value label shown directly on Power cards.

**v6 [Chuck]** Within-triad swap overhaul — validated via `isTriadComplete()` simulation, simplified to exactly one swap (no loop), prefers bottom burial. Fixed 5 hang/ordering bugs: human swap hang (`hasRevealedKapow` always true), AI turn not firing (refreshUI/endTurn order), missing refreshUI in else branch, `aiTurnInProgress` guard stuck true. KAPOW-aware `aiCountFutureCompletions` (tests all 13 KAPOW values for triads with value=25 placeholder).

**v5 [Eric]** Integrated Chuck's AI improvements (PR #1): within-triad KAPOW swaps for AI, powerset-aware KAPOW detection, debug logging.

**v4 [Eric]** Desktop layout fix — replaced 146px center strip with compact inline control bar (zero scroll at 820px). Hidden triad labels + section headers on desktop. Card height formula: `clamp(68px, calc((100vh - 112px) / 6), 120px)`.

**v3 [Chuck]** Discard safety formula `safety*0.05-2` had tiny range (-2 to +3). New formula `(safety-50)*0.2-2` with extra penalty below 30. Debug logging for AI decision candidates.

**v2 [Eric]** Analytics docs + SW cache bump (v47→v48).

**v1 [Eric]** Bug fixes: powerset log display, name screen button centering. Changelog check in pre-commit hook now blocks (was warn-only).

### 02-23-2026

**v12 [Eric]** GA4 analytics — 7 custom events (game_start, tutorial_complete, round_complete, game_over, buy_cta_click, email_submit, feedback_submit).

**v11 [Eric]** Security fixes — XSS in game notes, leaderboard score injection, SW POST bypass for Google Forms.

**v10 [Chuck]** Powerset display fix (Power-on-Power shows value). KAPOW burial bonus (+8 per nearby KAPOW, +6 for top position).

**v9 [Eric]** CONTRIBUTING.md — dev setup, architecture, deployment, versioning guide.

**v8 [Eric]** Full changelog backfill — reconstructed project history from initial commit (02-08) through current.

**v7 [Eric]** Test suite + git hooks — 133 tests (Vitest) across 7 modules, pre-commit hook (tests, auto-bump, changelog), shared `hooks/` dir.

**v6 [Eric]** Merged Chuck's AI swaps + engagement hooks + UI polish. Leaderboard, challenge-a-friend, powerset display redesign, buy CTA, glows/badges.

**v5 [Chuck]** KAPOW in powersets not detected — `length === 1` missed KAPOW+modifier pairs. Changed to `length > 0` in `hasRevealedKapow`, `swapKapowCard`, `aiStepWithinTriadSwap`.

**v4 [Chuck]** AI within-triad swaps not triggering — gated to `currentPlayer === 0` (human only). Enabled for both players in `handlePlaceCard`, `handleAddPowerset`, `handleCreatePowersetOnPower`.

**v3 [Chuck]** Reverted incorrect Power card scoring — briefly treated as 0 points. Correct: solo Power = face value (1 or 2); in powerset = face + modifier.

**v2 [Chuck]** AI within-triad KAPOW swaps with oscillation prevention — swap history tracking, depth preference bottom > middle > top, recursive evaluation.

**v1 [Chuck]** New session, carrying forward 02-21 changes.

### 02-22-2026

**v4 [Eric]** Email suppression + feedback form via Google Form with game log, device context.

**v3 [Eric]** Feedback via Google Form (replaces mailto). Auto-includes game log and device context.

**v2 [Eric]** Game save/resume via localStorage. `/play` redirect page for QR code. AI renamed to "Kai" in README.

**v1 [Eric]** Buy funnel, email capture, rename AI → Kai, dopamine hits. Scorecard (notes, share, tap-to-close), desktop layout constraints, card animations, breathing glow button, share crash fix.

### 02-21-2026

**v7 [Eric]** Fix desktop piles tucked in — replaced CSS grid with flex+center on play-area.

**v6 [Eric]** Fix desktop vertical spacing — card formula overhead 165px → 280px, removed flex:1 from center-strip.

**v5 [Eric]** Fix desktop center strip — each element on its own row via `flex: 0 0 100%`.

**v4 [Eric]** Fix piles shifting horizontally — CSS grid locks columns. Revision footer to center.

**v3 [Eric/Chuck]** Stack center strip vertically. Chuck: powerset value on card face ("Powerset = X").

**v2 [Eric/Chuck]** Viewport-height card sizing formula. Chuck: removed deprecated `isFrozen`/`assignedValue` from KAPOW cards.

**v1 [Eric/Chuck]** Merged Eric's fork into Chuck's: mobile UI, sounds, animations, tutorial, PWA, hint system, "Understand AI's Move", AI banter, XSS fix, deadlock fix, scoring guard. Chuck: within-triad KAPOW swaps (new swap phase, `hasRevealedKapow()`, `completeWithinTriadSwap()`).

### 02-20-2026

**v3 [Chuck]** Fixed AI explanation — avoids nonsensical future completion paths when going out.

**v2 [Chuck]** Strengthened discard safety penalty — scaling factor 0.4 → 1.0.

**v1 [Chuck]** Initial revision tracking. Software revision footer added.

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
