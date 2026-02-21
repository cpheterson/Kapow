# KAPOW! Card Game

A strategic card game inspired by [Skyjo](https://www.magilano.com/skyjo/), with power card modifiers, KAPOW! wild cards, and triad completion mechanics. Built in vanilla HTML/CSS/JavaScript with a sophisticated AI opponent. No frameworks, no dependencies, playable in any browser.

**[Play now →](https://cpheterson.github.io/Kapow/)**

---

## How to Play

KAPOW! is played over **10 rounds**. Lowest total score wins.

### The Cards (118 total)

| Type | Count | Description |
|------|-------|-------------|
| **Fixed** | 96 | Values 0–12. Lower is better. |
| **Power** | 16 | Modifiers (±1 or ±2) that stack on existing cards to change their value |
| **KAPOW!** | 6 | Wild cards — assign any value 0–12 to complete a triad. **25-point penalty** if left unresolved |

### Setup

Each player gets 12 cards arranged in **4 triads** (columns of 3). All start face-down. You reveal 2 cards to start.

### On Your Turn

1. **Draw** from the deck or discard pile
2. **Place** the card in your hand (swapping out an existing card) or **discard** it
3. Power cards can be **stacked** as modifiers beneath existing cards
4. KAPOW! cards can be **swapped** between positions after placement

### Triad Completion

When all 3 cards in a triad form a **set** (same value) or a **run** (consecutive sequence), the triad is **discarded for zero points**. This is how you win — eliminate entire columns from your score.

### Going Out

When all your cards are revealed or discarded, the round ends. All other players get one final turn. **Warning:** if you go out first but don't have the lowest score, your score is **doubled**.

### Scoring

- Remaining cards score their face value (modified by any Power cards)
- Completed triads score 0
- Unplaced KAPOW! cards score 25
- First-out penalty: score doubled if not strictly lowest

---

## Features

- **Sophisticated AI opponent** — threat modeling, discard safety analysis, going-out timing, matched-pair protection
- **"Understand AI's Move"** — explains the AI's reasoning after every turn, with strategic takeaway tips
- **Hint button** — suggests the best move when you're stuck
- **Interactive tutorial** — first game uses a guided deck to teach triads, power cards, and KAPOW! mechanics
- **Sound effects** — Web Audio API synthesized sounds (flip, draw, place, triad chime, KAPOW hit)
- **Card animations** — flip on reveal, slide-in on placement, screen shake on triad completion, KAPOW glow
- **Mobile-first responsive layout** — works great on phones and tablets, add to iPhone home screen as a standalone app
- **100+ AI banter messages** — contextual commentary across 17 game scenarios
- **Scorecard** — round-by-round tracking across all 10 rounds
- **Game log** — full turn-by-turn history with export

---

## Architecture

Single-file IIFE bundle (`js/kapow.js`, ~192KB unminified):

| Section | What It Does |
|---------|-------------|
| AI Banter | 100+ contextual messages across 17 categories |
| Deck/Hand | Card creation, Fisher-Yates shuffle, deal, hand management |
| Triads | Completion detection: sets, runs, KAPOW value assignment |
| Scoring | Hand evaluation, first-out doubling penalty, winner determination |
| Game State | State machine: setup → firstTurn → playing → finalTurns → scoring → gameOver |
| AI Engine | Multi-layered heuristic evaluation with opponent modeling |
| UI | DOM rendering, modals, animations, scorecard |
| Tutorial | Stacked-deck onboarding: triads, power cards, KAPOW mechanics |
| Action Log | Turn-by-turn history with text export |

### The AI

The AI opponent evaluates every possible action each turn:

- **Placement scoring** — value delta, triad completion potential, synergy with revealed cards, KAPOW timing
- **Opponent threat modeling** — tracks near-complete triads, reveal ratio, estimated score
- **Discard safety analysis** — avoids feeding cards that complete your triads
- **Matched-pair protection** — won't break a valuable matched pair for a small raw gain
- **Go-out timing** — considers hand value, unrevealed count, doubled-score risk
- **Triad completion going-out detection** — simulates whether completing a triad triggers going out with a bad score

---

## Development

No build tools needed. Serve locally:

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

### Project Structure

```
Kapow/
├── index.html              # Entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline caching)
├── PLAN.md                 # Project roadmap and collaboration plan
├── CHANGELOG.md          # Changelog (date-versioned)
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── kapow.js            # Production bundle (~5,100 lines)
│   ├── sound.js            # Web Audio API synthesized sounds
│   └── *.js                # Modular files (reference only, not loaded)
└── icons/
    ├── icon-512.png        # PWA icon
    ├── icon-192.png        # PWA icon
    └── apple-touch-icon.png
```

### Known Issues

| Severity | Issue |
|----------|-------|
| Medium | AI `reveals` array not bounds-checked — edge case crash if <2 unrevealed cards |
| Low | Round-end screen re-rendered on every `refreshUI()` during scoring phase |

### Roadmap

See [PLAN.md](PLAN.md) for prioritized roadmap and collaboration notes.

---

## Credits

Original game design and AI engine by [cpheterson](https://github.com/cpheterson)

Mobile UI, animations, sounds, tutorial, PWA, and bug fixes by [epheterson](https://github.com/epheterson)
