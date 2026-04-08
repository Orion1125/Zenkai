ALTER TABLE game_cards ADD COLUMN hp INTEGER;

UPDATE game_cards
   SET hp = COALESCE(hp, 180 + (COALESCE(def, 50) * 3) + (COALESCE(level, 1) * 10))
 WHERE hp IS NULL;

CREATE TABLE IF NOT EXISTS equipment_track_levels (
  address       TEXT NOT NULL,
  class_key     TEXT NOT NULL,
  track_id      TEXT NOT NULL,
  current_level INTEGER DEFAULT 1,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, track_id)
);

INSERT OR IGNORE INTO equipment_track_levels (address, class_key, track_id, current_level, updated_at)
SELECT
  address,
  class_key,
  REPLACE(equipment_id, '_defense_', '_hp_'),
  1,
  COALESCE(unlocked_at, CURRENT_TIMESTAMP)
FROM equipment_unlocks;

ALTER TABLE card_loadouts ADD COLUMN power_track_id TEXT;
ALTER TABLE card_loadouts ADD COLUMN hp_track_id TEXT;
ALTER TABLE card_loadouts ADD COLUMN speed_track_id TEXT;

UPDATE card_loadouts
   SET power_track_id = COALESCE(power_track_id, power_item_id),
       hp_track_id = COALESCE(hp_track_id, REPLACE(defense_item_id, '_defense_', '_hp_')),
       speed_track_id = COALESCE(speed_track_id, speed_item_id)
 WHERE power_track_id IS NULL
    OR hp_track_id IS NULL
    OR speed_track_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_track_levels_class_key ON equipment_track_levels(address, class_key);
