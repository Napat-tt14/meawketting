-- READ ONLY. Run with a named environment and approved operator access.
-- Aggregate counts only; never dump message bodies, tokens or Passport profiles.
SELECT state, count(*) AS total FROM message_outbox GROUP BY state;
SELECT count(*) AS expired_sending_leases FROM message_outbox
 WHERE state='sending' AND lease_until::timestamptz < now();
SELECT count(*) AS overdue_outbox FROM message_outbox
 WHERE state IN ('queued','retry') AND available_at::timestamptz < now()-interval '5 minutes';
SELECT state, count(*) AS total FROM payment_attempts GROUP BY state;
SELECT state, count(*) AS total FROM payment_webhook_events GROUP BY state;
SELECT count(*) AS unvalidated_constraints FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated;
SELECT pg_database_size(current_database()) AS database_bytes;
