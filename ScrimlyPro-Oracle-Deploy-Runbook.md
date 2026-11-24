# ScrimlyPro → Oracle Always Free — Deploy Runbook

Deploy target: **Next.js app on an Oracle Cloud Always-Free Ampere A1 VM + Supabase Cloud (free) for Postgres/Auth + Caddy for HTTPS.**
Total cost: **$0/month**. Total time: **~90 minutes**, one coffee included.

---

## 0. The map (30-second recap)

```
                    ┌─────────────────────────────┐
   Browser ───────► │  Oracle VM (Ampere A1 ARM)  │
   https://you.com  │  ┌───────────┐  ┌────────┐  │        ┌──────────────────┐
                    │  │  Caddy    │─►│ Next.js│──┼──────► │ Supabase Cloud   │
                    │  │ :80/:443  │  │ :3000  │  │  TCP   │ • Postgres (Drizzle)
                    │  └───────────┘  └────────┘  │        │ • Auth (login)   │
                    └─────────────────────────────┘        └──────────────────┘
                                       │
                                       ▼  HTTPS (API call only, nothing hosted)
                              ┌────────────────┐
                              │  Gemini API    │
                              │  (OCR)         │
                              └────────────────┘
```

| Piece | Lives on | Why |
|---|---|---|
| Next.js server (`next start`) | Oracle A1 VM | needs a real computer, Node 22 |
| Postgres + Auth | Supabase Cloud free | auth is a Supabase *service*, DB comes with it |
| HTTPS + reverse proxy | Caddy (same VM) | free TLS certificates, auto-renew |
| OCR | Google Gemini API | nothing to host, just a key |

**Placeholders used in this runbook — replace all of them:**

| Placeholder | Meaning |
|---|---|
| `YOUR_DOMAIN` | your domain, e.g. `scrimly.yourname.com` |
| `<VM_PUBLIC_IP>` | public IP of the Oracle VM |
| `<project-ref>` | Supabase project ref (the `abcdefg` in `abcdefg.supabase.co`) |
| `<region>` | Supabase region slug, e.g. `ap-south-1` |

---

## 1. Prerequisites checklist

- [ ] Oracle Cloud account, **Ampere A1 capacity available** (see Troubleshooting #9 if it isn't)
- [ ] Supabase account (free)
- [ ] A domain you control — recommended (~$10/yr from Namecheap/Cloudflare/Porkbun; free alternative: duckdns.org subdomain)
- [ ] SSH keypair on your laptop (`ssh-keygen -t ed25519` if you don't have one)
- [ ] Gemini API key from <https://aistudio.google.com> (free tier is fine)
- [ ] The repo pushed to GitHub and `db/migrations/` committed (they are, per README)
- [ ] CI green on the commit you will deploy (`.github/workflows/ci.yml`)
- [ ] This runbook and `scripts/deploy.sh` committed to `main` (the runbook was untracked)

---

## 2. Phase 1 — Supabase Cloud (≈10 min)

### 2.1 Create the project

1. <https://supabase.com> → **New project**.
2. Name: `scrimlypro`. **Generate a strong database password and SAVE it** — you'll paste it into the connection string.
3. Region: pick the one nearest your Oracle VM region:

   | Oracle region | Supabase region |
   |---|---|
   | Mumbai / Hyderabad | `ap-south-1` (Mumbai) |
   | Singapore | `ap-southeast-1` |
   | Tokyo | `ap-northeast-1` |
   | Seoul | `ap-northeast-2` |
   | Sydney / Melbourne | `ap-southeast-2` |
   | Frankfurt / Zurich / Milan / Madrid | `eu-central-1` |
   | London | `eu-west-2` |
   | Ashburn | `us-east-1` |
   | Phoenix / San Jose | `us-west-1` |
   | São Paulo | `sa-east-1` |

### 2.2 Collect the three keys

Project **Settings → API** (older UI: "API Keys"; newer UI: "Publishable / Secret"):

| Your env var | Copy this |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon / publishable** key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role / secret** key (never expose to the browser) |

### 2.3 Get the database URL — use the SESSION POOLER

Project page → **Connect** → **Session pooler**. It looks like:

```
postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Replace `[YOUR-PASSWORD]` with the DB password from 2.1. This is `SUPABASE_DB_URL`.

> Why the pooler? Supabase's direct connection URL can resolve to IPv6 only; the session pooler is reachable over plain IPv4 from the VM. Port **5432** is session mode (6543 is transaction mode). All app DB clients set `prepare: false`, so either mode works — this is an IPv4 choice, not a prepared-statement requirement. For `pg_dump`/`pg_restore` the repo's own `docs/deploy/cut-over.md` recommends the direct URL.

### 2.4 Tell Supabase about your future domain

Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://YOUR_DOMAIN`
- **Redirect URLs:** add `https://YOUR_DOMAIN/**`

Do it now so login/recovery works the moment the site is live.

### 2.5 Run migrations against the cloud DB (from your laptop)

```bash
# on your laptop, in the repo
# temporarily point SUPABASE_DB_URL in .env.local at the session-pooler URL from 2.3
npm run db:migrate
# optional demo data:  npm run db:seed
# then REVERT .env.local back to 127.0.0.1 for local dev
```

> **Never run `db:reset` against the cloud URL** — it drops the `public` schema. `db:sweep-test` only drops throwaway databases named `m*test_*`, but it should still not be pointed at hosted Supabase. `db:seed` is also **not** harmless on a cloud DB: it inserts a demo row into Supabase-managed `auth.users`. Migration scripts are fine.

✅ Checkpoint: Supabase **Table Editor** shows your tables.

---

## 3. Phase 2 — Create the Oracle VM (≈15 min)

1. <https://cloud.oracle.com> → **Compute → Instances → Create Instance**.
2. Name: `scrimlypro`.
3. Image: **Ubuntu 24.04** (canonical, minimal).
4. Shape: click **Change shape → Ampere** → `VM.Standard.A1.Flex` → **2 OCPU / 12 GB RAM**. The console shows an **"Always Free eligible"** badge — make sure you see it.
   > Verify the current Always-Free A1 allowance in your own console (both 4 OCPU / 24 GB and 2 OCPU / 12 GB figures circulate) and request whatever is free in your region. Use it as one VM.
5. Boot volume: **100 GB** (your Always-Free allowance is 200 GB total — leave headroom).
6. SSH keys: paste your **public** key (`~/.ssh/id_ed25519.pub`).
7. Create. Note the **Public IP address** on the instance page.

### 3.1 Make the IP permanent (do not skip)

By default the public IP is *ephemeral* — it changes on every stop/start, breaking DNS.

Instance details → **Attached VNICs** → click the VNIC → **IPv4 Addresses** → edit the row → switch from *Ephemeral* to **Reserved Public IP**.

### 3.2 Open ports in the cloud firewall (layer 1 of 2)

VCN (your instance's VCN) → **Security Lists** → the default list → **Add Ingress Rules** — two rules:

| Source CIDR | Protocol | Dest. port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(Port 22 is already open for SSH.)

✅ Checkpoint: from your laptop, `ssh ubuntu@<VM_PUBLIC_IP>` works.

---

## 4. Phase 3 — Server prep (≈15 min)

```bash
# updates + PostgreSQL client binaries for the nightly backup job
sudo apt update && sudo apt -y upgrade
sudo apt install -y postgresql-client

# 4 GB swap — cheap insurance so `next build` never gets OOM-killed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # swap should show 4.0Gi

# open ports in the VM's own firewall (layer 2 of 2 — OCI Ubuntu ships a
# restrictive iptables ruleset that survives reboots via netfilter-persistent)
sudo iptables -I INPUT -p tcp --dport 80  -m conntrack --ctstate NEW -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT
sudo netfilter-persistent save
```

> **Do not** install/enable `ufw` on Oracle images — it fights the managed iptables ruleset. The two commands above are the whole job.

---

## 5. Phase 4 — Node 22 + app + build (≈15 min)

### 5.1 Node 22 (system-wide, so systemd can find it)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
node -v    # expect v22.x
```

### 5.2 Clone and configure

```bash
cd ~
git clone https://github.com/qasim-mehar/ScrimlyPro.git scrimlypro
cd scrimlypro
```

Create `.env.local` **in the project root**. Next.js reads `.env.local` at build time *and* at runtime with `next start`, and your npm scripts use it the same way they do in dev.

```bash
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<DB-PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres

# --- Gemini OCR (server only) ---
GEMINI_API_KEY=<key from aistudio.google.com>
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_MODEL_FALLBACKS=gemini-2.5-flash-lite,gemini-2.0-flash-lite
SAMPLE_OCR=0

# --- Production identity ---
APP_ORIGIN=https://YOUR_DOMAIN
IMP_SECRET=<paste output of:  openssl rand -hex 32>
AUDIT_SALT=<paste output of:  openssl rand -hex 16>
TRUST_PROXY=true
```

Generate the two secrets right on the VM:

```bash
openssl rand -hex 32   # → IMP_SECRET
openssl rand -hex 16   # → AUDIT_SALT
```

Var-by-var reasoning (matches your fail-closed design):

| Var | Value | Why |
|---|---|---|
| `APP_ORIGIN` | exact `https://YOUR_DOMAIN` | the app still boots without it, but `POST /api/auth/forgot-password` returns **503** in production (recovery links fail closed) |
| `IMP_SECRET` | `openssl rand -hex 32` | signs impersonation cookies; without it impersonation refuses (fail-closed) |
| `AUDIT_SALT` | `openssl rand -hex 16` | salts `ip_hash`; missing = audit rows simply lose ip_hash |
| `TRUST_PROXY` | `true` | Caddy overwrites `x-forwarded-for`; your per-IP rate limiting needs it. Only true because of the proxy |

### 5.3 Install, build, self-check

```bash
npm ci
npm run build
npm run verify:secrets   # your own guard: confirms no secrets leaked into the client bundle
```

> **Order matters:** `NEXT_PUBLIC_*` variables are baked into the client bundle **at build time**. Edit `.env.local` first, build second. If you ever change them, rebuild.

Quick smoke test (then Ctrl-C):

```bash
node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health  # expect 200
curl -I http://127.0.0.1:3000/    # expect 307 → /login (anonymous visitors are redirected)
```

---

## 6. Phase 5 — systemd service (≈5 min)

```bash
sudo tee /etc/systemd/system/scrimlypro.service > /dev/null <<'EOF'
[Unit]
Description=ScrimlyPro Next.js server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/scrimlypro
# Reads .env.local itself; bound to localhost so ONLY Caddy can reach it
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now scrimlypro
systemctl status scrimlypro --no-pager
```

`enable --now` = start now **and** auto-start on reboot.

✅ Checkpoint: `curl -s http://127.0.0.1:3000/api/health` returns `{"status":"ok",...}` even after `sudo reboot` (`/` returns 307 → `/login` for anonymous visitors).

---

## 7. Phase 6 — Domain + Caddy HTTPS (≈10 min)

### 7.1 DNS

At your domain provider, create an **A record**:

```
YOUR_DOMAIN  →  A  →  <VM_PUBLIC_IP>
```

Verify from your laptop: `ping YOUR_DOMAIN` shows the VM's IP. (If you use Cloudflare, set the record to **"DNS only"** / grey cloud for now — the proxy can be enabled later.)

### 7.2 Install Caddy (official repo)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 7.3 Configure

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
YOUR_DOMAIN {
    reverse_proxy 127.0.0.1:3000
}
EOF

sudo systemctl reload caddy
```

Caddy fetches a Let's Encrypt certificate automatically and renews it forever.

✅ Checkpoint: open `https://YOUR_DOMAIN` on your laptop → padlock, app loads.

---

## 8. Phase 7 — Daily backups + keep-alive (≈5 min)

Your `db:backup` script kills two birds: backups **and** daily DB activity, which prevents Supabase's free-tier **7-day inactivity pause** (a paused project = site down until you click Restore in the dashboard).

```bash
crontab -e
```

Add:

```cron
# 03:10 UTC daily: dump the Supabase DB (this DB hit also keeps Supabase awake)
10 3 * * * mkdir -p /home/ubuntu/backups && BACKUP_DIR=/home/ubuntu/backups /usr/bin/node --env-file=/home/ubuntu/scrimlypro/.env.local /home/ubuntu/scrimlypro/scripts/backup-db.mjs >> /home/ubuntu/backups/backup.log 2>&1
# 03:20 UTC daily: prune backup FOLDERS older than 14 days (keep the log)
20 3 * * * find /home/ubuntu/backups -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
```

`BACKUP_DIR` tells the now cross-platform backup script where to write (it used
to hardcode a Windows `pg_dump.exe` path and always wrote into `./backups`).
`pg_dump`/`pg_restore` are resolved from `PG_BIN_DIR` when set, otherwise from
PATH — Ubuntu's `postgresql-client` (Phase 3) puts them on PATH. The prune job
deletes whole timestamped backup folders, not the log file.

✅ Checkpoint after the first night: `find ~/backups -name db.dump` shows a dump and `~/backups/<stamp>/manifest.json` exists; Supabase dashboard shows the project **Active**. Note the dump covers the `public` schema only — `auth.users` and Storage are **not** included (see the backup-boundary note in `docs/deploy/cut-over.md`), so a restore requires users to re-sign-up/reset.

---

## 9. Phase 8 — Redeploying updates

The corrected deploy script is committed in the repo as **`scripts/deploy.sh`** — which is why the runbook itself must also be committed. On the VM:

```bash
chmod +x /home/ubuntu/scrimlypro/scripts/deploy.sh
sudo ln -sf /home/ubuntu/scrimlypro/scripts/deploy.sh /usr/local/bin/deploy-scrimlypro
deploy-scrimlypro     # every time you push new code
```

It stops the service, runs `git pull --ff-only`, `npm ci`, **`npm run db:migrate`** (idempotent — applies committed migrations only), `npm run build`, `npm run verify:secrets`, starts the service and waits for `/api/health` before returning. Stopping before `npm ci` avoids lazy-loaded route modules breaking while `node_modules` is replaced. Expect roughly **1–3 minutes of downtime**, not zero.

---

## 10. Env var quick-reference (production values)

| Var | Where the value comes from | Server-only? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | no (by design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/publishable | no (by design) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role/secret | **yes — bypasses RLS** |
| `SUPABASE_DB_URL` | Session pooler URI (port **5432**) | **yes** |
| `GEMINI_API_KEY` | aistudio.google.com | **yes** |
| `GEMINI_MODEL` / `GEMINI_MODEL_FALLBACKS` | keep repo defaults | yes |
| `SAMPLE_OCR` | `0` in production | yes |
| `APP_ORIGIN` | `https://YOUR_DOMAIN` (exact, with scheme) | yes |
| `IMP_SECRET` | `openssl rand -hex 32` | **yes** |
| `AUDIT_SALT` | `openssl rand -hex 16` | yes |
| `TRUST_PROXY` | `true` (only because Caddy is in front) | yes |

Cost reminder: everything above is intended to sit inside Oracle Always Free (A1 compute + block storage) and Supabase Free (500 MB DB / 50k MAU / 1 GB file storage — matches Supabase's current Free Plan doc). **Verify the exact current A1 OCPU/RAM and storage allowance in your Oracle console before relying on it** — the figures previously written here could not be confirmed. ScrimlyPro won't get near those limits.

### Ops-only variables (not used by the app itself)

| Var | Used by | Value on the VM |
|---|---|---|
| `BACKUP_DIR` | `scripts/backup-db.mjs`, `scripts/restore-test.mjs` | `/home/ubuntu/backups` (default `./backups`) |
| `PG_BIN_DIR` | same | only if `pg_dump`/`pg_restore` are not on PATH (e.g. `/usr/lib/postgresql/16/bin`) |

### CI (already in the repo)

`.github/workflows/ci.yml` runs on every push and PR to `main`: Node 22 + a Postgres 16 service container, then typecheck, lint, the full test suite (including the 28 DB/RLS files), `next build` and `verify:secrets`. `.github/dependabot.yml` checks npm and Actions weekly. **CI must be green on the exact commit you deploy before you start this runbook on a fresh VM.**

---

## 11. Troubleshooting

| # | Symptom | Likely cause → fix |
|---|---|---|
| 1 | Site unreachable entirely | Firewall layer 1 (OCI Security List) or layer 2 (iptables) missing ports 80/443. From laptop: `curl -I http://<VM_PUBLIC_IP>`; from VM: `curl -s http://127.0.0.1:3000/api/health` (expect 200). Whichever fails tells you which layer. |
| 2 | Caddy returns **502 Bad Gateway** | App down → `systemctl status scrimlypro`, `journalctl -u scrimlypro -n 50`. |
| 3 | HTTPS certificate never issued | DNS not propagated yet, or Cloudflare proxy (orange cloud) enabled → wait / switch to DNS-only, `sudo systemctl restart caddy`. |
| 4 | App boots, DB errors | Check `SUPABASE_DB_URL` (host, port **5432** session or **6543** transaction, correct password), then whether the project is **paused** → dashboard → Restore, then whether migrations were applied (`npm run db:migrate`). |
| 5 | `npm run build` dies mid-build | Out of memory → `free -h`; confirm the 4 GB swapfile is active (Phase 3). |
| 6 | Login / password recovery broken | Supabase **Auth → URL Configuration** missing `https://YOUR_DOMAIN`, or `APP_ORIGIN` doesn't exactly match the live origin (scheme included). |
| 7 | Rate limits trip for everyone at once | `TRUST_PROXY` not set to `true`. Without it `x-forwarded-for` is ignored entirely and IP-keyed limiters collapse into one `unknown` bucket (per-email buckets are unaffected). |
| 8 | Changed `NEXT_PUBLIC_*` but browser shows old values | Those are baked at **build time** → edit `.env.local`, then `npm run build` and restart. |
| 9 | Oracle says A1 "out of capacity" | Free A1 is scarce in some regions → try another availability domain, or retry at off-peak hours; capacity frees up regularly. |
| 10 | `npm run db:migrate` fails from laptop | Check the DSN and network first. All 11 migrations **are** committed. Only run `npm run db:generate` when you intentionally changed `lib/db/schema.ts` — it creates a *new* migration, it does not repair a missing one. |
| 11 | Recovery emails throttled | Supabase's built-in email is heavily rate-limited on free — fine for a small user base; if it bites, add custom SMTP in Supabase Auth settings later. |

---

## 12. Post-deploy verification checklist

- [ ] `https://YOUR_DOMAIN` loads with a padlock
- [ ] Sign-up + login works; new user appears in Supabase **Authentication → Users**
- [ ] Password-recovery email arrives and its link points at `https://YOUR_DOMAIN` (proves `APP_ORIGIN`)
- [ ] Screenshot OCR upload works (proves `GEMINI_API_KEY`)
- [ ] Standings page renders from real cloud data (proves Drizzle → pooler)
- [ ] `npm run verify:secrets` passes; service-role key is **not** in the client bundle
- [ ] Security headers present: `curl -sI https://YOUR_DOMAIN/login | grep -iE 'x-frame|content-security|nosniff'` (the CSP is a minimal subset — see `next.config.ts`; it is not full XSS protection)
- [ ] `SAMPLE_OCR=0` — otherwise OCR can silently serve fixture results in production
- [ ] CI is green on the exact deployed commit (typecheck, lint, test, build, verify:secrets)
- [ ] Cut-over gates from `docs/deploy/cut-over.md`: ≥55 RLS policies, `on_auth_user_created` trigger, `scripts/verify-production.sh` with real owner + attacker accounts and 0 fail / 0 skip
- [ ] First nightly backup exists in `~/backups`
- [ ] Reboot test: `sudo reboot`, wait 60 s, site returns (proves systemd + reserved IP + fstab swap)
- [ ] 7+ days later: Supabase project still **Active** (proves the keep-alive cron)
