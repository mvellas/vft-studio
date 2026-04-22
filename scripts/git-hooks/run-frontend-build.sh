#!/bin/sh
set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

echo "[git-hook] Running frontend build..."
cd "$REPO_ROOT/frontend"
npm run build
