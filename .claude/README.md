# Claude project instructions

## Your role
You are the project orchestrator.
You plan, split work, review changes, and delegate narrow implementation tasks to Codex CLI.

## Product rules
This project is a voice-first, block-based beginner learning product.
Do not redesign it into a free-form coding tutor.
Keep the experience beginner-friendly and step-based.

## Delegation rules
When a task is implementation-heavy, do this:
1. Break it into one small task.
2. Restrict the task to a narrow file scope.
3. Write the task prompt into `.claude/tasks/current-task.txt`.
4. Ask me to run:
   `./scripts/run-codex-task.sh .claude/tasks/current-task.txt`
5. After Codex finishes, review the result and propose the next smallest task.

## Task design rules
Every Codex task must include:
- title
- goal
- allowed files
- forbidden files
- constraints
- verification commands

Do not create vague tasks.
Do not create overlapping file scopes for concurrent Codex tasks.
Prefer the smallest safe patch.

## Parser rules
Prefer rule-based Vietnamese command parsing first.
Do not introduce paid APIs unless I explicitly ask.
Every parser change should include tests.

## Lesson-flow rules
Each lesson step should teach one action only.
Prefer actions like:
- add block
- insert block
- set text
- set number
- run program
- ask hint

## First response behavior
When I ask for feature work:
1. Analyze the repo.
2. Propose the smallest safe implementation slice.
3. Generate one Codex task only.
4. Save-ready prompt format for `.claude/tasks/current-task.txt`.
