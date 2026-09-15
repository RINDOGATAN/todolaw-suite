# todo.law suite v0.1.14 (one login, the community engine, a licence, pinned versions)

The kit installs and runs the same three products on one computer in your
office: DPO Central, Dealroom and AI Sentinel. This release closes four gaps
between what the todo.law site says about the kit and what the kit did.

## One login for the suite

The three apps now sign their sessions with one shared secret and answer on
the same host name, so signing in on any one of them signs you in on the other
two. Each app still keeps its own local account for you, keyed by your email,
so approvals, audit trails and licences record who acted exactly as before.

Behind a reverse proxy that serves the apps under one domain, set
`AUTH_COOKIE_DOMAIN` in `.env` to the parent domain; on localhost leave it empty.

## The community engine, off by default

Donna (the legal assistant) on LQ.AI (the engine) can be started with
`docker compose --profile community up -d` once both image references are
filled in `.env`. Left empty, the profile refuses to start, so nothing ever
floats to an unpinned version.

## A licence at the root

The kit now carries its LICENSE (GNU Affero General Public License v3 or
later, the same family as the three apps) and a short NOTICE naming the three
apps and the desktop app's separate Apache-2.0 licence.

## The apps are pinned to the kit

A kit release now pins the three app images to its own version tag. A fresh
install runs exactly the images this kit was released with, and
`./suite.sh update` moves the pin when it refreshes the kit. Set
`TODOLAW_VERSION` in `.env` to `latest` to follow the newest images instead,
or to a tag to stay on one release. Installs made before this release keep the
value already in their `.env`.

## Upgrading

```bash
./suite.sh backup && ./suite.sh update
```

That backs up first, refreshes the kit itself, pulls the images and restarts.
