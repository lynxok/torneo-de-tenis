
-- Fix for Profiles Constraints
-- The existing profiles_category_check is blocking '1ra', '2da', etc.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_category_check;

-- Optional: Re-add if needed with better values, or leave it flex.
-- ALTER TABLE profiles ADD CONSTRAINT profiles_category_check CHECK (category IN ('1ra', '2da', '3ra', '4ta', '5ta', 'Open', '6ta', 'PRINCIPIANTE'));

NOTIFY pgrst, 'reload config';
