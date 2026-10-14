-- Parent identity only. Never apply to the CRM database.
DO $guard$
BEGIN
  IF to_regclass('public.clients') IS NOT NULL OR to_regclass('public.lessons') IS NOT NULL THEN
    RAISE EXCEPTION 'LOTOS_PARENT_REFUSES_CRM_DATABASE';
  END IF;
END
$guard$;
CREATE SCHEMA IF NOT EXISTS parent;
REVOKE ALL ON SCHEMA parent FROM PUBLIC;
CREATE TABLE parent.users (
 id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
 email_verified BOOLEAN NOT NULL DEFAULT false, image TEXT, enabled BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ(3) NOT NULL
);
CREATE UNIQUE INDEX users_email_key ON parent.users(email);
CREATE TABLE parent.sessions (
 id TEXT NOT NULL PRIMARY KEY, token TEXT NOT NULL, user_id TEXT NOT NULL,
 expires_at TIMESTAMPTZ(3) NOT NULL, ip_address TEXT, user_agent TEXT,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT sessions_user_id_fkey FOREIGN KEY(user_id) REFERENCES parent.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX sessions_token_key ON parent.sessions(token);
CREATE INDEX sessions_user_id_idx ON parent.sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON parent.sessions(expires_at);
CREATE TABLE parent.accounts (
 id TEXT NOT NULL PRIMARY KEY, user_id TEXT NOT NULL, account_id TEXT NOT NULL, provider_id TEXT NOT NULL,
 password TEXT, access_token TEXT, refresh_token TEXT, id_token TEXT,
 access_token_expires_at TIMESTAMPTZ(3), refresh_token_expires_at TIMESTAMPTZ(3), scope TEXT,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT accounts_user_id_fkey FOREIGN KEY(user_id) REFERENCES parent.users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX accounts_provider_id_account_id_key ON parent.accounts(provider_id,account_id);
CREATE INDEX accounts_user_id_idx ON parent.accounts(user_id);
CREATE TABLE parent.verifications (
 id TEXT NOT NULL PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at TIMESTAMPTZ(3) NOT NULL,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX verifications_identifier_idx ON parent.verifications(identifier);
CREATE TABLE parent.child_links (
 id TEXT NOT NULL PRIMARY KEY, parent_user_id TEXT NOT NULL, crm_client_id VARCHAR(100) NOT NULL,
 created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TIMESTAMPTZ(3), operator_note VARCHAR(500) NOT NULL,
 CONSTRAINT child_links_parent_user_id_fkey FOREIGN KEY(parent_user_id) REFERENCES parent.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX child_links_parent_user_id_crm_client_id_key ON parent.child_links(parent_user_id,crm_client_id);
CREATE INDEX child_links_parent_user_id_revoked_at_idx ON parent.child_links(parent_user_id,revoked_at);
CREATE TABLE parent.rate_buckets (
 key CHAR(64) NOT NULL PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX rate_buckets_expires_at_idx ON parent.rate_buckets(expires_at);
