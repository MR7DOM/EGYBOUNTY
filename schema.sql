CREATE TABLE IF NOT EXISTS users(
 id serial PRIMARY KEY, handle text UNIQUE NOT NULL, email text UNIQUE NOT NULL, pass_hash text NOT NULL,
 role text NOT NULL DEFAULT 'hacker', email_verified boolean NOT NULL DEFAULT false, verify_token text,
 totp_secret text, totp_enabled boolean NOT NULL DEFAULT false, coc_at timestamptz,
 kyc_status text NOT NULL DEFAULT 'none', kyc_file text, kyc_name text,
 failed int NOT NULL DEFAULT 0, locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS companies(
 id serial PRIMARY KEY, owner_id int UNIQUE NOT NULL REFERENCES users(id), name text NOT NULL, name_ar text,
 balance numeric(14,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS programs(
 id serial PRIMARY KEY, company_id int NOT NULL REFERENCES companies(id), name text NOT NULL, name_ar text,
 sector text NOT NULL, description text, description_ar text, status text NOT NULL DEFAULT 'pending',
 rewards jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS program_domains(
 id serial PRIMARY KEY, program_id int NOT NULL REFERENCES programs(id), domain text NOT NULL, token text NOT NULL,
 verified boolean NOT NULL DEFAULT false, verified_at timestamptz, UNIQUE(program_id, domain));
CREATE TABLE IF NOT EXISTS reports(
 id serial PRIMARY KEY, program_id int NOT NULL REFERENCES programs(id), hacker_id int NOT NULL REFERENCES users(id),
 title text NOT NULL, asset text NOT NULL, severity text NOT NULL, cvss_vector text, cvss_score numeric(3,1),
 description text NOT NULL, steps text, impact text, status text NOT NULL DEFAULT 'new',
 bounty numeric(14,2) NOT NULL DEFAULT 0, duplicate_of int, dup_hint int,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS comments(
 id serial PRIMARY KEY, report_id int NOT NULL REFERENCES reports(id), user_id int NOT NULL REFERENCES users(id),
 body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS attachments(
 id serial PRIMARY KEY, report_id int NOT NULL REFERENCES reports(id), user_id int NOT NULL REFERENCES users(id),
 filename text NOT NULL, stored text NOT NULL, mime text, size int, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS deposits(
 id serial PRIMARY KEY, company_id int NOT NULL REFERENCES companies(id), amount numeric(14,2) NOT NULL,
 reference text NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS payouts(
 id serial PRIMARY KEY, report_id int UNIQUE NOT NULL REFERENCES reports(id), hacker_id int NOT NULL REFERENCES users(id),
 company_id int NOT NULL REFERENCES companies(id), gross numeric(14,2) NOT NULL, fee numeric(14,2) NOT NULL,
 net numeric(14,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS withdrawals(
 id serial PRIMARY KEY, user_id int NOT NULL REFERENCES users(id), amount numeric(14,2) NOT NULL, method text NOT NULL,
 account_name text NOT NULL, account_number text NOT NULL, status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz);
CREATE INDEX IF NOT EXISTS ix_reports_program ON reports(program_id);
CREATE INDEX IF NOT EXISTS ix_reports_hacker ON reports(hacker_id);
CREATE INDEX IF NOT EXISTS ix_comments_report ON comments(report_id);
