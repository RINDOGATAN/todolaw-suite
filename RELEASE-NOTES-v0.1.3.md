# todo.law suite v0.1.3 — one home per computer

Everything in v0.1.2 (see its notes: tiny kit, port pre-flight, premium-skill
key passthrough), plus one guard that v0.1.2 shipped without:

- **The suite refuses to run from a second folder.** The compose project name
  is fixed, so a re-downloaded kit in a different folder would silently adopt —
  and could reconfigure — an existing installation on the same computer. Every
  `suite.sh` command now detects where the installation actually lives and
  stops with directions to that folder instead. Fresh installs are unaffected.

Found by running the public one-liner on a machine that already had a suite
installed elsewhere: the second copy adopted the first one's containers and
recreated them with its own (different) passwords. Data was never at risk —
Postgres only accepts its original credentials — but the apps went down until
started again from the right folder. Now it cannot happen.

## Upgrading

```bash
git pull        # or re-download the ZIP over the old folder (your .env is kept)
./suite.sh backup && ./suite.sh update
```
