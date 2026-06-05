#!/usr/bin/env bash
set -euo pipefail

REPO="Team-Newdawn/taglow_survey_admin"
EXPECTED_ORIGIN="https://github.com/minchanpark/taglow_survey_admin.git"
TEAM_REMOTE="team-newdawn"
TEAM_URL="https://github.com/Team-Newdawn/taglow_survey_admin.git"
BASE_BRANCH="main"
HEAD_BRANCH="dev"
SHOULD_MERGE=0

usage() {
  cat <<USAGE
Usage: $0 [--merge]

Creates or finds the Team-Newdawn dev -> main PR.
Use --merge only when production deployment is explicitly approved.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --merge)
      SHOULD_MERGE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required."
  exit 1
fi

gh auth status -h github.com >/dev/null

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

git fetch "$TEAM_REMOTE" "$BASE_BRANCH" "$HEAD_BRANCH"

base_ref="$TEAM_REMOTE/$BASE_BRANCH"
head_ref="$TEAM_REMOTE/$HEAD_BRANCH"
base_sha="$(git rev-parse --short "$base_ref")"
head_sha="$(git rev-parse --short "$head_ref")"

if [[ "$(git rev-parse "$base_ref")" == "$(git rev-parse "$head_ref")" ]]; then
  echo "$head_ref and $base_ref already point to $head_sha. No PR needed."
  exit 0
fi

echo "Release diff:"
git log --oneline "$base_ref..$head_ref"

pr_json="$(gh pr list --repo "$REPO" --base "$BASE_BRANCH" --head "$HEAD_BRANCH" --state open --json number,url --limit 1)"
pr_number="$(printf '%s' "$pr_json" | node -e 'const fs=require("fs"); const prs=JSON.parse(fs.readFileSync(0,"utf8")); console.log(prs[0]?.number ?? "")')"
pr_url="$(printf '%s' "$pr_json" | node -e 'const fs=require("fs"); const prs=JSON.parse(fs.readFileSync(0,"utf8")); console.log(prs[0]?.url ?? "")')"

if [[ -z "$pr_number" ]]; then
  body_file="$(mktemp)"
  cat > "$body_file" <<BODY
## Release

Promotes \`dev\` to \`main\` for deployment.

## Commits

\`\`\`
$(git log --oneline "$base_ref..$head_ref")
\`\`\`

## Deployment

Merging this PR triggers the server GitHub Actions deployment from \`main\`.
BODY
  pr_url="$(gh pr create --repo "$REPO" --base "$BASE_BRANCH" --head "$HEAD_BRANCH" --title "Release: dev to main" --body-file "$body_file")"
  rm -f "$body_file"
  pr_number="$(basename "$pr_url")"
fi

echo "PR: $pr_url"

if [[ "$SHOULD_MERGE" == "1" ]]; then
  gh pr merge "$pr_number" --repo "$REPO" --merge
  git fetch "$TEAM_REMOTE" "$BASE_BRANCH"
  merged_main_sha="$(git rev-parse --short "$TEAM_REMOTE/$BASE_BRANCH")"
  echo "Merged PR #$pr_number. $TEAM_REMOTE/$BASE_BRANCH is now $merged_main_sha."
  git push origin "$TEAM_REMOTE/$BASE_BRANCH:$BASE_BRANCH"
  git push "$TEAM_REMOTE" "$TEAM_REMOTE/$BASE_BRANCH:$HEAD_BRANCH"
  if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
    git switch "$BASE_BRANCH"
    git branch --set-upstream-to="origin/$BASE_BRANCH" "$BASE_BRANCH" >/dev/null 2>&1 || true
    git merge --ff-only "$TEAM_REMOTE/$BASE_BRANCH"
  fi
  echo "Synced origin/$BASE_BRANCH and $TEAM_REMOTE/$HEAD_BRANCH to $merged_main_sha."
  echo "Recent GitHub Actions runs:"
  gh run list --repo "$REPO" --branch "$BASE_BRANCH" --limit 5 || true
else
  echo "PR is ready. Merge it on GitHub, or rerun with --merge after explicit approval."
fi
