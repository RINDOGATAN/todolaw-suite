#!/usr/bin/env bash
# ============================================================================
# rebake-apps.sh  --  MAINTAINER TOOL (todo.law). Not for end users.
#
# Refreshes the app source trees bundled in this kit (apps/dpocentral,
# apps/deal-room, apps/aisentinel) from the product repos, before you cut a
# new release of the suite. Run it whenever an app has changed.
#
# It bakes ONLY the clean tracked tree via `git archive`: no git history, no
# .env / secrets, no node_modules, no CLAUDE.md. It stages the result and runs
# a safety check. It does NOT commit or push -- you review, then commit + push.
#
# Point it at your local product repos (override the defaults via env):
#   SRC_DPOCENTRAL   default: $HOME/NEL/dpocentral-todo
#   SRC_DEALROOM     default: $HOME/NEL/deal-room-todo
#   SRC_AISENTINEL   default: $HOME/NEL/aisentinel
#   BRANCH           default: main
#
# Written for the bash that ships with macOS (3.2) -- no associative arrays.
# ============================================================================
set -o pipefail

SUITE=$(cd "$(dirname "$0")/.." && pwd)
BRANCH="${BRANCH:-main}"
APPS="dpocentral deal-room aisentinel"

# app name (as bundled under apps/) -> local product repo path
src_repo() {
  case "$1" in
    dpocentral) echo "${SRC_DPOCENTRAL:-$HOME/NEL/dpocentral-todo}" ;;
    deal-room)  echo "${SRC_DEALROOM:-$HOME/NEL/deal-room-todo}" ;;
    aisentinel) echo "${SRC_AISENTINEL:-$HOME/NEL/aisentinel}" ;;
  esac
}

for app in $APPS; do
  src=$(src_repo "$app")
  if [ ! -d "$src/.git" ]; then
    printf 'ERROR: source repo for %s not found at: %s\n' "$app" "$src" >&2
    printf 'Set the matching SRC_* env var (see the header of this script).\n' >&2
    exit 1
  fi
  sha=$(git -C "$src" rev-parse --short "$BRANCH" 2>/dev/null) || {
    printf 'ERROR: branch %s not found in %s\n' "$BRANCH" "$src" >&2; exit 1; }
  printf 're-baking %-11s <- %s @ %s (%s)\n' "$app" "$src" "$BRANCH" "$sha"
  rm -rf "$SUITE/apps/$app"
  mkdir -p "$SUITE/apps/$app"
  git -C "$src" archive "$BRANCH" | tar -x -C "$SUITE/apps/$app"
  printf '  %s files\n' "$(find "$SUITE/apps/$app" -type f | wc -l | tr -d ' ')"
done

git -C "$SUITE" add -A apps/

bad=$(git -C "$SUITE" diff --cached --name-only \
  | grep -icE '(^|/)\.env($|\.local|\.production)|node_modules/|(^|/)CLAUDE\.md$' || true)
printf '\n'
if [ "$bad" != "0" ]; then
  printf '!!! SAFETY: %s sensitive file(s) staged -- do NOT commit. Inspect:\n' "$bad" >&2
  git -C "$SUITE" diff --cached --name-only | grep -iE '\.env|node_modules|CLAUDE' >&2
  exit 1
fi

printf 'Re-bake complete and staged; safety check clean.\n'
printf 'Review:  git -C "%s" status\n' "$SUITE"
printf 'Ship:    git -C "%s" commit -m "chore: re-bake apps (%s)" && git -C "%s" push\n' "$SUITE" "$BRANCH" "$SUITE"
