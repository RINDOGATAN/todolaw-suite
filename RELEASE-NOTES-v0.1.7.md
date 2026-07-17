# todo.law suite v0.1.7 — the workspace passphrase, and a UX polish wave

## Workspace passphrase

New installs now set a **workspace passphrase** (shown in the box at the end
of the install): each browser is asked for it once before anyone can sign in
to the apps. Your email stays your *identity* — it names you on approvals,
audit trails and licences; the passphrase is the *lock*.

- See or change it any time: `./suite.sh passphrase` / `--new`.
- Existing installs are never locked out: no passphrase in `.env` = no gate.
  Add one with `./suite.sh passphrase --new`.
- Honest security note (now also in the README): the passphrase is a speed
  bump against casual snooping at the computer. The suite already answers to
  this computer alone; the real wall for a lost or stolen machine is the
  computer's own login and disk encryption (FileVault on a Mac).

Requires app images from 2026-07-17 or newer (aisentinel v0.1.6, dpocentral
v0.1.15, deal-room v0.1.9 — `:latest` has them); older images simply ignore
the gate.

## The apps got a first-impressions overhaul (ships via `:latest`)

Found by a full UX walkthrough of a fresh install:

- Sign-in pages now say **"Local sign-in — your account lives on this
  computer"** instead of developer wording ("Development Mode" is gone).
- Dealroom's premium catalog cards no longer link to a dead URL; they open
  the real todo.law marketplace, and contentless catalog stubs are labelled
  honestly ("Skill package not installed") instead of appearing both free
  and locked at once. Cloud promo banners no longer show on sovereign boxes.
- DPO Central's Billing page (a cloud concern) is gated off self-host; the
  DPIA template no longer wears a phantom Premium lock; the quickstart
  redirect happens once instead of on every visit.
- AI Sentinel's Register button no longer vanishes while the page loads,
  and its skills page stops offering a licence upload when nothing needs one.
- A pass of Castilian Spanish fixes across all three apps.

## Upgrading

```bash
git pull   # or re-download the ZIP over the old folder (your .env is kept)
./suite.sh backup && ./suite.sh update
./suite.sh passphrase --new   # optional: add the new sign-in gate
```
