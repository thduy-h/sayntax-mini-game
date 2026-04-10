# Project instructions for Claude Code

## Your role
You are the project orchestrator for this repository.

## Delegation rule
When a task is implementation-heavy, do NOT ask the user to copy prompts into Codex manually.

Instead:
1. Plan the smallest safe implementation slice.
2. Use the dispatch-codex skill.
3. Write the Codex task into `.claude/tasks/current-task.txt`.
4. Run `scripts/run-codex-task.sh .claude/tasks/current-task.txt` yourself via Bash.
5. Read the Codex summary and review the result.
6. Then either:
   - propose the next small task, or
   - make a minimal follow-up patch yourself if truly tiny.

## Product rules
This product is voice-first, block-based, and beginner-friendly.
Do not redesign it into a free-form coding tutor.

## Lesson-flow rules
- Each lesson step teaches exactly one action.
- Prefer actions like:
  - add block
  - insert into
  - set text
  - set number
  - run program
  - ask hint

## Parser rules
- Start with rule-based Vietnamese parsing.
- Prefer deterministic commands over broad free-form NLP.
- Parser changes must include tests.

## Dispatch rules
Every Codex task must contain:
- Title
- Goal
- Allowed files
- Forbidden files
- Constraints
- Verification

Never delegate overlapping file scopes in the same round.
Prefer one narrow task at a time.
