# KAPOW! — PLAN.md

The living document. Updated in real-time throughout every session.

---

## Current State (03-10-2026)

**Live at:** cpheterson.github.io/Kapow/ (GitHub Pages, auto-deploys on push to `main`)
**Repo:** github.com/cpheterson/Kapow (single `main` branch, both contributors push here)
**Version:** 03-04-2026 v8

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

## Session Log (03-10-2026)

### Shipped
- [x] AI: fix KAPOW burial in double-KAPOW triads (R9T9)
  - [K!, 11, K!] burial swapped K! ↔ K! (no-op), leaving K! on discard pile
  - Now skips KAPOW targets, correctly swaps top K! with middle 11
  - 1 regression test added
- [x] UI: show "Discard Completed Triad(s)" button for AI's reveal-completed triads
  - AI's triads auto-vanished after 800ms on final turn reveal; now pauses with button like human triads
- [x] AI: smarter forced go-out from triad completion (R4T25)
  - When completing a triad forces going out, -200 penalty was too blunt — didn't consider opponent is about to go out
  - Now compares doubled go-out score vs. stuck score; allows completion when doubled is better
  - Fixes R4T25: Kai refused to complete T2[fd,12,12] → [12,12,12] because going out with 10 (doubled 20) was "bad", while holding ~34 points was worse
  - 1 regression test added

---

## Session Log (03-09-2026)

### Shipped
- [x] AI: exclude safety swap bonus from draw-from-discard decision (R2T12)
  - DISCARD SAFETY SWAP BONUS inflated placement scores during draw evaluation
  - Added `excludeSafetySwapBonus` option to `aiScorePlacement()`, passed from `aiEvaluateDrawFromDiscard()`
  - 1 regression test added
- [x] AI: gate defensive burial explanation on triad completion potential
  - "Buried when triad completes" explanation no longer shows for triads with zero completion paths
- [x] UI: show completed triads before discarding on final-turn reveal
  - Human: "Discard Completed Triad(s)" button with green highlight
  - AI: animated discard after brief delay
- [x] UI: fix K! within-triad swap double animation
  - Removed `runWithTriadAnimation` wrapper; `completeWithinTriadSwap` already handles animation

---

## Session Log (03-07-2026)

### Shipped
- [x] AI: bury KAPOW after cross-triad swap completion (R2T13)
  - After cross-triad K! swap completes a triad, K! was left at top → went to discard pile
  - New burial logic in `aiStepCheckSwap()` moves K! from top to bottom/middle before discard
  - Matches existing within-triad burial in `aiStepWithinTriadSwap()` (only ran after direct placement)
  - Fixes R2T13: K! on discard let opponent complete T4 for 29 points (Kai only shed 1 point)
  - Added `aiBuryKapowInCompletedTriad()` to modular `ai.js`
  - 3 regression tests added (R2T13 + 2 guard tests)
- [x] AI: detect KAPOW swap completions in discard safety (R5T27)
  - `aiEvaluateDiscardSafety()` now checks if a discarded fixed card is within ±2 of the fixed value in an opponent's [fd, F, K!] triad
  - Standard completionValues only covers F±1 (in-place); swap extends to F±2 (opponent rearranges after placement)
  - Same -40 penalty as direct completion — the swap is deterministic
  - Fixes R5T27: 5 discarded into [fd, 3, K!], Mindy swapped K! to complete [5,4,3] and went out
  - 3 regression tests added (R5T27 + guard for out-of-range + guard for no double-penalty)
- [x] AI: fix KAPOW placement scoring — seed face-down slots, don't replace known cards (R4T12)
  - Fix 1 (`kapow.js` line 2679): skip existingSynergyPenalty for KAPOW — wild card has synergy with everything
  - Fix 2 (`kapow.js` line 3452): skip discard safety swap bonus for KAPOW — low safety (15) biased toward replacing revealed cards
  - Fix 3 (`ai.js` Strategy 4): KAPOW seeds face-down slots in triads with revealed neighbors, skips 2-revealed triads (completion handled by Strategy 1 with go-out safety)
  - Fixes R4T12: KAPOW placed in T3-middle (replacing the 9) instead of seeding a face-down slot
  - 2 regression tests added (R4T12 + guard with all-revealed triads)

---

## Session Log (03-06-2026)

### Shipped
- [x] Fix debug log: face-down cards now show 'fd' instead of actual hidden values
  - DEBUG lines like `T3 middle (11→3)` incorrectly showed actual fd values, causing false peeking concerns
  - AI provably doesn't peek: all-fd triads with different hidden values score identically per position
  - 1 no-peek regression test added
- [x] AI: skip triad completion when it feeds opponent's go-out (R6T20)
  - When opponent has 1 triad left and any card in our completing triad is their completion value, apply penalty = remaining hand points
  - R6T20: completing [3,3,K!] put a 3 on discard, opponent completed [3,2,1] and went out, Kai stuck with T4[fd,fd,fd] ≈ 18pts
  - Penalty (18) cancels completion bonus (106), making alternatives score higher
  - Updated modular `ai.js` with matching go-out check in Strategy 1 completion flow
  - 2 regression tests added (R6T20 + guard test)
- [x] AI: discard-aware placement — avoid feeding opponent completion cards (R2T22)
  - Fix 1: matched-pair destruction offset in `aiScorePlacement()` — when new pair created, offset the penalty
  - Fix 2: discard safety swap bonus — reward placements that avoid discarding dangerous cards
  - Fix 3: modular `ai.js` Strategy 6 — discard safety swap before default discard
  - 2 regression tests added (R2T22 scenario + guard test with safe drawn card)
- [x] UI: show game version on opening screen below Leaderboard button
  - Dynamically populated from scorecard-version (single source for pre-commit hook auto-bump)
  - Matches Leaderboard button font: 14px, DM Sans 600, rgba(255,255,255,0.6)
- [x] AI: low-value starter bonus — prefer seeding untouched triads over marginal improvements (R3T6)
  - In `aiScorePlacement()`, low cards (0-4) get +3 bonus when placed in untouched triads with 2+ untouched remaining
  - Root cause: 3-revealed path bonus (+16) made marginal improvements in developed triads beat the untouched triad bonus (+17)
  - Updated modular `ai.js` Strategy 3: check for 2+ untouched triads before high-value replacement
  - 2 regression tests added (R3T6 scenario + guard test with 1 untouched triad)

---

## Session Log (03-05-2026)

### Shipped
- [x] AI: KAPOW opportunity cost — skip low-value triad completion when KAPOW has more flexibility value (R2T16)
  - In `aiScorePlacement()`, when KAPOW completes a triad, check `totalTriadPoints < fdCount * 3` and skip completion bonus if too low
  - Fixes: Kai placed KAPOW in T2 [0,K!,0] saving 9 pts instead of keeping flexibility for T3 [fd,4,fd] with 4 completion paths
  - High-value completions and final turns unaffected
  - Updated modular `ai.js` with matching logic + KAPOW flexibility placement strategy
  - 2 regression tests added (low-value skip + high-value guard)
- [x] Fix final-turn hang when all triads auto-discard after reveal (R10T39)
  - After AI goes out, human's remaining triads all auto-completed on reveal → empty hand → draw prompt with no valid placements → hang
  - `advanceToNextPlayer()` now detects empty hand after auto-discard and skips straight to `endRound()`
  - AI already had this guard in `playAITurn()` (lines 5082-5094); human path was missing it

---

## Session Log (03-04-2026)

### Shipped
- [x] AI: fix path gain recognition — exactly doubling paths now counts as "card fits" (R1T6)
  - Changed `>` to `>=` in path-doubling check in `aiScorePlacement()` line 2755
  - Going from 1→2 paths was penalized -20 because strict `>` required MORE than doubling
  - Fixes: T1-top [6,4,4] score goes from -4 to 16, beats T4-middle's 8
  - 1 regression test added
- [x] AI: smarter final-turn draw decision — prefer deck over high-value discard (R2T48)
  - `aiEvaluateDrawFromDiscard()` now compares discard card value against avg deck value (~6)
  - Only draws from discard on final turns when card value ≤ 6; above that, deck is statistically better
  - Deck draws have no downside risk — bad draws can always be discarded
  - Fixes: Kai drew 10 from discard to replace KAPOW (saves 15) instead of deck (expected ~19 savings)
- [x] AI: stronger path loss penalty in placement scoring (R2T18)
  - Increased path loss multiplier in `aiScorePlacement()` from 8 to 15
  - Each lost path ≈ 1/13 chance per draw of shedding 15-20+ points — justifies ~15 penalty
  - Fixes: Kai placed 2 in T3-middle (killed a completion path for 6-point save) instead of T4-middle (all face-down, preserves T3 flexibility)
- [x] AI: stronger discard safety when feeding opponent a triad completion (R8T20)
  - Increased completion penalty in `aiEvaluateDiscardSafety()` from -25 to -40
  - Applies to all near-complete triads (KAPOW or not) — same defensive failure with [fd,9,9]
  - Fixes: safety for completion cards drops from 42→27, placement penalty 8→23 (rejected)
  - Added `aiEvaluateDiscardSafety()` to modular `ai.js` with matching logic
  - 2 regression tests added
- [x] AI: more defensive go-out decision with uncertain margins (R3T24)
  - Lowered high-score caution threshold from 15 to 12 in `aiShouldGoOutWithScore()`
  - Fixes: Kai went out with 12 pts, 2-point margin over estimated opponent, 3 unknowns — doubled to 24
- [x] Auto-bump service worker cache in pre-commit hook
  - Step 3 added: increments `CACHE_NAME` in sw.js on every commit
  - No more manual cache bumps — returning users always get fresh code
  - Updated CLAUDE.md: added step 3, removed manual bump from common mistakes

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

## Session Log (03-03-2026)

### Shipped
- [x] Remove face-down card peeking from AI — AI plays fair
  - KAPOW swap lookahead in `aiScorePlacement()` no longer temporarily reveals face-down cards
  - `aiFindBeneficialSwap()` no longer peeks at face-down targets for completion checks (keeps final-turn heuristic)
  - Modular `ai.js` `findTriadCompletionSpot()` updated with matching no-peek logic
  - Within-triad KAPOW swap now requires KAPOW to be revealed (both production and modular)
  - Principle: the AI should never use information a human player wouldn't have
  - All 140 tests pass (R2T18 cross-triad test still works — KAPOW replacing a face-down creates all-revealed triad)
- [x] AI draws from discard on final turn when guaranteed improvement exists (R3T34)
  - `aiEvaluateDrawFromDiscard()` now evaluates power card modifier opportunities (not just face-value replacement)
  - On final turns, any positive score improvement triggers drawing from discard
  - Fixes: AI ignored P2 on discard that could reduce hand [3,4,4] to [1,4,4] via -2 modifier, missing the chance to force opponent's score doubling
  - Updated modular `ai.js` with matching logic
  - 2 regression tests added (R3T34 scenario + no-improvement guard)
- [x] Show discard pile top card in game log turn headers
  - Format: `--- Turn N: Player --- (discard: P2)` — log is now self-contained for analysis
- [x] Enable "Understand Kai's Move" button at round end before Continue
  - Button was disabled when Kai goes out because `currentPlayer` was still AI
  - Now enabled during scoring phase pre-Continue so player can review Kai's final move

### In Progress
- [ ] Power card face redesign: minus/plus signs flanking center value, POWER label stays at top

### Blocked

### Next Up

---

## Session Log (03-02-2026)

### Shipped
- [x] AI evaluates both positive and negative modifiers for power card placement
  - `aiFindModifierOpportunity()` now loops over both modifiers instead of always picking the lowest
  - Fixes cases where +modifier completes a triad (e.g., P1 +1 on 6 in [7,6,7] → [7,7,7])
  - Updated modular `ai.js` with matching logic
  - 1 regression test added (R3T17 scenario)
- [x] Fix face-down synergy penalty applying when placement completes triad
  - KAPOW into [fd,11,10] was penalized -35 because synergy check used strategic value 15 (not wildcard)
  - Penalty is now undone when completion is detected — triad is being discarded, synergy is irrelevant
  - Also applies to KAPOW-swap completions
  - 1 regression test added (R7T8: high-value triad completion preferred over low-value)
- [x] Protect matched pairs from KAPOW swap destruction (R1T24)
  - When KAPOW swap completion replaces a revealed card in a 2-revealed triad with synergy, swap bonus zeroed
  - Prevents AI from breaking [7,7,fd] set start via face-down peek KAPOW swap
  - 1 regression test added (R1T24 scenario)

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

*Last updated: 03-10-2026*
