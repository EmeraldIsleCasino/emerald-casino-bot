const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const economyDb = new Database(path.join(dbDir, 'economy.db'));
const giveawaysDb = new Database(path.join(dbDir, 'giveaways.db'));
const sportsDb = new Database(path.join(dbDir, 'sports.db'));
const insideTrackDb = new Database(path.join(dbDir, 'insidetrack.db'));
const slotsDb = new Database(path.join(dbDir, 'slots.db'));
const blackjackDb = new Database(path.join(dbDir, 'blackjack.db'));

function initializeDatabases() {
  economyDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0,
      total_won INTEGER DEFAULT 0,
      total_lost INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      amount INTEGER,
      type TEXT,
      description TEXT,
      admin_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS house_funds (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_in INTEGER DEFAULT 0,
      total_out INTEGER DEFAULT 0
    );
  `);

  economyDb.prepare('INSERT OR IGNORE INTO house_funds (id, total_in, total_out) VALUES (1, 0, 0)').run();

  giveawaysDb.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT,
      message_id TEXT,
      prize TEXT,
      status TEXT DEFAULT 'active',
      winner_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id INTEGER,
      user_id TEXT,
      UNIQUE(giveaway_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS winners_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      prize TEXT,
      giveaway_id INTEGER,
      won_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  sportsDb.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT,
      message_id TEXT,
      title TEXT,
      sport TEXT,
      team1_name TEXT,
      team1_logo TEXT,
      team1_odds REAL,
      team2_name TEXT,
      team2_logo TEXT,
      team2_odds REAL,
      draw_odds REAL,
      status TEXT DEFAULT 'open',
      winner TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sports_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      user_id TEXT,
      team TEXT,
      amount INTEGER,
      potential_win INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sports_house (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_bets INTEGER DEFAULT 0,
      total_won INTEGER DEFAULT 0,
      total_lost INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS events_board (
      channel_id TEXT PRIMARY KEY,
      message_id TEXT
    );
  `);

  sportsDb.prepare('INSERT OR IGNORE INTO sports_house (id, total_bets, total_won, total_lost) VALUES (1, 0, 0, 0)').run();

  insideTrackDb.exec(`
    CREATE TABLE IF NOT EXISTS races (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT,
      message_id TEXT,
      horses TEXT,
      status TEXT DEFAULT 'betting',
      winner_horse TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS race_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      race_id INTEGER,
      user_id TEXT,
      horse_index INTEGER,
      amount INTEGER,
      odds REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inside_house (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_bets INTEGER DEFAULT 0,
      total_won INTEGER DEFAULT 0,
      total_lost INTEGER DEFAULT 0
    );
  `);

  insideTrackDb.prepare('INSERT OR IGNORE INTO inside_house (id, total_bets, total_won, total_lost) VALUES (1, 0, 0, 0)').run();

  slotsDb.exec(`
    CREATE TABLE IF NOT EXISTS spins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      game TEXT,
      bet_amount INTEGER,
      result TEXT,
      payout INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS slots_house (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_wagered INTEGER DEFAULT 0,
      total_paid INTEGER DEFAULT 0
    );
  `);

  slotsDb.prepare('INSERT OR IGNORE INTO slots_house (id, total_wagered, total_paid) VALUES (1, 0, 0)').run();

  blackjackDb.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      bet INTEGER,
      result TEXT,
      payout INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS blackjack_house (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_wagered INTEGER DEFAULT 0,
      total_paid INTEGER DEFAULT 0
    );
  `);

  blackjackDb.prepare('INSERT OR IGNORE INTO blackjack_house (id, total_wagered, total_paid) VALUES (1, 0, 0)').run();

  console.log('[Database] All databases initialized successfully.');
}

function saveAllDatabases() {
  try {
    economyDb.pragma('wal_checkpoint(TRUNCATE)');
    giveawaysDb.pragma('wal_checkpoint(TRUNCATE)');
    sportsDb.pragma('wal_checkpoint(TRUNCATE)');
    insideTrackDb.pragma('wal_checkpoint(TRUNCATE)');
    slotsDb.pragma('wal_checkpoint(TRUNCATE)');
    blackjackDb.pragma('wal_checkpoint(TRUNCATE)');
    console.log('[Autoping] Bases de datos guardadas correctamente.');
    return true;
  } catch (error) {
    console.error('[Autoping] Error saving databases:', error);
    return false;
  }
}

module.exports = {
  economyDb,
  giveawaysDb,
  sportsDb,
  insideTrackDb,
  slotsDb,
  blackjackDb,
  initializeDatabases,
  saveAllDatabases
};
