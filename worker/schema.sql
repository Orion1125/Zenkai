-- ══════════════════════════════════════════════
-- ZENKAI — Cloudflare D1 Schema (SQLite)
-- Run: wrangler d1 execute zenkai --file=worker/schema.sql
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wallets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  address    TEXT UNIQUE NOT NULL,
  handle     TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  address      TEXT NOT NULL,
  handle       TEXT,
  quote_url    TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allowlist_gtd (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  address    TEXT UNIQUE NOT NULL,
  handle     TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allowlist_fcfs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  address    TEXT UNIQUE NOT NULL,
  handle     TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sybil_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT,
  user_agent TEXT,
  handle     TEXT,
  address    TEXT,
  reason     TEXT,
  flagged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Game tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_cards (
  address      TEXT PRIMARY KEY,
  token_id     TEXT NOT NULL,
  name         TEXT,
  image        TEXT,
  pwr          INTEGER,
  def          INTEGER,
  spd          INTEGER,
  element      TEXT,
  ability      TEXT,
  rarity       TEXT,
  traits_json  TEXT,
  level        INTEGER DEFAULT 1,
  xp           INTEGER DEFAULT 0,
  wins         INTEGER DEFAULT 0,
  losses       INTEGER DEFAULT 0,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battle_queue (
  address    TEXT PRIMARY KEY,
  card_json  TEXT NOT NULL,
  queued_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battles (
  id         TEXT PRIMARY KEY,
  player1    TEXT NOT NULL,
  player2    TEXT NOT NULL,
  winner     TEXT,
  p1_card    TEXT,
  p2_card    TEXT,
  rounds     TEXT,
  status     TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);
