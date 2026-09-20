import postgres from "postgres";
const { DATABASE_URL: url, SUPABASE_AUTH_USER_ID: user, MEAWKETTING_PERSON_ID: person } = process.env;
if (!url || !user || !person || !/^[0-9a-f-]{36}$/.test(user)) throw Error("DATABASE_URL, SUPABASE_AUTH_USER_ID and MEAWKETTING_PERSON_ID are required.");
const sql = postgres(url, { prepare: false, max: 1, ssl: ["127.0.0.1","localhost"].includes(new URL(url).hostname) ? false : "verify-full" });
try {
  const rows = await sql`INSERT INTO auth_person_links(auth_user_id,person_id)
    SELECT ${user}::uuid,p.id FROM persons p WHERE p.id=${person} AND p.status='active'
    AND EXISTS(SELECT 1 FROM business_memberships m JOIN businesses b ON b.id=m.business_id WHERE m.person_id=p.id AND m.status='active' AND b.status='active')
    RETURNING person_id`;
  if (!rows.length) throw Error("An active Person with an active Business membership must be provisioned first.");
  console.log("Verified auth identity linked to existing Person. No authority was created.");
} finally { await sql.end(); }
