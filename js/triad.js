// ========================================
// KAPOW! - Triad Completion Logic
// ========================================

import { getPositionValue } from './hand.js';

/**
 * Check if a triad is complete (set or run).
 * All three positions must be revealed.
 * A triad is complete if the effective values form:
 *   - A set: all three values are equal
 *   - An ascending run: values increase by 1 (top, top+1, top+2)
 *   - A descending run: values decrease by 1 (top, top-1, top-2)
 */
export function isTriadComplete(triad) {
  if (triad.isDiscarded) return false;

  // All positions must have at least one revealed card
  for (const pos of ['top', 'middle', 'bottom']) {
    if (triad[pos].length === 0) return false;
    if (!triad[pos][0].isRevealed) return false;
  }

  const values = getEffectiveValues(triad);
  return isSet(values) || isAscendingRun(values) || isDescendingRun(values);
}

/**
 * Get effective values for a triad's three positions.
 * Returns [topValue, middleValue, bottomValue].
 */
export function getEffectiveValues(triad) {
  return [
    getPositionValue(triad.top),
    getPositionValue(triad.middle),
    getPositionValue(triad.bottom)
  ];
}

/**
 * Check if three values form a set (all equal).
 */
export function isSet(values) {
  return values[0] === values[1] && values[1] === values[2];
}

/**
 * Check if three values form an ascending run (each +1).
 */
export function isAscendingRun(values) {
  return values[1] === values[0] + 1 && values[2] === values[1] + 1;
}

/**
 * Check if three values form a descending run (each -1).
 */
export function isDescendingRun(values) {
  return values[1] === values[0] - 1 && values[2] === values[1] - 1;
}

/**
 * Determine what type of completion a triad has, if any.
 * Returns: 'set' | 'ascending' | 'descending' | null
 */
export function getCompletionType(triad) {
  if (triad.isDiscarded) return null;

  for (const pos of ['top', 'middle', 'bottom']) {
    if (triad[pos].length === 0 || !triad[pos][0].isRevealed) return null;
  }

  const values = getEffectiveValues(triad);

  if (isSet(values)) return 'set';
  if (isAscendingRun(values)) return 'ascending';
  if (isDescendingRun(values)) return 'descending';

  return null;
}

/**
 * Check if a KAPOW! card at a specific position could complete the triad
 * when assigned a particular value.
 * Returns the value needed, or null if no single value works.
 */
export function getKapowValueForCompletion(triad, kapowPosition) {
  const positions = ['top', 'middle', 'bottom'];
  const otherPositions = positions.filter(p => p !== kapowPosition);

  // Both other positions must be revealed
  for (const pos of otherPositions) {
    if (triad[pos].length === 0 || !triad[pos][0].isRevealed) return null;
  }

  const otherValues = otherPositions.map(pos => getPositionValue(triad[pos]));
  const kapowIndex = positions.indexOf(kapowPosition);

  // Try to find a value that makes a set
  if (otherValues[0] === otherValues[1]) {
    return otherValues[0]; // Set: KAPOW! matches the other two
  }

  // Try ascending run
  // We need values[0]+1 = values[1], values[1]+1 = values[2]
  // Depending on kapow position, solve for the missing value
  const candidates = [];

  if (kapowIndex === 0) {
    // top = ?, mid = otherValues[0], bot = otherValues[1]
    // ascending: top+1=mid → top = mid-1
    if (otherValues[0] + 1 === otherValues[1]) candidates.push(otherValues[0] - 1);
    // descending: top-1=mid → top = mid+1
    if (otherValues[0] - 1 === otherValues[1]) candidates.push(otherValues[0] + 1);
  } else if (kapowIndex === 1) {
    // top = otherValues[0], mid = ?, bot = otherValues[1]
    // ascending: top+1=mid, mid+1=bot → mid = top+1 if bot=top+2
    if (otherValues[1] === otherValues[0] + 2) candidates.push(otherValues[0] + 1);
    // descending: top-1=mid, mid-1=bot → mid = top-1 if bot=top-2
    if (otherValues[1] === otherValues[0] - 2) candidates.push(otherValues[0] - 1);
  } else {
    // top = otherValues[0], mid = otherValues[1], bot = ?
    // ascending: mid+1=bot
    if (otherValues[1] === otherValues[0] + 1) candidates.push(otherValues[1] + 1);
    // descending: mid-1=bot
    if (otherValues[1] === otherValues[0] - 1) candidates.push(otherValues[1] - 1);
  }

  // Return first valid candidate in KAPOW! range (0-12)
  for (const val of candidates) {
    if (val >= 0 && val <= 12) return val;
  }

  return null;
}
