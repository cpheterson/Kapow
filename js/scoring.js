// ========================================
// KAPOW! - Scoring System
// ========================================

import { getPositionValue } from './hand.js';

/**
 * Score a single position (card + powerset modifiers).
 */
export function scorePosition(positionCards) {
  if (positionCards.length === 0) return 0;
  return getPositionValue(positionCards);
}

/**
 * Score an entire hand.
 * Only non-discarded triads contribute to score.
 * All cards are revealed at scoring time.
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
 */
export function calculateRoundScores(players, firstOutIndex) {
  const rawScores = players.map(p => scoreHand(p.hand));
  return applyFirstOutPenalty(rawScores, firstOutIndex);
}

/**
 * Determine the winner after all rounds (lowest cumulative score).
 * Returns the index of the winning player.
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
