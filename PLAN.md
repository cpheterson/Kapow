# KAPOW! — Project Plan

## Current State (02-21-2026)

Two repos in active development that have now been merged:
- **[cpheterson/Kapow](https://github.com/cpheterson/Kapow)** — original, canonical repo. Chuck's AI improvements, logging system, version footer. Desktop-first layout.
- **[epheterson/Kapow](https://github.com/epheterson/Kapow)** — Eric's fork. Mobile UI, sounds, animations, tutorial, help system, PWA. Just merged Chuck's AI fixes upstream.

**Goal:** Contribute Eric's improvements back to Chuck's repo as the single source of truth. Both collaborate via GitHub. One URL: `cpheterson.github.io/Kapow/`.

---

## Merge Plan (Eric → Chuck's repo)

### Step 1: Chuck adds Eric as collaborator
- GitHub → cpheterson/Kapow → Settings → Collaborators → Add `epheterson`
- Eric gets write access, no more PRs needed for direct work

### Step 2: Eric opens one PR into cpheterson/Kapow
Batch all of Eric's improvements into a single well-described PR:
- [ ] Mobile-first responsive layout (CSS grid, svh/dvh units)
- [ ] PWA / iOS home screen (manifest.json, sw.js, Apple meta tags)
- [ ] Sound effects (js/sound.js — Web Audio API synthesized)
- [ ] Card animations (flip, slide-in, screen shake, KAPOW glow)
- [ ] Interactive tutorial (stacked deck first game)
- [ ] How to Play modal (5 tabs: Basics, Cards, Turns, Scoring, Tips)
- [ ] Hint button (AI-powered move suggestions)
- [ ] "Understand AI's Move" lightbulb tips
- [ ] Cached player name (localStorage)
- [ ] XSS fix (player name escapeHTML)
- [ ] AI deadlock fix (empty pile handling)
- [ ] Scoring null guard fix

### Step 3: Chuck reviews and merges
Walk him through the GitHub PR UI if needed.

### Step 4: Going forward
Both push to `cpheterson/Kapow` main directly. Eric uses his fork as staging.
One rule: pull before pushing, heads-up before big CSS/JS refactors.

---

## Desktop UI (Active Work)

**Problem:** Eric's mobile-first layout doesn't make best use of desktop space. Chuck's desktop layout is functional but visually dated (no felt, no animations, no typography).

**Target:** One responsive design — same aesthetic, different layout:
- **Mobile (≤768px):** Current mobile layout (working great, don't touch)
- **Desktop (≥769px):** Larger cards, sidebar always visible, banter prominent, controls more spacious

**Desktop layout reference (Chuck's version):**
- Cards fill the center with real space (not squeezed)
- Scorecard always visible in sidebar (not hidden behind a button)
- Draw/Discard flanking the hands
- Banter/commentary visible inline (not buried in sidebar)
- Controls (Hint, End Turn, Understand AI) in a clear strip

**Status:** [ ] Not started — do after files land in Chuck's repo

---

## Version / Changelog

**Adopting Chuck's format:** `MM-DD-YYYY vN` (resets daily, increments within day)

Both repos now use `CHANGELOG.md` as changelog. Eric's PR will add all his version entries retroactively.

**Current version:** 02-21-2026 v1 (AI merge from Chuck)

**In game UI:**
- Mobile: version tag in top score bar (`v0.4.4` → switch to date format)
- Desktop: revision footer bottom-right (Chuck's style)

---

## Roadmap (Prioritized)

### Up next
- [ ] Desktop UI polish (after merge into Chuck's repo)
- [ ] Unify version display format (mobile bar + revision footer)
- [ ] Confetti on triad completion

### Polish
- [ ] AI banter as speech bubbles near AI hand (desktop)
- [ ] AI speed toggle (Normal / Fast / Instant)
- [ ] Score count-up animation at round end

### Features
- [ ] Difficulty levels (Beginner / Normal / Expert)
- [ ] Persistent stats (win/loss, streaks via localStorage)
- [ ] Undo button (snapshot state before each action)
- [ ] Local multiplayer (pass-and-play)

### Infrastructure
- [ ] Consolidate js/*.js modular files with kapow.js bundle (esbuild, ~30KB gzipped)
- [ ] Remove Export Log button once logging is mature (Chuck's note)

---

## Working Agreement

- **Chuck owns game logic** (AI heuristics, scoring, rules). Eric reviews but doesn't refactor without discussing.
- **Eric owns UI/UX** (CSS, animations, mobile). Chuck can flag issues.
- **Shared:** HTML structure, kapow.js event handling, version bumps.
- **Communication:** Quick text/email before big changes. "About to redo X, don't push for an hour."
- **Version bump every push** — date format, log entry in CHANGELOG.md.
