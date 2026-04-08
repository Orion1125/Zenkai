ALTER TABLE game_cards ADD COLUMN competitive_rating REAL;
ALTER TABLE game_cards ADD COLUMN competitive_rd REAL;
ALTER TABLE game_cards ADD COLUMN competitive_volatility REAL;
ALTER TABLE game_cards ADD COLUMN competitive_matches INTEGER;
ALTER TABLE game_cards ADD COLUMN last_rated_at DATETIME;

UPDATE game_cards
   SET competitive_rating = COALESCE(competitive_rating, 1500),
       competitive_rd = COALESCE(competitive_rd, 350),
       competitive_volatility = COALESCE(competitive_volatility, 0.06),
       competitive_matches = COALESCE(competitive_matches, 0)
 WHERE competitive_rating IS NULL
    OR competitive_rd IS NULL
    OR competitive_volatility IS NULL
    OR competitive_matches IS NULL;

CREATE INDEX IF NOT EXISTS idx_game_cards_competitive_rating ON game_cards(competitive_rating DESC, wins DESC);
