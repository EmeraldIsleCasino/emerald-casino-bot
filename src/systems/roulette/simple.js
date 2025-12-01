const games = new Map();
const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function checkWin(num, bet) {
  if (!bet || bet.amount === 0) return 0;
  // Probabilidades oficiales: 44% jugador en rojo/negro/par/impar
  // Pago 2:1 pero con 44% de probabilidad de ganar
  const rand = Math.random();
  const playerWinProb = 0.44;
  
  let won = false;
  if (bet.type === 'r' && RED.includes(num)) won = true;
  if (bet.type === 'b' && !RED.includes(num) && num > 0) won = true;
  if (bet.type === 'e' && num > 0 && num % 2 === 0) won = true;
  if (bet.type === 'o' && num > 0 && num % 2 === 1) won = true;
  
  // Aplicar probabilidad: solo gana si el resultado físico es correcto Y pasa la probabilidad
  if (won && rand < playerWinProb) {
    return bet.amount * 2; // Pago 2:1
  }
  return 0;
}

module.exports = {
  create: (uid) => { 
    games.set(uid, { bet: null, result: null, win: 0 }); 
    return games.get(uid); 
  },
  get: (uid) => games.get(uid),
  del: (uid) => games.delete(uid),
  setBet: (uid, type, amt) => {
    const g = games.get(uid);
    if (g) g.bet = { type, amount: amt };
    return true;
  },
  spin: (uid) => {
    const g = games.get(uid);
    if (!g) return null;
    const n = Math.floor(Math.random() * 37);
    g.result = n;
    g.win = checkWin(n, g.bet);
    return n;
  },
  RED
};
