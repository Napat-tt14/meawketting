-- BE5 immutable history and cross-object scope guards. No credential or Person authority is inferred.
--> statement-breakpoint
CREATE TRIGGER trg_be5_intake_insert BEFORE INSERT ON business_intakes BEGIN SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM access_grants g JOIN consents c ON c.id=g.consent_id AND c.business_id=g.business_id AND c.branch_id=g.branch_id
 WHERE g.business_id=NEW.business_id AND g.branch_id=NEW.branch_id AND g.id=NEW.grant_id AND (NEW.pet_id IS NULL OR NEW.pet_id=c.pet_id)
 AND (NEW.customer_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r WHERE r.business_id=NEW.business_id AND r.customer_id=NEW.customer_id AND r.pet_id=NEW.pet_id AND r.status='active'))
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=NEW.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=NEW.customer_id AND e.pet_id=c.pet_id))
 ) THEN RAISE(ABORT,'BE5_SCOPE') END; END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_execution_intake_insert BEFORE INSERT ON service_executions BEGIN SELECT CASE WHEN NEW.intake_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM business_intakes i JOIN access_grants g ON g.id=i.grant_id AND g.business_id=i.business_id AND g.branch_id=i.branch_id JOIN consents c ON c.id=g.consent_id
 WHERE i.business_id=NEW.business_id AND i.branch_id=NEW.branch_id AND i.id=NEW.intake_id AND c.pet_id=NEW.pet_id AND i.customer_id=NEW.customer_id AND i.execution_id=NEW.id)
 THEN RAISE(ABORT,'BE5_SCOPE') END; END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_intake_update BEFORE UPDATE ON business_intakes BEGIN SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM access_grants g JOIN consents c ON c.id=g.consent_id AND c.business_id=g.business_id AND c.branch_id=g.branch_id
 WHERE g.business_id=NEW.business_id AND g.branch_id=NEW.branch_id AND g.id=NEW.grant_id AND (NEW.pet_id IS NULL OR NEW.pet_id=c.pet_id)
 AND (NEW.customer_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r WHERE r.business_id=NEW.business_id AND r.customer_id=NEW.customer_id AND r.pet_id=NEW.pet_id AND r.status='active'))
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=NEW.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=NEW.customer_id AND e.pet_id=c.pet_id))
 ) THEN RAISE(ABORT,'BE5_SCOPE') END; END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_execution_intake_update BEFORE UPDATE ON service_executions BEGIN SELECT CASE WHEN NEW.intake_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM business_intakes i JOIN access_grants g ON g.id=i.grant_id AND g.business_id=i.business_id AND g.branch_id=i.branch_id JOIN consents c ON c.id=g.consent_id
 WHERE i.business_id=NEW.business_id AND i.branch_id=NEW.branch_id AND i.id=NEW.intake_id AND c.pet_id=NEW.pet_id AND i.customer_id=NEW.customer_id AND i.execution_id=NEW.id)
 THEN RAISE(ABORT,'BE5_SCOPE') END; END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_access_events_update BEFORE UPDATE ON access_events BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_access_events_delete BEFORE DELETE ON access_events BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_intake_corrections_update BEFORE UPDATE ON intake_corrections BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_intake_corrections_delete BEFORE DELETE ON intake_corrections BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_access_grant_scopes_update BEFORE UPDATE ON access_grant_scopes BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_access_grant_scopes_delete BEFORE DELETE ON access_grant_scopes BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_grant_identity BEFORE UPDATE ON access_grants WHEN NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.consent_id<>OLD.consent_id OR NEW.token_hash<>OLD.token_hash OR NEW.purpose<>OLD.purpose OR NEW.expires_at<>OLD.expires_at OR NEW.created_at<>OLD.created_at OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NOT OLD.revoked_at) BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be5_consent_identity BEFORE UPDATE ON consents WHEN NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.pet_id<>OLD.pet_id OR NEW.authority_id<>OLD.authority_id OR (OLD.status<>'pending' AND NEW.status<>OLD.status) BEGIN SELECT RAISE(ABORT,'BE5_IMMUTABLE'); END;
