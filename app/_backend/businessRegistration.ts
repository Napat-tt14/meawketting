import { verifiedBusinessUser, businessAccountDestination } from "./auth";
import { database } from "./runtime";
import { asBe1Error, be1Error } from "./be1/errors";
import { readJson } from "./shared/http";
import { requireSameOrigin } from "./shared/requestSecurity";
import { normalizeBranchNameKey } from "./be1/validation";

function validate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("INVALID_INPUT");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["displayName", "businessName", "branchName", "phone", "email", "modules", "confirmed"].includes(key)) || input.confirmed !== true) throw be1Error("INVALID_INPUT");
  const field = (key: string, max: number, optional = false) => {
    const v = input[key];
    if (typeof v !== "string" || v.trim().length > max || (!optional && !v.trim()) || [...v].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw be1Error("INVALID_INPUT");
    return v.trim();
  };
  const displayName = field("displayName", 120), businessName = field("businessName", 160), branchName = field("branchName", 160);
  const phone = field("phone", 30), email = field("email", 254, true);
  if (!/^\+?[0-9 ()-]{8,30}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw be1Error("INVALID_INPUT");
  if (!Array.isArray(input.modules) || !input.modules.length || input.modules.length > 3 || input.modules.some(m => !["grooming", "hotel", "daycare"].includes(m)) || new Set(input.modules).size !== input.modules.length) throw be1Error("INVALID_INPUT");
  return { displayName, businessName, branchName, phone, email, modules: [...input.modules as string[]].sort(), confirmed: true };
}

/** The unlinked-identity guard and unique receipt serialize registration inside D1's atomic batch. */
export async function registerBusiness(value: unknown) {
  const user = await verifiedBusinessUser();
  const input = validate(value);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)))), b => b.toString(16).padStart(2,"0")).join("");
  const db = database();
  const readReceipt = async () => {
    const receipt = await db.prepare(`SELECT r.*,p.status person_status,b.status business_status,m.status membership_status
      FROM business_registrations r JOIN persons p ON p.id=r.person_id JOIN businesses b ON b.id=r.business_id
      JOIN business_memberships m ON m.person_id=p.id AND m.business_id=b.id WHERE r.identity_id=?`).bind(user.id)
      .first<{ person_status: string; business_status: string; membership_status: string; request_hash: string; business_id: string; branch_id: string }>();
    if (receipt) {
      if ([receipt.person_status, receipt.business_status, receipt.membership_status].some(s => s !== "active")) throw be1Error("FORBIDDEN");
      if (receipt.request_hash !== hash) throw be1Error("CONFLICT");
      return { businessId: receipt.business_id, branchId: receipt.branch_id };
    }
    return null;
  };
  const receipt = await readReceipt();
  if (receipt) return receipt;
  if (user.person_id) throw be1Error("FORBIDDEN");
    const personId = crypto.randomUUID(), businessId = crypto.randomUUID(), branchId = crypto.randomUUID(), membershipId = crypto.randomUUID();
    const now = new Date().toISOString(), guard = crypto.randomUUID();
    const statements = [
      db.prepare(`INSERT INTO backend_guards(id,allowed) SELECT ?,EXISTS(SELECT 1 FROM auth_identities i
        JOIN auth_sessions s ON s.identity_id=i.id WHERE i.id=? AND i.person_id IS NULL AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>?)`).bind(guard, user.id, user.session_id, now),
      db.prepare("INSERT INTO persons(id,display_name,primary_email,created_at,updated_at) VALUES(?,?,?,?,?)").bind(personId, input.displayName, user.email, now, now),
      db.prepare(`INSERT INTO businesses(id,name,contact_name,phone,email,created_at,updated_at,created_by_person_id,updated_by_person_id)
        VALUES(?,?,?,?,?,?,?,?,?)`).bind(businessId, input.businessName, input.displayName, input.phone, input.email, now, now, personId, personId),
      db.prepare(`INSERT INTO branches(id,business_id,name,name_key,phone,email,created_at,updated_at,created_by_person_id,updated_by_person_id)
        VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(branchId, businessId, input.branchName, normalizeBranchNameKey(input.branchName), input.phone, input.email, now, now, personId, personId),
      db.prepare(`INSERT INTO business_memberships(id,person_id,business_id,role,created_at,updated_at,created_by_person_id,updated_by_person_id)
        VALUES(?,?,?,'OWNER',?,?,?,?)`).bind(membershipId, personId, businessId, now, now, personId, personId),
    ];
    for (const service of input.modules) statements.push(db.prepare("INSERT INTO branch_enabled_modules(business_id,branch_id,module,created_at,created_by_person_id) VALUES(?,?,?,?,?)").bind(businessId, branchId, service, now, personId));
    for (const day of ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]) {
      statements.push(db.prepare(`INSERT INTO branch_operating_hours(business_id,branch_id,weekday,closed,opens_at,closes_at,updated_at,updated_by_person_id)
        VALUES(?,?,?,1,'09:00','18:00',?,?)`).bind(businessId, branchId, day, now, personId));
    }
    statements.push(db.prepare("UPDATE auth_identities SET person_id=?,updated_at=? WHERE id=? AND person_id IS NULL").bind(personId, now, user.id));
    statements.push(db.prepare("UPDATE auth_sessions SET person_id=? WHERE identity_id=?").bind(personId, user.id));
    statements.push(db.prepare("INSERT INTO business_registrations(identity_id,person_id,business_id,branch_id,request_hash,confirmed_at) VALUES(?,?,?,?,?,?)").bind(user.id, personId, businessId, branchId, hash, now));
    const requestId = crypto.randomUUID();
    statements.push(db.prepare(`INSERT INTO audit_events(id,actor_person_id,actor_membership_id,business_id,branch_id,request_id,correlation_id,action,target_type,target_id,after_json,occurred_at)
      VALUES(?,?,?,?,?,?,?,'business.register','business',?,?,?)`)
      .bind(crypto.randomUUID(), personId, membershipId, businessId, branchId, requestId, requestId, businessId, JSON.stringify({ confirmed: true, policy: "self-service-2026-09-20", modules: input.modules }), now));
    statements.push(db.prepare("DELETE FROM backend_guards WHERE id=?").bind(guard));
    try { await db.batch(statements); }
    catch (error) {
      const concurrent = await readReceipt();
      if (concurrent) return concurrent;
      if (String(error).includes("ck_backend_authorization")) throw be1Error("FORBIDDEN");
      throw error;
    }
    return { businessId, branchId };
}

export async function registrationRequest(request: Request) {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  try {
    if (request.method === "GET") {
      const user = await verifiedBusinessUser();
      const destination = await businessAccountDestination(user.id);
      return Response.json({ authenticated: true, registered: destination === "/business/home" }, { headers });
    }
    requireSameOrigin(request);
    const result = await registerBusiness(await readJson(request, 4096));
    return Response.json(result, { headers });
  } catch (error) {
    const failure = asBe1Error(error);
    return Response.json({ error: failure.code }, { status: failure.status, headers });
  }
}
