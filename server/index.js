const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const SUITS = ['C', 'E', 'O', 'P'];
const RANKS = [
  { rank: '2', value: 0, power: 1 }, { rank: '3', value: 0, power: 2 },
  { rank: '4', value: 0, power: 3 }, { rank: '5', value: 0, power: 4 },
  { rank: '6', value: 0, power: 5 }, { rank: 'Q', value: 2, power: 6 },
  { rank: 'J', value: 3, power: 7 }, { rank: 'K', value: 4, power: 8 },
  { rank: '7', value: 10, power: 9 }, { rank: 'A', value: 11, power: 10 },
];

let rooms = {};
let turnTimers = {};

function createDeck() {
  let deck = [];
  SUITS.forEach(suit => RANKS.forEach(r => {
    const apiSuit = suit === 'P' ? 'C' : suit === 'O' ? 'D' : suit === 'E' ? 'S' : 'H';
    deck.push({ ...r, suit, id: `${r.rank}${suit}-${Math.random()}`, image: `https://deckofcardsapi.com/static/img/${r.rank === '10' ? '0' : r.rank}${apiSuit}.png` });
  }));
  return deck.sort(() => Math.random() - 0.5);
}

function resolveTrick(table, trumpSuit) {
  const leadSuit = table[0].suit;
  let winnerCard = table[0];
  table.forEach(card => {
    const isTrump = card.suit === trumpSuit;
    const winnerIsTrump = winnerCard.suit === trumpSuit;
    if ((isTrump && !winnerIsTrump) || (card.suit === winnerCard.suit && card.power > winnerCard.power)) {
      winnerCard = card;
    }
  });
  return { winnerIndex: winnerCard.playerIndex, points: table.reduce((a, b) => a + b.value, 0) };
}

function startTurnManager(roomID) {
  const room = rooms[roomID];
  if (!room || room.gameState.gameOver) return;
  if (turnTimers[roomID]) clearTimeout(turnTimers[roomID]);

  const currentPlayer = room.players[room.gameState.turn];
  if (!currentPlayer) return;

  const delay = currentPlayer.isBot ? 1500 : 31000;
  turnTimers[roomID] = setTimeout(() => {
    const r = rooms[roomID];
    if (!r || r.gameState.gameOver) return;
    const hand = r.gameState.hands[currentPlayer.id];
    if (!hand || hand.length === 0) return;
    let idx = 0;
    if (r.gameState.table.length > 0) {
      const lead = r.gameState.table[0].suit;
      const vIdx = hand.findIndex(c => c.suit === lead);
      idx = vIdx !== -1 ? vIdx : 0;
    }
    processPlay(roomID, currentPlayer.id, idx);
  }, delay);
}

function processPlay(roomID, socketID, cardIdx) {
  const room = rooms[roomID];
  if (!room || room.gameState.table.length >= 4) return;
  const gs = room.gameState;
  const hand = gs.hands[socketID];
  if (!hand || !hand[cardIdx]) return;

  const card = hand[cardIdx];
  if (gs.table.length > 0) {
    const lead = gs.table[0].suit;
    if (hand.some(c => c.suit === lead) && card.suit !== lead) {
      return io.to(socketID).emit('errorMsg', 'Tens de assistir ao naipe!');
    }
  }

  gs.hands[socketID].splice(cardIdx, 1);
  gs.table.push({ ...card, playerIndex: gs.turn });
  gs.cardCounts[gs.turn]--;
  
  io.to(socketID).emit('updateMyHand', gs.hands[socketID]);
  gs.turn = (gs.turn + 1) % 4;
  io.in(roomID).emit('gameStateUpdate', gs);

  if (gs.table.length === 4) {
    clearTimeout(turnTimers[roomID]);
    setTimeout(() => {
      if (!rooms[roomID]) return;
      const res = resolveTrick(gs.table, gs.trump.suit);
      gs.scores[res.winnerIndex % 2 === 0 ? 0 : 1] += res.points;
      gs.turn = res.winnerIndex;
      gs.table = [];
      if (Object.values(gs.hands)[0].length === 0) {
        gs.gameOver = true;
        io.in(roomID).emit('gameOver', { scores: gs.scores });
      } else {
        io.in(roomID).emit('gameStateUpdate', gs);
        startTurnManager(roomID);
      }
    }, 2000);
  } else {
    startTurnManager(roomID);
  }
}

function handleDeparture(socket, roomID) {
  const room = rooms[roomID];
  if (!room) return;
  const pIdx = room.players.findIndex(p => p.id === socket.id);
  if (pIdx === -1) return;

  const oldId = socket.id;
  const player = room.players[pIdx];

  if (room.gameState.started && !room.gameState.gameOver) {
    const botId = `bot-takeover-${Date.now()}-${pIdx}`;
    if (room.gameState.hands[oldId]) {
      room.gameState.hands[botId] = room.gameState.hands[oldId];
      delete room.gameState.hands[oldId];
    }
    player.isBot = true;
    player.name = `Bot ${pIdx + 1}`;
    player.id = botId;
    io.in(roomID).emit('roomUpdate', { id: roomID, players: room.players });
    if (room.gameState.turn === pIdx) startTurnManager(roomID);
  } else {
    room.players.splice(pIdx, 1);
    room.players.forEach((p, i) => p.index = i);
    io.in(roomID).emit('roomUpdate', { id: roomID, players: room.players });
  }

  const humans = room.players.filter(p => !p.isBot);
  if (humans.length === 0) {
    if (turnTimers[roomID]) clearTimeout(turnTimers[roomID]);
    delete rooms[roomID];
  }
}

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomID, playerName }) => {
    if (!rooms[roomID]) rooms[roomID] = { players: [], gameState: { started: false, gameOver: false }, readyPlayers: new Set() };
    const room = rooms[roomID];
    const humanCount = room.players.filter(p => !p.isBot).length;

    if (room.gameState.started || humanCount >= 4) {
      socket.emit('offerSpectate', { roomID, isFull: humanCount >= 4, isStarted: room.gameState.started, playerName });
      return;
    }

    socket.join(roomID);
    room.players.push({ id: socket.id, name: playerName, isBot: false, index: room.players.length });
    io.in(roomID).emit('roomUpdate', { id: roomID, players: room.players });
  });

  socket.on('confirmSpectate', ({ roomID, playerName }) => {
    socket.join(roomID);
    const room = rooms[roomID];
    if (room) socket.emit('spectatorInit', { id: roomID, players: room.players, gameState: room.gameState, mySpectatorName: playerName });
  });

  socket.on('claimSlot', ({ roomID, playerName }) => {
    const room = rooms[roomID];
    if (!room) return;

    // 1. Verificar se há lugar (vaga ou bot)
    const botIdx = room.players.findIndex(p => p.isBot);
    let newIndex;

    const newPlayer = { 
      id: socket.id, 
      name: playerName, 
      isBot: false 
    };

    if (botIdx !== -1) {
      newIndex = botIdx;
      newPlayer.index = newIndex;
      room.players[botIdx] = newPlayer;
    } else if (room.players.length < 4) {
      newIndex = room.players.length;
      newPlayer.index = newIndex;
      room.players.push(newPlayer);
    } else {
      return socket.emit('errorMsg', 'Mesa cheia!');
    }

    console.log(`[CLAIM] Espectador ${playerName} ocupou lugar ${newIndex}`);

    // 2. Notificar TODOS na sala para atualizar o Lobby (background)
    io.in(roomID).emit('roomUpdate', { id: roomID, players: room.players });

    // 3. Notificar ESPECIFICAMENTE este utilizador para ele mudar de ecrã
    socket.emit('spectatorBecamePlayer', { 
      playerIndex: newIndex, 
      allPlayers: room.players 
    });
  });

  socket.on('startGame', (roomID) => {
    const room = rooms[roomID];
    if (!room) return;
    while (room.players.length < 4) {
      const idx = room.players.length;
      room.players.push({ id: `bot-${idx}`, name: `Bot ${idx + 1}`, isBot: true, index: idx });
    }
    const deck = createDeck();
    room.gameState = { started: true, gameOver: false, hands: {}, table: [], trump: deck[39], turn: 0, scores: [0, 0], cardCounts: { 0: 10, 1: 10, 2: 10, 3: 10 } };
    io.in(roomID).emit('gameStateUpdate', room.gameState);
    room.players.forEach((p, i) => {
      room.gameState.hands[p.id] = deck.slice(i * 10, (i + 1) * 10);
      if (!p.isBot) io.to(p.id).emit('initHand', { hand: room.gameState.hands[p.id], trump: room.gameState.trump, playerIndex: i, allPlayers: room.players });
    });
    io.in(roomID).emit('gameStarted', room.gameState);
    startTurnManager(roomID);
  });

  socket.on('playCard', ({ roomID, cardId }) => {
    const room = rooms[roomID];
    if (!room || room.gameState.table.length >= 4) return;
    const hand = room.gameState.hands[socket.id];
    if (!hand) return;
    const idx = hand.findIndex(c => c.id === cardId);
    if (idx !== -1) processPlay(roomID, socket.id, idx);
  });

  socket.on('playerReady', (roomID) => {
    const room = rooms[roomID];
    if (!room) return;
    
    room.readyPlayers.add(socket.id);
    const humans = room.players.filter(p => !p.isBot);
    
    io.in(roomID).emit('readyUpdate', Array.from(room.readyPlayers));

    if (room.readyPlayers.size >= humans.length) {
      room.readyPlayers.clear();
      
      // LIMPEZA: Remove os bots para que o Lobby mostre apenas os humanos
      room.players = room.players.filter(p => !p.isBot);
      room.gameState.started = false;
      room.gameState.gameOver = false;
      room.gameState.table = [];

      // Primeiro avisamos que a sala mudou (volta ao Menu da Mesa)
      io.in(roomID).emit('roomUpdate', { id: roomID, players: room.players });
      
      // Depois damos o sinal de restart que muda o ecrã no React
      io.in(roomID).emit('triggerRestart');
    }
  });

  socket.on('leaveRoom', (roomID) => { handleDeparture(socket, roomID); socket.emit('leftRoom'); });
  socket.on('disconnect', () => { for (const rid in rooms) handleDeparture(socket, rid); });
});

server.listen(3001, () => console.log("Servidor Online 3001"));