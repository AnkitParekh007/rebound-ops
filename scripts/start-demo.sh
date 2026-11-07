#!/usr/bin/env bash
# ReboundOps — start the local demo (localhost only).
#
# Everything lives in this repository:
#   apps/api, packages/contracts  ReboundOps recovery API (Fastify)
#   workspace/                    ReboundOps Workspace — job-search UI + same-origin bridge (Express)
#   engine/                       ReboundOps engine — job-search data folder and CLI scripts
#
# Starts:
#   ReboundOps API        http://127.0.0.1:4174   — memory-only sessions, AI disabled
#   ReboundOps Workspace  http://127.0.0.1:4317   — open http://127.0.0.1:4317/#/start
#
# Ctrl+C stops both. Nothing listens on a non-loopback interface.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$REPO/workspace"
export REBOUND_OPS_ROOT="${REBOUND_OPS_ROOT:-$REPO/engine}"
export REBOUNDOPS_API_PORT="${REBOUNDOPS_API_PORT:-4174}"
UI_PORT="${PORT:-4317}"

for d in "$WORKSPACE_DIR" "$REBOUND_OPS_ROOT"; do
  [ -d "$d" ] || { echo "Missing folder: $d (see workspace/docs/INTEGRATION-DEMO.md)" >&2; exit 1; }
done

# AI stays OFF for the demo: never pass provider keys to either process.
unset ANTHROPIC_API_KEY OPENAI_API_KEY GEMINI_API_KEY OPENROUTER_API_KEY QWEN_API_KEY GITHUB_MODELS_API_KEY || true
export REBOUNDOPS_AI_ENABLED=false

if [ ! -d "$REPO/node_modules" ]; then
  echo "→ Installing ReboundOps dependencies (npm ci)…"; (cd "$REPO" && npm ci --no-audit --no-fund)
fi
if [ ! -d "$WORKSPACE_DIR/node_modules" ]; then
  echo "→ Installing Workspace dependencies (npm ci)…"; (cd "$WORKSPACE_DIR" && npm ci --no-audit --no-fund --ignore-scripts)
fi
echo "→ Building ReboundOps contracts + API…"
(cd "$REPO" && npm run build:contracts >/dev/null && npm run build:api >/dev/null)

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
(cd "$WORKSPACE_DIR" && HOST=127.0.0.1 PORT="$UI_PORT" node server/index.mjs) &
pids+=($!)

for _ in $(seq 1 40); do
  curl -fsS "http://127.0.0.1:$UI_PORT/api/rebound/health" >/dev/null 2>&1 && break
  sleep 0.25
done

echo
echo "  ReboundOps is running — open http://127.0.0.1:$UI_PORT/#/start"
echo "  Local demo only; not publicly hosted; AI off. Use fictional data. Ctrl+C to stop."
echo
wait
