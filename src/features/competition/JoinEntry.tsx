import { lazy, Suspense, useEffect, useState } from "react";
import { ArenaApiError, invokeArena, standaloneMode } from "../../lib/workshop";
import { isValidRoomCode, parseJoinRoute } from "../../lib/joinRouting";
import { isCompetitionId } from "./contracts";
import CompetitionPortal from "./CompetitionPortal";
const LegacyApp = lazy(() => import("../../LegacyApp"));

// Resolve a public room code without registering a team or receiving privileges.
export default function JoinEntry() {
  const code = parseJoinRoute(window.location.pathname)?.code ?? "";
  const [result, setResult] = useState<{
    mode: string;
    competitionId?: string;
  } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isValidRoomCode(code) || standaloneMode) return;
    let disposed = false;
    setError(false);
    void invokeArena<{ mode: string; competitionId?: string }>(
      "arena-join-room",
      { action: "resolve", code },
    )
      .then((value) => {
        if (
          value.mode === "competition" &&
          !isCompetitionId(value.competitionId)
        )
          throw new Error("invalid_contract");
        if (!disposed) setResult(value);
      })
      .catch((e) => {
        if (disposed) return;
        if (e instanceof ArenaApiError && e.code === "not_found")
          setResult({ mode: "workshop" });
        else setError(true);
      });
    return () => {
      disposed = true;
    };
  }, [code, retry]);
  if (result?.mode === "competition")
    return <CompetitionPortal resolvedCompetitionId={result.competitionId} />;
  if (standaloneMode || !isValidRoomCode(code) || result?.mode === "workshop")
    return (
      <Suspense fallback={<p role="status">Đang tải phòng…</p>}>
        <LegacyApp />
      </Suspense>
    );
  return (
    <main className="competition-shell">
      <h1>Tham gia SAYNTAX Arena</h1>
      {error ? (
        <>
          <p role="alert">
            Chưa thể kiểm tra mã tham gia. Kiểm tra kết nối rồi thử lại; đội
            chưa được đăng ký.
          </p>
          <button
            className="button button-primary"
            onClick={() => setRetry(retry + 1)}
          >
            Thử kết nối lại
          </button>
        </>
      ) : (
        <p role="status">Đang kiểm tra mã tham gia…</p>
      )}
    </main>
  );
}
