CREATE UNIQUE INDEX `uq_execution_event_scope` ON `execution_events` (`business_id`,`branch_id`,`id`);
--> statement-breakpoint
CREATE UNIQUE INDEX uq_charge_base_item ON charge_items(charge_id) WHERE kind='base-service';
--> statement-breakpoint
CREATE TRIGGER be7_charge_source BEFORE INSERT ON charges WHEN NOT EXISTS(
 SELECT 1 FROM bookings b WHERE b.business_id=NEW.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=NEW.customer_id AND b.service_module=NEW.module AND b.status<>'cancelled'
 AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets p WHERE p.business_id=b.business_id AND p.branch_id=b.branch_id AND p.booking_id=b.id AND p.pet_id=NEW.pet_id))
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=b.business_id AND e.branch_id=b.branch_id AND e.id=NEW.execution_id AND e.booking_id=b.id AND e.customer_id=b.customer_id AND e.pet_id=NEW.pet_id AND e.module=NEW.module)))
 BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_charge_identity BEFORE UPDATE ON charges WHEN NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.booking_id<>OLD.booking_id OR NEW.customer_id<>OLD.customer_id OR NEW.pet_id IS NOT OLD.pet_id OR NEW.execution_id IS NOT OLD.execution_id OR NEW.module<>OLD.module OR NEW.service_label<>OLD.service_label OR NEW.currency<>OLD.currency OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR (OLD.cancelled_at IS NOT NULL AND (NEW.cancelled_at IS NOT OLD.cancelled_at OR NEW.cancellation_reason IS NOT OLD.cancellation_reason))
 BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_booking_charge_identity BEFORE UPDATE ON bookings WHEN EXISTS(SELECT 1 FROM charges c WHERE c.business_id=OLD.business_id AND c.branch_id=OLD.branch_id AND c.booking_id=OLD.id AND (c.customer_id<>NEW.customer_id OR c.module<>NEW.service_module)) BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_cancel_unpaid BEFORE UPDATE OF cancelled_at ON charges WHEN NEW.cancelled_at IS NOT NULL AND (EXISTS(SELECT 1 FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.id) OR EXISTS(SELECT 1 FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.id AND state IN ('created','pending','retry','reconciliation'))) BEGIN SELECT RAISE(ABORT,'BE7_AMOUNT'); END;
--> statement-breakpoint
CREATE TRIGGER be7_item_source BEFORE INSERT ON charge_items WHEN NOT EXISTS(SELECT 1 FROM charges c WHERE c.business_id=NEW.business_id AND c.branch_id=NEW.branch_id AND c.id=NEW.charge_id AND c.cancelled_at IS NULL
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=c.branch_id AND e.id=NEW.execution_id AND e.booking_id=c.booking_id))
 AND ((NEW.kind='add-on' AND EXISTS(SELECT 1 FROM execution_events e WHERE e.business_id=c.business_id AND e.branch_id=c.branch_id AND e.id=NEW.source_event_id AND e.execution_id=NEW.execution_id AND e.kind='addon' AND json_extract(e.data_json,'$.additionalPrice')*100=NEW.amount_minor)) OR (NEW.kind<>'add-on' AND NEW.source_event_id IS NULL))) BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_item_total BEFORE INSERT ON charge_items WHEN
 coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)+NEW.amount_minor <
 coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)+coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND state IN ('created','pending','retry','reconciliation')),0)
 BEGIN SELECT RAISE(ABORT,'BE7_AMOUNT'); END;
--> statement-breakpoint
CREATE TRIGGER be7_payment_source BEFORE INSERT ON payments WHEN NEW.source='provider' AND NOT EXISTS(SELECT 1 FROM payment_attempts a JOIN charges c ON c.business_id=a.business_id AND c.branch_id=a.branch_id AND c.id=a.charge_id WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.id=NEW.attempt_id AND a.account_id=NEW.account_id AND a.amount_minor=NEW.amount_minor AND a.currency=NEW.currency AND a.state='succeeded' AND c.customer_id=NEW.customer_id AND a.provider_reference=NEW.provider_reference) BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_payment_allocation BEFORE INSERT ON payment_allocations WHEN NOT EXISTS(SELECT 1 FROM payments p JOIN charges c ON c.business_id=p.business_id AND c.branch_id=p.branch_id AND c.customer_id=p.customer_id WHERE p.business_id=NEW.business_id AND p.branch_id=NEW.branch_id AND p.id=NEW.payment_id AND c.id=NEW.charge_id AND c.cancelled_at IS NULL)
 OR NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id),0)>(SELECT amount_minor FROM payments WHERE id=NEW.payment_id)
 OR NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)+coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND state IN ('created','pending','retry','reconciliation')),0)>coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)
 BEGIN SELECT RAISE(ABORT,'BE7_AMOUNT'); END;
--> statement-breakpoint
CREATE TRIGGER be7_refund_amount BEFORE INSERT ON payment_refunds WHEN NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_refunds WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id),0)>(SELECT amount_minor FROM payments WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND id=NEW.payment_id) BEGIN SELECT RAISE(ABORT,'BE7_AMOUNT'); END;
--> statement-breakpoint
CREATE TRIGGER be7_refund_allocation BEFORE INSERT ON refund_allocations WHEN NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id AND charge_id=NEW.charge_id),0)>(SELECT amount_minor FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id AND charge_id=NEW.charge_id)
 OR NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND refund_id=NEW.refund_id),0)>(SELECT amount_minor FROM payment_refunds WHERE id=NEW.refund_id)
 BEGIN SELECT RAISE(ABORT,'BE7_AMOUNT'); END;
--> statement-breakpoint
CREATE TRIGGER be7_attempt_source BEFORE INSERT ON payment_attempts WHEN NOT EXISTS(SELECT 1 FROM charges c JOIN payment_provider_accounts p ON p.business_id=c.business_id WHERE c.business_id=NEW.business_id AND c.branch_id=NEW.branch_id AND c.id=NEW.charge_id AND c.cancelled_at IS NULL AND p.id=NEW.account_id AND p.status='active') BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_attempt_reservation BEFORE INSERT ON payment_attempts WHEN NEW.amount_minor+
 coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND state IN ('created','pending','retry','reconciliation')),0)+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)>coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0) BEGIN SELECT RAISE(ABORT,'BE7_AMOUNT'); END;
--> statement-breakpoint
CREATE TRIGGER be7_attempt_identity BEFORE UPDATE ON payment_attempts WHEN NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.charge_id<>OLD.charge_id OR NEW.account_id<>OLD.account_id OR NEW.amount_minor<>OLD.amount_minor OR NEW.currency<>OLD.currency OR NEW.idempotency_key<>OLD.idempotency_key OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR (OLD.provider_reference IS NOT NULL AND NEW.provider_reference IS NOT OLD.provider_reference) OR (OLD.state='succeeded' AND NEW.state<>'succeeded') BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_webhook_scope BEFORE INSERT ON payment_webhook_events WHEN NEW.attempt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payment_attempts a WHERE a.business_id=NEW.business_id AND a.account_id=NEW.account_id AND a.id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_charge_delete BEFORE DELETE ON charges BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_item_update BEFORE UPDATE ON charge_items BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_item_delete BEFORE DELETE ON charge_items BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_charge_event_update BEFORE UPDATE ON charge_events BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_charge_event_delete BEFORE DELETE ON charge_events BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_payment_update BEFORE UPDATE ON payments BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_payment_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_allocation_update BEFORE UPDATE ON payment_allocations BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_allocation_delete BEFORE DELETE ON payment_allocations BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_refund_update BEFORE UPDATE ON payment_refunds BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_refund_delete BEFORE DELETE ON payment_refunds BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_refund_allocation_update BEFORE UPDATE ON refund_allocations BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_refund_allocation_delete BEFORE DELETE ON refund_allocations BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_webhook_update BEFORE UPDATE ON payment_webhook_events BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_webhook_delete BEFORE DELETE ON payment_webhook_events BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_attempt_event_update BEFORE UPDATE ON payment_attempt_events BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER be7_attempt_event_delete BEFORE DELETE ON payment_attempt_events BEGIN SELECT RAISE(ABORT,'BE7_SCOPE'); END;
