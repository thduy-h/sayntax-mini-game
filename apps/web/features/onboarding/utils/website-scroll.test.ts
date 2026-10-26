import assert from "node:assert/strict";
import { calculateWebsiteScrollTarget } from "./website-scroll";

assert.equal(calculateWebsiteScrollTarget("down", 0, 0, 800), null);
assert.equal(calculateWebsiteScrollTarget("down", 0, 1200, 800), 600);
assert.equal(calculateWebsiteScrollTarget("down", 1000, 1200, 800), 1200);
assert.equal(calculateWebsiteScrollTarget("down", 1200, 1200, 800), null);
assert.equal(calculateWebsiteScrollTarget("up", 0, 1200, 800), null);
assert.equal(calculateWebsiteScrollTarget("top", 400, 1200, 800), 0);
assert.equal(calculateWebsiteScrollTarget("bottom", 400, 1200, 800), 1200);

console.log("website-scroll tests passed");
