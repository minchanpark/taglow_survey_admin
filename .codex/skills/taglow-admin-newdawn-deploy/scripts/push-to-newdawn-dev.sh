#!/usr/bin/env bash
set -euo pipefail

EXPECTED_ORIGIN="https://github.com/minchanpark/taglow_survey_admin.git"
TEAM_REMOTE="team-newdawn"
TEAM_URL="https://github.com/Team-Newdawn/tallow_survey_admin.git"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

origin_url="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$origin_url" != "$EXPECTED_ORIGIN" ]]; then
  echo "origin remote must stay on $EXPECTED_ORIGIN"
  echo "current origin: ${origin_url:-missing}"
  exit 1
fi

team_url="$(git remote get-url "$TEAM_REMOTE" 2>/dev/null || true)"
if [[ -z "$team_url" ]]; then
  git remote add "$TEAM_REMOTE" "$TEAM_URL"
elif [[ "$team_url" != "$TEAM_URL" ]]; then
  echo "$TEAM_REMOTE remote must be $TEAM_URL"
  echo "current $TEAM_REMOTE: $team_url"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before deploying to $TEAM_REMOTE/dev."
  git status -sb
  exit 1
fi

if [[ "${TAGLOW_SKIP_CHECKS:-0}" != "1" ]]; then
  pnpm typecheck
  pnpm test -- --run
  pnpm build
fi

git fetch "$TEAM_REMOTE" main dev || true
git push "$TEAM_REMOTE" HEAD:dev

commit_hash="$(git rev-parse --short HEAD)"
echo "Pushed $commit_hash to $TEAM_REMOTE/dev."

if command -v gh >/dev/null 2>&1; then
  echo "Open PRs from dev to main:"
  gh pr list --repo Team-Newdawn/tallow_survey_admin --base main --head dev || true
fi
