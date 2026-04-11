-- Private lobbies for Friend Match mode
-- Host creates a lobby with a numeric code; guest joins with the code and
-- the two cards are resolved into a battle immediately on join.

CREATE TABLE IF NOT EXISTS private_lobbies (
  code             TEXT PRIMARY KEY,
  host_address     TEXT NOT NULL,
  host_card_json   TEXT NOT NULL,
  host_ticket_id   TEXT NOT NULL,
  guest_address    TEXT,
  guest_ticket_id  TEXT,
  status           TEXT NOT NULL DEFAULT 'open',
  match_id         TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  matched_at       DATETIME,
  expires_at       DATETIME DEFAULT (datetime('now', '+600 seconds')),
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_private_lobbies_host ON private_lobbies(host_address, status);
CREATE INDEX IF NOT EXISTS idx_private_lobbies_status_expires ON private_lobbies(status, expires_at);
