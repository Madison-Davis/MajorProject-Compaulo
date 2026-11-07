#!/bin/bash
set -euo pipefail

CODEX="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$CODEX/scripts/build-codex.py" "$CODEX"
