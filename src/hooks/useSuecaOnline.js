import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://sueca-server-production.up.railway.app/', {
  transports: ['websocket'], // Força o uso de WebSockets diretamente
  upgrade: false
});

// const socket = io('http://localhost:3001'); 

const sortHand = (hand) => {
  if (!hand) return [];
  const suitOrder = { 'C': 0, 'E': 1, 'O': 2, 'P': 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return b.power - a.power;
  });
};

export const useSuecaOnline = (userName) => {
  const [availableTables, setAvailableTables] = useState([]);
  const [roomInfo, setRoomInfo] = useState({ id: null, players: [null,null,null,null] });
  const [inGame, setInGame] = useState(false);
  const [gamePhase, setGamePhase] = useState('lobby');
  const [cortador, setCortador] = useState(0);
  const [dealer, setDealer] = useState(0);
  const [totalScores, setTotalScores] = useState([0, 0]);
  const [isSpectator, setIsSpectator] = useState(false);
  const [spectatorName, setSpectatorName] = useState("");
  const [specOffer, setSpecOffer] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [isFinalGame, setIsFinalGame] = useState(false);
  const [hand, setHand] = useState([]);
  const [table, setTable] = useState([]);
  const [trump, setTrump] = useState(null);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [cardCounts, setCardCounts] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [readyTimer, setReadyTimer] = useState(30);
  const [readyList, setReadyList] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on('tablesList', (list) => setAvailableTables(list));
    socket.on('roomUpdate', (data) => {
      setRoomInfo(data); setAllPlayers(data.players);
      const me = data.players.find(p => p?.id === socket.id);
      setPlayerIndex(me ? parseInt(me.index) : null);
      setIsSpectator(!me);
    });
    socket.on('gameStarted', (gs) => {
      setInGame(true); setGameOver(false); setGamePhase(gs.phase); 
      setCortador(gs.cortador); setDealer(gs.dealer); setScores([0,0]); setTable([]); setHand([]); setReadyList([]); setReadyTimer(30);
    });
    socket.on('phaseUpdate', (data) => { setGamePhase(data.phase); setDealer(data.dealer); setTimeLeft(30); });
    socket.on('initHand', (data) => {
      setHand(sortHand(data.hand)); setTrump(data.trump); setPlayerIndex(parseInt(data.playerIndex));
      setTurn(parseInt(data.turn)); setGamePhase('playing'); setInGame(true);
    });
    socket.on('gameStateUpdate', (gs) => {
      setTable(gs.table || []); setTurn(parseInt(gs.turn)); setScores(gs.scores || [0,0]);
      setCardCounts(gs.cardCounts || {}); if (gs.phase) setGamePhase(gs.phase); setTimeLeft(30);
    });
    socket.on('gameOver', (d) => { setGameOver(true); setInGame(false); setScores(d.scores); setTotalScores(d.totalScores); setIsFinalGame(d.isFinal); setReadyTimer(30); });
    socket.on('readyUpdate', (list) => setReadyList(list));
    socket.on('triggerRestart', () => { setInGame(false); setGameOver(false); setTable([]); setHand([]); setGamePhase('lobby'); setReadyList([]); setReadyTimer(30); });
    socket.on('spectatorInit', (data) => {
      setRoomInfo({ id: data.id, players: data.players }); setIsSpectator(true);
      setTotalScores(data.totalScores || [0,0]); setSpectatorName(data.mySpectatorName);
      if (data.gameState?.started) {
        setInGame(true); setGamePhase(data.gameState.phase); setTrump(data.gameState.trump);
        setTable(data.gameState.table || []); setTurn(parseInt(data.gameState.turn)); setScores(data.gameState.scores);
        setCardCounts(data.gameState.cardCounts); setCortador(data.gameState.cortador); setDealer(data.gameState.dealer);
      }
    });
    socket.on('spectatorBecamePlayer', (data) => { setIsSpectator(false); setPlayerIndex(parseInt(data.playerIndex)); setGameOver(false); setInGame(false); });
    socket.on('leftRoom', () => { setRoomInfo({ id: null, players: [null,null,null,null] }); setInGame(false); setGameOver(false); setIsSpectator(false); setPlayerIndex(null); setHand([]); });
    socket.on('updateMyHand', (h) => setHand(sortHand(h)));
    socket.on('errorMsg', (m) => { setError(m); setTimeout(() => setError(""), 3000); });
    return () => socket.off();
  }, [roomInfo.id]);

  useEffect(() => {
    if (!inGame || gameOver || gamePhase === 'lobby') return;
    const t = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [inGame, gameOver, turn, gamePhase]);

  useEffect(() => {
    if (!gameOver || isFinalGame) return;
    const t = setInterval(() => {
      setReadyTimer(prev => {
        if (prev <= 1) {
          if (!isSpectator && !readyList.includes(socket.id)) socket.emit('playerReady', roomInfo.id);
          clearInterval(t); return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gameOver, isFinalGame, readyList, roomInfo.id, isSpectator]);

  const joinTable = (t, s, p) => socket.emit('joinSeat', { tableId: t, seatIndex: s, playerName: p });
  const startMatch = () => socket.emit('startGame', roomInfo.id);
  const cutDeck = (pos) => socket.emit('cutDeck', { roomID: roomInfo.id, cutPosition: pos });
  const pickTrump = (side) => socket.emit('pickTrump', { roomID: roomInfo.id, side });
  const playCard = (cId) => { if (parseInt(turn) === parseInt(playerIndex) && table.length < 4) socket.emit('playCard', { roomID: roomInfo.id, cardId: cId }); };
  const toggleReady = () => socket.emit('playerReady', roomInfo.id);
  const leaveTable = () => socket.emit('leaveRoom', roomInfo.id);
  const sitAtTable = () => {
    const emptySlot = roomInfo.players.findIndex(p => !p || p.isBot);
    if (emptySlot !== -1) joinTable(roomInfo.id, emptySlot, spectatorName || userName);
  };

  return { availableTables, roomInfo, inGame, gamePhase, cortador, dealer, totalScores, isSpectator, gameOver, isFinalGame, readyTimer, hand, table, trump, turn, scores, playerIndex, cardCounts, timeLeft, readyList, error, myId: socket.id, joinTable, startMatch, cutDeck, pickTrump, playCard, toggleReady, leaveTable, sitAtTable };
};