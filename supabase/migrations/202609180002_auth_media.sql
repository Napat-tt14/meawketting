-- Identity links are provisioned by an operator after verifying the invitation.
-- No email matching, signup trigger, implicit Person, Membership or Owner creation.
CREATE TABLE auth_person_links (
  auth_user_id uuid PRIMARY KEY,
  person_id text NOT NULL UNIQUE REFERENCES persons(id) ON DELETE RESTRICT,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media_objects (
  id uuid PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id),
  branch_id text,
  kind text NOT NULL CHECK (kind IN ('business-logo','pet-photo','grooming-before','grooming-after','hotel','daycare')),
  pet_id text,
  execution_id text,
  object_path text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  created_by text NOT NULL REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, branch_id) REFERENCES branches(business_id,id),
  FOREIGN KEY (business_id, pet_id) REFERENCES business_pet_profiles(business_id,pet_id),
  FOREIGN KEY (business_id, branch_id, execution_id) REFERENCES service_executions(business_id,branch_id,id),
  CHECK ((kind='business-logo' AND branch_id IS NULL AND pet_id IS NULL AND execution_id IS NULL)
    OR (kind='pet-photo' AND branch_id IS NOT NULL AND pet_id IS NOT NULL AND execution_id IS NULL)
    OR (kind IN ('grooming-before','grooming-after','hotel','daycare') AND branch_id IS NOT NULL AND pet_id IS NOT NULL AND execution_id IS NOT NULL))
);
CREATE INDEX media_objects_scope ON media_objects(business_id,branch_id,pet_id);

-- Supabase API roles cannot access Business tables. Worker authorization is mandatory.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname=current_schema() LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',t.tablename); END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',t.tablename); END IF;
  END LOOP;
END $$;

ALTER VIEW be4_staff_slots SET (security_invoker = true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon',current_schema());
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM anon',current_schema());
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated',current_schema());
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM authenticated',current_schema());
  END IF;
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE auth_person_links ADD CONSTRAINT auth_person_links_user_fk
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END $$;
