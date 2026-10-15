import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  acknowledgeVoiceProcessing,
  canStartVoiceRecognition,
  hasAcknowledgedVoiceProcessing,
  shouldPersistVoiceCommandLog,
  VOICE_PROCESSING_DISCLOSURE,
  VOICE_PROCESSING_NOTICE_KEY,
} from "./voice-privacy";
import { onboardingSchema, studentProfileFromOnboarding } from "../../onboarding/schemas";

const values = new Map<string, string>([["scc_voice_privacy_ack", "true"]]);
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};

assert.equal(hasAcknowledgedVoiceProcessing(storage), false, "The older notice cannot bypass the new provider disclosure");
acknowledgeVoiceProcessing(storage);
assert.equal(values.get(VOICE_PROCESSING_NOTICE_KEY), "true");
assert.equal(hasAcknowledgedVoiceProcessing(storage), true);

assert.equal(canStartVoiceRecognition(true, true, true), true, "Voice access is independent of transcript logging");
assert.equal(canStartVoiceRecognition(true, true, false), false);
assert.equal(canStartVoiceRecognition(true, false, true), false);
assert.equal(shouldPersistVoiceCommandLog("authenticated", false), false);
assert.equal(shouldPersistVoiceCommandLog("authenticated", true), true);
assert.equal(shouldPersistVoiceCommandLog("demo", true), false);
assert.match(VOICE_PROCESSING_DISCLOSURE, /nhà cung cấp nhận dạng/);
assert.doesNotMatch(VOICE_PROCESSING_DISCLOSURE, /Groq|FastAPI|Whisper|localhost/);
assert.match(VOICE_PROCESSING_DISCLOSURE, /trình duyệt/);
assert.match(VOICE_PROCESSING_DISCLOSURE, /không giữ lại âm thanh thô/);
assert.match(VOICE_PROCESSING_DISCLOSURE, /mặc định tắt/);

const lesson = readFileSync("features/lesson-v2/components/voice-lesson-client.tsx", "utf8");
const globalVoice = readFileSync("features/voice-control/components/global-voice-control.tsx", "utf8");
const admin = readFileSync("app/admin/page.tsx", "utf8");
const onboardingPage = readFileSync("app/onboarding/page.tsx", "utf8");
const onboardingAction = readFileSync("features/onboarding/server/actions.ts", "utf8");

assert.match(lesson, /\[voiceLoggingEnabled, setVoiceLoggingEnabled\] = useState\(false\)/);
assert.match(lesson, /if \(!shouldPersistVoiceCommandLog\(mode, voiceLoggingEnabled\)\) return/);
assert.match(lesson, /fetch\("\/api\/voice-command-logs"/);
assert.match(lesson, /disabled=\{!canStartVoiceRecognition\(speech\.isSupportKnown, speech\.isSupported, voicePrivacyAcknowledged\)\}/);
assert.match(lesson, /handleTranscriptCommand\(command, "text"\)/);
assert.match(lesson, /if \(lessonComplete\) return handleCompletionCommand\(rawTranscript\)/);
assert.match(lesson, /\{VOICE_PROCESSING_DISCLOSURE\}/);
assert.doesNotMatch(lesson, /scc_voice_logging_disabled/);
assert.match(globalVoice, /if \(!voicePrivacyAcknowledged\) return/);
assert.match(globalVoice, /\{VOICE_PROCESSING_DISCLOSURE\}/);
assert.doesNotMatch(admin, /\.select\("[^"]*(?:transcript|failure_reason|disability_support_notes)/);
assert.doesNotMatch(admin, /log\.transcript|snapshot\.voiceLogs/);
assert.doesNotMatch(onboardingPage, /name="disabilitySupportNotes"/);
assert.match(onboardingPage, /nhận bản sao hoặc yêu cầu xóa dữ liệu tài khoản/);
assert.doesNotMatch(onboardingAction, /getString\(formData, "disabilitySupportNotes"\)/);

const parsed = onboardingSchema.parse({
  disabilitySupportNotes: "Existing client payload",
  displayName: "Bạn học",
  fontScale: "default",
});
const profile = studentProfileFromOnboarding("student-id", parsed);
assert.equal(Object.hasOwn(profile, "disability_support_notes"), false, "A legacy field is accepted but never saved");
assert.equal(profile.age_range, null);
assert.equal(profile.goals, null);
assert.equal(profile.grade_level, null);
assert.equal(profile.school_name, null);
assert.equal(onboardingSchema.shape.gradeLevel.isOptional(), true);
assert.equal(onboardingSchema.shape.schoolName.isOptional(), true);
assert.equal(onboardingSchema.shape.goals.isOptional(), true);

console.log("voice privacy tests passed");
