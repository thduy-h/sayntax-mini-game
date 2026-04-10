---
name: dispatch-codex
description: Use this when implementation work should be delegated to Codex CLI automatically. Create one narrow task, save it to .claude/tasks/current-task.txt, run the Codex shell script, then review the result.
allowed-tools: Bash(scripts/run-codex-task.sh:*),Bash(mkdir:*),Bash(cat:*),Bash(git status:*),Bash(git diff:*),Read,Write,Edit,Glob,Grep
---

When using this skill, follow this exact sequence:

1. Break the requested implementation into ONE small task only.
2. Write the exact Codex prompt to `.claude/tasks/current-task.txt`.
3. The prompt must include:
   - Title
   - Goal
   - Allowed files
   - Forbidden files
   - Constraints
   - Verification
4. Run:
   `scripts/run-codex-task.sh .claude/tasks/current-task.txt`
5. Read the newest summary file from `.claude/codex-runs/`.
6. Review whether the patch matches the product goal.
7. If successful, propose the next smallest task.
8. Do not ask the user to copy anything manually.
9. Do not create vague or broad Codex tasks.
