import { useState, useEffect, useCallback } from 'react';
import { createDeck, sortHand } from '../constants/deck';

export const useSueca = () => {
  const [hands, setHands] = useState([[], [], [], []]);
  const [table, setTable] = useState([]);
  const [trump, setTrump] = useState(null);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [gameMessage, setGameMessage] = useState("");

  const startGame = () => {
    try {
      const deck = createDeck();
      const trumpCard = deck[39];
      setTrump(trumpCard);
      
      const initialHands = [
        sortHand(deck.slice(0, 10)),
        deck.slice(10, 20),
        deck.slice(20, 30),
        deck.slice(30, 40)
      ];
      
      setHands(initialHands);
      setScores([0, 0]);
      setTable([]);
      setTurn(0);
      setGameMessage("Jogo Iniciado!");
    } catch (error) {
      console.error("Erro ao iniciar jogo:", error);
    }
  };

  const playCard = useCallback((playerIndex, cardIndex) => {
    if (playerIndex !== turn) return false;

    const card = hands[playerIndex][cardIndex];

    // Regra: Assistir ao naipe
    if (table.length > 0) {
      const leadSuit = table[0].suit;
      const hasLeadSuit = hands[playerIndex].some(c => c.suit === leadSuit);
      
      if (hasLeadSuit && card.suit !== leadSuit) {
        setGameMessage("É obrigado a seguir o naipe!");
        return false;
      }
    }

    const newHand = hands[playerIndex].filter((_, i) => i !== cardIndex);
    const newHands = [...hands];
    // Ordena apenas a mão do jogador humano (0)
    newHands[playerIndex] = playerIndex === 0 ? sortHand(newHand) : newHand; 
    
    setHands(newHands);
    setTable(prev => [...prev, { ...card, player: playerIndex }]);
    setTurn((playerIndex + 1) % 4);
    setGameMessage("");
    return true;
  }, [hands, turn, table]);

  // Função de IA (definida fora do useEffect para ser limpa)
  const autoPlay = useCallback(() => {
    const myHand = hands[turn];
    if (!myHand || myHand.length === 0) return;

    let cardIndex = 0;
    if (table.length > 0) {
      const leadSuit = table[0].suit;
      const suitIndex = myHand.findIndex(c => c.suit === leadSuit);
      cardIndex = suitIndex !== -1 ? suitIndex : 0;
    }
    playCard(turn, cardIndex);
  }, [hands, turn, table, playCard]);

  // Função para resolver rodada
  const resolveRound = useCallback(() => {
    const leadSuit = table[0].suit;
    let winnerCard = table[0];

    table.forEach(card => {
      const isTrump = card.suit === trump.suit;
      const winnerIsTrump = winnerCard.suit === trump.suit;

      if (isTrump && !winnerIsTrump) {
        winnerCard = card;
      } else if (card.suit === winnerCard.suit && card.power > winnerCard.power) {
        winnerCard = card;
      }
    });

    const points = table.reduce((sum, c) => sum + c.value, 0);
    const team = (winnerCard.player % 2 === 0) ? 0 : 1;
    
    setScores(prev => {
      const newScores = [...prev];
      newScores[team] += points;
      return newScores;
    });

    setTable([]);
    setTurn(winnerCard.player);
  }, [table, trump]);

  // Gerenciador de Turnos e Regras
  useEffect(() => {
    if (table.length === 4) {
      const timer = setTimeout(resolveRound, 1200);
      return () => clearTimeout(timer);
    } 
    
    if (turn !== 0 && hands[turn].length > 0 && table.length < 4) {
      const timer = setTimeout(autoPlay, 800);
      return () => clearTimeout(timer);
    }
  }, [turn, table.length, resolveRound, autoPlay, hands]);

  return { hands, table, trump, turn, scores, gameMessage, startGame, playCard };
};