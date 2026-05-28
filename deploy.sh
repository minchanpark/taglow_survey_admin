#!/usr/bin/env bash

set -Eeuo pipefail

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_file() {
  local file_path="$1"
  [[ -f "$file_path" ]] || fail "missing file: $file_path"
}

http_probe() {
  local url="$1"

  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error "$url" >/dev/null
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q -O /dev/null "$url"
    return
  fi

  fail "curl or wget is required for health checks"
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-30}"
  local sleep_seconds="${3:-2}"

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if http_probe "$url"; then
      return 0
    fi

    sleep "$sleep_seconds"
  done

  return 1
}

cleanup_candidate() {
  local candidate_name="${1:-}"

  if [[ -n "$candidate_name" ]]; then
    docker rm -f "$candidate_name" >/dev/null 2>&1 || true
  fi
}

APP_ROOT="${APP_ROOT:-$HOME/apps/taglow/admin}"
BUNDLE_DIR="${BUNDLE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
NEXT_ENV_FILE="$BUNDLE_DIR/.deploy.env.next"
NEXT_COMPOSE_FILE="$BUNDLE_DIR/docker-compose.prod.yml"

require_file "$NEXT_ENV_FILE"
require_file "$NEXT_COMPOSE_FILE"

source "$NEXT_ENV_FILE"

: "${APP_NAME:?APP_NAME is required}"
: "${COMPOSE_PROJECT_NAME:?COMPOSE_PROJECT_NAME is required}"
: "${HOST_PORT:?HOST_PORT is required}"
: "${CANDIDATE_PORT:?CANDIDATE_PORT is required}"
: "${HEALTHCHECK_PATH:?HEALTHCHECK_PATH is required}"
: "${IMAGE_REPOSITORY:?IMAGE_REPOSITORY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${IMAGE_ARCHIVE:?IMAGE_ARCHIVE is required}"
: "${KEEP_RELEASES:?KEEP_RELEASES is required}"
: "${IMAGE_PRUNE_UNTIL:?IMAGE_PRUNE_UNTIL is required}"
: "${IMAGE_LABEL_TITLE:?IMAGE_LABEL_TITLE is required}"

IMAGE_REF="${IMAGE_REPOSITORY}:${IMAGE_TAG}"
IMAGE_ARCHIVE_PATH="$BUNDLE_DIR/$IMAGE_ARCHIVE"
CURRENT_ENV_FILE="$APP_ROOT/.deploy.env"
CURRENT_COMPOSE_FILE="$APP_ROOT/docker-compose.prod.yml"
PREVIOUS_ENV_BACKUP="$(mktemp)"
PREVIOUS_COMPOSE_BACKUP="$(mktemp)"
CANDIDATE_NAME="${APP_NAME}-candidate"
PREVIOUS_IMAGE="$(docker inspect "$APP_NAME" --format '{{.Config.Image}}' 2>/dev/null || true)"
INCOMING_ROOT="$APP_ROOT/incoming"

require_file "$IMAGE_ARCHIVE_PATH"

trap 'cleanup_candidate "$CANDIDATE_NAME"' EXIT

command -v docker >/dev/null 2>&1 || fail "docker is required"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is required"

mkdir -p "$APP_ROOT" "$INCOMING_ROOT"

if [[ -f "$CURRENT_ENV_FILE" ]]; then
  cp "$CURRENT_ENV_FILE" "$PREVIOUS_ENV_BACKUP"
fi

if [[ -f "$CURRENT_COMPOSE_FILE" ]]; then
  cp "$CURRENT_COMPOSE_FILE" "$PREVIOUS_COMPOSE_BACKUP"
fi

log "Loading image archive $IMAGE_ARCHIVE"
docker load --input "$IMAGE_ARCHIVE_PATH" >/dev/null

log "Verifying new image on candidate port $CANDIDATE_PORT"
cleanup_candidate "$CANDIDATE_NAME"
docker run \
  --detach \
  --rm \
  --name "$CANDIDATE_NAME" \
  --publish "127.0.0.1:${CANDIDATE_PORT}:8080" \
  --read-only \
  --tmpfs /tmp:size=64m,mode=1777 \
  --tmpfs /var/cache/nginx:size=32m \
  --tmpfs /var/run:size=8m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  "$IMAGE_REF" >/dev/null

if ! wait_for_url "http://127.0.0.1:${CANDIDATE_PORT}${HEALTHCHECK_PATH}" 30 2; then
  docker logs "$CANDIDATE_NAME" || true
  fail "candidate container failed health check"
fi

cleanup_candidate "$CANDIDATE_NAME"

cp "$NEXT_ENV_FILE" "$CURRENT_ENV_FILE"
cp "$NEXT_COMPOSE_FILE" "$CURRENT_COMPOSE_FILE"

log "Starting $APP_NAME on port $HOST_PORT"
docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --env-file "$CURRENT_ENV_FILE" \
  -f "$CURRENT_COMPOSE_FILE" \
  up -d --force-recreate --remove-orphans --no-build "$APP_NAME"

if ! wait_for_url "http://127.0.0.1:${HOST_PORT}${HEALTHCHECK_PATH}" 30 2; then
  docker compose \
    --project-name "$COMPOSE_PROJECT_NAME" \
    --env-file "$CURRENT_ENV_FILE" \
    -f "$CURRENT_COMPOSE_FILE" \
    logs --tail=100 "$APP_NAME" || true

  if [[ -n "$PREVIOUS_IMAGE" && -s "$PREVIOUS_ENV_BACKUP" && -s "$PREVIOUS_COMPOSE_BACKUP" ]]; then
    log "Health check failed, rolling back to $PREVIOUS_IMAGE"
    cp "$PREVIOUS_ENV_BACKUP" "$CURRENT_ENV_FILE"
    cp "$PREVIOUS_COMPOSE_BACKUP" "$CURRENT_COMPOSE_FILE"

    docker compose \
      --project-name "$COMPOSE_PROJECT_NAME" \
      --env-file "$CURRENT_ENV_FILE" \
      -f "$CURRENT_COMPOSE_FILE" \
      up -d --force-recreate --remove-orphans --no-build "$APP_NAME"
  fi

  fail "official container failed health check"
fi

log "Pruning old unused images for $IMAGE_LABEL_TITLE"
docker image prune -af \
  --filter "label=org.opencontainers.image.title=${IMAGE_LABEL_TITLE}" \
  --filter "until=${IMAGE_PRUNE_UNTIL}" >/dev/null || true

if [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t old_release_dirs < <(
    find "$INCOMING_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
      | sort -nr \
      | awk "NR > ${KEEP_RELEASES} { print \$2 }"
  )

  if (( ${#old_release_dirs[@]} > 0 )); then
    rm -rf "${old_release_dirs[@]}"
  fi
fi

rm -f "$PREVIOUS_ENV_BACKUP" "$PREVIOUS_COMPOSE_BACKUP"

log "Deployment completed for $IMAGE_REF"
