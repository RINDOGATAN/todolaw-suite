# Upgrades and database migrations

## Migrations are forward-only

Each app ships a one-shot migrator image (`*-migrator` in
`docker-compose.yml`). On every start it applies that app's migration history
to its database and exits; the app starts only after it exits successfully.
Migrations only move forward: there is no "down" step, and the kit never
rolls a schema back.

Consequences:

- **Going back a version is a restore, not a downgrade.** Setting
  `TODOLAW_VERSION` to an older tag does not undo migrations already applied;
  an older app on a newer schema may fail. To go back, restore the backup
  taken before the upgrade (`./suite.sh restore <app> <file>`) and then pin
  the older tag.
- **Back up first, every time.** `./suite.sh backup && ./suite.sh update`
  does both in the right order.
- A migrator that fails stops its app from starting; the database keeps
  whatever steps completed. Check `logs/suite.log` and
  `docker compose logs <app>-migrator`, then restore the pre-upgrade backup
  if needed.

## Rehearsing an upgrade on a copy

Do this before upgrading an install that holds real work. The suite allows
**one install per computer** (the scripts refuse a second folder), so the
rehearsal runs on a second computer or a virtual machine, never beside the
real install.

1. On the real install: `./suite.sh backup`. Copy the three newest files from
   `backups/` and the `.env` file to the rehearsal machine.
2. On the rehearsal machine: install the kit at the **current** version (the
   one the real install runs), put the copied `.env` in the kit folder, run
   `./suite.sh`, then restore each app:
   `./suite.sh restore <app> backups/<file>`.
3. Upgrade the copy: `./suite.sh update` (or set `TODOLAW_VERSION` to the
   target tag and run `./suite.sh update`).
4. Check: the three migrators exited 0
   (`docker compose ps -a --format '{{.Service}} {{.Status}}'`), the three
   apps answer (`./suite.sh status`), and the records you rely on are there.
5. Only then upgrade the real install, and delete the rehearsal copy (it
   holds real data and the real `.env`).

The monthly seam test (`.github/workflows/suite-integration.yml`) checks the
same thing on empty databases: migrators exit 0 and apps answer 200. It does
not replace a rehearsal on a copy of real data.
