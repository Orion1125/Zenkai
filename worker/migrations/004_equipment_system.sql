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
