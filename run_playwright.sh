#!/usr/bin/env bash
set -euo pipefail
export PWDEBUG=0
# Helpful on WSL/CI:
export CI=1

# Reduce parallel load to avoid OOM/FD spikes while debugging:
DEFAULT_ARGS=(--workers=1 --retries=0 --reporter=line --timeout=60000)

CMD="${1:-test}"
if [[ $# -gt 0 ]]; then
  shift
fi

if [[ "${CMD}" == "test" ]]; then
  npx playwright test "${DEFAULT_ARGS[@]}" "$@"
else
  npx playwright "${CMD}" "$@"
fi
