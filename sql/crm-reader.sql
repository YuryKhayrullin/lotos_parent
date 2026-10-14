-- Run once in the EXISTING CRM database using an operator account.
-- No application tables, rows or CRM migrations are changed.
BEGIN;
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lotos_parent_reader') THEN
    CREATE ROLE lotos_parent_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$role$;
DO $connect$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO lotos_parent_reader',current_database()); END $connect$;
ALTER ROLE lotos_parent_reader SET default_transaction_read_only = on;
ALTER ROLE lotos_parent_reader SET statement_timeout = '8s';
ALTER ROLE lotos_parent_reader SET idle_in_transaction_session_timeout = '10s';
GRANT USAGE ON SCHEMA public TO lotos_parent_reader;
REVOKE CREATE ON SCHEMA public FROM lotos_parent_reader;
REVOKE ALL ON public.clients,public.branches,public.coaches,public.lessons,public.lesson_enrollments,public.attendance,public.payments FROM lotos_parent_reader;
GRANT SELECT (id,branch_id,child_name,birth_date,category,lessons_per_week,status,remaining_lessons) ON public.clients TO lotos_parent_reader;
GRANT SELECT (id,name,time_zone) ON public.branches TO lotos_parent_reader;
GRANT SELECT (id,name) ON public.coaches TO lotos_parent_reader;
GRANT SELECT (id,branch_id,coach_id,title,local_date,starts_at,ends_at,time_zone,location,status) ON public.lessons TO lotos_parent_reader;
GRANT SELECT (id,lesson_id,client_id,branch_id,status) ON public.lesson_enrollments TO lotos_parent_reader;
GRANT SELECT (id,lesson_id,client_id,branch_id,status) ON public.attendance TO lotos_parent_reader;
GRANT SELECT (id,client_id,paid_at,amount_minor,lessons_added,package_lessons) ON public.payments TO lotos_parent_reader;
COMMIT;
-- Set this dedicated role's password separately; never commit it.
