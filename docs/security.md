# Security posture

The todo.law suite runs in two postures. They share the application code but
not the security model. This document covers both, and says which one this
repository governs.

## 1. Self-hosted (this repository)

The kit (`docker-compose.yml`, `suite.sh`) and the desktop app (`desktop/`)
run the three apps on one computer, for one office.

| Control | How it is enforced | Where |
|---|---|---|
| Reachable from this computer only | Every published port binds to `127.0.0.1` (apps 8485 to 8487; community engine 8488 and 8489). The databases publish no port at all. | `docker-compose.yml`, `ports:` lines |
| Sign-in is trusting by design | Local accounts are created on first sign-in by email, with no email sent. This is safe only because of the row above. Exposing the apps to a network requires a reverse proxy with real authentication and HTTPS in front first. | `README.md`, "What actually protects your data" |
| One login across the three apps | Sessions are signed with one `NEXTAUTH_SECRET`, generated on first run; the compose file refuses to start without it (no default value). | `docker-compose.yml`, `x-shared-login` |
| Secrets stay on the machine | `.env` is generated once with `umask 077`, set to mode 600, never overwritten, and git-ignored. It holds the three database passwords, the session secret, the bridge key and the backup passphrase. | `suite.sh`, `ensure_env()`; `.gitignore` |
| Encrypted backups | `pg_dump`, gzip, then `openssl enc -aes-256-cbc -pbkdf2 -salt` with `BACKUP_PASSPHRASE`. The desktop app writes byte-compatible files. | `suite.sh`, `cmd_backup()` / `cmd_restore()`; `desktop/src/core/backup.ts` |
| Pinned images | Each kit release pins the six app images to its own tag; nothing floats unless `TODOLAW_VERSION=latest` is set. The optional community engine refuses to start until a pinned image is set. | `docker-compose.yml`; `RELEASING.md` |
| No AI calls by default | The AI engine variables are empty; even when set, an administrator must also enable the AI posture inside the app. | `docker-compose.yml`, `.env.example` |
| Premium skills verified offline | The apps carry the marketplace public key; `SKILL_SIGNING_PUBLIC_KEY` is only a rotation override. | `docker-compose.yml` |
| One install per computer | The compose project name is fixed and the scripts refuse to run from a second folder, so a second copy cannot reconfigure the first. | `docker-compose.yml` (`name:`); `suite.sh`, `check_home()` |
| Desktop app | Signed and notarized for macOS; renderer runs with `contextIsolation` on. | `desktop/RELEASING.md`; `desktop/src/main/index.ts` |

What the kit does **not** protect against, and the owner of the computer must:

- A lost or stolen machine: the wall is the computer's own login and disk
  encryption (FileVault on a Mac).
- Anyone with a shell on the computer: they can read `.env` and the Docker
  volumes. During a backup or restore the passphrase is passed to `openssl`
  on its command line, so another local user could see it in the process list
  for that moment.
- Loss of `.env`: without `BACKUP_PASSPHRASE` a backup cannot be opened by
  anyone, including us. Keep a copy in a password manager.

Upgrades and database migrations: see [upgrades.md](upgrades.md).

## 2. Hosted (the cloud service)

The hosted pilot runs the same apps on managed infrastructure, with
multi-tenant data, real sign-in (no trusting local accounts), managed
database backups and deploys from each app's own repository. None of that is
configured here: this repository neither builds nor deploys the hosted
service. Its security posture is documented in each app's repository
(`docs/security.md` there), and a vulnerability in it is reported the same
way as in [SECURITY.md](../SECURITY.md).
