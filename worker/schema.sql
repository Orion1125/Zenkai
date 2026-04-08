-- ══════════════════════════════════════════════
-- ZENKAI — Cloudflare D1 Schema (SQLite)
-- Snapshot of the latest schema. Prefer: npm run worker:db:migrate[:remote]
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
  competitive_rating REAL DEFAULT 1500,
  competitive_rd REAL DEFAULT 350,
  competitive_volatility REAL DEFAULT 0.06,
  competitive_matches INTEGER DEFAULT 0,
  last_rated_at DATETIME,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battle_queue (
  address    TEXT PRIMARY KEY,
  ticket_id  TEXT UNIQUE NOT NULL,
  card_json  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'searching',
  match_id   TEXT,
  rating     INTEGER NOT NULL DEFAULT 0,
  bucket_key INTEGER NOT NULL DEFAULT 0,
  queued_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  matched_at DATETIME,
  expires_at DATETIME DEFAULT (datetime('now', '+90 seconds')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  resolved_at DATETIME,
  p1_ticket_id TEXT,
  p2_ticket_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_battle_queue_status_queued_at ON battle_queue(status, queued_at);
CREATE INDEX IF NOT EXISTS idx_battle_queue_status_rating ON battle_queue(status, rating, queued_at);
CREATE INDEX IF NOT EXISTS idx_battle_queue_bucket_key ON battle_queue(bucket_key, queued_at);
CREATE INDEX IF NOT EXISTS idx_battle_queue_match_id ON battle_queue(match_id);
CREATE INDEX IF NOT EXISTS idx_battles_p1_ticket_id ON battles(p1_ticket_id);
CREATE INDEX IF NOT EXISTS idx_battles_p2_ticket_id ON battles(p2_ticket_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_competitive_rating ON game_cards(competitive_rating DESC, wins DESC);

-- ── Profile table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  address      TEXT PRIMARY KEY,
  display_name TEXT,
  bio          TEXT,
  avatar_url   TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_progress (
  address      TEXT PRIMARY KEY,
  forge_shards INTEGER DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_unlocks (
  address      TEXT NOT NULL,
  class_key    TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  unlocked_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, equipment_id)
);

CREATE TABLE IF NOT EXISTS card_loadouts (
  address         TEXT NOT NULL,
  token_id        TEXT NOT NULL,
  power_item_id   TEXT NOT NULL,
  defense_item_id TEXT NOT NULL,
  speed_item_id   TEXT NOT NULL,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_equipment_unlocks_class_key ON equipment_unlocks(address, class_key);
CREATE INDEX IF NOT EXISTS idx_card_loadouts_address ON card_loadouts(address, token_id);
