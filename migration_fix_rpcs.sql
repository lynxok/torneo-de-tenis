
-- RPCs for Player Statistics
-- These functions allow the application/seed script to increment counters safely

-- Increment matches_won
CREATE OR REPLACE FUNCTION increment_matches_won(userid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET matches_won = matches_won + 1
  WHERE id = userid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment tournaments_won
CREATE OR REPLACE FUNCTION increment_tournaments_won(userid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET tournaments_won = tournaments_won + 1
  WHERE id = userid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload config';
