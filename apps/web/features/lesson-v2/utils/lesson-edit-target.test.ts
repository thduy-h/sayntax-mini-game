import assert from "node:assert/strict";

import { resolveAuthoritativeEditTarget } from "./lesson-edit-target";

type Candidate = { id: string; compatible: boolean };
const compatible = (candidate: Candidate) => candidate.compatible;
const print = { id: "print", compatible: true };
const start = { id: "start", compatible: false };

assert.deepEqual(resolveAuthoritativeEditTarget({ selected: print, fallback: null, isCompatible: compatible }), {
  incompatibleSelection: null,
  target: print,
  usedFallback: false,
});
assert.deepEqual(resolveAuthoritativeEditTarget({ selected: start, fallback: print, isCompatible: compatible }), {
  incompatibleSelection: start,
  target: null,
  usedFallback: false,
});
assert.deepEqual(resolveAuthoritativeEditTarget({ selected: null, fallback: print, isCompatible: compatible }), {
  incompatibleSelection: null,
  target: print,
  usedFallback: true,
});
assert.deepEqual(resolveAuthoritativeEditTarget({ selected: null, fallback: start, isCompatible: compatible }), {
  incompatibleSelection: null,
  target: null,
  usedFallback: false,
});

console.log("lesson edit target tests passed");
