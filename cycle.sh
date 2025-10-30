#!/usr/bin/env bash
# Simple autonomous Codex loop
# Requires: git, codex CLI

sessionNum=$(cat .session || echo 1)

while true; do
  branch="session-${sessionNum}-codex"
  echo "=== Starting ${branch} ==="

  # Create and switch to new branch
  git checkout -b "$branch" || git checkout "$branch"

  # Run Codex autonomous development
  codex --yolo --search exec "review AGENTS.md fetch handoff from game-mcp-server, and use result to plan and execute an autonomous development cycle"
  sleep 15

  # Commit and push results
  git add -A
  git commit -m "Autonomous dev cycle ${branch}"
  git push -u origin "$branch"

  # Increment session number
  ((sessionNum++))
  echo $sessionNum > .session

  # Delay before next cycle (adjust as needed)
  sleep 15
done

