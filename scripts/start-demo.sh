#!/usr/bin/env bash
# ReboundOps — start the local-first workspace (localhost only).
#
# Everything lives in this repository:
#   apps/api, packages/contracts  ReboundOps recovery API (Fastify)
#   workspace/                    ReboundOps Workspace — job-search UI + same-origin bridge (Express)
#   engine/                       ReboundOps engine — job-search data folder and CLI scripts
#
# Starts:
#   ReboundOps API        http://127.0.0.1:4174   — opt-in local saving, AI off unless opted in
#   ReboundOps Workspace  http://127.0.0.1:4317   — open http://127.0.0.1:4317/#/start
#
# Ctrl+C stops both. Nothing listens on a non-loopback interface.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$REPO/workspace"
export REBOUND_OPS_ROOT="${REBOUND_OPS_ROOT:-$REPO/engine}"
export REBOUNDOPS_DATA_DIR="${REBOUNDOPS_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/reboundops/sessions}"
export REBOUNDOPS_API_PORT="${REBOUNDOPS_API_PORT:-4174}"
UI_PORT="${PORT:-4317}"

for d in "$WORKSPACE_DIR" "$REBOUND_OPS_ROOT"; do
  [ -d "$d" ] || { echo "Missing folder: $d (see workspace/docs/INTEGRATION-DEMO.md)" >&2; exit 1; }
done

# Recovery AI requires explicit opt-in. Keys stay in server processes only.
AI_MODE="${REBOUNDOPS_AI_ENABLED:-false}"
for arg in "$@"; do
  case "$arg" in
    --ai) AI_MODE=true ;;
    --no-ai) AI_MODE=false ;;
    --help|-h)
      echo "Usage: bash scripts/start-demo.sh [--ai | --no-ai]"
      echo "--ai enables recovery AI with ANTHROPIC_API_KEY in the server environment."
      echo "Alternatively set REBOUNDOPS_AI_ENABLED=true. Default: AI off."
      exit 0 ;;
    *) echo "Unknown option: $arg. Use --help." >&2; exit 2 ;;
  esac
done
if [ "$AI_MODE" != true ] && [ "$AI_MODE" != false ]; then
  echo "REBOUNDOPS_AI_ENABLED must be true or false." >&2; exit 2
fi
if [ "$AI_MODE" = true ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "AI opt-in needs ANTHROPIC_API_KEY in this terminal. See https://rebound-ops.org/docs/ai/" >&2
  exit 2
fi
export REBOUNDOPS_AI_ENABLED="$AI_MODE"
if [ "$AI_MODE" = false ]; then
  unset ANTHROPIC_API_KEY OPENAI_API_KEY GEMINI_API_KEY OPENROUTER_API_KEY QWEN_API_KEY GITHUB_MODELS_API_KEY || true
fi

node "$REPO/scripts/prepare-local-runtime.mjs"
echo "→ Building ReboundOps contracts + API + recovery interface…"
(cd "$REPO" && npm run build:contracts >/dev/null && npm run build:api >/dev/null && npm run build:web >/dev/null)

pids=()
cleanup() { for p in "${pids[@]:-}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

echo "→ Starting ReboundOps API on 127.0.0.1:$REBOUNDOPS_API_PORT"
(cd "$REPO/apps/api" && PORT="$REBOUNDOPS_API_PORT" node ../../dist/api/server.js) &
pids+=($!)

for _ in $(seq 1 40); do
  curl -fsS "http://127.0.0.1:$REBOUNDOPS_API_PORT/api/health" >/dev/null 2>&1 && break
  sleep 0.25
done

echo "→ Starting ReboundOps Workspace on 127.0.0.1:$UI_PORT (engine: $REBOUND_OPS_ROOT)"
(cd "$WORKSPACE_DIR" && unset ANTHROPIC_API_KEY OPENAI_API_KEY GEMINI_API_KEY OPENROUTER_API_KEY QWEN_API_KEY GITHUB_MODELS_API_KEY && HOST=127.0.0.1 PORT="$UI_PORT" node server/index.mjs) &
pids+=($!)

for _ in $(seq 1 40); do
  curl -fsS "http://127.0.0.1:$UI_PORT/api/rebound/health" >/dev/null 2>&1 && break
  sleep 0.25
done

echo
echo "  ReboundOps is running — open http://127.0.0.1:$UI_PORT/#/start"
echo "  Local-first workspace; recovery AI enabled: $AI_MODE. Reviews require preview and consent. Ctrl+C to stop."
echo "  Recovery AI setup: http://127.0.0.1:$UI_PORT/#/ai-setup"
echo
wait
