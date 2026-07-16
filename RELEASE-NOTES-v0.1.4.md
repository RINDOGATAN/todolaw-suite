# todo.law suite v0.1.4 — docs: premium skills need no key setup

No behaviour changes. This corrects the kit's own documentation:

- **Premium skills verify out of the box.** All three apps ship with the
  marketplace's public verification key built in. `.env.example` and the
  compose previously implied you had to obtain and set
  `SKILL_SIGNING_PUBLIC_KEY` first (and that leaving it empty rejected
  installs) — wrong on both counts. The variable is an override for a future
  key rotation, nothing more. Buy a skill, upload the `.skill` file on the
  app's Skills page, done.

## Upgrading

Not needed for running installs — the images are unchanged. `git pull` if you
want the corrected comments.
