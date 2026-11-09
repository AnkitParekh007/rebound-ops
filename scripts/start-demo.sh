#!/usr/bin/env bash
# Compatibility entry point. The supported command is npm start.
set -euo pipefail
exec node "$(dirname "${BASH_SOURCE[0]}")/start.mjs" "$@"
