#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Project: $PROJECT_DIR"
echo

echo "Git status:"
git -C "$PROJECT_DIR" status --short
echo

if [[ -d "$PROJECT_DIR/data" || -d "$PROJECT_DIR/.run" || -d "$PROJECT_DIR/.test-data" ]]; then
  echo "Warning: local runtime data exists. It should stay ignored and must not be pushed."
  echo
fi

echo "Ignored files overview:"
git -C "$PROJECT_DIR" status --ignored --short | sed -n '1,60p'
echo

echo "Running basic checks..."
./.venv/bin/ruff check backend
PYTHONPYCACHEPREFIX=.pycache PYTHONPATH=backend ./.venv/bin/pytest backend/tests -q
(cd "$PROJECT_DIR/frontend" && npm --cache .npm-cache run build >/dev/null)
(cd "$PROJECT_DIR/frontend" && npm --cache .npm-cache test -- --run >/dev/null)
echo "Checks passed."
echo

echo "Staged files:"
git -C "$PROJECT_DIR" diff --cached --name-only
echo

read "commit_now?Create commit from currently staged files? [y/N]: "
if [[ "${commit_now:l}" == "y" ]]; then
  read "message?Commit message: "
  if [[ -z "$message" ]]; then
    echo "Commit aborted: empty commit message."
    exit 1
  fi
  git -C "$PROJECT_DIR" commit -m "$message"
else
  echo "Commit skipped."
fi

echo
read "push_now?Push current branch to remote? [y/N]: "
if [[ "${push_now:l}" == "y" ]]; then
  branch="$(git -C "$PROJECT_DIR" branch --show-current)"
  git -C "$PROJECT_DIR" push -u origin "$branch"
else
  echo "Push skipped."
fi
