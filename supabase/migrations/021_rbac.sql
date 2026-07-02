-- ─── Add ACCOUNTANT role ─────────────────────────────────────────────────────
INSERT INTO roles (name) VALUES ('ACCOUNTANT') ON CONFLICT (name) DO NOTHING;

-- ─── Sync role → auth.users app_metadata ─────────────────────────────────────
-- Runs after INSERT or UPDATE on users table so the JWT always carries the role.
CREATE OR REPLACE FUNCTION sync_user_role_to_auth()
RETURNS TRIGGER AS $$
DECLARE
  v_role_name TEXT;
  v_auth_uid  UUID;
BEGIN
  SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id;
  SELECT id   INTO v_auth_uid  FROM auth.users WHERE email = NEW.email;

  IF v_auth_uid IS NOT NULL AND v_role_name IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('role', v_role_name)
    WHERE id = v_auth_uid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_user_role ON users;
CREATE TRIGGER trg_sync_user_role
  AFTER INSERT OR UPDATE OF role_id ON users
  FOR EACH ROW EXECUTE FUNCTION sync_user_role_to_auth();

-- ─── Back-fill existing users ─────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT u.email, r.name AS role_name
    FROM   users u
    JOIN   roles r ON r.id = u.role_id
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('role', rec.role_name)
    WHERE email = rec.email;
  END LOOP;
END;
$$;
