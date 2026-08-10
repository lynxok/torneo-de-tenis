
-- Fix for Tournaments Constraints
-- The existing tournaments_category_check is too restrictive or mismatched.

ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_category_check;

-- Optional: Re-add with correct values if desired, or leave it flexible.
-- ALTER TABLE tournaments ADD CONSTRAINT tournaments_category_check CHECK (category IN ('1ra', '2da', '3ra', '4ta', '5ta', 'Open', 'Primera', 'Segunda', 'Tercera'));

-- Also check 'type' constraint if it exists?
-- ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_type_check;

NOTIFY pgrst, 'reload config';
