import assert from "node:assert/strict";
import { hasAdminRole } from "./roles";

assert.equal(hasAdminRole(null), false);
assert.equal(hasAdminRole({ role: "student" }), false);
assert.equal(hasAdminRole({ role: "admin" }), true);

console.log("auth role tests passed");
