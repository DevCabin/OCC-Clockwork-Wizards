-- Migration: Create admin_settings table for frontend admin gate
-- Stores the admin password so it can be changed directly in Supabase.

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one row exists by using a fixed singleton key.
-- The application will always read the first (and only) row.
INSERT INTO admin_settings (id, password)
VALUES ('00000000-0000-0000-0000-000000000000', 'NERDYMUGS1234!')
ON CONFLICT (id) DO NOTHING;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
