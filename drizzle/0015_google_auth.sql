CREATE TABLE `auth_sessions` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `person_id` text NOT NULL,
  `issued_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `revoked_at` integer,
  FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
  CONSTRAINT `ck_auth_session_token_hash` CHECK (length(`token_hash`) = 64),
  CONSTRAINT `ck_auth_session_window` CHECK (`issued_at` > 0 AND `expires_at` > `issued_at`),
  CONSTRAINT `ck_auth_session_revoked_at` CHECK (`revoked_at` IS NULL OR `revoked_at` >= `issued_at`)
);
--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_person` ON `auth_sessions` (`person_id`, `revoked_at`, `expires_at`);
