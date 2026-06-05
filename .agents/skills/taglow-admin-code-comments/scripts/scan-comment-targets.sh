#!/usr/bin/env bash
set -euo pipefail

root="${1:-.}"
cd "$root"

echo "== Taglow code comment inventory =="
echo

echo "Docs:"
for file in AGENTS.md src/AGENTS.md dev/Taglow_Survey_Admin_PRD.md dev/Taglow_survey_Admin_TDD_v2.md dev/Taglow_survey_Admin_TDD.md; do
  if [ -f "$file" ]; then
    echo "  [ok] $file"
  else
    echo "  [missing] $file"
  fi
done
echo

echo "Nearest AGENTS files:"
find src -name AGENTS.md -print | sort
echo

echo "TypeScript target counts:"
for dir in src/app src/api/admin src/api/participant src/store src/components src/view src/utils src/test; do
  if [ -d "$dir" ]; then
    count="$(rg --files "$dir" | rg '\.(ts|tsx)$' | wc -l | tr -d ' ')"
    echo "  $dir: $count"
  fi
done
echo

echo "Likely declaration targets:"
rg -n "^(export\\s+)?(abstract\\s+)?(class|interface|type|enum|const|function)\\s+|^export\\s+\\{.*\\}|^\\s{2,}(readonly\\s+)?[A-Za-z][A-Za-z0-9_]*\\??:" src --glob '*.{ts,tsx}' --glob '!**/*.css.ts' || true
echo

echo "Boundary checks to re-run after editing:"
echo "  rg -n \"@supabase|supabase\\\\.from|supabase\\\\.storage\" src/view src/store src/api/admin/query"
echo "  rg -n \"AdminPayloadMapper|AdminApiGateway\" src/view src/store src/api/admin/query"
