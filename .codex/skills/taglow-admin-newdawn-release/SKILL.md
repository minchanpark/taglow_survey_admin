---
name: taglow-admin-newdawn-release
description: "Team-Newdawn/tallow_survey_admin에서 dev -> main Pull Request를 만들고, 사용자가 명시적으로 요청한 경우에만 merge하여 GitHub Actions 배포를 트리거할 때 사용. main 직접 push 없이 PR 기반 릴리즈를 운영한다."
user-invocable: true
---

# taglow-admin-newdawn-release

이 스킬은 배포 저장소 `Team-Newdawn/tallow_survey_admin`에서 `dev -> main` Pull Request를 열고, 필요 시 merge해서 서버 GitHub Actions 배포를 시작할 때 사용한다.

## Guardrails

- `main`에 직접 push하지 않는다.
- `dev -> main` PR만 대상으로 한다.
- merge는 사용자가 이번 요청에서 명시적으로 "merge", "머지", "배포", "main에 반영"을 요청한 경우에만 실행한다.
- 단순히 PR을 "던져줘", "만들어줘", "열어줘"라고만 하면 merge하지 않는다.
- 이미 열린 PR이 있으면 새 PR을 만들지 않고 기존 PR을 사용한다.
- PR merge 후 GitHub Actions 배포가 시작되는 구조임을 응답에 명시한다.

## Quick Commands

PR 생성 또는 기존 PR 확인:

```sh
.codex/skills/taglow-admin-newdawn-release/scripts/release-dev-to-main.sh
```

PR 생성/확인 후 즉시 merge:

```sh
.codex/skills/taglow-admin-newdawn-release/scripts/release-dev-to-main.sh --merge
```

## Workflow

1. 배포 후보가 `team-newdawn/dev`에 올라갔는지 확인한다. 필요하면 먼저 `taglow-admin:newdawn-deploy`를 사용한다.

```sh
git fetch team-newdawn main dev
git log --oneline team-newdawn/main..team-newdawn/dev
```

2. 차이가 없으면 PR/merge를 만들지 않는다.

3. PR을 만든다.

```sh
gh pr create --repo Team-Newdawn/tallow_survey_admin --base main --head dev
```

4. merge 요청이 명시된 경우에만 merge한다.

```sh
gh pr merge --repo Team-Newdawn/tallow_survey_admin <PR_NUMBER> --merge
```

5. merge 후 GitHub Actions 상태를 확인한다.

```sh
gh run list --repo Team-Newdawn/tallow_survey_admin --branch main --limit 5
```

## Handoff

마무리 응답에는 다음을 포함한다.

- PR URL
- merge 여부
- `team-newdawn/dev`와 `team-newdawn/main`의 commit hash
- GitHub Actions run 확인 결과 또는 확인 명령
- merge하지 않은 경우, 사용자가 GitHub에서 merge할 수 있다는 안내
