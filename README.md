# EgyBounty | منصة المكافآت الأمنية المصرية

Node.js (Express) + PostgreSQL. The web UI (Arabic/English, RTL) is served by the same server from `public/`.

## تشغيل محلي / Run locally
```bash
cp .env.example .env        # edit DATABASE_URL, JWT_SECRET (32+ chars), ADMIN_EMAIL/PASSWORD
# create the database once:  createdb egybounty
npm install
npm start                   # http://localhost:3000   (tables are created automatically)
```
For local testing only, set `NODE_ENV=development` and `DEV_AUTO_VERIFY=true` (skips email verification; with no SMTP, emails print to the console).

## Docker
`DB_PASSWORD=... ` in `.env`, then `docker compose up -d --build`. Put nginx or Caddy with HTTPS in front (the session cookie is `Secure` in production).

## What is implemented
- Hacker signup: alias + real email + email verification + **mandatory 2FA (TOTP)** + Code of Conduct acceptance. Login lockout after 5 failures.
- Company signup, programs, **domain ownership via DNS TXT** (`egybounty-verify=...`). A program becomes *active* only after one domain is verified; reports are accepted only for assets inside verified domains.
- Reports with CVSS 3.1 (score computed server-side), attachments (png/jpg/pdf/mp4/txt, 10 MB), comments, statuses, duplicate marking + automatic possible-duplicate hint (shown to the company only).
- Money: company deposits by bank transfer (admin confirms) -> company awards bounty -> **15% commission** (`COMMISSION_PCT`) -> hacker earnings. Withdrawals by bank/InstaPay are paid manually by the admin.
- **KYC at first withdrawal**: national ID photo + name; admin approves; the withdrawal account name must match the verified name. IDs are stored in `PRIVATE_DIR` and are viewable only by admins.
- Admin panel (KYC, deposits, withdrawals), leaderboard, email notifications, per-company isolation (each company sees only its own programs and reports).

## Hosting in Egypt (data residency)
Run the server, PostgreSQL, `UPLOAD_DIR`, `PRIVATE_DIR` and **backups** on infrastructure physically located in Egypt. Enable full-disk encryption, restrict SSH, keep the DB off the public internet, and schedule daily `pg_dump` backups to a second Egyptian location.

## Before going live (not done by the code)
1. Egyptian lawyer review: Terms, Code of Conduct, safe-harbor wording, privacy policy (Personal Data Protection Law 151/2020, including any registration/licensing duties as a data controller), and your commission/tax/invoicing setup.
2. Penetration test of EgyBounty itself.
3. A real SMTP provider and SPF/DKIM for your mail domain.
4. Bank account for deposits (`PLATFORM_BANK_INFO`) and an internal procedure for confirming deposits and paying withdrawals.

## Known limits
- DNS TXT verification only (no HTML-file method). One user per company. No virus scanning of uploads. TOTP secrets are not encrypted at rest (encrypt them or the whole disk/DB). No automatic payment gateway. Admin pause of a program can be undone by the company.
