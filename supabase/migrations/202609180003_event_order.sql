-- Preserve insertion ordering independently of physical row location.
ALTER TABLE execution_events ADD COLUMN sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE;
ALTER TABLE access_events ADD COLUMN sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE;
ALTER TABLE intake_corrections ADD COLUMN sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE;

-- New identity sequences must not inherit Supabase API-role access.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM anon',current_schema());
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM authenticated',current_schema());
  END IF;
END $$;

-- New identity sequences must not inherit Supabase API-role access.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM anon',current_schema());
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM authenticated',current_schema());
  END IF;
END $$;
