export const SUITS = ['C', 'E', 'O', 'P'];
export const RANKS = [
  { rank: '2', value: 0, power: 1 },
  { rank: '3', value: 0, power: 2 },
  { rank: '4', value: 0, power: 3 },
  { rank: '5', value: 0, power: 4 },
  { rank: '6', value: 0, power: 5 },
  { rank: 'Q', value: 2, power: 6 },
  { rank: 'J', value: 3, power: 7 },
  { rank: 'K', value: 4, power: 8 },
  { rank: '7', value: 10, power: 9 },
  { rank: 'A', value: 11, power: 10 },
];

export const createDeck = () => {
  let deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(r => {
      const apiSuit = suit === 'P' ? 'C' : suit === 'O' ? 'D' : suit === 'E' ? 'S' : 'H';
      deck.push({ 
        ...r, 
        suit, 
        id: `${r.rank}${suit}`, // ID fixo para evitar re-renders loucos
        image: `https://deckofcardsapi.com/static/img/${r.rank === '10' ? '0' : r.rank}${apiSuit}.png`
      });
    });
  });
  return deck.sort(() => Math.random() - 0.5);
};

export const sortHand = (hand) => {
  const suitOrder = { 'C': 0, 'E': 1, 'O': 2, 'P': 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return b.power - a.power;
  });
};