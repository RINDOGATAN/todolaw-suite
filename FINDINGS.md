# FINDINGS — todolaw-suite (kit + desktop app)

Alignment and re-verification after storefront v3, cycle 8, 2026-09-15.
Each entry: what the storefront (or the tree) says, what is true in this tree
today, and the smallest change on either side. Nothing here edits the
storefront; that is another tree.

The storefront has no `P.<product>` entry for the kit. The kit's own copy is the
"The kit" row on `/run` (Spanish "Instalador local" on `/es/a-tu-manera`) and
the matching row on `/pricing`:

- EN: "Open source, Docker, one login for the suite, the community engine included."
- ES: "Código abierto, Docker, un único acceso a toda la suite y el motor de la comunidad incluido."
- Pricing: "Free; premium modules 60 a year each" / "Gratis; módulos premium a 60 al año cada uno".

## 1. "one login for the suite" / "un único acceso a toda la suite"

**What is true today.** `docker-compose.yml` starts three independent NextAuth
apps (DPO Central on 8485, Dealroom on 8486, AI Sentinel on 8487). Each has its
own `NEXTAUTH_URL`; they share only the `NEXTAUTH_SECRET` value. No service is
configured as an identity provider for the other two, and no environment
variable in the compose or `.env.example` points Dealroom or AI Sentinel at DPO
Central for sign-in. The kit README says so: "Sign in on each with your email
address. The first sign-in creates your account, locally" (README.md, "What you
get"). The desktop app bundles the same compose file.

**Smallest change.** Either the storefront row for the kit says "one kit, one
command, three apps" and keeps "one login" for the hosted cloud only, or, if the
app images already support signing in through DPO Central, the compose gains the
one or two environment variables that wire it (the dpocentral-todo tree owns
that contract; see its own STATUS for which apps sign in through it).

## 2. "the community engine included" / "el motor de la comunidad incluido"

**What is true today.** The compose ships no community engine service. The only
AI engine in the file is `ollama/ollama:latest`, under `profiles: ["ai"]`, so it
is not started by `./suite.sh` or `docker compose up -d`, and no model is pulled.
The README states the apps make no AI calls out of the box and that an
administrator must switch the assistant on. Nothing in the tree references
Donna or LQ.AI other than the desktop app's `NOTICES.md` (code adapted from
LQ.AI Desktop, Apache-2.0).

**Smallest change.** Storefront wording "an optional local AI engine" (or drop
the clause for the kit row), or, if "community engine" is meant to be a
concrete service, add it to `docker-compose.yml` behind the existing `ai`
profile and document it in `.env.example`.

## 3. "Open source" for the kit

**What is true today.** The kit repository (`RINDOGATAN/todolaw-suite`, public)
has no `LICENSE` file at its root; only `desktop/LICENSE` (Apache-2.0) exists.
The README says "The three products are open source under the AGPL licence",
which this tree cannot prove: the app repositories are not readable from this
session and the GitHub licence API call needs an approval that a headless run
cannot give.

**Smallest change.** Add a `LICENSE` file at the kit root (owner's choice:
Apache-2.0 to match the desktop app, or AGPL-3.0 to match what the README says
about the apps), and have the owner confirm the three app repositories carry the
AGPL licence file the README claims.

## 4. Release pinning (safeguards check 7) — kit, installer and images are not pinned together

**What is true today.** The kit tag is pinned in two places that agree:
`suite.sh` carries `KIT_VERSION="v0.1.13"` and the git tag `v0.1.13` contains
exactly the kit files on `main` (no diff on suite.sh, docker-compose.yml,
.env.example, README.md). The installer at `https://todo.law/install.sh` pins a
kit tag in `KIT_URL`, which this session could not fetch (outbound curl needs an
approval); the owner check is listed in STATUS.md. The image tags are NOT pinned
to the kit tag: `docker-compose.yml` uses `${TODOLAW_VERSION:-latest}` and
`.env.example` sets `TODOLAW_VERSION=latest`, so a fresh install and every
`./suite.sh update` pull whatever `:latest` is on GHCR. The monthly seam test
(`suite-integration.yml`) tests `:latest` only.

**Smallest change.** Either document on the storefront and in the README that
the kit tracks the latest app images by design (and keep the seam test as the
gate), or have each kit release write a pinned `TODOLAW_VERSION` into
`.env.example` and the generated `.env`, so kit tag, installer pin and image tag
move together.
