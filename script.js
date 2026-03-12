// ♠♣♥♦
/*  Game State */
let state = {
  deck: [],
  discard: [],
  players: [
    { id: 1, hand: [] },
    { id: 2, hand: [] },
  ],
  heldCard: null, // Populated when player draws card and is choosing where it goes. Null otherwise.
  currentPlayer: 0,
  gameStarted: false,
  lastTurn: false,
  gameOver: false,
};

/* Create deck, setup & start game */
function initGame() {
  //Create deck, ♠♣♥♦
  const suits = ["♠", "♣", "♥", "♦"];
  const values = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  state.deck = [];
  for (let s of suits) {
    for (let v of values) {
      state.deck.push({ suit: s, value: v, isVisible: false });
    }
  }

  // Shuffle (Fisher Yates)
  // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
  for (let i = state.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
  }

  // Deal 9 cards to each player
  state.players.forEach((p) => {
    p.hand = state.deck.splice(0, 9);
  });

  // Discard the first card
  const firstDiscard = state.deck.pop();
  firstDiscard.isVisible = true;
  state.discard.push(firstDiscard);

  state.gameStarted = true;
  render();
}

/*
Game Actions 
*/

function drawFromDeck() {
  if (state.gameOver) return;
  if (state.heldCard || state.deck.length === 0) return; //bail if you already drew or nothing to draw
  state.heldCard = state.deck.pop();
  state.heldCard.isVisible = true;
  render();
}

function drawFromDiscard() {
  if (state.gameOver) return;
  if (state.heldCard || state.discard.length === 0) return;
  state.heldCard = state.discard.pop();
  render();
}

//Turn ending action
function handleCardClick(playerIdx, cardIdx) {
  if (state.gameOver) return;
  let card = state.players[playerIdx].hand[cardIdx];
  if (!card) return; //Empty card
  if (playerIdx !== state.currentPlayer) return; //Wrong player
  if (state.heldCard) {
    handleCardSwap(playerIdx, cardIdx);
  } else if (!card.isVisible) {
    handleCardReveal(playerIdx, cardIdx);
  } else {
    console.log("Illegal click!");
    return; //(clicked a visible card with nothing in the hand)
  }

  handleEndTurn();
}

function handleCardReveal(playerIdx, cardIdx) {
  state.players[playerIdx].hand[cardIdx].isVisible = true;
}

function handleCardSwap(playerIdx, cardIdx) {
  // Put held card in hand, put old card in discard
  const oldCard = state.players[playerIdx].hand[cardIdx];
  oldCard.isVisible = true; //make sure card is visible

  state.players[playerIdx].hand[cardIdx] = state.heldCard;
  state.discard.push(oldCard);

  state.heldCard = null;
}

/*
end turn:
check if any rows need to be removed
check if game ends   
change player state
render
*/
function handleEndTurn() {
  // 0 1 2
  // 3 4 5
  // 6 7 8
  // Card layout.
  // Need to check rows (just each group of 3)
  // And columns (+3 instead)

  const p = state.currentPlayer;
  const hand = state.players[p].hand;
  const lines = [
    /// set up rows and columns to remove
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
  ];

  /*
   *   Check for matches
   */
  for (let line of lines) {
    let matchValue = null;
    let isMatch = true;

    for (let i of line) {
      const card = hand[i];

      if (!card || !card.isVisible) {
        //if null or not yet visible, don't remove
        isMatch = false;
        break;
      }

      //card exists and it is visible, and no match has been established yet
      //it is a match candidate
      if (matchValue === null || matchValue === "2") {
        matchValue = card.value;
      }
      //non-wild card, match has already been established
      else if (card.value !== "2" && card.value !== matchValue) {
        //makes match impossible
        isMatch = false;
        break;
      }
    } //inner for

    //Match found, set each card to null (remove them)
    if (isMatch) {
      console.log("Found match");
      for (let i of line) {
        hand[i] = null;
      }
      break; // Remove only the first match
    }
  } // outer for

  /*
   *   End Game
   */
  if (state.lastTurn) {
    state.gameOver = true;
    const msg = document.getElementById("gameMessage");
    if (msg) {
      msg.textContent = "Game Over";
    }
  }

  let end = true;
  for (let i = 0; i < hand.length; i++) {
    if (hand[i] && !hand[i].isVisible) {
      end = false;
      break;
    }
  }

  if (end) {
    state.lastTurn = true; //Opponent gets one more turn
    console.log("Final turn triggered");
  }

  //Change the player, render
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  render();
}

//
// RENDER
//
function render() {
  const container = document.getElementById("players-container");
  container.innerHTML = "";

  // Render Players
  state.players.forEach((player, pIdx) => {
    const pDiv = document.createElement("div");
    pDiv.className = `player-area ${pIdx === state.currentPlayer ? "active" : ""}`;
    pDiv.innerHTML = `<h3>Player ${player.id}</h3>`;

    const handDiv = document.createElement("div");
    handDiv.className = "player-hand";

    player.hand.forEach((card, cIdx) => {
      const cardEl = document.createElement("div");

      // Mark null cards as such
      if (card === null) {
        cardEl.className = "card empty";
        cardEl.textContent = "";
      }
      // Card exists, display (face down or up )
      else {
        cardEl.className = `card ${card.isVisible ? "" : "back"}`;
        cardEl.textContent = card.isVisible ? `${card.value}${card.suit}` : "?";

        // Only allow clicking if it's this player's turn
        cardEl.onclick = () => handleCardClick(pIdx, cIdx);
      }

      handDiv.appendChild(cardEl);
    });

    pDiv.appendChild(handDiv);
    container.appendChild(pDiv);
  });

  // Update Piles
  document.getElementById("discard-pile").textContent = state.discard.length
    ? `${state.discard.at(-1).value}${state.discard.at(-1).suit}`
    : "Empty";

  document.getElementById("held-area").textContent = state.heldCard
    ? `Held: ${state.heldCard.value}${state.heldCard.suit}`
    : "Held: None";
}

// Event Listeners
document.getElementById("draw-pile").onclick = drawFromDeck;
document.getElementById("discard-pile").onclick = drawFromDiscard;

initGame();
