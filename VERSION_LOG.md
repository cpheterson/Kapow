# KAPOW! Card Game - Version Log

## Version History

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

## Latest Version: 02-20-2026 v1
