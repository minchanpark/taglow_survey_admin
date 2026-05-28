---
name: taglow-admin:newdawn-deploy
description: "Team-Newdawn/tallow_survey_admin 배포 저장소로 dev 브랜치를 올리고 dev -> main PR 배포 흐름을 운영할 때 사용. origin/minchanpark 기본 연결은 유지하면서 team-newdawn remote, GitHub Actions 배포 브랜치, PR 생성/확인 작업에 사용."
user-invocable: true
---

# taglow-admin:newdawn-deploy

이 스킬은 Taglow Survey Admin을 서버 배포용 저장소인 `Team-Newdawn/tallow_survey_admin`의 `dev` 브랜치로 올릴 때 사용한다. 로컬/VSCode의 기본 Git 연결은 `origin = minchanpark/taglow_survey_admin`로 유지한다.

## Remote Rules

- 기본 개발 remote는 항상 `origin`이다.
- `origin`은 `https://github.com/minchanpark/taglow_survey_admin.git`이어야 한다.
- 배포 remote는 `team-newdawn`이다.
- `team-newdawn`은 `https://github.com/Team-Newdawn/tallow_survey_admin.git`이어야 한다.
- Team-Newdawn 배포는 upstream tracking에 의존하지 말고 명시적으로 `git push team-newdawn HEAD:dev`를 사용한다.
- `main`에 직접 push하지 않는다. `dev -> main` PR merge 후 서버 GitHub Actions가 배포한다.

## Quick Command

반복 배포는 bundled script를 우선 사용한다.

```sh
.codex/skills/taglow-admin-newdawn-deploy/scripts/push-to-newdawn-dev.sh
```

검증을 이미 끝낸 경우에만 임시로 생략할 수 있다.

```sh
TAGLOW_SKIP_CHECKS=1 .codex/skills/taglow-admin-newdawn-deploy/scripts/push-to-newdawn-dev.sh
```

## Workflow

1. 현재 작업 범위를 확인한다.

```sh
git status -sb
git remote -v
git branch -vv
```

2. 워킹트리가 dirty이면 먼저 사용자에게 커밋 범위를 확인한다. 배포 스크립트는 uncommitted 변경이 있으면 중단한다.

3. 검증한다.

```sh
pnpm typecheck
pnpm test -- --run
pnpm build
```

4. 현재 커밋을 Team-Newdawn `dev`에 올린다.

```sh
git push team-newdawn HEAD:dev
```

5. PR 생성/머지는 `taglow-admin:newdawn-release`로 넘긴다.

```sh
.codex/skills/taglow-admin-newdawn-release/scripts/release-dev-to-main.sh
```

이미 열린 PR이 있으면 새 PR을 만들지 말고 링크와 상태만 보고한다. merge는 사용자가 명시적으로 요청한 경우에만 release 스킬에서 실행한다.

## Safety Checks

- `origin` remote를 Team-Newdawn으로 바꾸지 않는다.
- 로컬 브랜치 upstream을 `team-newdawn/dev`로 바꾸지 않는다.
- `team-newdawn/main` 직접 push, force push, branch protection 변경은 사용자가 명시적으로 요청한 경우에만 한다.
- PR merge는 사용자가 명시적으로 요청한 경우에만 진행한다.

## Handoff

마무리 응답에는 다음을 포함한다.

- push한 commit hash
- `team-newdawn/dev` push 결과
- 열린 PR 링크 또는 PR 생성 안내
- 실행한 검증 명령
- GitHub Actions 배포는 `main` merge 후 실행된다는 점
