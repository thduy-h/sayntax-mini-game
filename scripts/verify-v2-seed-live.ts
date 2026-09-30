/** Read-only check against a staging Supabase project. Never writes learner data. */
import assert from "node:assert/strict";
import { lessonsV2 } from "../packages/lesson-engine/src/seed-v2";

async function verifyStagingRows() {
  const url = process.env.STAGING_SUPABASE_URL;
  const key = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || new URL(url).protocol !== "https:") {
    throw new Error("Set STAGING_SUPABASE_URL (HTTPS) and STAGING_SUPABASE_SERVICE_ROLE_KEY for read-only verification");
  }

  const expectedLessons = lessonsV2.map((lesson) => ({ id: lesson.databaseLessonId, slug: lesson.slug }));
  const expectedSteps = lessonsV2.flatMap((lesson) => lesson.steps.map((step) => ({
    id: step.databaseStepId,
    lesson_id: lesson.databaseLessonId,
  })));

  async function readRows<T>(table: string, columns: string, ids: string[]): Promise<T[]> {
    const endpoint = new URL(`/rest/v1/${table}`, url);
    endpoint.searchParams.set("select", columns);
    endpoint.searchParams.set("id", `in.(${ids.join(",")})`);
    const response = await fetch(endpoint, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
      method: "GET",
    });
    if (!response.ok) throw new Error(`Staging ${table} read failed: HTTP ${response.status}`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error(`Staging ${table} returned invalid data`);
    return rows as T[];
  }

  const [lessonRows, stepRows] = await Promise.all([
    readRows<{ id: string; slug: string }>("lessons", "id,slug", expectedLessons.map((lesson) => lesson.id)),
    readRows<{ id: string; lesson_id: string }>("lesson_steps", "id,lesson_id", expectedSteps.map((step) => step.id)),
  ]);

  const byId = <T extends { id: string }>(rows: T[]) => rows.sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(byId(lessonRows), byId(expectedLessons), "staging V2 lesson rows differ from code");
  assert.deepEqual(byId(stepRows), byId(expectedSteps), "staging V2 step parents differ from code");
  console.log(`PASS staging V2 reference rows: ${expectedLessons.length} lessons, ${expectedSteps.length} steps`);
}

void verifyStagingRows().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
