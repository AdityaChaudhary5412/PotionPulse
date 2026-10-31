#!/usr/bin/env bash
# PotionPulse Automatic Git Commit & Push Script

COMMIT_MSG="${1:-chore: automatic commit $(date '+%Y-%m-%d %H:%M:%S')}"

echo "🔄 Checking for changes..."
git add -A

if git diff --cached --quiet; then
  echo "✨ Working tree clean, no changes to commit."
else
  echo "📦 Committing changes with message: '$COMMIT_MSG'"
  git commit -m "$COMMIT_MSG"
  echo "🚀 Pushing to origin main..."
  git push origin main
  echo "✅ Successfully pushed to GitHub!"
fi
