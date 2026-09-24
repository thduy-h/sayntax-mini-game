import assert from "node:assert/strict";

import { normalizeVietnameseTranscript, stripVietnameseDiacritics } from "./transcript-normalizer";

assert.equal(stripVietnameseDiacritics("Đặt chữ Xin chào"), "Dat chu Xin chao");
assert.equal(normalizeVietnameseTranscript("  HÃY   thêm khối lặp!!! ").ascii, "them khoi lap");
assert.equal(normalizeVietnameseTranscript("giúp mình tạo vòng lặp nhé").ascii, "tao vong lap");
assert.equal(normalizeVietnameseTranscript("cho mình đặt chữ Xin chào nhé").ascii, "dat chu xin chao");
assert.deepEqual(normalizeVietnameseTranscript("thêm khối lặp").tokens, ["them", "khoi", "lap"]);
assert.equal(normalizeVietnameseTranscript("vui lòng, chạy chương trình.").ascii, "chay chuong trinh");

console.log("transcript-normalizer tests passed");
