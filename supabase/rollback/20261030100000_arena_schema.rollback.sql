-- Covers the revised atomic-submission candidate (undeployed migration version unchanged).
-- MANUAL, DESTRUCTIVE rollback. Export arena data and stop Arena functions first.
-- CASCADE can remove external objects that depend on Arena. Review the dependency graph first.
-- It does not revert migration history or any Edge/secret/API configuration.
begin;
drop schema if exists arena cascade;
commit;
