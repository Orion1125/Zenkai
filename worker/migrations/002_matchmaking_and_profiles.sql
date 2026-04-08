CREATE TABLE IF NOT EXISTS profiles (
  address      TEXT PRIMARY KEY,
  display_name TEXT,
  bio          TEXT,
  avatar_url   TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE game_cards ADD COLUMN pwr INTEGER;
ALTER TABLE game_cards ADD COLUMN def INTEGER;
ALTER TABLE game_cards ADD COLUMN spd INTEGER;
ALTER TABLE game_cards ADD COLUMN element TEXT;
ALTER TABLE game_cards ADD COLUMN ability TEXT;
ALTER TABLE game_cards ADD COLUMN rarity TEXT;
ALTER TABLE game_cards ADD COLUMN traits_json TEXT;

ALTER TABLE battle_queue ADD COLUMN ticket_id TEXT;
ALTER TABLE battle_queue ADD COLUMN status TEXT;
ALTER TABLE battle_queue ADD COLUMN match_id TEXT;
ALTER TABLE battle_queue ADD COLUMN rating INTEGER;
ALTER TABLE battle_queue ADD COLUMN bucket_key INTEGER;
ALTER TABLE battle_queue ADD COLUMN matched_at DATETIME;
ALTER TABLE battle_queue ADD COLUMN expires_at DATETIME;
ALTER TABLE battle_queue ADD COLUMN updated_at DATETIME;

ALTER TABLE battles ADD COLUMN p1_ticket_id TEXT;
ALTER TABLE battles ADD COLUMN p2_ticket_id TEXT;

UPDATE battle_queue
   SET ticket_id  = COALESCE(ticket_id, lower(hex(randomblob(16)))),
       status     = COALESCE(status, 'searching'),
       rating     = COALESCE(rating, 0),
       bucket_key = COALESCE(bucket_key, 0),
       expires_at = COALESCE(expires_at, datetime(COALESCE(queued_at, CURRENT_TIMESTAMP), '+90 seconds')),
       updated_at = COALESCE(updated_at, COALESCE(queued_at, CURRENT_TIMESTAMP))
 WHERE ticket_id IS NULL
    OR status IS NULL
    OR rating IS NULL
    OR bucket_key IS NULL
    OR expires_at IS NULL
    OR updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_battle_queue_ticket_id ON battle_queue(ticket_id);
CREATE INDEX IF NOT EXISTS idx_battle_queue_status_queued_at ON battle_queue(status, queued_at);
CREATE INDEX IF NOT EXISTS idx_battle_queue_status_rating ON battle_queue(status, rating, queued_at);
CREATE INDEX IF NOT EXISTS idx_battle_queue_bucket_key ON battle_queue(bucket_key, queued_at);
CREATE INDEX IF NOT EXISTS idx_battle_queue_match_id ON battle_queue(match_id);
CREATE INDEX IF NOT EXISTS idx_battles_p1_ticket_id ON battles(p1_ticket_id);
CREATE INDEX IF NOT EXISTS idx_battles_p2_ticket_id ON battles(p2_ticket_id);
