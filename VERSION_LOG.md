# KAPOW! Card Game - Version Log

## Version History

### 02-21-2026 v3
**Redesigned powerset value display to appear directly on card.**
- Powerset values now display on the fixed value card instead of below it
- Format: "Powerset = X" where X is the total value (card + all modifiers)
- Orange font (#ff9800), 14px, bold, centered above card bottom
- Prevents card layout shift caused by below-card powerset info
- Cleaner UI with improved readability for powerset values
- Removed individual modifier display and calculation details
- Commit: cde90c8

### 02-21-2026 v2
**Removed frozen KAPOW property (deprecated feature).**
- KAPOW cards are never frozen; this feature was removed from game long ago
- Cleaned up all references to isFrozen and assignedValue properties
- Simplified KAPOW checks from 'type === kapow && !isFrozen' to 'type === kapow'
- Removed triad freezing logic and KAPOW reset when discarded
- Code now reflects actual game mechanics where KAPOW is always wild (0-12)
- Commit: 832e09e

### 02-21-2026 v1
**Implemented within-triad KAPOW swaps for strategic card positioning.**
- When a placement completes a triad containing a revealed KAPOW, player can now swap it within that triad before discard
- Prevents KAPOW from being immediately exposed on the discard pile's top position
- New swap phase enters after placement but before triad discard
- Button text changes to "Discard Triad and End Turn" during within-triad swap phase
- Message box highlights with swap-phase styling
- New helper functions: `hasRevealedKapow()`, `completeWithinTriadSwap()`
- Modified `findSwapTargets()` with optional scope restriction parameter
- AI unchanged: uses normal cross-triad swap logic after discard
- Commit: 1011155

### 02-20-2026 v3
**Fixed AI explanation to avoid nonsensical future completion paths when going out.**
- When placement triggers going out, explanation now focuses on going-out decision
- Removed mention of "completion paths" that will never be needed post-game
- Explanation now clarifies why the timing was right to end the round

### 02-20-2026 v2
**Strengthened discard safety penalty for opponent-completion cards.**
- Increased scaling factor for replaced-card discard penalty from 0.4 to 1.0
- Penalty now directly proportional to danger level (stronger deterrent)
- Prevents AI from discarding cards that would help opponent complete triads
- Example: replacing 9 with 3 now scores -2 instead of +3 when 9 completes opponent's triad

### 02-20-2026 v1
**Initial revision with software revision footer added.**
- Added revision footer to lower right corner of page
- Format: `02-20-2026 v1` (date v{version})
- Created VERSION_LOG.md for version tracking

---

## Version Numbering Convention

- Format: `MM-DD-YYYY vN` where N is a sequential number (1, 2, 3, etc.)
- Each new date resets the version counter to v1
- Multiple versions on the same day are incremented (v1, v2, v3, etc.)
- The revision text in the HTML footer (`index.html` line ~150) should be updated to match the latest version

## How to Increment

When making changes that warrant a version bump:

1. Determine today's date in MM-DD-YYYY format
2. Check if today's version already exists (e.g., is there a v1, v2, etc.?)
3. Increment accordingly:
   - If new date: use `MM-DD-YYYY v1`
   - If same date: increment to next number (e.g., `02-20-2026 v2`)
4. Update `id="revision-text"` in `index.html` with the new version string
5. Add an entry to this VERSION_LOG.md file describing the changes
6. Commit the changes with the version in the commit message

---

## Latest Version: 02-21-2026 v3
