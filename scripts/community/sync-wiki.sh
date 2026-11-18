#!/usr/bin/env bash
# Syncs the generated Wiki pages to the GitHub Wiki. Run by the maintainer, never by CI.
#
#   scripts/community/sync-wiki.sh [--update]
#
# Prerequisites:
#   - The Wiki is enabled, and its first page has been created once in the GitHub web UI
#     (GitHub creates the <repo>.wiki.git repository only then).
#   - You can push to the repository.
#
# It clones the Wiki into a temporary folder, generates pages without overwriting hand-written ones
# (and without replacing generated ones unless --update is given), commits locally, shows the diff,
# and asks before pushing.
set -euo pipefail

WIKI_URL="https://github.com/AnkitParekh007/rebound-ops.wiki.git"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet "$WIKI_URL" "$WORK/wiki"
REF="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
node "$REPO_ROOT/scripts/community/build-wiki.ts" "$WORK/wiki" --ref "$REF" "$@"

cd "$WORK/wiki"
if [ -z "$(git status --porcelain)" ]; then
  echo "Wiki is already up to date."
  exit 0
fi
git add -A
git commit --quiet -m "Sync generated pages from rebound-ops@$REF"
git show --stat HEAD
read -r -p "Push these Wiki changes to GitHub? [y/N] " answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
  git push origin HEAD
else
  echo "Not pushed. Nothing was changed on GitHub."
fi
