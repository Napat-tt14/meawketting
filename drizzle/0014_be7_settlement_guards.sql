-- Merchant identity is permanent; credential rotation uses a new revision.
CREATE TRIGGER be7_provider_identity BEFORE UPDATE ON payment_provider_accounts
WHEN NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.provider<>OLD.provider OR NEW.external_account_id<>OLD.external_account_id OR NEW.source<>OLD.source
OR ((NEW.secret_ref<>OLD.secret_ref OR NEW.status<>OLD.status) AND NEW.revision<=OLD.revision)
BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
-- Released attempts cannot reclaim money already allocated to another receipt.
CREATE TRIGGER be7_attempt_rereservation BEFORE UPDATE OF state ON payment_attempts
WHEN OLD.state NOT IN ('created','pending','retry','reconciliation') AND NEW.state IN ('created','pending','retry','reconciliation')
AND NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND id<>NEW.id AND state IN ('created','pending','retry','reconciliation')),0)
+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)
-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)
>coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)
BEGIN SELECT RAISE(ABORT,'BE7_AMOUNT'); END;
