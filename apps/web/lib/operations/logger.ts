export type OperationEvent =
  | "progress_write_failure"
  | "program_save_failure"
  | "program_run_failure"
  | "voice_log_failure"
  | "auth_failure"
  | "onboarding_failure";

type Metadata = { status?: number; phase?: "validation" | "persistence" | "session" | "unexpected" };

// Allowlist only: never serialize errors, request bodies, profiles or credentials.
export function operationRecord(event: OperationEvent, metadata: Metadata = {}) {
  return {
    timestamp: new Date().toISOString(),
    level: "error",
    event,
    ...(Number.isInteger(metadata.status) ? { status: metadata.status } : {}),
    ...(["validation", "persistence", "session", "unexpected"].includes(metadata.phase ?? "")
      ? { phase: metadata.phase } : {}),
  };
}

export function logOperation(event: OperationEvent, metadata: Metadata = {}) {
  if (typeof window !== "undefined") return;
  console.error(JSON.stringify(operationRecord(event, metadata)));
}

// Keep the sink above replaceable without changing route handlers.
export function observeRoute(event: OperationEvent, handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      const response = await handler(request);
      if (response.status >= 500 || response.status === 400) {
        logOperation(event, { status: response.status, phase: response.status === 400 ? "validation" : "persistence" });
      } else if (response.status === 401) {
        logOperation("auth_failure", { status: 401, phase: "session" });
      }
      return response;
    } catch {
      logOperation(event, { status: 500, phase: "unexpected" });
      return Response.json({ error: "Không thể xử lý yêu cầu lúc này." }, { status: 500 });
    }
  };
}
