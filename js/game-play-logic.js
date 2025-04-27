Math.factorial = function (n) {
  if (n < 0) return NaN;
  if (n === 0) return 1;
  let result = 1;
  for (let i = 1; i <= n; i++) {
    result *= i;
  }
  return result;
};

function dealCard(hand, location) {
  var cardDrawn = cardsInDeck.pop();
  hand.push(cardDrawn);
  var index = hand.length - 1;

  // Crear imagen de la carta, oculta inicialmente para la transición
  var cardImage = $("<img>")
    .attr("class", "card")
    .attr("src", "img/" + hand[index].src)
    .hide();
  cardImage.attr("id", currentTurn + "-card-" + index);

  // Para efecto de cartas en pila
  if (index === 0) {
    cardImage.appendTo($(location)).show();
  } else if (index > 0) {
    cardImage
      .appendTo($(location))
      .offset({ left: -60 })
      .css("margin-right", -60)
      .show();
  }

  // Si es un as (solo para el jugador)
  if (hand[index].name === "ace" && currentTurn != "dealer") {
    playerHasAce = true;
  }

  // Variables para facilitar la actualización del total
  var updateTotal = function (newTotal) {
    if (currentTurn === "player") {
      playerHandTotal = newTotal;
    } else if (currentTurn === "playerSplit") {
      playerSplitHandTotal = newTotal;
    } else if (currentTurn === "dealer") {
      dealerHandTotal = newTotal;
    }
  };

  // Obtener total actual según turno
  var currentTotal =
    currentTurn === "player"
      ? playerHandTotal
      : currentTurn === "playerSplit"
      ? playerSplitHandTotal
      : dealerHandTotal;

  // Aplicar la operación según el tipo de carta
  switch (hand[index].name) {
    case "times":
      updateTotal(currentTotal * hand[index].value);
      break;
    case "division":
      updateTotal(currentTotal / hand[index].value);
      break;
    case "minus":
      updateTotal(currentTotal - hand[index].value);
      break;
    case "exponential":
      // Si value es 2 eleva al cuadrado; si es 3, al cubo.
      updateTotal(
        hand[index].value === 2
          ? Math.pow(currentTotal, 2)
          : Math.pow(currentTotal, 3)
      );
      break;
    case "root":
      // Si value es 2 se toma raíz cuadrada; si es 3, raíz cúbica.
      updateTotal(
        hand[index].value === 2
          ? Math.sqrt(currentTotal)
          : Math.cbrt(currentTotal)
      );
      break;
    case "trigo":
      // Se asume: value === 1 para seno, 2 para coseno, 3 para tangente.
      if (hand[index].value === 1) {
        updateTotal(Math.sin(currentTotal));
      } else if (hand[index].value === 2) {
        updateTotal(Math.cos(currentTotal));
      } else if (hand[index].value === 3) {
        updateTotal(Math.tan(currentTotal));
      }
      break;
    case "equation":
      // La carta contiene una propiedad "formula", por ejemplo "2*x+3"
      try {
        var expr = hand[index].formula.replace(/x/g, currentTotal);
        // Nota: eval se usa aquí para evaluar la cadena; úsalo con precaución.
        updateTotal(eval(expr));
      } catch (e) {
        console.error("Error evaluando la fórmula:", e);
      }
      break;
    // PERMUTACIÓN: P(n,r) = n! / (n-r)!
    case "permutation":
      updateTotal(
        Math.factorial(currentTotal) /
          Math.factorial(currentTotal - hand[index].value)
      );
      break;

    // COMBINACIÓN: C(n,r) = n! / (r! (n-r)!)
    case "combination":
      updateTotal(
        Math.factorial(currentTotal) /
          (Math.factorial(hand[index].value) *
            Math.factorial(currentTotal - hand[index].value))
      );
      break;

    // VARIACIÓN sin repetición (igual que permutación)
    case "variation_no_rep":
      updateTotal(
        Math.factorial(currentTotal) /
          Math.factorial(currentTotal - hand[index].value)
      );
      break;

    // VARIACIÓN con repetición: V'(n,r) = n^r
    case "variation_rep":
      updateTotal(Math.pow(currentTotal, hand[index].value));
      break;

    // FACTORIAL: n!
    case "factorial":
      updateTotal(Math.factorial(currentTotal));
      break;

    case "loss":
      // Carta que provoca la derrota: se asigna un total muy alto
      updateTotal(999999);
      break;
    case "fix21":
      // Carta que fija el total a 21
      updateTotal(21);
      break;
    default:
      // Operación por defecto: suma el valor de la carta
      updateTotal(currentTotal + hand[index].value);
      break;
  }

  // Para la segunda carta del dealer, se muestra boca abajo
  if (dealerHand.length === 2 && currentTurn === "dealer") {
    cardImage.attr("src", "img/card_back.png");
  }

  updateVisibleHandTotals();
  evaluateGameStatus();
}

function evaluateGameStatus() {
  // El jugador sólo puede dividir o doblar después de las dos primeras cartas
  if (playerHand.length === 3 || dealerStatus === "hit") {
    disableButton(doubleDownButton);
    disableButton(splitButton);
  }
  if (currentTurn != "dealer") {
    if (playerHasAce === true) {
      if (currentTurn === "player") {
        reviewAcesValue(playerHand, playerHandTotal);
      } else if (currentTurn === "playerSplit") {
        reviewAcesValue(playerSplitHand, playerSplitHandTotal);
      }
    } else {
      isPlayerDone();
    }
  }
  if (currentTurn === "dealer" && dealerStatus === "hit") {
    dealerPlay();
  }
}

function isPlayerDone() {
  // Si no hay juego dividido: verifica si el total llega a 21, se pasa o baja a -10
  if (
    splitGame === false &&
    (playerHandTotal >= 21 || playerHandTotal <= -10)
  ) {
    gameOver();
  } else if (splitGame === true) {
    if (currentTurn === "player") {
      if (playerHandTotal === 21 || playerHandTotal <= -10) {
        gameOver();
      } else if (playerHandTotal > 21) {
        changeHand(playerStatus);
      }
    } else if (currentTurn === "playerSplit") {
      if (playerSplitHandTotal === 21 || playerSplitHandTotal <= -10) {
        gameOver();
      } else if (playerSplitHandTotal > 21) {
        // Si en la primera mano el total está bajo 21 y mayor a -10, se pasa a la segunda
        if (playerHandTotal < 21 && playerHandTotal > -10) {
          changeHand(playerSplitStatus);
        } else {
          gameOver();
        }
      }
    }
  }
}

function changeHand(currentDeckStatus) {
  currentDeckStatus = "stand";
  if (currentTurn === "player") {
    if (splitGame === true) {
      currentTurn = "playerSplit";
      // Reducir la escala de la baraja del jugador y ampliar la del split
      scaleDownDeck(playerGameBoard, playerHandTotalDisplay);
      enlargeDeck(playerSplitGameBoard, playerSplitHandTotalDisplay);
    } else if (splitGame === false) {
      currentTurn = "dealer";
      dealerStatus = "hit";
    }
  } else if (currentTurn === "playerSplit") {
    currentTurn = "dealer";
    dealerStatus = "hit";
  }
  evaluateGameStatus();
}

function reviewAcesValue(hand, total) {
  if (total > 21) {
    // Si tienen exactamente 2 ases en la primera jugada, se permite dividir
    if (hand.length === 2) {
      enableButton(splitButton, split);
      $("#two-aces-prompt").modal("open");
      // De lo contrario, se reduce el valor del as
    } else if (hand.length > 2) {
      reduceAcesValue(hand);
      isPlayerDone();
    }
  } else {
    isPlayerDone();
  }
}

function reduceAcesValue(deck) {
  for (var i = 0; i < deck.length; i++) {
    if (deck[i].name === "ace" && deck[i].value === 11) {
      // Solo se revisan ases que no han sido cambiados de 11 a 1
      deck[i].value = 1;
      if (currentTurn === "player") {
        playerHandTotal -= 10;
      } else if (currentTurn === "playerSplit") {
        playerSplitHandTotal -= 10;
      }
      updateVisibleHandTotals();
      Materialize.toast("El valor de tu as cambio de 11 a 1", 1500);
    }
  }
}

function dealerPlay() {
  flipHiddenCard();
  disableButton(standButton);
  disableButton(hitButton);
  disableButton(splitButton);
  // Lógica del dealer según reglas estándar del blackjack
  if (dealerHandTotal < 17) {
    setTimeout(function () {
      dealCard(dealerHand, dealerGameBoard);
    }, 1000);
  } else if (dealerHandTotal >= 21) {
    setTimeout(function () {
      gameOver();
    }, 1100);
  } else if (dealerHandTotal >= 17) {
    setTimeout(function () {
      dealerStatus = "stand";
      gameOver();
    }, 1100);
  }
}
