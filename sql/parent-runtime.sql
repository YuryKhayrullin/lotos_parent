-- Run in the separate PARENT identity database AFTER Prisma migrations.
BEGIN;
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lotos_parent_runtime') THEN
    CREATE ROLE lotos_parent_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$role$;
DO $connect$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO lotos_parent_runtime',current_database()); END $connect$;
ALTER ROLE lotos_parent_runtime SET statement_timeout = '8s';
GRANT USAGE ON SCHEMA parent TO lotos_parent_runtime;
REVOKE ALL ON SCHEMA parent FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON parent.users,parent.sessions,parent.accounts,parent.verifications,parent.rate_buckets TO lotos_parent_runtime;
GRANT SELECT ON parent.child_links TO lotos_parent_runtime;
DO $public_roles$
DECLARE target text;
BEGIN
  FOR target IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON SCHEMA parent FROM %I',target);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA parent FROM %I',target);
  END LOOP;
END
$public_roles$;
COMMIT;
