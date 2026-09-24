import assert from "node:assert/strict";

import type { WorkspaceBlock } from "@shecancode/shared-types";

import { getSeedV2LessonById, getSeedV2LessonBySlug, lessonsV2, listSeedV2Lessons } from "./seed-v2";

const validActionKinds = new Set(["add_block", "insert_into", "set_text", "set_number", "set_variable_output", "run_program", "ask_hint"]);

function hasBlockId(blocks: WorkspaceBlock[], blockId: string): boolean {
  return blocks.some((block) => block.id === blockId || hasBlockId(block.children ?? [], blockId));
}

const previews = listSeedV2Lessons();
assert.equal(previews.length, 5);
assert.deepEqual(
  previews.map((preview) => preview.orderIndex),
  [1, 2, 3, 4, 5],
);
assert.equal(new Set(previews.map((preview) => preview.slug)).size, 5);
assert.ok(previews.every((preview) => preview.slug.endsWith("-v2")));

for (const lesson of lessonsV2) {
  assert.deepEqual(getSeedV2LessonBySlug(lesson.slug), lesson);
  assert.deepEqual(getSeedV2LessonById(lesson.id), lesson);
  assert.equal(lesson.stepCount, lesson.steps.length);

  for (const step of lesson.steps) {
    assert.ok(step.instructions.length > 0);
    assert.ok(step.instructions.toLowerCase().includes("hãy nói"));
    assert.ok(validActionKinds.has(step.action.kind));

    if (step.action.kind === "set_text" || step.action.kind === "set_number" || step.action.kind === "set_variable_output") {
      assert.ok(hasBlockId(step.starterWorkspace.blocks, step.action.blockId));
    }
  }
}

const lesson1 = getSeedV2LessonById("v2-lesson-1");
assert.ok(lesson1 !== null);
assert.equal(lesson1.steps[0]?.action.kind, "add_block");
assert.equal(lesson1.steps[0]?.starterWorkspace.blocks.length, 0);

const lesson4 = getSeedV2LessonBySlug("if-basics-v2");
assert.ok(lesson4 !== null);
assert.equal(lesson4.steps[4]?.action.kind, "ask_hint");

assert.equal(getSeedV2LessonBySlug("nonexistent"), null);
assert.equal(getSeedV2LessonById("nonexistent"), null);

console.log("seed-v2 tests passed");
