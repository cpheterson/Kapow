# KAPOW! Card Game - Version Log

## Version History

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

## Latest Version: 02-20-2026 v3
