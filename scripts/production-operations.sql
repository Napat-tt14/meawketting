-- READ ONLY. Run with a named environment and approved operator access.
-- Aggregate counts only; never dump message bodies, tokens or Passport profiles.
SELECT state, count(*) AS total FROM message_outbox GROUP BY state;
SELECT count(*) AS expired_sending_leases FROM message_outbox
 WHERE state='sending' AND lease_until < strftime('%Y-%m-%dT%H:%M:%fZ','now');
SELECT count(*) AS overdue_outbox FROM message_outbox
 WHERE state IN ('queued','retry') AND available_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 minutes');
SELECT state, count(*) AS total FROM payment_attempts GROUP BY state;
SELECT state, count(*) AS total FROM payment_webhook_events GROUP BY state;
PRAGMA foreign_key_check;
PRAGMA quick_check;
PRAGMA page_count;
PRAGMA page_size;
