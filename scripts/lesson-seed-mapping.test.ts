import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listSeedV2Lessons, getSeedV2LessonBySlug } from "../packages/lesson-engine/src/seed-v2";

const sql = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const lessons = listSeedV2Lessons();

assert.equal(lessons.length, 5);
for (const preview of lessons) {
  const lesson = getSeedV2LessonBySlug(preview.slug);
  assert.ok(lesson, `missing lesson ${preview.slug}`);
  assert.ok(sql.includes(`'${lesson.databaseLessonId}'`), `seed is missing lesson UUID ${lesson.databaseLessonId}`);
  assert.ok(sql.includes(`'${lesson.slug}'`), `seed is missing lesson slug ${lesson.slug}`);
  for (const step of lesson.steps) {
    assert.ok(sql.includes(`'${step.databaseStepId}'`), `seed is missing step UUID ${step.databaseStepId}`);
  }
}

console.log("V2 lesson/database seed mappings passed");
