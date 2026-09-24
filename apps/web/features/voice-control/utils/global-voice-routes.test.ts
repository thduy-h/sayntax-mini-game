import assert from "node:assert/strict";

import { isWorkspaceVoiceRoute } from "./global-voice-routes";

assert.equal(isWorkspaceVoiceRoute("/demo/start-and-sequence-v2"), true);
assert.equal(isWorkspaceVoiceRoute("/demo/start-and-sequence-v2/"), true);
assert.equal(isWorkspaceVoiceRoute("/lessons-v2/start-and-sequence-v2"), true);
assert.equal(isWorkspaceVoiceRoute("/lessons-v2/start-and-sequence-v2/"), true);
assert.equal(isWorkspaceVoiceRoute("/demo"), false);
assert.equal(isWorkspaceVoiceRoute("/demo/"), false);
assert.equal(isWorkspaceVoiceRoute("/lessons-v2"), false);
assert.equal(isWorkspaceVoiceRoute("/"), false);
assert.equal(isWorkspaceVoiceRoute("/sign-in"), false);
assert.equal(isWorkspaceVoiceRoute("/demo/start-and-sequence-v2/extra"), false);

console.log("global-voice-routes tests passed");
