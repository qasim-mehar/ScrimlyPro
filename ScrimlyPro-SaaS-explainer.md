# ScrimlyPro — Our SaaS, Explained

A plain-language tour of the product: what it does, who it serves, how it works, and where it is going.

---

## The one-liner

ScrimlyPro is a web service for PUBG Mobile esports teams. It turns scrim results into clean standings in minutes. The organizer uploads a result screenshot. Our AI reader scans the image. The standings update themselves. Nobody types a score by hand.

## The problem we solve

A serious PUBG Mobile team plays many practice games — "scrims" — every week. Each scrim produces results that someone must capture. Today, that work is manual. Screenshots pile up in Discord chats. Scores get hand-typed into spreadsheets. Numbers get mistyped, disputed, and re-checked. The person who organizes scrims spends more time on data entry than on coaching.

The pain spreads from there. Coaches wait hours for clean standings. Players argue over wrong totals. Team managers worry that their practice data sits in public chats. Fans and sister teams never see results at all, because sharing a spreadsheet is awkward and leaks personal information.

ScrimlyPro removes the whole problem. One upload replaces ten minutes of typing. One link replaces the spreadsheet. One private workspace replaces the public chat.

## Who it is for

| Role | What they get |
|---|---|
| **Scrim organizer** | Creates sessions, uploads screenshots, gets auto-computed standings |
| **Coach / analyst** | Clean, trustworthy match data minutes after each game |
| **Team owner / manager** | A private organization workspace with invite control and roles |
| **Community / fans** | Public standings pages via share links — no login, no personal data exposed |

## How it works — the core loop

1. **Create a session.** The organizer sets up a scrim session: the date, the format, and the lobbies. A session groups all matches of one scrim.
2. **Play the matches.** Teams play their games as usual. Nothing changes on their side.
3. **Upload the screenshot.** After each match, the organizer uploads the end-result image. One photo, one upload.
4. **AI reads the image.** Our AI reader (powered by Google Gemini) scans the screenshot and extracts the results — team names, placements, kills. No hand typing. No copy errors.
5. **Standings compute themselves.** ScrimlyPro scores the match and folds it into the session standings. Totals stay consistent across every match.
6. **Share it.** Publish a standings page with one public link, or export it as a graphic for Discord and social media.

The loop runs in about a minute per match. The organizer uploads. Everything else is automatic.

## Feature tour

### 1. Scrim sessions with lobbies

Sessions are the backbone. Each session holds its matches, its teams, and its standings. Large formats with multiple parallel lobbies are supported — every lobby's matches roll up into one standings table, so multi-room scrims stay manageable.

### 2. AI screenshot ingest (the killer feature)

This is the heart of ScrimlyPro. Upload the match screenshot; the AI reads it. The reading takes a few seconds per image and returns structured results. It removes the entire manual data-entry layer — the single biggest source of errors and wasted evenings in scrim management.

### 3. Auto-computed standings

Once a match is read, points and totals update across the session. Every table draws from the same structured data, so numbers cannot drift between views. When the scrim ends, the final standings are already done.

### 4. Public share links

Any standings page can be shared with one link. The link works without a login. The public page shows exactly the results — and nothing else. No emails, no user identities, no private data. Revoking a link kills it instantly.

### 5. Graphics export

Turn any standings table into a clean image, right in the browser. Export it and drop it into Discord, WhatsApp, or X. The graphic looks the same on every device, because it is rendered as one image.

### 6. Organizations, roles, and invites

Each team or esports org gets its own private workspace. One **owner** controls it, **admins** help run it, **members** use it. New people join through single-use invite links — each link works exactly once, and the system stores only a secure hash of it. Nobody outside the organization sees its data.

### 7. Usage quotas

AI reads cost real money, so usage is metered and capped per user: scrim sessions and AI reads per calendar month. Quotas block new work when the limit is hit — they never lock anyone out of their existing data. During the pilot, limits can be raised by contacting support.

## Security and trust, in plain words

- **Your data lives behind database-level walls.** Every row in the database knows which organization owns it. The database itself refuses wrong reads and writes — even a bug in our application code cannot leak data across organizations.
- **Admin power is signed, limited, and recorded.** Support staff can log in *as* a user to debug a problem only through a signed, expiring session that is written to an audit log. Every admin action lands in an append-only record that nobody can edit or delete.
- **Accounts can be frozen instantly.** A kill switch blocks any account at once, and it fails closed — if the switch system itself is down, the block stays on.
- **Backups are proven, not promised.** The backup tooling restores into a throwaway database, counts every row, and compares. It is even tested against corrupt backups to make sure they get refused.
- **Outsiders cannot probe the system.** "Not allowed" and "does not exist" return the same answer, so attackers learn nothing about what is inside.

## Under the hood

For the technically minded:

- **Next.js 16** (App Router) with **TypeScript** in strict mode
- **Tailwind CSS v4** for the interface
- **Supabase** — PostgreSQL 17.6, authentication (GoTrue), and row-level security
- **Drizzle ORM** with a versioned migration journal
- **Google Gemini** powering the screenshot reader
- An automated test suite of roughly **600 checks** that gates every change — security, isolation, and behavior are all under test

## Plans and limits (pilot phase)

ScrimlyPro is entering its hosted pilot with **5 to 15 organizer teams**. During this phase:

- Every user gets monthly quotas for sessions and AI reads.
- Limits are enforced fairly and per user — creating extra organizations does not create extra quota.
- Need more? Contact support and we raise the limit for your account.
- Pilot feedback directly shapes the first public release.

## Where we are today

Wave 1 of the platform is complete and reviewed:

| Milestone | Status |
|---|---|
| Accounts, login, tenant isolation | Done — reviewed and approved |
| Organizations, invites, quotas, share links | Done — approved with fixes folded in at integration |
| Admin panel (audit log, impersonation, kill switch) | Done — approved with fixes folded in at integration |
| Dependency and security hardening | Done — production audit at zero known issues |
| Operations: deploy checks, backups, health monitoring | Done — approved |
| Hosted cut-over + pilot | In progress now |

## What comes next (Wave 2 candidates)

| Feature | What it adds |
|---|---|
| **Email delivery for invites** | Invite links arrive by email — today they are copy-paste |
| **Redis-backed sessions and rate limits** | Login sessions survive restarts and scale across servers |
| **Logo uploads** | Organizations brand their workspace and export graphics with their own logo |
| **Ownership transfer** | Hand an organization over to a successor, safely and recorded |
| **Share-link expiry defaults** | Public links can auto-expire after a set time |
| **Framework upgrade (Next 17 / Cache Components)** | Faster pages, modern caching |
| **Art / theme packs** | Custom visual themes for standings and exports |

---

*ScrimlyPro — built for teams that grind.*
