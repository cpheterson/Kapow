# KAPOW! Card Game - Changelog

*Unified timeline. Entries tagged `[Eric]` or `[Chuck]` to indicate contributor. Version numbers are sequential per date across both contributors.*

## Version History

### 03-12-2026

**v1 [Chuck]** AI: fix draw decision missing power card modifier opportunities when 1 fd card remains (R5T29).
- AI had T3[fd,-2,P2(2)], discard was P2. Modifier on T3-bottom saves 2pts without touching fd.
- Bug 1 (kapow.js): go-out check fired before modifier evaluation, assuming any placement reveals fd — false for modifier placements on already-revealed positions.
- Bug 2 (ai.js): aiDecideDraw only checked modifier opportunities on finalTurns, not playing phase.
- Fix: evaluate modifier improvements before go-out check; skip go-out block when modifier escape ≥ 2pt exists; add playing-phase modifier check to modular AI.
- 2 regression tests added (R5T29 + guard)

### 03-11-2026

**v1 [Chuck]** AI: fix final-turn KAPOW preferring low-value completion over high-value (R2T35).
- On final turn with T2[0,0,P1]=1pt and T4[P1,6,7]=14pt, AI chose T2 over T4 for KAPOW placement
- Bug 1 (kapow.js): go-out penalty (-200) fired on finalTurns phase — irrelevant since round ends regardless
- Bug 2 (ai.js): findTriadCompletionSpot returned first match, not best; final-turn now scans all completions
- 1 regression test added (R2T35)

### 03-10-2026

**v8 [Eric]** Chore: trigger deploy workflow for per-branch preview URLs.

**v7 [Eric]** Infra: self-host fonts (Safari fix), add deploy workflow to main, update CONTRIBUTING.md for Play-Kapow org.
- Self-hosted Bangers + DM Sans woff2 (35KB) — eliminates cross-origin font loading issues on Safari
- Added `.github/workflows/deploy.yml` to main — enables GitHub Actions deploys + per-branch preview URLs
- Updated CONTRIBUTING.md: new org URL, branching workflow, accurate test count, service worker status

**v6 [Eric]** Infra: disable service worker caching, fix Safari font loading.

**v5 [Eric]** Infra: add custom domain playkapow.com via GitHub Pages CNAME.

**v4 [Chuck]** AI: fix KAPOW burial in double-KAPOW triads — skip KAPOW ↔ KAPOW no-op swap (R9T9).
- [K!, 11, K!] burial tried swapping top K! ↔ bottom K! (no-op), leaving K! on top of discard pile
- Now skips target positions that are also KAPOW, correctly swaps top K! ↔ middle 11
- 1 regression test added

**v4 [Chuck]** UI: show "Discard Completed Triad(s)" button for AI's reveal-completed triads too.
- When human goes out and AI's face-down cards reveal a complete triad, it auto-vanished after 800ms
- Now shows the same confirmation button as human triads, giving the player time to see the completion

**v2 [Chuck]** Deploy: fix GitHub Pages — switch from broken workflow mode back to branch deploy, disable stale deploy workflow.

**v1 [Chuck]** AI: smarter forced go-out from triad completion — compare doubled score vs. stuck score (R4T25).
- When completing a triad forces going out and `aiShouldGoOutWithScore` blocks it, the AI applied a blanket -200 penalty — killing the completion even when holding was worse
- Now compares doubled go-out score vs. estimated stuck score (all remaining hand points if opponent goes out first)
- If doubled is less than stuck, reduces penalty from -200 to -10 (allows completion)
- Only applies when opponent threat >= 0.5 (3+ triads completed); low-threat situations still fully block
- Fixes R4T25: Kai had T2[fd,12,12] and drew 12, but refused to complete [12,12,12] because going out with 10 doubled to 20 was "bad" — meanwhile opponent had 3 triads done and would go out soon, leaving Kai stuck with ~34 points
- 1 regression test added

### 03-09-2026

**v1 [Chuck]** AI: exclude safety swap bonus from draw-from-discard decision (R2T12).
- DISCARD SAFETY SWAP BONUS inflated placement scores during draw evaluation, causing AI to draw dangerous cards just because they could be placed (absorbing a score cost)
- The bonus is correct for placement decisions (after draw) but wrong for draw decisions (should not motivate drawing)
- Added `excludeSafetySwapBonus` option to `aiScorePlacement()`, passed from `aiEvaluateDrawFromDiscard()`
- Fixes R2T12: Kai drew 9 from discard and placed in T2-middle replacing a 5 (+4 points)
- 1 regression test added

**v1 [Chuck]** AI: gate defensive burial explanation on triad completion potential.
- "Buried when triad completes" explanation no longer shows for triads with zero completion paths
- Prevents misleading explanation when card is placed in a triad like [fd, 9, fd] (no realistic completion)

**v1 [Chuck]** UI: show completed triads before discarding on final-turn reveal.
- When face-down cards are revealed and complete triads, they no longer vanish instantly
- Human player sees completed triads highlighted green with a "Discard Completed Triad(s)" button
- AI's reveal-completed triads animate out after a brief delay
- Uses existing `triad-completing` CSS class and `animateNewlyDiscardedTriads` animation

**v1 [Chuck]** UI: fix K! within-triad swap double animation.
- Removed `runWithTriadAnimation` wrapper from within-triad swap handler
- `completeWithinTriadSwap` already has proper animation logic; wrapping it caused competing animation chains

### 03-08-2026

**v1 [Eric]** Buy page, leaderboard upgrades, and deploy workflow.
- Product landing page at `/buy/` — hero, card showcase, features, how-to-play, pricing block, photo placeholders
- Moderated reviews section — players submit feedback, approved reviews appear publicly
- Leaderboard now shows both player score AND Kai's score
- Leaderboard email now required for entry (was optional)
- Game over screen: added "Get the Real Deck" CTA button
- Buy funnel toggle: `KAPOW_BUY_MODE` routes all CTAs through `showBuyModal()` — supports `email`, `product`, or `stripe` mode
- GitHub Actions deploy workflow: `main` → prod, `beta` → `/beta/` preview
- CONTRIBUTING.md: branching strategy docs (feature → beta → main)
- Deploy workflow: every branch gets its own preview URL at `/branch-name/`

### 03-07-2026

**v4 [Chuck]** UI: add trademark symbol and "Card Game" subtitle to launch screen and scorecard header.

**v3 [Chuck]** AI: bury KAPOW after cross-triad swap completion (R2T13).
- After a cross-triad KAPOW swap completes a triad, the K! was left at the top position — landing on the discard pile where the opponent could grab it
- New burial logic in `aiStepCheckSwap()` moves K! from top to bottom (or middle) if the triad stays complete, matching the existing within-triad burial in `aiStepWithinTriadSwap()`
- Fixes R2T13: K! swapped from T2 to T1-top completing [K!,P1,0] — K! went to discard pile, opponent grabbed it and completed their T4 for 29 points
- Added `aiBuryKapowInCompletedTriad()` to modular `ai.js`
- 3 regression tests added (R2T13 scenario + 2 guard tests)

**v2 [Chuck]** AI: detect KAPOW swap completions in discard safety (R5T27).
- When opponent has [fd, F, K!], standard completionValues only checks F±1 — misses that opponent can place a card, then swap KAPOW to a different position to complete a run
- KAPOW swap expands the danger zone from F±1 to F±2: for F=3, standard={2,3,4}, swap adds {1,5}
- Applies same -40 penalty as direct completion — the swap is guaranteed, not speculative
- Fixes R5T27: Kai discarded 5 (safety=55) into [fd, 3, K!], Mindy grabbed it, swapped K! to complete [5, 4, 3] and went out
- 3 regression tests added (R5T27 scenario + 2 guard tests)

**v1 [Chuck]** AI: fix KAPOW placement scoring — seed face-down slots, don't replace known cards (R4T12).
- Fix 1: skip existingSynergyPenalty for KAPOW placements — KAPOW is wild (0-12), penalizing it for "no direct paths" with neighbors is always wrong
- Fix 2: skip discard safety swap bonus for KAPOW draws — KAPOW's low safety (15) caused systematic bias toward replacing revealed cards
- Updated modular `ai.js` Strategy 4: KAPOW prefers seeding face-down slots in triads with revealed neighbors, skips triads where it would immediately complete (handled by Strategy 1 with go-out safety), falls back to replacing highest value
- Fixes R4T12: Kai placed KAPOW in T3-middle replacing a 9, should have seeded a face-down slot
- 2 regression tests added (R4T12 scenario + guard with all-revealed triads)

### 03-06-2026

**v6 [Chuck]** UI: show game version on opening screen below Leaderboard button.
- Dynamically populated from scorecard version (single source of truth for pre-commit hook)
- Matches Leaderboard button font: 14px, DM Sans, 600 weight, 60% white

**v5 [Chuck]** UI: increase scorepad version font size (9px → 12px) for mobile readability.

**v4 [Chuck]** AI: skip triad completion when it feeds opponent's go-out (R6T20).
- When completing a triad, its cards go to the discard pile — if the opponent has just 1 triad left and any of those cards completes it, they go out and Kai is stuck with remaining hand points
- In `aiScorePlacement()`, penalty = estimated remaining hand points (typically dwarfs the 100+ completion bonus when Kai has an untouched triad left)
- Updated modular `ai.js`: completion check in Strategy 1 now detects opponent go-out and skips completion
- Fixes R6T20: Kai completed [3,3,K!] putting a 3 on discard, opponent grabbed it to complete [3,2,1] and go out
- 2 regression tests added (R6T20 scenario + guard when opponent doesn't need triad cards)

**v3 [Chuck]** Fix debug log: face-down cards now show 'fd' instead of actual hidden values.
- DEBUG placement lines like `T3 middle (11→3)` showed actual face-down values, causing false peeking concerns
- AI provably doesn't peek: scoring uses `currentValue = 6` for all unrevealed cards (line 2528)
- Proof: all-fd triads with different hidden values score identically per position in the game log
- 1 no-peek regression test added (different hidden values → same decision)

**v2 [Chuck]** AI: discard-aware placement — avoid feeding opponent completion cards (R2T22).
- Two fixes in `aiScorePlacement()`:
  1. Matched-pair offset: when destroying a pair creates a NEW pair with equal potential, offset the penalty (e.g., [6,6,7]→[7,6,7]: old pair penalty zeroed by new 7,7 pair)
  2. Discard safety swap bonus: when drawn card is dangerous (safety < 40) and replaced card is much safer (delta > 10), reward the placement up to +15
- Fixes R2T22: Kai drew 7 and discarded it (safety=21, opponent had [7,7,fd]) instead of placing in T2 and discarding the safe 6
- Updated modular `ai.js` with Strategy 6: discard safety swap (before default discard)
- 2 regression tests added

**v1 [Chuck]** AI: low-value starter bonus — prefer seeding untouched triads over marginal improvements (R3T6).
- In `aiScorePlacement()`, low cards (0-4) placed into untouched triads get +3 bonus when 2+ untouched triads remain
- Prevents wasting good starter cards on 3-point saves in developed triads that also lose completion paths
- Fixes R3T6: Kai placed 2 in T2-top (replacing 5, saving 3 pts) instead of starting T3 (untouched, better long-term value)
- Updated modular `ai.js` with matching logic (untouched triad preference in Strategy 3)
- 2 regression tests added

### 03-05-2026

**v2 [Chuck]** AI: KAPOW opportunity cost — skip low-value triad completion when KAPOW has more flexibility value (R2T16).
- In `aiScorePlacement()`, when KAPOW completes a triad, check total points saved vs a dynamic threshold (`fdCount * 3`)
- More face-down cards elsewhere = higher bar for burning KAPOW on a cheap completion
- Fixes R2T16: Kai placed KAPOW in T2 [0,K!,0] (saves 9 pts) instead of keeping it for T3 [fd,4,fd] (4 paths to completion)
- High-value completions unaffected (e.g., [10,K!,10] saves 20+ pts, always above threshold)
- Final turns excluded — only applies during `playing` phase
- Updated modular `ai.js` with matching logic
- 2 regression tests added

**v1 [Chuck]** Fix final-turn hang when all triads auto-discard after reveal (R10T39).
- After AI goes out, if the human player's remaining triads all auto-complete on reveal, the game prompted a draw with nowhere to place a card
- `advanceToNextPlayer()` now checks for an empty hand after auto-reveal/discard and skips directly to scoring
- Corner case: only happens when a player's last triads complete upon final-turn reveal

### 03-04-2026

**v12 [Chuck]** AI: fix path gain recognition in placement scoring (R1T6).
- Changed `>` to `>=` in path-doubling check in `aiScorePlacement()` — exactly doubling paths now counts as "card fits"
- Fixes R1T6: Kai placed 6 in all-face-down T4 (+8) instead of T1-top [6,4,4] (+16) because 1→2 paths was exactly doubling, not more
- 1 regression test added

**v11 [Chuck]** Tests: 3 regression tests for R2T18 path loss and R2T48 final-turn draw.
- Synced modular `ai.js` final-turn draw logic with production threshold (≤ 6)

**v10 [Chuck]** AI: smarter final-turn draw decision — prefer deck over high-value discard (R2T48).
- `aiEvaluateDrawFromDiscard()` no longer auto-draws from discard on final turns just because there's any improvement
- Only draws from discard when the card's value is ≤ 6 (at or below average deck card)
- Deck draws have no downside risk (bad draws can be discarded), so the deck is statistically better when discard is high
- Fixes R2T48: Kai drew 10 from discard to replace KAPOW (saves 15 pts) instead of drawing from deck (expected ~19 pts savings)

**v9 [Chuck]** AI: stronger path loss penalty in placement scoring (R2T18).
- Increased path loss multiplier in `aiScorePlacement()` from 8 to 15
- Each lost completion path costs ~15 expected points over remaining turns
- Fixes R2T18: Kai no longer sacrifices T3's completion flexibility for a 6-point save — places card in all-face-down T4 instead

**v8 [Chuck]** Update PLAN.md with session progress.

**v7 [Chuck]** Auto-bump service worker cache in pre-commit hook.
- Step 3 added to hook: increments `CACHE_NAME` in sw.js on every commit
- No more manual cache bumps needed — returning users always get fresh code

**v6 [Chuck]** Bump service worker cache to v55.

**v5 [Chuck]** AI: more defensive go-out decision with uncertain margins (R3T24).
- Lowered high-score caution threshold from 15 to 12 in `aiShouldGoOutWithScore()`
- Prevents going out when score is 12+ and margin is thin with opponent unknowns
- Fixes R3T24: Kai went out with 12 pts, 2-point margin, 3 opponent unknowns — doubled to 24

**v4 [Chuck]** Bump service worker cache to v54.

**v3 [Chuck]** AI: stronger discard safety when feeding opponent a triad completion (R8T20).
- Increased completion penalty in `aiEvaluateDiscardSafety()` from -25 to -40
- Fixes R8T20: Kai no longer discards a 9 into opponent's near-complete triad — safety drops from 42→27, placement penalty 8→23 (rejected)
- Applies to all near-complete triads (KAPOW or not), not just KAPOW-specific
- Added `aiEvaluateDiscardSafety()` to modular `ai.js` with matching logic
- 2 regression tests added (KAPOW triad + non-KAPOW triad, both get same penalty)

**v2 [Chuck]** Enable "Understand Kai's Move" button at round end before clicking Continue.
- Button was disabled when Kai goes out because `currentPlayer` was still AI (not human turn)
- Now also enabled during the scoring phase pre-Continue so player can review Kai's final move

### 03-03-2026

**v2 [Chuck]** AI: draw from discard on final turn when it guarantees improvement (R3T34). Show discard pile in log.
- `aiEvaluateDrawFromDiscard()` now evaluates power card modifier opportunities (not just face-value replacement)
- On final turns, any guaranteed score improvement triggers drawing from discard
- Fixes case where AI ignored P2 on discard that could reduce hand via -2 modifier, costing opponent a doubled score
- Updated modular `ai.js` with matching final-turn draw logic
- Added 2 regression tests (R3T34 modifier draw, no-improvement deck draw)

**v24 [Chuck]** AI: remove face-down card peeking — AI plays fair.
- `aiScorePlacement()` KAPOW swap lookahead no longer temporarily reveals face-down cards
- `aiFindBeneficialSwap()` no longer peeks at face-down targets for completion checks (keeps final-turn heuristic)
- Modular `ai.js` `findTriadCompletionSpot()` updated with matching no-peek logic
- Within-triad KAPOW swap now requires KAPOW to be revealed (both production and modular)
- Principle: the AI should never use information a human player wouldn't have

**v23 [Chuck]** AI: protect matched pairs from KAPOW swap destruction (R1T24).
- When KAPOW swap completion replaces a revealed card in a 2-revealed triad that already had set/run synergy, the swap bonus is zeroed out
- Prevents AI from breaking [7,7,fd] set start to create [9,K!(8),7] run via face-down peek
- Added R1T24 regression test

### 03-01-2026

**v22 [Chuck]** AI: undo face-down synergy penalty when placement completes a triad.
- `aiScorePlacement()` was penalizing KAPOW placements into face-down slots even when they completed the triad
- Synergy check used KAPOW's strategic value (15) instead of recognizing it as a wildcard, so it thought KAPOW didn't fit [11,10]
- Fix: when `placementCompletesTriad` or `placementCompletesViaKapowSwap`, undo the synergy penalty since the triad is being discarded
- Added R7T8 regression test (prefer completing high-value triad over low-value one)

**v21 [Chuck]** AI: evaluate both positive and negative modifiers for power card placement.
- `aiFindModifierOpportunity()` now loops over both modifiers instead of always picking the lowest value
- Fixes cases where +modifier completes a triad (e.g., P1 +1 on 6 in [7,6,7] → [7,7,7] set)
- Updated modular `ai.js` `findBestPowersetSpot()` with matching both-modifier logic
- Added regression test reproducing R3T17 scenario

**v20 [Chuck]** Update PLAN.md session log.

**v19 [Chuck]** AI: fix final-turn scoring to maximize point shedding.
- Modifier/powerset bonuses stripped on final turns — only pure point reduction counts
- Triad completion on final turn compared against best replacement by actual points saved
- Added final-turn awareness to modular `ai.js`
- Added 2 regression tests reproducing R6T26 and R4T32 scenarios

**v18 [Chuck]** Update PLAN.md session log.

**v17 [Chuck]** AI: cross-triad KAPOW swap lookahead for placement decisions.
- AI now considers swapping a KAPOW from another triad to complete the target triad after placement
- Fixed `aiFindBeneficialSwap()` to check face-down targets for triad completion (AI knows its own cards)
- Updated modular `triad.js` to handle KAPOW wildcards in `isTriadComplete()` (was missing)
- Updated modular `ai.js` with matching cross-triad + within-triad swap lookahead
- Added 2 regression tests (cross-triad and within-triad KAPOW swap completion)

**v16 [Chuck]** Update PLAN.md session log.

**v15 [Chuck]** Redesign turn counter above draw pile.
- Removed black background pill
- Split "Round X — Turn X" into two left-aligned lines with numbers vertically aligned
- Uses CSS grid for clean column layout

### 02-28-2026

**v14 [Chuck]** Update PLAN.md session log.

**v13 [Chuck]** Make AI go-out decision more conservative.
- Doubled-score cap lowered from 30 to 20
- High-score caution threshold lowered from 20 to 15
- Opponent final-turn improvement estimate increased from 3 to 5
- Early/mid game: AI must be strictly ahead to go out (no +5 margin)

**v12 [Chuck]** Update PLAN.md with 03-01-2026 session log.

**v11 [Chuck]** Rewrite How to Play modal text + switch headers from Bangers to DM Sans for readability.
- All 5 tabs rewritten with expanded explanations (Basics, Cards, Turns, Scoring, Tips)
- Help modal h2/h3 headers switched from Bangers display font to DM Sans body font
- Fixes blurry yellow header text on mobile

**v10 [Eric]** Docs cleanup — all URLs now point to cpheterson/Kapow as canonical repo.
- README, CONTRIBUTING, CLAUDE.md, PLAN.md updated with correct clone/deploy URLs
- CONTRIBUTING: added Common Gotchas section, hook setup emphasis, repo history updated to reflect completed merge
- CLAUDE.md: added Common Mistakes to Avoid, two-contributor workflow guidance, service worker cache reminder

**v8 [Chuck]** Shorten round-end button text to "Continue".

**v7 [Chuck]** Fix FIXED label displaced to bottom-right on mobile — keep all card type labels centered at top.

**v6 [Chuck]** Fix POWERSET label running off right edge on mobile — center it horizontally on the card.

**v5 [Chuck]** Delay round-end splash until player clicks "Round Over: Continue" — lets you see the final board state before scores appear.

**v4 [Chuck]** Power card face redesign: bold red minus and green plus signs flank the centered face value; POWER label stays at top.

**v2 [Chuck]** Refresh PLAN.md, add PLAN.md workflow rule to CLAUDE.md, master branch recovery info.

**v1 [Chuck]** Merge game logic from master branch (AI + KAPOW swap improvements).
- AI offensive strategy: recognize KAPOW-swap triad completions when evaluating placements
- Steepen discard safety formula to prevent gifting triad-completing cards to opponent
- Fix: KAPOW-swap completion bonus was inflated by placed card's value
- Strengthen discard safety scoring with two-segment formula
- KAPOW-aware `aiCountFutureCompletions` for 3-revealed triads
- Within-triad KAPOW swap: single swap (no loop), exempt top-position penalty on completion
- Validate within-triad KAPOW swaps keep triad complete after swap
- Fix: within-triad KAPOW swaps not detecting KAPOW in powersets
- Fix: AI within-triad KAPOW swaps not triggering on placement completion
- Fix: AI hang — clear `aiTurnInProgress` in `completeWithinTriadSwap`
- Fix: hang after AI within-triad KAPOW swap (missing `refreshUI` in else branch)
- Fix: human within-triad KAPOW swap hang after swap
- Fix: AI not triggering after within-triad swap discard animation

### 02-25-2026

**v17 [Eric]** Desktop UX & card redesign — Chuck's feedback.
- Card redesign: removed physical-card corner values from Fixed cards; center-top type label + large center value
- Power cards: modifiers now flank "Power" label in header row instead of bottom position
- Powerset on-card display: top card shows "Powerset" label + effective value (= N) below face value
- Desktop font sizes: game message 11px → 14px, action buttons → 13px, pile labels → 12px
- Fuzzy text fix: removed backdrop-filter blur on desktop game message, added GPU compositing hints
- Center strip: message stacked above buttons (not inline), fixed 320px width prevents card deck bouncing
- Desktop play area vertically centered in viewport
- Help button (?) restyled: larger, cleaner border, removed backdrop blur
- AI → Kai: all user-facing game messages and "Understand Move" explanations now say "Kai" instead of "AI"
- Mobile center strip: fixed height prevents button growth from shifting card hands
- Round-end screen: shows winner announcement ("You win the round!" / "Kai wins!" / "Tie!") with colored text
- Telemetry: on by default (was opt-in, blocking all data collection)
- Privacy: replaced consent banner with footer/scorecard "Privacy" link → modal with opt-out button
- Fix: discard pile cards now render with same layout as hand cards (was still using old corner-value style)
- Fix: removed "=" prefix from powerset effective value display
- Fix: clear Kai's card highlight when round ends (green highlight no longer persists into round-end screen)
- Fix: power card modifiers clipping on iOS (clamped font size, overflow hidden)
- Font fallback: Impact/Arial Black before Bangers loads (closer match than default cursive)
- Footer reordered: Feedback · Privacy · Get the Card Game
- Privacy modal text simplified
- Scorecard Share/Leaderboard row matched to full width
- Mobile score bar: visual separators between groups
- Desktop footer hidden on short viewports (< 700px height) to prevent overlap with cards
- iOS landscape: enabled vertical scrolling so game is accessible in landscape orientation
- Power card face value moved to bottom of card (balances against Power header at top, saves vertical space)
- Privacy modal: concise, honest text about data collection
- Pre-commit hook: version bump now compares against origin/main to avoid conflicts between contributors
- Fix: revert Fixed card face value back to centered (bottom positioning was worse)
- Power card face value padding increased for more breathing room
- "Understand Kai's Move" button toned down (no longer bright blue pulsing glow, matches other button style)
- Desktop footer hidden at viewport heights under 920px to prevent overlapping cards
- Scorecard buttons reordered: Leaderboard → Add Note → Export | Share row
- "Export Log" shortened to "Export"
- Scorecard shows "Get Deck" link (+ Feedback/Privacy) when footer is hidden
- Fix: modal functions (showBuyModal, showLeaderboard, hideLeaderboard, etc.) now defined — buttons were wired to nonexistent functions since original build
- Privacy opt-out is now toggleable (tap to opt out, tap again to opt back in)
- "Get Deck" link in scorecard styled with orange accent + arrow to match footer
- Leaderboard: fetches real data from telemetry API, shows top 25 lowest-score winners, medal emojis for top 3
- Leaderboard submit: prompts player after winning a game to submit score with name/email, sends via telemetry form
- Add Note: inline input in scorecard (no browser prompt dialog), notes shown below scores with round labels
- Share: Web Share API on mobile, clipboard fallback on desktop, generates shareable game summary with link
- Export: includes player notes in exported game log
- Toast notification system (replaces alert dialogs)
- Notes cleared on new game start
- Game history: completed games saved to localStorage (last 50), includes scores, rounds, notes, player ID — for future stats/history UI
- Fix: mobile score bar now updates live — shows cumulative scores and current round number (was stuck on "Round 1 You 0 Kai 0")
- Mobile layout: moved Hint + Understand Kai's Move out of center strip into secondary bar below score bar
- Center strip now just game message + End Turn — less cramped, no more accidental Understand taps
- Score bar enlarged (40px height, larger fonts) for better tap targets on mobile
- Removed extra divider between ? button and Round indicator
- All tap targets meet 36px+ minimum for mobile accessibility
- Desktop layout unchanged — Hint + Understand stay in center strip on wide screens
- Restored Hint button: uses AI scoring engine (`aiScorePlacement`) to suggest best moves — context-aware for reveal, draw, placement, and KAPOW swap phases
- Restored lightbulb takeaway tips in "Understand Kai's Move" modal — contextual coaching after each AI turn (discard strategy, triad progress, power card modifiers, etc.)

**v16 [Eric]** Telemetry system, analytics dashboard, scoreboard UX fix.
- Game telemetry (telemetry.js): anonymous stats collection via Google Form → Sheet pipeline, player consent flow, abandonment tracking, GA4 events
- Analytics dashboard (dashboard.html): live data via Apps Script API, Chart.js charts, 8 stat cards, recent games table, manual import feature
- Scoreboard close fix: defined missing `closeSidebar()`, tap-anywhere-to-close on mobile overlay, improved X button visibility
- Privacy consent banner for telemetry opt-in
- Feedback modal with game log auto-capture

### 02-24-2026

**v20 [Eric]** Unified changelog — merged VERSION_LOG.md into CHANGELOG.md with `[Eric]`/`[Chuck]` tags.

**v19 [Eric]** Fix CSS regression from dad's merge. Restored full desktop layout + UI styling; surgically applied Chuck's two CSS fixes (powerset label position/color, modifier overlap).

**v18 [Eric]** Integrated Chuck's AI strategy overhaul (batch 2).
- Steeper discard safety formula (two-segment) — prevents AI gifting triad-completing cards
- KAPOW-swap completion lookahead: AI recognizes placements that complete via one swap
- KAPOW-aware `aiCountFutureCompletions` for 3-revealed triads with KAPOW
- KAPOW burial bonus in powerset opportunity scoring
- Top-position penalty exempted when placement completes triad
- Single within-triad swap (no loop) — simplified `aiStepWithinTriadSwap`
- Human swap validates triad stays complete before executing
- Discard animation after within-triad swap completion
- AI hang fix: clear `aiTurnInProgress` in `completeWithinTriadSwap`
- Power card modifier overlap fix (CSS)
- Powerset value label shown on Power cards

**v17 [Eric]** Integrated Chuck's AI improvements (PR #1).
- AI can now perform within-triad KAPOW swaps (previously human-only)
- KAPOW detection handles powersets (KAPOW + Power modifier pairs), not just solo KAPOWs
- Added debug logging for AI decision candidates and chosen actions
- Updated `swapKapowCard`, `hasRevealedKapow`, `aiStepWithinTriadSwap` for powerset awareness

**v16 [Eric]** Desktop layout fix.
- Fixed desktop vertical overflow — replaced 146px center strip with compact inline control bar (zero scroll at 820px)
- Hidden redundant section headers and triad labels on desktop, reclaiming ~216px vertical space
- Card height formula now precisely accounts for triad padding, gaps, and borders
- Bumped service worker cache (v48→v49)

**v15 [Chuck]** Fix: KAPOW-swap completion bonus unfairly inflated vs direct completion.
- Bug: `kapowSwapExistingPoints` summed ALL 3 triad positions including the placed slot. For a placed KAPOW (value=25), this added 25 to the bonus, making the swap path score higher than a direct completion at a different slot that correctly excluded the placed position.
- Example from R2 T13: AI had T2=[11,11,10] and drew KAPOW. T2-bottom gives direct completion [11,11,K!] → score 100+22=122. T2-middle gives KAPOW-swap completion [11,K!,10]→swap K! to top→[K!,11,10] = run → score 80+46=126 (46 included the placed KAPOW=25). Wrong: mid won over bottom.
- Fix: skip `posIdx` (the placed slot) when computing `kapowSwapExistingPoints`, matching exactly how direct completion's `existingPoints` is calculated.
- Corrected scores: T2-bottom direct=122, T2-middle swap=80+21=101. Bottom wins by ~21 — AI now correctly places KAPOW at bottom to complete T2 directly, discarding 32 pts instead of 28.

**v14 [Chuck]** Steepened discard safety penalty to prevent gifting triad-completing cards.
- Root cause from R6 T26: AI drew 8, discarded it (safety=39), score -4.2. Best placement was -4.36. A margin of only 0.16 caused the mistake — the 8 completed Chuck's [9,8,8] triad.
- New two-segment formula: above safety=50, mild positive slope `(s-50)*0.15 - 2`. Below 50, steep negative `-(50-s)*0.4 - 2`, plus extra steepness below 40: `-(40-s)*0.4`.
- safety=39 → -6.8 (was -4.2), safety=25 → -18 (was -9.5), safety=80 → +2.5 (safe discards still work).

**v13 [Chuck]** AI recognizes KAPOW-swap triad completions as offensive strategy.
- Added one-step lookahead in `aiScorePlacement`: after simulating a card placement, if the triad is all-revealed but not yet complete, try all possible within-triad KAPOW swaps. If any single swap would complete the triad, award `+80 + existingPoints` bonus (nearly as valuable as direct completion at `+100 + existingPoints`).
- Same check added to the final-turn short-circuit path.
- Updated top-position KAPOW penalty exemption to also bypass when placement completes via KAPOW swap.
- Updated action reason threshold from `ps >= 100` to `ps >= 80` so KAPOW-swap completions log as "completes Triad X".
- Example: AI had [4,10,K!] and drew 8. Mid replacement saved 2 pts (score +29). Top placement makes [8,10,K!] → swap K! to mid → ascending run [8,9,10]. Now scores ~123 and is correctly chosen.

**v12 [Chuck]** Fixed Power card modifier (+/-) values overlapping "Powerset = x" label.
- `.card-power-modifiers` repositioned to `position: absolute; bottom: 6px` so it anchors at the card bottom like fixed-card values — no longer rendered in the flex flow where it collided with the powerset label.
- `.powerset-value-on-card` raised slightly from `bottom: 26px` to `bottom: 30px` to ensure clean clearance above the modifier row.
- Result: Power cards now show "Powerset = x" in red above the +/- modifiers with no overlap.

**v11 [Chuck]** Strengthened AI discard safety scoring to prevent gifting opponent triad-completing cards.
- Root cause: discard score formula `safety * 0.05 - 2` produced a tiny range (-2 to +3). A card that directly completes an opponent triad (safety=25) only scored -0.75 — barely negative. Late in the round when placement scores also collapse, even marginal placements beat -0.75, but mediocre placements (e.g., score=-1) could lose to it, letting the AI discard a card the opponent immediately uses to win the triad.
- New formula: `(safety - 50) * 0.2 - 2` with extra penalty for safety < 30.
  - Safe discard (safety=100): +8 — chosen freely when no good placement exists
  - Neutral (safety=50): -2 — slight preference for placement over discard
  - Dangerous (safety=25): -9.5 — strongly avoids giving opponent completion cards
  - KAPOW (safety=15): -12 with extra -7.5 = -19.5 — almost never discarded
- Discard reason string now includes safety value for easier log debugging.

**v10 [Chuck]** Fixed AI hang after within-triad KAPOW swap: aiTurnInProgress never cleared.
- Root cause: `aiStepWithinTriadSwap` → `completeWithinTriadSwap` → `endTurn` bypasses `aiStepCheckSwap`, which is the only place `aiTurnInProgress = false` was set. With the guard stuck at `true`, the next AI turn could never start.
- Fix: `completeWithinTriadSwap` now sets `aiTurnInProgress = false` before `endTurn` in both the animation callback path and the else (no-animation) path.
- This is the definitive fix for the within-triad swap hang — previous fixes (v7, v9) addressed `refreshUI` ordering but missed the `aiTurnInProgress` guard.

**v9 [Chuck]** Fixed hang after AI within-triad KAPOW swap: missing refreshUI in else branch of completeWithinTriadSwap.
- Root cause: after AI's placement step discards the triad (via `checkAndDiscardTriads`), it then calls `aiStepWithinTriadSwap` → `completeWithinTriadSwap`. At this point the triad is already marked discarded, so `newlyDiscarded.length === 0` and the `else` branch fires: `endTurn(state)` with no `refreshUI()` following it. The next player's turn never triggered.
- Fix: added `refreshUI()` after `endTurn(state)` in the `else` branch, matching the animation callback path which already had this correct ordering.
- Same root cause as v7 (human path) — the else branch was missed in that fix.

**v8 [Chuck]** Fixed `aiCountFutureCompletions` to be KAPOW-aware for 3-revealed triads.
- Root cause: when scoring placement of a card into a face-down slot completing [x, K, y], `aiCountFutureCompletions([x, 25, y])` treated KAPOW as fixed value 25, finding zero paths since no set/run includes 25. This caused the 3-revealed bonus to fire as -20 (zero paths penalty) instead of rewarding the many real completion paths.
- Example: [5, K, 11] previously scored 0 future paths → -20 penalty. In reality, e.g. replacing pos 0 (5) with 9 and K=10 gives [9,10,11] ascending run — a valid path.
- Fix: `aiCountFutureCompletions` now detects when one value is 25 (KAPOW placeholder) and for each candidate replacement value, tests all 13 KAPOW assignments (0-12) to find any combination that completes the triad. Mirrors `aiAnalyzeTriad`'s existing KAPOW handling.
- Impact: placing a card into a face-down slot to create [x, K, y] now correctly scores the real completion path count, making it competitive with replacing existing revealed cards.

**v7 [Chuck]** Fixed AI not taking its turn after human within-triad KAPOW swap + discard animation.
- Root cause: in `completeWithinTriadSwap`, `refreshUI()` was called before `endTurn(state)` inside the animation callback. At that point `currentPlayer` was still the human, so the AI trigger check (`!isHumanTurn`) was false and `playAITurn` was never scheduled. After `endTurn` switched `currentPlayer` to the AI, no further `refreshUI()` was called.
- Fix: swap the order to `endTurn(state)` first, then `refreshUI()` — so when `refreshUI` runs, `currentPlayer` is already the AI and the `setTimeout(playAITurn, 1000)` fires.

**v6 [Chuck]** Fixed human within-triad KAPOW swap hanging after swap.
- After a successful swap, the game showed "Swap again, or Discard Triad and End Turn" indefinitely
- Root cause: `hasRevealedKapow` is always true (KAPOW is still in the triad, just repositioned) so the code always offered another swap instead of auto-proceeding to discard
- Fix: after the swap, check the KAPOW's new position:
  - If buried (middle or bottom) → auto-proceed to `completeWithinTriadSwap` immediately
  - If still at top (swap to buried position wasn't valid) → show "Swap again" message for one more attempt
- Mirrors the AI's one-swap-and-done logic from v5

**v5 [Chuck]** Fixed within-triad KAPOW swap: one swap, no loop; KAPOW top-position penalty exempted on triad completion.
- `aiStepWithinTriadSwap` rewritten to perform exactly one swap then immediately discard:
  - No longer recurses via `setTimeout` — eliminates any risk of infinite swap loops
  - Prefers bottom burial first, falls back to middle; takes the first valid option and stops
  - If KAPOW is already at middle or bottom (already buried), skips straight to discard
  - Swap validity still confirmed via `isTriadComplete()` simulation
  - `withinTriadSwapHistory` removed — no longer needed since only one swap is ever made
- `aiScorePlacement` defensive top-position penalty now exempted when placement completes the triad:
  - Previously a KAPOW drawn to the top slot of a completing triad incurred a -17 penalty
  - This suppressed valid triad-completing KAPOW placements at the top position
  - The penalty is unnecessary when the triad completes — the within-triad swap buries KAPOW before discard
  - New `placementCompletesTriad` flag captured during simulation and checked in the penalty block

**v4 [Chuck]** AI within-triad KAPOW swap now verified to keep triad complete; human swap validated too.
- AI `aiStepWithinTriadSwap`: replaced positional-score-only logic with simulation-based validation
  - Only attempts swaps when KAPOW is at top position (middle/bottom already buried — no action needed)
  - Simulates each candidate swap via `isTriadComplete()` before committing
  - Sets (K,x,x): swap with either position always valid — correctly confirmed
  - Runs (K,m,b): swap with bottom valid except when mid=0 (ascending) or mid=12 (descending) — correctly caught
  - Swapping K with middle in a run typically breaks it — now properly skipped
  - Still prefers deepest burial (bottom=15 > middle=10)
- Human `_onCardClick` within-triad swap: added same simulation check
  - If a swap would break the triad, shows message "That swap would break the triad! Choose a different position."
  - Prevents player from accidentally clicking an invalid target position

**v3 [Eric]** Analytics docs + SW cache bump.
- Added analytics section to CONTRIBUTING.md (events, quick checks, debug tips)
- Bumped service worker cache (v47→v48) to force fresh version for returning users
- Updated CONTRIBUTING.md to reflect changelog enforcement

**v2 [Chuck]** Debug logging for AI decision candidates and chosen actions.

**v1 [Eric]** Bug fixes + hook enforcement.
- Fixed powerset log display — stacked power modifiers now show all values (was only showing first)
- Fixed name screen button centering — How to Play / Leaderboard were left of center on desktop
- Changelog check in pre-commit hook now blocks commit (was warn-only)
- Added app icon / favicon to tech debt tracker

### 02-23-2026

**v12 [Eric]** GA4 analytics.
- Google Analytics 4 wired up with 7 custom events (game_start, tutorial_complete, round_complete, game_over, buy_cta_click, email_submit, feedback_submit)

**v11 [Eric]** Security fixes.
- XSS fix: game notes escaped via `escapeHTML()` before innerHTML
- Leaderboard score injection fix: `parseInt()` on external data
- Service worker no longer intercepts POST requests (Google Form submissions)

**v10 [Chuck]** Fixed powerset value display and improved AI powerset placement strategy.
- **Powerset display fix:** Power cards on top of other Power cards now show "Powerset = x" in red bold font (e.g., P1 on top of P2 now displays the effective value)
- **AI powerset placement strategy improvements:**
  - Added +8 bonus per KAPOW card in other positions of the same triad (recognizes opportunity for defensive swaps)
  - Added +6 positional bonus for placing powersets in top position when KAPOW burial opportunities exist
  - Example: AI placing P1 on P2 in top position now scores higher when triad also has a KAPOW, encouraging strategic positioning for future swaps
  - These changes encourage the AI to facilitate KAPOW burial through within-triad swaps after triad completion
- Fixed animation issue where within-triad KAPOW swaps followed by discard now properly animates cards disappearing one at a time

**v9 [Eric]** Developer docs.
- Added CONTRIBUTING.md — dev setup, architecture, deployment, versioning guide

**v8 [Eric]** Full changelog backfill.
- Reconstructed complete project history from initial commit (02-08) through current

**v7 [Eric]** Test suite + git hooks infrastructure.
- Added Vitest test suite: 133 tests across 7 modules (deck, hand, triad, scoring, rules, gameState, ai)
- Pre-commit hook: runs tests, auto-bumps version, enforces changelog updates
- Shared `hooks/` directory — Chuck runs `git config core.hooksPath hooks` once
- CHANGELOG.md backfilled with full project history from initial commit
- PLAN.md updated with AI improvement roadmap

**v6 [Eric]** AI KAPOW swaps, engagement hooks, merge upstream, UI polish.
- AI within-triad KAPOW swaps with oscillation prevention
- Engagement hooks: challenge-a-friend, global leaderboard (seeded, local-first)
- Powerset value display redesigned — modifiers shown on card face
- Merged upstream/master: AI KAPOW swaps, powerset value fixes
- Fixed cards showing as `?` after merge conflict (missing return)
- Pile selection says "either pile" (was only showing one option)
- Buy CTA updated for direct card sales
- UI polish: glows, badges, buttons, card spacing, loading states

**v5 [Chuck]** Fixed within-triad KAPOW swaps not detecting KAPOW in powersets.
- Critical bug extension of v4 fix: KAPOW swaps only worked when KAPOW was solo
- If AI completed a triad with KAPOW in a powerset (KAPOW + Power modifier), swaps were skipped
- Example from R1 T6: AI had [KAPOW, P1(-1)], 8, 7 and completed, but didn't attempt burial swaps
- Fixed three functions to detect KAPOW in both solo and powerset forms:
  - `hasRevealedKapow()`: Now checks `posCards.length > 0` instead of `=== 1`
  - `swapKapowCard()`: Removed `sourceCards.length !== 1` check, now allows length 1 or 2
  - `aiStepWithinTriadSwap()`: Now checks `posCards.length > 0` instead of `=== 1`
- KAPOW in powersets [KAPOW, P1] or [KAPOW, P2] are now properly detected and swappable
- Swaps move entire position: KAPOW alone OR KAPOW+modifier as a unit

**v4 [Chuck]** Fixed AI within-triad KAPOW swaps not triggering on triad completion.
- Critical bug: AI would complete a triad with a revealed KAPOW and immediately discard it
- Example from R4 T4: AI placed a card completing a triad with KAPOW in top position
- Instead of swapping KAPOW to middle/bottom to bury it, AI discarded triad, leaving KAPOW on discard pile
- Root cause: Within-triad KAPOW swap phase only enabled for human player (currentPlayer === 0)
- Fixed three placement handlers to enable within-triad swaps for both human and AI:
  - `handlePlaceCard()`: check for KAPOW + completion regardless of player
  - `handleAddPowerset()`: same fix for Power card modifier placements
  - `handleCreatePowersetOnPower()`: same fix for powerset creation
- Now AI strategically buries KAPOW cards before triad discard, matching human player capability

**v3 [Chuck]** Reverted incorrect Power card scoring fix.
- Power cards were briefly treated as scoring 0 points (incorrect)
- Reverted: Power cards correctly score their face value (1 for P1, 2 for P2)
- This was causing R1 T8 bug where P1 in completed triad incorrectly had 0 value
- Correct scoring: solo Power = face value; in powerset = face + modifier

**v2 [Chuck]** Implemented AI within-triad KAPOW swaps with oscillation prevention.
- AI now performs strategic within-triad KAPOW swaps when completing triads
- Evaluates all three positions and selects optimal burial depth (bottom > middle > top)
- Adds bonus for moving KAPOW away from exposed top position
- Prevents oscillation by tracking swap history (never swaps KAPOW back to previous position)
- Includes detailed explanation in "Understand AI's Move" modal showing swap strategy
- AI recursively swaps KAPOW deeper until no better position is available
- After within-triad swaps complete, proceeds to discard triad and cross-triad KAPOW swaps

**v1 [Chuck]** New session begins on 02-23-2026.
- Version counter resets to v1 for new date
- All changes from 02-21-2026 carried forward

### 02-22-2026

**v4 [Eric]** Email suppression + feedback form.
- Buy CTAs suppressed once player has given their email
- Feedback form wired to Google Form with email, game log, context
- Reverted price anchoring copy (cards aren't for sale yet)
- Removed "frozen" from user-facing KAPOW card descriptions

**v3 [Eric]** Feedback via Google Form (replaces mailto).
- Feedback modal submits to Google Form instead of opening mail client
- Includes game log and device context automatically

**v2 [Eric]** Game save/resume + feedback flow.
- Game save & resume via localStorage — never lose a 30-minute game
- Mailto-based feedback flow (later replaced by Google Form in v3)
- `/play` redirect page for QR code in physical packaging
- Corrected live URL to epheterson.github.io/Kapow/
- AI renamed to "Kai" throughout README

**v1 [Eric]** Buy funnel, email capture, rename AI → Kai, dopamine hits.
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

### 02-21-2026

**v10 [Eric]** Fix desktop piles tucked in: replaced CSS grid with flex+center on play-area.
- `grid-template-columns: auto 1fr auto` made center column claim full viewport width, pushing piles to screen edges
- New: `display: flex; justify-content: center` — piles sit directly adjacent to cards
- `#center-strip` uses `align-self: stretch` to lock width to hand-grid

**v9 [Eric]** Fix desktop vertical spacing: remove artificial spreading between hands and center strip.
- Card formula overhead increased 165px → 280px to account for center strip + headers
- Removed fixed height from hands-column, removed `flex: 1` from center-strip
- Cards top out at ~103px on 900px viewports (still reach 130px at ≥1060px)

**v8 [Eric]** Fix desktop center strip button layout: each element on its own row.
- Message, action buttons (Hint + End Turn), and Understand AI's Move each occupy a full-width row
- `flex: 0 0 100%` enforces single-row-per-element — no horizontal shifting

**v7 [Eric]** Fix piles shifting horizontally and version to footer center.
- CSS grid (`auto 1fr auto`) locks piles in fixed columns
- Center strip uses `width: fit-content; margin: auto`
- Revision footer moved from bottom-right to bottom-center

**v6 [Eric]** Stack center strip vertically: message on its own row, buttons below.
- `flex-wrap: wrap` on center-strip, `flex: 0 0 100%` on game-message

**v5 [Eric]** Fix desktop card overflow: viewport-height-based card sizing.
- Formula: `clamp(68px, (100vh - 165px) / 6, 130px)` — 6 card rows fill available height
- Card width derives from height at fixed 100:140 aspect ratio
- Renamed VERSION_LOG.md → CHANGELOG.md

**v4 [Eric]** Merged Eric's fork: mobile UI, sounds, animations, tutorial, PWA, bug fixes.
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

**v3 [Chuck]** Redesigned powerset value display to appear directly on card.
- Powerset values now display on the fixed value card instead of below it
- Format: "Powerset = X" where X is the total value (card + all modifiers)
- Orange font (#ff9800), 14px, bold, centered above card bottom
- Prevents card layout shift caused by below-card powerset info
- Cleaner UI with improved readability for powerset values
- Removed individual modifier display and calculation details

**v2 [Chuck]** Removed frozen KAPOW property (deprecated feature).
- KAPOW cards are never frozen; this feature was removed from game long ago
- Cleaned up all references to isFrozen and assignedValue properties
- Simplified KAPOW checks from 'type === kapow && !isFrozen' to 'type === kapow'
- Removed triad freezing logic and KAPOW reset when discarded
- Code now reflects actual game mechanics where KAPOW is always wild (0-12)

**v1 [Chuck]** Implemented within-triad KAPOW swaps for strategic card positioning.
- When a placement completes a triad containing a revealed KAPOW, player can now swap it within that triad before discard
- Prevents KAPOW from being immediately exposed on the discard pile's top position
- New swap phase enters after placement but before triad discard
- Button text changes to "Discard Triad and End Turn" during within-triad swap phase
- Message box highlights with swap-phase styling
- New helper functions: `hasRevealedKapow()`, `completeWithinTriadSwap()`
- Modified `findSwapTargets()` with optional scope restriction parameter
- AI unchanged: uses normal cross-triad swap logic after discard

### 02-20-2026

**v3 [Chuck]** Fixed AI explanation to avoid nonsensical future completion paths when going out.
- When placement triggers going out, explanation now focuses on going-out decision
- Removed mention of "completion paths" that will never be needed post-game
- Explanation now clarifies why the timing was right to end the round

**v2 [Chuck]** Strengthened discard safety penalty for opponent-completion cards.
- Increased scaling factor for replaced-card discard penalty from 0.4 to 1.0
- Penalty now directly proportional to danger level (stronger deterrent)
- Prevents AI from discarding cards that would help opponent complete triads
- Example: replacing 9 with 3 now scores -2 instead of +3 when 9 completes opponent's triad

**v1 [Chuck]** Initial revision with software revision footer added.
- Added revision footer to lower right corner of page
- Format: `02-20-2026 v1` (date v{version})
- Created VERSION_LOG.md for version tracking

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
