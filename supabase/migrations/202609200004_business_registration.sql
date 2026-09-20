-- Explicit, confirmed self-service registration; OAuth callbacks never create authority.
CREATE TABLE business_registrations (
  auth_user_id uuid PRIMARY KEY REFERENCES auth_person_links(auth_user_id),
  business_id text NOT NULL UNIQUE REFERENCES businesses(id),
  branch_id text NOT NULL,
  request_hash text NOT NULL CHECK (length(request_hash)=64),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id,branch_id) REFERENCES branches(business_id,id)
);
ALTER TABLE business_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON business_registrations FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON business_registrations FROM anon; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON business_registrations FROM authenticated; END IF;
END $$;
