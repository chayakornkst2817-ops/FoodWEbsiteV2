CREATE TABLE IF NOT EXISTS auth_accounts (
 id text PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
 salt text NOT NULL, password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('merchant','admin')),
 subject_id text NOT NULL, restaurant_id text REFERENCES restaurant_defaults(id),
 active boolean NOT NULL DEFAULT true,
 CHECK ((role='merchant' AND restaurant_id IS NOT NULL) OR (role='admin' AND restaurant_id IS NULL))
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash text PRIMARY KEY, account_id text REFERENCES auth_accounts(id) ON DELETE CASCADE,
 customer_id text, expires_at timestamptz NOT NULL,
 CHECK ((account_id IS NULL) <> (customer_id IS NULL))
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_attempts (
 key text PRIMARY KEY, failures integer NOT NULL DEFAULT 0,
 blocked_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS restaurant_id text;
