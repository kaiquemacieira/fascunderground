#!/usr/bin/env bash
# Hook local: .git/hooks/pre-commit → scripts/pre-commit-a11y.sh
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
if [[ -f index.html && -f scripts/a11y-check.py ]]; then
  echo "→ a11y-check"
  python3 scripts/a11y-check.py index.html
fi
