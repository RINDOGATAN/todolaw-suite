# todo.law suite v0.1.13 (the workspace passphrase is removed)

The kit and the Mac app install and run the same three products on one
computer in your office: DPO Central, Dealroom and AI Sentinel. This release
changes one thing, how you sign in.

## The shared sign-in passphrase is gone

Installs made since v0.1.7 asked every browser for a single workspace
passphrase before anyone could sign in to the apps. It has been removed.

The passphrase was one secret, shared by everyone, typed at every sign-in. It
decided who got in but recorded nothing about who acted, so it added friction
without helping either teamwork or accountability. Colleagues working the same
matter had to pass it between them, which worked against both.

Nothing is lost. Each of the three apps already issues its own per-user
accounts, so who did what is still recorded exactly as before. Your email
remains your identity on approvals, audit trails and licences.

What is still missing is a way to enrol additional people on a local install
without depending on the hosted identity service. That is a separate piece of
work (enrolment by scan from the Mac app, switched on only when an install
declares itself a team install), so anyone working alone sees no change at all.

The honest security note stands: the suite answers to this computer alone. The
real protection for a lost or stolen machine is the computer's own login and
disk encryption (FileVault on a Mac).

`BACKUP_PASSPHRASE`, which encrypts your backups, is untouched.

## What changed in the files

- `WORKSPACE_PASSPHRASE` is gone from `docker-compose.yml` and `.env.example`
  (seven keys remain).
- `suite.sh` no longer generates it, shows it in the install banner or the
  status line, puts it on the portal card, or offers the `passphrase` command.
- The Mac app drops the secret, the wizard's reveal box and the panel link.

Existing installs keep their `.env` exactly as it is. A leftover
`WORKSPACE_PASSPHRASE` line in an old `.env` is simply ignored, because the
compose file no longer passes it to the apps, so the gate is off after the
update whether or not you tidy the line away.

## Upgrading

```bash
./suite.sh backup && ./suite.sh update
```

That backs up first, refreshes the kit itself, pulls the newest images and
restarts. Mac app users update from the app's own panel, or install v0.1.5
from the release page.
