import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getSeedV2LessonBySlug,
  isSeedV2DatabaseLessonStep,
  listSeedV2Lessons,
} from "../packages/lesson-engine/src/seed-v2";

const sql = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const referenceMarker = "-- Hidden relational references for the five code-seeded V2 lessons.";
const referenceStart = sql.indexOf(referenceMarker);
assert.ok(referenceStart >= 0, "V2 reference seed section is missing");
const referenceSql = sql.slice(referenceStart);

function insertValues(table: "lessons" | "lesson_steps") {
  const match = referenceSql.match(
    new RegExp(`insert into public\\.${table} \\([\\s\\S]*?\\) values\\s*([\\s\\S]*?)\\s*on conflict \\(id\\)`, "i"),
  );
  assert.ok(match, `V2 ${table} INSERT is missing`);
  return match[1];
}

function unique(values: string[], label: string) {
  assert.equal(new Set(values).size, values.length, `duplicate ${label}`);
}

function allInsertedIds(table: "lessons" | "lesson_steps") {
  const statements = [...sql.matchAll(
    new RegExp(`insert into public\\.${table} \\([\\s\\S]*?\\) values\\s*([\\s\\S]*?)\\s*on conflict \\(id\\)`, "gi"),
  )];
  return statements.flatMap((statement) => [...statement[1].matchAll(/^\s*\(\s*'([^']+)'/gm)]
    .map((match) => match[1]));
}

const lessonRows = [...insertValues("lessons").matchAll(/^\s*\('([^']+)',\s*'[^']+',\s*'([^']+)'/gm)]
  .map((match) => ({ id: match[1], slug: match[2] }));
const stepRows = [...insertValues("lesson_steps").matchAll(/^\s*\('([^']+)',\s*'([^']+)'/gm)]
  .map((match) => ({ id: match[1], lessonId: match[2] }));
assert.equal(lessonRows.length, [...insertValues("lessons").matchAll(/^\s*\(/gm)].length,
  "unparsed V2 lesson seed row");
assert.equal(stepRows.length, [...insertValues("lesson_steps").matchAll(/^\s*\(/gm)].length,
  "unparsed V2 step seed row");

const lessons = listSeedV2Lessons().map((preview) => {
  const lesson = getSeedV2LessonBySlug(preview.slug);
  assert.ok(lesson, `missing active lesson ${preview.slug}`);
  assert.equal(lesson.stepCount, lesson.steps.length, `wrong step count for ${lesson.slug}`);
  return lesson;
});

unique(lessons.map((lesson) => lesson.databaseLessonId), "active lesson UUID");
unique(lessons.map((lesson) => lesson.slug), "active lesson slug");
unique(lessons.flatMap((lesson) => lesson.steps.map((step) => step.databaseStepId)), "active step UUID");
unique(lessonRows.map((row) => row.id), "seed lesson UUID");
unique(lessonRows.map((row) => row.slug), "seed lesson slug");
unique(stepRows.map((row) => row.id), "seed step UUID");

const expectedLessons = lessons.map((lesson) => ({ id: lesson.databaseLessonId, slug: lesson.slug }));
const expectedSteps = lessons.flatMap((lesson) => lesson.steps.map((step) => ({
  id: step.databaseStepId,
  lessonId: lesson.databaseLessonId,
})));
const byId = <T extends { id: string }>(rows: T[]) => rows.sort((a, b) => a.id.localeCompare(b.id));
assert.deepEqual(byId(lessonRows), byId(expectedLessons), "V2 lesson seed rows differ from active lessons");
assert.deepEqual(byId(stepRows), byId(expectedSteps), "V2 step seed rows differ from active lesson/step parents");
for (const [table, expectedIds] of [
  ["lessons", expectedLessons.map((lesson) => lesson.id)],
  ["lesson_steps", expectedSteps.map((step) => step.id)],
] as const) {
  const insertedIds = allInsertedIds(table);
  for (const id of expectedIds) {
    assert.equal(insertedIds.filter((candidate) => candidate === id).length, 1,
      `${table} UUID ${id} must be inserted exactly once in seed.sql`);
  }
  assert.deepEqual(insertedIds.filter((id) => id.startsWith("40000000-")).sort(), [...expectedIds].sort(),
    `${table} contains an unexpected V2 reference ID`);
}

for (const lesson of lessons) {
  assert.equal(isSeedV2DatabaseLessonStep(lesson.databaseLessonId, "00000000-0000-0000-0000-000000000000"), false,
    `API pair validator accepts an unknown step for ${lesson.slug}`);
  for (const step of lesson.steps) {
    assert.ok(isSeedV2DatabaseLessonStep(lesson.databaseLessonId, step.databaseStepId),
      `API pair validator rejects ${lesson.slug}/${step.id}`);
    for (const otherLesson of lessons) {
      if (otherLesson.databaseLessonId === lesson.databaseLessonId) continue;
      assert.equal(isSeedV2DatabaseLessonStep(otherLesson.databaseLessonId, step.databaseStepId), false,
        `API pair validator accepts wrong parent for ${step.id}`);
    }
  }
}
assert.equal(isSeedV2DatabaseLessonStep("00000000-0000-0000-0000-000000000000", expectedSteps[0].id), false,
  "API pair validator accepts an unknown lesson");

for (const route of ["programs", "program-runs", "voice-command-logs"]) {
  const source = readFileSync(new URL(`../apps/web/app/api/${route}/route.ts`, import.meta.url), "utf8");
  const check = source.search(/if \(!isSeedV2DatabaseLessonStep\(parsed\.data\.lessonId, parsed\.data\.lessonStepId\)\) \{\s*return NextResponse\.json\([\s\S]*?\{ status: 400 \}\);\s*\}/);
  const write = source.indexOf('.from("', check);
  assert.ok(check >= 0 && write > check,
    `${route} route must validate the lesson/step pair before writing`);
}

console.log(`V2 lesson/database seed mappings passed: ${lessonRows.length} lessons, ${stepRows.length} steps`);
if (process.env.SHOW_V2_ID_MAP === "1") {
  for (const lesson of lessons) {
    console.log(`${lesson.slug} -> ${lesson.databaseLessonId}`);
    for (const step of lesson.steps) console.log(`  ${step.id} -> ${step.databaseStepId}`);
  }
}
