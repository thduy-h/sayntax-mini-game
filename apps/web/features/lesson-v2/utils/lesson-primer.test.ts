import assert from "node:assert/strict";
import { executeProgram } from "@shecancode/block-engine";
import { getSeedV2LessonBySlug, listSeedV2Lessons } from "@shecancode/lesson-engine";
import { LESSON_PRIMERS } from "./lesson-primer";

// The lesson's actual runnable starter is the reference for the teaching
// example; the illustration must not promise a different output or extra step.
const lesson = getSeedV2LessonBySlug("start-and-sequence-v2")!;
const primer = LESSON_PRIMERS[lesson.slug];
const sections = primer.sections!;
const example = sections.find((section) => section.id === "complete-example")!.program!;
const finalStep = lesson.steps.at(-1)!;
const result = executeProgram(finalStep.starterWorkspace);
assert.equal(result.success, true);
assert.deepEqual(example.output, result.output);
assert.deepEqual(example.output, finalStep.action.kind === "run_program" ? finalStep.action.expectedOutput : undefined);
assert.deepEqual(example.blocks, ["Bắt đầu", 'In "Xin chào"']);
assert.equal(sections.find((section) => section.id === "apply")!.steps!.length, lesson.steps.length);

// These are separate teaching topics, not interchangeable summary labels.
for (const topic of ["program", "blocks", "start-and-print", "sequence", "complete-example", "create-and-run", "apply"]) {
  const section = sections.find((entry) => entry.id === topic);
  assert.ok(section, `Missing teaching topic: ${topic}`);
  assert.ok(section.explanation.length > 0 && section.example && section.practice, `${topic} needs explanation, example and practical connection`);
}
assert.equal(new Set(sections.map((section) => section.id)).size, sections.length, "Heading IDs must be unique");

// Keep all five primers available; the other lessons retain their existing
// summary schema rather than acquiring an unrelated curriculum rewrite.
for (const entry of listSeedV2Lessons()) {
  const content = LESSON_PRIMERS[entry.slug];
  assert.ok(content?.concept && content.purpose && content.example && content.goal);
  if (entry.slug !== lesson.slug) assert.equal(content.sections, undefined);
}
// Concrete output traces removed by the polish remain explicit to the learner.
assert.ok(LESSON_PRIMERS["print-output-v2"].example.includes("kết quả: Xin chào / Bạn làm được!"));
assert.ok(LESSON_PRIMERS["repeat-loops-v2"].example.includes("Cố lên! / Cố lên! / Cố lên!"));
assert.ok(LESSON_PRIMERS["if-basics-v2"].purpose.includes("điều kiện sai"));
assert.ok(LESSON_PRIMERS["variables-basics-v2"].concept.includes("thay đổi"));
console.log("knowledge primer teaching/example tests passed");
