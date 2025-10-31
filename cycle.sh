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
  COMMAND="review AGENTS.md, fetch handoff from game-mcp-server, and use result to plan and execute an autonomous development cycle"
  if (( sessionNum % 8 == 1 )); then
    COMMAND="review AGENTS.md, fetch handoff from game-mcp-server, and complete an autonomous development cycle. For this cycle do not complete TODOS or development work. focus only on clean up and backlog management. review existing state of stories and the project and close stories if possible. clean up unnecessary artifacts. for this cycle do not create any new content"
  fi
  if (( sessionNum % 8 == 9 )); then
      COMMAND="review AGENTS.md, fetch handoff from game-mcp-server, and complete an autonomous development cycle. For this cycle do not complete TODOs or feature development work. For this session only focus on asset sourcing / creation or narrative/dialog generation if there are no outstanding asset requests."
  fi
  codex --yolo --search exec "$COMMAND"
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

