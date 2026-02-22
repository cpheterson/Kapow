# KAPOW! — PLAN.md

The living document. Updated every session.

---

## Current State (2026-02-22)

**Live at:** cpheterson.github.io/Kapow/ (Eric's fork, GitHub Pages)
**Canonical:** github.com/cpheterson/Kapow (Chuck's repo)
**Version:** v10 | SW cache: v29

### What's Working
- Full 2-player game vs Kai (AI opponent)
- Interactive tutorial (first game, auto-completes after 7 turns)
- Sound effects (Web Audio API, all synthesized, zero HTTP)
- PWA (home screen app, offline capable)
- Mobile + desktop responsive layout
- Hint system + AI move explanation modal
- Scorecard with notes, share results, export log
- Buy funnel: engagement-tiered CTAs (name screen, game over, round end, footer)
- Google Form email capture (pre-launch, form ID: 1sOwXtDq9HZpbuwt5C_7qWD6LCOEWSIreNdwBboE_S3A)
- Dopamine hits: round win celebrations, streak badges, personal best detection
- Cached player name (localStorage)

### What's Shipped This Session (02-22)
- [x] Buy funnel — engagement-tiered CTAs, email capture modal
- [x] AI renamed to "Kai" in all user-facing strings
- [x] Scorecard: notes, share (Web Share API), version at bottom, tap-to-close
- [x] Desktop layout constrained (max-width 1100px)
- [x] Mobile center strip height fixed
- [x] "Fixed" label removed from cards
- [x] Start Game button — big, green, breathing glow
- [x] Dopamine hits — round win flash/fanfare, streaks, personal best
- [x] Card animations polished — flip overshoot, slide bounce, KAPOW burst
- [x] Share crash fixed (p.scores → p.roundScores)
- [x] Scorecard close button + tap-anywhere-to-dismiss
- [x] PWA safe area honored on scorecard overlay
- [x] Name screen: bigger input, How to Play is real button
- [x] Power card modals: show card values, explain options, show resulting values
- [x] Powerset badge: absolute positioning prevents layout shift

### Known Issues
- [ ] Desktop could still use polish (but not blocking revenue)
- [ ] No undo for power card placement (by design — commit to your move)
- [ ] Service worker aggressive caching means returning users may see stale version
- [ ] Eric's fork is ahead of Chuck's canonical — need PR eventually

---

## 48-Hour Sprint (02-22 → 02-23)

**Goal:** First real dollar from a KAPOW sale by end of Sunday.

See `~/vault/projects/kapow/kapow-48hr-sprint.md` for full checklist.

### Eric's Track
- [ ] Stripe account + product + Payment Link ($19.99 + $4.99 shipping)
- [ ] Wire Payment Link into app (set `KAPOW_BUY_MODE = 'amazon'`, `KAPOW_BUY_URL` = Stripe link)
- [ ] Create `/play` redirect page for QR code in packaging
- [ ] Buy bubble mailers (local or Amazon Prime)
- [ ] QR code → print insert cards
- [ ] Text 20 people tonight
- [ ] Pirate Ship account for shipping labels

### Chuck's Track
- [ ] Shoot 4 iPhone photos (hero, full package, gameplay, close-up)
- [ ] Ship Eric a deck

---

## Revenue Architecture

See `~/vault/projects/kapow/kapow-monetization.md` for full plan.

**Phase 1 (now):** DTC physical sales via Stripe Payment Links ($19.99 + shipping, ~$18.81 net/sale)
**Phase 2:** $1.99 digital unlock (round 3 paywall, Stripe Payment Links, zero backend)
**Phase 3:** Multiplayer (solo → pass-play → local-table → remote, WebSocket server)
**Phase 4:** Amazon listing for organic discovery

`KAPOW_BUY_MODE` constant controls funnel: `'email'` (pre-launch capture) → `'amazon'` (direct link to Stripe/Amazon)

---

## Tech Debt (Someday)

- kapow.js refactor: split ~5400-line IIFE into modules (multiplayer will force this)
- Desktop layout: left/right or better top/down for wide screens
- Proper versioning system (semver, auto-bump)
- Test coverage (currently zero — it's a card game, manual testing)
- Chuck/Eric collaboration: PR Eric's fork into canonical, shared push access

---

*Last updated: 2026-02-22*
