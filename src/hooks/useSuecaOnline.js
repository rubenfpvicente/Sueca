import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://sueca-server-production.up.railway.app/', {
  transports: ['websocket'], // Força o uso de WebSockets diretamente
  upgrade: false
});

const sortHand = (hand) => {
  const suitOrder = { 'C': 0, 'E': 1, 'O': 2, 'P': 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return b.power - a.power;
  });
};

export const useSuecaOnline = () => {
  const [roomInfo, setRoomInfo] = useState({ id: null, players: [] });
  const [inGame, setInGame] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [spectatorName, setSpectatorName] = useState("");
  const [specOffer, setSpecOffer] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [hand, setHand] = useState([]);
  const [table, setTable] = useState([]);
  const [trump, setTrump] = useState(null);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [cardCounts, setCardCounts] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [readyList, setReadyList] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on('roomUpdate', (data) => {
      setRoomInfo({ id: data.id, players: data.players });
      setAllPlayers(data.players);
    });
    socket.on('offerSpectate', (data) => { setSpecOffer(data); setSpectatorName(data.playerName); });
    socket.on('spectatorInit', (data) => {
      setRoomInfo({ id: data.id, players: data.players });
      setAllPlayers(data.players);
      setIsSpectator(true);
      setSpectatorName(data.mySpectatorName);
      if (data.gameState.started) {
        setInGame(true);
        setTrump(data.gameState.trump);
        setTable(data.gameState.table || []);
        setTurn(data.gameState.turn);
        setScores(data.gameState.scores);
        setCardCounts(data.gameState.cardCounts);
      }
      setSpecOffer(null);
    });
    socket.on('initHand', (data) => {
      setHand(sortHand(data.hand));
      setTrump(data.trump);
      setPlayerIndex(data.playerIndex);
      setAllPlayers(data.allPlayers);
      setInGame(true);
      setGameOver(false);
    });
    socket.on('gameStateUpdate', (gs) => {
      setTable(gs.table || []);
      setTurn(gs.turn);
      setScores(gs.scores);
      setCardCounts(gs.cardCounts);
      setTimeLeft(30);
    });
    socket.on('updateMyHand', (h) => setHand(sortHand(h)));
    socket.on('gameOver', (d) => { 
      setGameOver(true); 
      setInGame(false); // Volta para o fundo do Lobby
      setScores(d.scores); 
      setTable([]); // Limpa a mesa central
    });
    socket.on('readyUpdate', (list) => setReadyList(list));
    socket.on('triggerRestart', () => {
      setInGame(false);
      setGameOver(false);
      setReadyList([]);
      setTable([]);
    });
    socket.on('spectatorBecamePlayer', (data) => {
      console.log("Transformação: Agora és jogador!");
      setIsSpectator(false);
      setPlayerIndex(data.playerIndex);
      setAllPlayers(data.allPlayers);
      
      // RESET TOTAL DA UI PARA ESTE UTILIZADOR
      setGameOver(false); // Fecha o modal de fim de jogo
      setInGame(false);   // Garante que vê o Menu da Mesa (Lobby)
      setTable([]);       // Limpa mesa central
      setHand([]);        // Limpa mãos antigas
    });
    socket.on('leftRoom', () => { setRoomInfo({ id: null, players: [] }); setInGame(false); setGameOver(false); setIsSpectator(false); });
    socket.on('errorMsg', (m) => { setError(m); setTimeout(() => setError(""), 3000); });

    return () => socket.off();
  }, []);

  useEffect(() => {
    if (!inGame || gameOver) return;
    const t = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [inGame, gameOver, turn]);

  const joinTable = (playerName, roomID) => socket.emit('joinRoom', { playerName, roomID });
  const confirmSpectate = (roomID) => socket.emit('confirmSpectate', { roomID, playerName: spectatorName });
  const sitAtTable = () => {
    // Usa o spectatorName que foi salvo no offerSpectate/spectatorInit
    if (roomInfo.id) {
      socket.emit('claimSlot', { roomID: roomInfo.id, playerName: spectatorName });
    }
  };
  const startMatch = () => socket.emit('startGame', roomInfo.id);
  const playCard = (cardId) => { if (!isSpectator && turn === playerIndex && table.length < 4) socket.emit('playCard', { roomID: roomInfo.id, cardId }); };
  const toggleReady = () => socket.emit('playerReady', roomInfo.id);
  const leaveTable = () => socket.emit('leaveRoom', roomInfo.id);

  return { roomInfo, inGame, isSpectator, specOffer, gameOver, hand, table, trump, turn, scores, playerIndex, allPlayers, cardCounts, timeLeft, readyList, error, myId: socket.id, joinTable, confirmSpectate, sitAtTable, startMatch, playCard, toggleReady, leaveTable, setSpecOffer };
};