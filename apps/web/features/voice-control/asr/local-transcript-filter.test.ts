import assert from "node:assert/strict";

import { isLikelyLocalASRHallucination } from "./local-transcript-filter";

assert.equal(isLikelyLocalASRHallucination("Hãy subscribe cho kênh Ghiền Mì Gõ Để không bỏ lỡ những video hấp dẫn"), true);
assert.equal(isLikelyLocalASRHallucination("Cảm ơn các bạn đã theo dõi"), true);
assert.equal(isLikelyLocalASRHallucination("trải nghiệm ngay"), false);
assert.equal(isLikelyLocalASRHallucination("thêm khối bắt đầu"), false);

console.log("local-transcript-filter tests passed");
