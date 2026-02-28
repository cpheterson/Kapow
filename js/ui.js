// ========================================
// KAPOW! - UI Rendering & Interaction
// ========================================

/**
 * Render a single card as an HTML element.
 */
export function renderCard(card, options = {}) {
  const { faceDown = false, clickable = false, selected = false, stacked = false } = options;

  const div = document.createElement('div');
  div.classList.add('card');

  if (stacked) div.classList.add('stacked');
  if (selected) div.classList.add('selected');
  if (clickable) div.classList.add('clickable');

  if (faceDown || !card.isRevealed) {
    // Card back
    div.classList.add('card-back');
    div.innerHTML = `
      <div class="card-back-inner">
        <span class="card-back-text">KAPOW!</span>
      </div>
    `;
  } else if (card.type === 'fixed') {
    div.classList.add('card-fixed');
    div.innerHTML = `
      <span class="card-type-label">Fixed</span>
      <span class="card-value-center">${card.faceValue}</span>
    `;
  } else if (card.type === 'power') {
    div.classList.add('card-power');
    div.innerHTML = `
      <div class="card-power-header">
        <span class="modifier-negative">${card.modifiers[0]}</span>
        <span class="card-type-label">Power</span>
        <span class="modifier-positive">+${card.modifiers[1]}</span>
      </div>
      <span class="card-power-face-value">${card.faceValue}</span>
    `;
  } else if (card.type === 'kapow') {
    div.classList.add('card-kapow');
    if (card.isFrozen) div.classList.add('frozen');
    div.innerHTML = `
      <span class="kapow-text">KAPOW!</span>
      ${card.isFrozen && card.assignedValue !== null
        ? `<span class="kapow-value">= ${card.assignedValue}</span>`
        : '<span class="kapow-value">Wild (0-12)</span>'}
    `;
  }

  return div;
}

/**
 * Render a player's hand into a container element.
 */
export function renderHand(hand, containerId, options = {}) {
  const { isOpponent = false, onCardClick = null, clickablePositions = [] } = options;
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  hand.triads.forEach((triad, tIndex) => {
    const triadDiv = document.createElement('div');
    triadDiv.classList.add('triad-column');
    if (triad.isDiscarded) {
      triadDiv.classList.add('complete');
    }

    const label = document.createElement('div');
    label.classList.add('triad-label');
    label.textContent = triad.isDiscarded ? 'Discarded' : `Triad ${tIndex + 1}`;
    triadDiv.appendChild(label);

    for (const pos of ['top', 'middle', 'bottom']) {
      const posSlot = document.createElement('div');
      posSlot.classList.add('position-slot');

      if (triad[pos].length > 0) {
        const topCard = triad[pos][0];
        const isClickable = clickablePositions.some(
          cp => cp.triadIndex === tIndex && cp.position === pos
        );

        // Render stacked cards (powerset) bottom-up
        for (let i = triad[pos].length - 1; i >= 0; i--) {
          const cardEl = renderCard(triad[pos][i], {
            faceDown: isOpponent && !triad[pos][i].isRevealed,
            clickable: i === 0 && isClickable,
            stacked: triad[pos].length > 1
          });

          if (i === 0 && onCardClick) {
            cardEl.addEventListener('click', () => {
              onCardClick(tIndex, pos);
            });
          }

          posSlot.appendChild(cardEl);
        }
      }

      triadDiv.appendChild(posSlot);
    }

    container.appendChild(triadDiv);
  });
}

/**
 * Render the discard pile top card.
 */
export function renderDiscardPile(discardPile) {
  const container = document.getElementById('discard-top');
  if (!container) return;

  // Reset to base state
  container.innerHTML = '';
  container.className = 'card';

  if (discardPile.length === 0) {
    container.classList.add('empty-pile');
    container.innerHTML = '<span>Empty</span>';
    return;
  }

  // Render top card inline (keep the same element to preserve ID)
  const topCard = discardPile[discardPile.length - 1];

  if (topCard.type === 'fixed') {
    container.classList.add('card-fixed');
    container.innerHTML = `
      <span class="card-type-label">Fixed</span>
      <span class="card-value-center">${topCard.faceValue}</span>
    `;
  } else if (topCard.type === 'power') {
    container.classList.add('card-power');
    container.innerHTML = `
      <div class="card-power-header">
        <span class="modifier-negative">${topCard.modifiers[0]}</span>
        <span class="card-type-label">Power</span>
        <span class="modifier-positive">+${topCard.modifiers[1]}</span>
      </div>
      <span class="card-power-face-value">${topCard.faceValue}</span>
    `;
  } else if (topCard.type === 'kapow') {
    container.classList.add('card-kapow');
    container.innerHTML = `
      <span class="kapow-text">KAPOW!</span>
      <span class="kapow-value">Wild (0-12)</span>
    `;
  }
}

/**
 * Render the drawn card display.
 */
export function renderDrawnCard(card) {
  const area = document.getElementById('drawn-card-area');
  const display = document.getElementById('drawn-card-display');

  if (!card) {
    area.classList.add('hidden');
    display.innerHTML = '';
    return;
  }

  area.classList.remove('hidden');
  display.innerHTML = '';
  display.appendChild(renderCard(card));
}

/**
 * Update the draw pile count display.
 */
export function updateDrawPileCount(count) {
  document.getElementById('draw-count').textContent = `(${count} cards)`;
}

/**
 * Update the game message display.
 */
export function updateMessage(message) {
  document.getElementById('game-message').textContent = message;
}

/**
 * Update the scoreboard.
 */
export function updateScoreboard(state) {
  document.getElementById('round-number').textContent = state.round;
  document.getElementById('player-score-display').textContent =
    `${state.players[0].name}: ${state.players[0].totalScore}`;
  document.getElementById('ai-score-display').textContent =
    `${state.players[1].name}: ${state.players[1].totalScore}`;
}

/**
 * Enable/disable action buttons.
 */
export function updateButtons(buttons) {
  for (const [id, enabled] of Object.entries(buttons)) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  }
}

/**
 * Show the round end screen.
 */
export function showRoundEnd(state) {
  const screen = document.getElementById('round-end-screen');
  const title = document.getElementById('round-end-title');
  const scores = document.getElementById('round-scores');

  title.textContent = `Round ${state.round} Complete!`;

  let html = '<table style="margin: 0 auto; text-align: left;">';
  state.players.forEach((player, i) => {
    const roundScore = player.roundScores[player.roundScores.length - 1];
    const doubled = state.firstOutPlayer === i && roundScore !== player.roundScores[player.roundScores.length - 1];
    html += `<tr>
      <td style="padding: 4px 12px; font-weight: bold;">${player.name}</td>
      <td style="padding: 4px 12px;">Round: +${roundScore}</td>
      <td style="padding: 4px 12px;">Total: ${player.totalScore}</td>
    </tr>`;
  });
  html += '</table>';

  if (state.firstOutPlayer !== null) {
    html += `<p style="margin-top: 12px; font-size: 14px; opacity: 0.8;">
      ${state.players[state.firstOutPlayer].name} went out first.
    </p>`;
  }

  scores.innerHTML = html;
  screen.classList.remove('hidden');
}

/**
 * Hide the round end screen.
 */
export function hideRoundEnd() {
  document.getElementById('round-end-screen').classList.add('hidden');
}

/**
 * Show the game over screen.
 */
export function showGameOver(state) {
  const screen = document.getElementById('game-over-screen');
  const title = document.getElementById('game-over-title');
  const scores = document.getElementById('final-scores');

  // Find winner
  let winnerIndex = 0;
  state.players.forEach((p, i) => {
    if (p.totalScore < state.players[winnerIndex].totalScore) winnerIndex = i;
  });

  title.textContent = `${state.players[winnerIndex].name} Wins!`;

  let html = '<table style="margin: 0 auto; text-align: left;">';
  state.players.forEach(player => {
    html += `<tr>
      <td style="padding: 4px 12px; font-weight: bold;">${player.name}</td>
      <td style="padding: 4px 12px;">Final Score: ${player.totalScore}</td>
    </tr>`;
  });
  html += '</table>';

  html += '<h3 style="margin-top: 16px;">Round-by-Round:</h3>';
  html += '<table style="margin: 0 auto; text-align: center; font-size: 14px;">';
  html += '<tr><th style="padding: 2px 8px;">Round</th>';
  state.players.forEach(p => {
    html += `<th style="padding: 2px 8px;">${p.name}</th>`;
  });
  html += '</tr>';

  for (let r = 0; r < state.maxRounds; r++) {
    html += `<tr><td style="padding: 2px 8px;">${r + 1}</td>`;
    state.players.forEach(p => {
      const score = p.roundScores[r] ?? '-';
      html += `<td style="padding: 2px 8px;">${score}</td>`;
    });
    html += '</tr>';
  }
  html += '</table>';

  scores.innerHTML = html;
  screen.classList.remove('hidden');
}

/**
 * Hide the game over screen.
 */
export function hideGameOver() {
  document.getElementById('game-over-screen').classList.add('hidden');
}
