import { be1Error } from "./errors";
import type { IdentityAdapter, AuthenticatedIdentity } from "./identity";
import { validateId } from "./validation";

export const SESSION_COOKIE = "__Host-meawketting-session";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export type SessionRecord = { personId: string; issuedAt: number; expiresAt: number; revokedAt: number | null };
/** Strongly consistent server storage; only a verified callback may insert.
 * No browser Person/Business/Branch identifiers are stored in the cookie.
 * Production repository, callback, invitations and recovery are not wired yet.
 */
export interface SessionRepository {
  findByTokenHash(hash: string): Promise<SessionRecord | null>;
  revokeByTokenHash(hash: string): Promise<void>;
}
export async function sessionTokenHash(token: string) {
  if (!TOKEN.test(token)) throw be1Error("UNAUTHENTICATED");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export function newSessionToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export function sessionCookie(token: string, maxAge: number) {
  if (!TOKEN.test(token) || !Number.isSafeInteger(maxAge) || maxAge <= 0) throw be1Error("INVALID_INPUT");
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export const clearSessionCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
function cookieToken(request: Request) {
  const values = (request.headers.get("cookie") ?? "").split(";").map(v => v.trim()).filter(v => v.startsWith(`${SESSION_COOKIE}=`));
  if (values.length !== 1) throw be1Error("UNAUTHENTICATED");
  const token = values[0].slice(SESSION_COOKIE.length + 1);
  if (!TOKEN.test(token)) throw be1Error("UNAUTHENTICATED");
  return token;
}
/** PROVIDER-NEUTRAL, deliberately not selected by any HTTP route. */
export class ServerSessionIdentityAdapter implements IdentityAdapter {
  constructor(private readonly repository: SessionRepository, private readonly now = Date.now) {}
  async resolve(request: Request): Promise<AuthenticatedIdentity> {
    const session = await this.repository.findByTokenHash(await sessionTokenHash(cookieToken(request)));
    const now = this.now();
    if (!session || session.revokedAt !== null || !Number.isFinite(session.issuedAt) || !Number.isFinite(session.expiresAt)
      || session.issuedAt > now || session.expiresAt <= now || session.expiresAt <= session.issuedAt) throw be1Error("UNAUTHENTICATED");
    return { personId: validateId(session.personId), provider: "server-session" };
  }
  async invalidate(request: Request) {
    await this.repository.revokeByTokenHash(await sessionTokenHash(cookieToken(request)));
    return clearSessionCookie;
  }
}
