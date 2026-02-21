# KAPOW! Card Game

A card game inspired by [Skyjo](https://www.magilano.com/skyjo/) with extra strategic depth — power card modifiers, KAPOW! wild cards, and triad completion mechanics. Built in vanilla HTML/CSS/JavaScript with a solid AI opponent. No frameworks, no dependencies.

**[Play the original](https://cpheterson.github.io/Kapow/)** | **[Play this fork](https://epheterson.github.io/Kapow/)**

---

## Hi Dad! 👋

Saw this and had to fork it. Cool to see what you built — here's what stands out and what I've been tinkering with.

### What's great about the original

- **It's a legit game.** Not a tutorial project — KAPOW! has real strategic depth. Triad completion, power modifiers, KAPOW risk/reward, the going-out doubling penalty... lots of meaningful decisions every turn.
- **The AI is solid.** Threat modeling, synergy evaluation, discard safety analysis, future completion paths — it actually thinks about what I need and avoids feeding me useful cards.
- **"Understand AI's Move" is a great idea.** Showing players WHY the AI made each decision turns the game into a learning tool. Never seen that in a card game.
- **The banter system.** 100+ context-aware messages across 17 categories. Makes it feel like playing against someone, not something.
- **It's complete.** 10 rounds, scorecard, round-by-round breakdown, game over screen, log export. Solid foundation.

### What I changed

**Design overhaul:**
- **Comic book aesthetic** — Bangers + DM Sans typography, felt table texture with noise pattern and vignette, richer card designs with layered shadows
- **Mobile-first responsive layout** — CSS grid restructure, viewport-relative card sizing (`svh` units), `position: fixed` viewport lock for iOS Safari, rubber-band scroll prevention
- **AI mini cards** — opponent cards shrunk on mobile since they're mostly face-down, saves vertical space
- **Glassmorphic UI chrome** — score bar, sidebar overlay, buttons all use backdrop-filter blur

**Rules / Help system:**
- **"How to Play" on the name screen** + **"?" button during gameplay**
- **5 tabbed sections** — Basics, Cards, Turns, Scoring, Tips — all from your rules PDF
- **Card type badges** — visual previews for Fixed, Power, and KAPOW! cards
- **YouTube tutorial link** embedded

**Bug fixes:**
- **XSS in player name** — names with HTML characters broke the round-end screen. Added `escapeHTML()` sanitization.
- **AI deadlock on empty piles** — if both draw and discard piles ran out, the game silently froze. Now gracefully ends the turn.
- **Scoring null guard** — `applyFirstOutPenalty` was called with `null` when nobody went out.

**Infrastructure:**
- **PWA / iOS web app** — manifest.json, service worker, Apple meta tags, app icons. "Add to Home Screen" works as a standalone app.
- **iOS Safari viewport handling** — `dvh`/`svh` units, `position: fixed` viewport lock, `overscroll-behavior: none`, touch event scroll prevention

### What I want to add next

Thinking about a **hint button** (that costs points) and **confetti/particles** for triad completion.

### A note on the modular files

There are separate `js/*.js` files alongside the main `kapow.js` bundle. The HTML only loads `kapow.js` — the modular files aren't used and have drifted from the bundle in a few spots. Might be worth either wiring them up with a build step or removing them to avoid confusion. Happy to help with that.

---

## How to Play

KAPOW! is played over **10 rounds**. Lowest total score wins.

### The Cards (118 total)

| Type | Count | Description |
|------|-------|-------------|
| **Fixed** | 96 | Values 0–12. Lower is better. |
| **Power** | 16 | Modifiers (-1/+1 or -2/+2) that stack on existing cards to change their value |
| **KAPOW!** | 6 | Wild cards — assign any value 0–12 to complete a triad. **25-point penalty** if left unresolved |

### Setup

Each player gets 12 cards arranged in **4 triads** (columns of 3). All start face-down. You reveal 2 cards to start.

### On Your Turn

1. **Draw** from the deck or discard pile
2. **Place** the card in your hand (swapping out an existing card) or **discard** it (then you must reveal a face-down card)
3. Power cards can be **stacked** as modifiers beneath existing cards
4. KAPOW! cards can be **swapped** between positions after placement

### Triad Completion

When all 3 cards in a triad form a **set** (same value) or a **run** (ascending/descending sequence), the triad is **discarded for zero points**. This is how you win — eliminate entire columns from your score.

### Going Out

Declare you're going out to end the round. All other players get one final turn. **Warning:** if you don't have the lowest score, your score is **doubled**.

### Scoring

- Each remaining card scores its face value (modified by any Power cards)
- Completed triads score 0
- Unfrozen KAPOW! cards score 25
- First-out penalty: doubled if you didn't have the strictly lowest score

## Architecture

Single-file IIFE bundle (`js/kapow.js`, ~192KB unminified):

| Section | What It Does |
|---------|-------------|
| AI Banter | 100+ contextual trash-talk messages across 17 categories |
| Deck/Hand | Card creation, Fisher-Yates shuffle, deal, hand management |
| Triads | Completion detection: sets, runs, KAPOW value assignment |
| Scoring | Hand evaluation, first-out doubling penalty, winner determination |
| Game State | State machine: setup → firstTurn → playing → finalTurns → scoring → gameOver |
| AI Engine | Multi-layered heuristic evaluation with opponent modeling |
| UI | DOM rendering, modals, animations, scorecard |
| Action Log | Turn-by-turn history with text export |

### The AI

The AI opponent is the most sophisticated part of the codebase:

- **Placement scoring** evaluates every possible position using value delta, triad completion potential, synergy with revealed cards, and KAPOW timing
- **Opponent threat modeling** tracks your near-complete triads, reveal ratio, and estimated score
- **Discard safety analysis** avoids feeding you cards that complete your triads
- **Go-out timing** considers hand value, unrevealed count, and whether it would get doubled
- **Pedagogical explanations** — click "Understand AI's Move" after any AI turn to see a full breakdown of its reasoning

## Known Bugs

| Severity | Issue |
|----------|-------|
| Medium | AI `reveals` array not bounds-checked — edge case crash if <2 unrevealed cards |
| Low | Round-end screen re-rendered on every `refreshUI()` during scoring phase |

### Accessibility

- No ARIA labels on card elements
- No keyboard navigation for card selection
- No color-blind accommodations for card types

## Roadmap

Prioritized by impact-to-effort ratio:

### Up next

- [ ] **Hint button** — show suggested move, but costs points (2-3 point penalty per hint)
- [ ] **Confetti on triad completion** — canvas particle burst

### Polish

- [x] **Sound effects** — card draw, place, flip, triad completion, KAPOW moment, round end (Web Audio API, v0.3.0)
- [x] **Card flip animation** — CSS 3D rotateY for reveals (v0.3.0)
- [x] **Card slide-in animation** — slide-in on placement (v0.3.0)
- [x] **Screen shake on triad completion** — CSS keyframes (v0.3.0)
- [x] **KAPOW glow effect** — red glow burst on KAPOW placement (v0.3.0)
- [ ] **AI banter as speech bubbles** — move from sidebar to overlay near AI hand
- [ ] **AI speed toggle** — `AI_DELAY` is hardcoded at 1500ms, add Normal/Fast/Instant
- [ ] **Score count-up animation** — animate numbers at round end

### Features

- [ ] **Interactive tutorial** — first-game guidance with tooltip arrows
- [ ] **Difficulty levels** — beginner (random/greedy), normal (current), expert (deeper eval)
- [ ] **Persistent stats** — win/loss, streaks, best round via localStorage
- [ ] **Undo button** — snapshot state before each action, restore on undo
- [ ] **Achievement badges** — "Shutout" (0-point round), "Comeback Kid", "KAPOW Master"
- [ ] **Consolidate codebases** — unify modular `js/*.js` files with `kapow.js`, add build step (esbuild/rollup for ~30KB gzipped)
- [ ] **Multiplayer** — game state already supports N players

## Development

No build tools needed. Just open `index.html` in a browser or serve locally:

```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Project Structure

```
Kapow/
├── index.html              # Entry point (loads kapow.js)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline caching)
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── kapow.js            # Production bundle (4,606 lines)
│   ├── ai.js               # AI heuristics (modular, NOT loaded)
│   ├── deck.js             # Card/deck creation (modular)
│   ├── gameState.js        # State machine (modular)
│   ├── hand.js             # Hand management (modular)
│   ├── main.js             # Entry point (modular)
│   ├── rules.js            # Validation (modular)
│   ├── scoring.js          # Scoring (modular)
│   ├── triad.js            # Triad completion (modular)
│   └── ui.js               # UI rendering (modular)
├── icons/
│   ├── icon.svg            # Source icon
│   ├── icon-512.png        # PWA icon (512x512)
│   ├── icon-192.png        # PWA icon (192x192)
│   └── apple-touch-icon.png # iOS home screen icon
└── ai-banter-messages.txt  # Banter message reference
```

## Credits

Original game by [cpheterson](https://github.com/cpheterson)

Fork by [epheterson](https://github.com/epheterson) — adding design polish, mobile support, rules, and PWA
