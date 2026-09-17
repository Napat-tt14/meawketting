import type { D1DatabaseLike } from "./repository";
import type { SessionRecord, SessionRepository } from "./session";

type SessionRow = {
  person_id: string;
  issued_at: number;
  expires_at: number;
  revoked_at: number | null;
};

/** D1-backed session storage. The browser only receives the opaque token. */
export class D1SessionRepository implements SessionRepository {
  constructor(private readonly database: D1DatabaseLike) {}

  async findByTokenHash(hash: string): Promise<SessionRecord | null> {
    const row = await this.database.prepare(`
      SELECT person_id, issued_at, expires_at, revoked_at
      FROM auth_sessions
      WHERE token_hash = ?
    `).bind(hash).first<SessionRow>();
    return row ? {
      personId: row.person_id,
      issuedAt: Number(row.issued_at),
      expiresAt: Number(row.expires_at),
      revokedAt: row.revoked_at === null ? null : Number(row.revoked_at),
    } : null;
  }

  async revokeByTokenHash(hash: string): Promise<void> {
    await this.database.prepare(`
      UPDATE auth_sessions
      SET revoked_at = ?
      WHERE token_hash = ? AND revoked_at IS NULL
    `).bind(Math.floor(Date.now() / 1000), hash).run();
  }

  async create(record: { tokenHash: string; personId: string; issuedAt: number; expiresAt: number }): Promise<void> {
    await this.database.prepare(`
      INSERT INTO auth_sessions (token_hash, person_id, issued_at, expires_at, revoked_at)
      VALUES (?, ?, ?, ?, NULL)
    `).bind(record.tokenHash, record.personId, record.issuedAt, record.expiresAt).run();
  }
}
