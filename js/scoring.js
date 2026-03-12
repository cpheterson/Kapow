// ========================================
// KAPOW! - Scoring System
// ========================================

import { getPositionValue } from './hand.js';

/** @typedef {import('./deck.js').Card} Card */
/** @typedef {import('./deck.js').Hand} Hand */

/**
 * @typedef {Object} Player
 * @property {string} name
 * @property {Hand|null} hand
 * @property {number} totalScore
 * @property {number[]} roundScores
 * @property {boolean} isHuman
 */

/**
 * Score a single position (card + powerset modifiers).
 * @param {Card[]} positionCards
 * @returns {number}
 */
export function scorePosition(positionCards) {
  if (positionCards.length === 0) return 0;
  return getPositionValue(positionCards);
}

/**
 * Score an entire hand.
 * Only non-discarded triads contribute to score.
 * All cards are revealed at scoring time.
 * @param {Hand} hand
 * @returns {number}
 */
export function scoreHand(hand) {
  let totalScore = 0;

  for (const triad of hand.triads) {
    if (triad.isDiscarded) continue;

    for (const pos of ['top', 'middle', 'bottom']) {
      totalScore += scorePosition(triad[pos]);
    }
  }

  return totalScore;
}

/**
 * Reveal all hidden cards in a hand (for end-of-round scoring).
 * @param {Hand} hand
 * @returns {Hand} The same hand, mutated
 */
export function revealAllCards(hand) {
  for (const triad of hand.triads) {
    if (triad.isDiscarded) continue;
    for (const pos of ['top', 'middle', 'bottom']) {
      for (const card of triad[pos]) {
        card.isRevealed = true;
      }
    }
  }
  return hand;
}

/**
 * Apply the "double if beaten" rule for the player who went out first.
 *
 * If the first player out does NOT have the lowest score (or tied for lowest),
 * their score for that round is doubled.
 *
 * If their score is 0, no doubling applies.
 * @param {number[]} roundScores
 * @param {number} firstOutIndex
 * @returns {number[]} New array with penalty applied
 */
export function applyFirstOutPenalty(roundScores, firstOutIndex) {
  if (roundScores[firstOutIndex] === 0) return roundScores;

  const scores = [...roundScores];
  const firstOutScore = scores[firstOutIndex];

  const otherScores = scores.filter((_, i) => i !== firstOutIndex);
  const lowestOther = Math.min(...otherScores);

  if (lowestOther < firstOutScore) {
    scores[firstOutIndex] = firstOutScore * 2;
  }

  return scores;
}

/**
 * Calculate final round scores for all players.
 * @param {Player[]} players
 * @param {number} firstOutIndex
 * @returns {number[]}
 */
export function calculateRoundScores(players, firstOutIndex) {
  const rawScores = players.map(p => scoreHand(p.hand));
  return applyFirstOutPenalty(rawScores, firstOutIndex);
}

/**
 * Determine the winner after all rounds (lowest cumulative score).
 * @param {Player[]} players
 * @returns {number} Index of the winning player
 */
export function getWinner(players) {
  let lowestScore = Infinity;
  let winnerIndex = 0;

  players.forEach((player, index) => {
    if (player.totalScore < lowestScore) {
      lowestScore = player.totalScore;
      winnerIndex = index;
    }
  });

  return winnerIndex;
}
