import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");

// 1. Independent State Verification
assert.ok(source.includes("const [isPrimerOpen, setIsPrimerOpen] = useState(false);"));
assert.ok(source.includes("const [hasStartedLesson, setHasStartedLesson] = useState(false);"));
assert.ok(source.includes("scc_lesson_started:${lesson.slug}"));
assert.ok(!source.includes("scc_primer_seen:"));

// 2. Body Scroll Locking
assert.ok(source.includes('document.body.style.overflow = "hidden"'));

// 3. Context-Aware Voice Scrolling
assert.ok(source.includes("function scrollPrimer(direction: \"down\" | \"up\" | \"top\" | \"bottom\""));
assert.ok(source.includes("Nội dung ngắn, không cần cuộn."));
assert.ok(source.includes("Đã ở cuối nội dung kiến thức nhanh."));
assert.ok(source.includes("Đã cuộn kiến thức nhanh xuống."));
assert.ok(source.includes("Đã ở đầu nội dung kiến thức nhanh."));
assert.ok(source.includes("Đã cuộn kiến thức nhanh lên."));
assert.ok(source.includes("Đã về đầu nội dung kiến thức nhanh."));
assert.ok(source.includes("Đã xuống cuối nội dung kiến thức nhanh."));

// 4. Voice Commands When Primer Is Open
assert.ok(source.includes("if (isPrimerOpen) {"));
assert.ok(source.includes("startLessonFromPrimer()"));
assert.ok(source.includes("closePrimer()"));
assert.ok(source.includes("Kiến thức nhanh đang mở. Nói 'cuộn xuống' để đọc tiếp, hoặc 'bắt đầu bài học' để thực hành."));
assert.ok(source.includes("Trợ giúp kiến thức"));

// 5. Reopening Knowledge Primer
assert.ok(source.includes("Đã mở kiến thức nhanh của bài học."));
assert.ok(source.includes("Xem kiến thức"));

// 6. UI & Accessibility Contracts
assert.ok(source.includes('role="tabpanel"'));
assert.ok(source.includes('data-knowledge-workspace'));
assert.ok(source.includes('aria-labelledby="tab-knowledge"'));
assert.ok(source.includes('aria-describedby="lesson-primer-desc"'));
assert.ok(source.includes('aria-label="Đóng kiến thức nhanh"'));
assert.ok(source.includes('h-11 w-11')); // 44x44px target
assert.ok(source.includes('{hasStartedLesson ? "Ôn lại kiến thức" : "Trước khi bắt đầu"}'));
assert.ok(!source.includes('Tiếp tục học →'));
assert.ok(source.includes('data-knowledge-scroll-hint'));
assert.ok(source.includes('aria-hidden={!primerCanScrollDown || !primerHintFits}'));
assert.ok(source.includes('💡 Kiến thức nhanh'));
assert.ok(source.includes('💡 Ôn lại kiến thức'));

// 7. Modal not blocked in Global Command Bar
assert.ok(source.includes("modalOpen: false"));

console.log("knowledge-primer-voice-scroll tests passed");
