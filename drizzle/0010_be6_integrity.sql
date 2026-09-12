CREATE TRIGGER be6_conversation_contexts_insert BEFORE INSERT ON conversation_contexts WHEN NOT EXISTS(SELECT 1 FROM conversations c JOIN customers cu ON cu.business_id=c.business_id AND cu.id=c.customer_id
WHERE c.business_id=NEW.business_id AND c.id=NEW.conversation_id AND cu.status='active'
AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.customer_id AND r.pet_id=NEW.pet_id AND r.status='active' AND p.status='active'))
AND (NEW.booking_id IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.business_id=c.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=c.customer_id AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.booking_id=b.id AND bp.pet_id=NEW.pet_id))))
AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=c.customer_id AND e.pet_id=NEW.pet_id AND e.booking_id=NEW.booking_id))) BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_conversation_contexts_update BEFORE UPDATE ON conversation_contexts WHEN NOT EXISTS(SELECT 1 FROM conversations c JOIN customers cu ON cu.business_id=c.business_id AND cu.id=c.customer_id
WHERE c.business_id=NEW.business_id AND c.id=NEW.conversation_id AND cu.status='active'
AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.customer_id AND r.pet_id=NEW.pet_id AND r.status='active' AND p.status='active'))
AND (NEW.booking_id IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.business_id=c.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=c.customer_id AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.booking_id=b.id AND bp.pet_id=NEW.pet_id))))
AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=c.customer_id AND e.pet_id=NEW.pet_id AND e.booking_id=NEW.booking_id))) BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_messages_insert BEFORE INSERT ON messages WHEN NOT EXISTS(SELECT 1 FROM conversations c JOIN customers cu ON cu.business_id=c.business_id AND cu.id=c.customer_id
WHERE c.business_id=NEW.business_id AND c.id=NEW.conversation_id AND cu.status='active'
AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.customer_id AND r.pet_id=NEW.pet_id AND r.status='active' AND p.status='active'))
AND (NEW.booking_id IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.business_id=c.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=c.customer_id AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.booking_id=b.id AND bp.pet_id=NEW.pet_id))))
AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=c.customer_id AND e.pet_id=NEW.pet_id AND e.booking_id=NEW.booking_id))) BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_context_identity BEFORE UPDATE ON conversation_contexts WHEN NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.conversation_id<>OLD.conversation_id BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_messages_update_immutable BEFORE UPDATE ON messages BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_messages_delete_immutable BEFORE DELETE ON messages BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_conversations_update_immutable BEFORE UPDATE ON conversations BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_conversations_delete_immutable BEFORE DELETE ON conversations BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_approval_insert BEFORE INSERT ON message_approvals WHEN NOT EXISTS(SELECT 1 FROM messages m JOIN bookings b ON b.business_id=m.business_id AND b.branch_id=m.branch_id AND b.id=m.booking_id
WHERE m.business_id=NEW.business_id AND m.branch_id=NEW.branch_id AND m.id=NEW.message_id AND m.kind='add-service-request' AND m.direction='business' AND b.status<>'cancelled'
AND (m.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=m.business_id AND e.branch_id=m.branch_id AND e.id=m.execution_id AND e.status NOT IN ('cancelled','no-show'))))
BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
--> statement-breakpoint

CREATE TRIGGER be6_approval_update BEFORE UPDATE ON message_approvals WHEN OLD.status<>'waiting' OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.message_id<>OLD.message_id OR NEW.service_name<>OLD.service_name OR NEW.additional_price<>OLD.additional_price OR NEW.additional_minutes<>OLD.additional_minutes OR NEW.note<>OLD.note OR NEW.revision<>OLD.revision+1 OR NEW.responded_at IS NULL
OR (NEW.status IN ('approved','declined') AND NOT EXISTS(SELECT 1 FROM pet_authorities a JOIN persons p ON p.id=a.person_id JOIN messages m ON m.pet_id=a.pet_id WHERE a.id=NEW.authority_id AND a.role='primary' AND a.status='active' AND p.status='active' AND m.id=NEW.message_id))
BEGIN SELECT RAISE(ABORT,'BE6_VERSION'); END;
--> statement-breakpoint

CREATE TRIGGER be6_outbox_identity BEFORE UPDATE ON message_outbox WHEN NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.message_id<>OLD.message_id OR NEW.retry_key<>OLD.retry_key OR (OLD.attempts>0 AND (NEW.channel_id IS NOT OLD.channel_id OR NEW.link_id IS NOT OLD.link_id OR NEW.recipient IS NOT OLD.recipient))
BEGIN SELECT RAISE(ABORT,'BE6_SCOPE'); END;
