import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArenaApiError, invokeArena, standaloneMode } from "../../lib/workshop";
import {
  isValidRoomCode,
  parseJoinRoute,
  workshopErrorMessage,
} from "../../lib/joinRouting";
import {
  capability,
  clearCompetitionIdentity,
  controlCompetition,
  createCompetition,
  downloadCard,
  getCompetitionState,
  headers,
  isLocalDevUrl,
  isValidJoinUrl,
  joinLink,
  loadCompetitionIdentity,
  presentationLink,
  saveCompetitionIdentity,
} from "./api";
import type {
  Command,
  CompetitionState,
  Identity,
  MapDefinition,
  Question,
  Stage,
} from "./types";
import { isCompetitionId } from "./contracts";
import { Demo } from "./Demo";
import { MapPrompt, Prompt, QuestionPlayer, RobotPlayer } from "./Content";
import { useA11ySync } from "../../lib/a11ySync";

const questionIds = [
  "contrast",
  "keyboard",
  "captions",
  "language",
  "touch",
  "color",
  "time",
  "motion",
  "alt",
  "plain",
  "audio",
  "navigation",
];
const labels = [
  "Tương phản",
  "Focus bàn phím",
  "Phụ đề",
  "Lỗi biểu mẫu",
  "Vùng chạm",
  "Màu sắc",
  "Thời gian",
  "Chuyển động",
  "Alt ảnh",
  "Ngôn ngữ",
  "Âm thanh",
  "Điều hướng",
];
const errors: Record<string, string> = {
  inactive_challenge:
    "Thử thách này đã đóng hoặc chưa được MC mở. Đang chờ thử thách hiện tại.",
  teams_pending:
    "Vẫn còn đội chưa nộp. Chờ đủ đội hoặc hết giờ thử thách trước khi đóng/chuyển.",
  challenges_pending:
    "Cần đi hết các thử thách và đóng thử thách cuối trước khi chốt phiên.",
  mc_progression_required: "Chỉ MC có thể chuyển thử thách theo thứ tự.",
  competition_backend_outdated:
    "Backend đang chạy phiên bản cũ, chưa hỗ trợ Competition V2. Cần triển khai lại bảy Edge Functions từ source V2 mới nhất trước khi tạo cuộc thi.",
  stage_closed: "Phiên đã hết giờ hoặc đã chốt. Không ghi nhận thêm kết quả.",
  forbidden:
    "Credential/token không hợp lệ, hết hạn hoặc đã bị thu hồi. Hãy khôi phục phiên hoặc liên hệ MC.",
  stage_locked: "Phiên 2 chưa mở. Chờ MC chốt Accessibility trước.",
  invalid_transition:
    "Không thể thực hiện ở trạng thái hiện tại. Hãy tải lại trạng thái.",
  tie_unresolved:
    "Chưa xác định một đội duy nhất. Hãy hoàn thành sudden death trước khi công bố.",
  tie_answers_pending: "Chờ tất cả đội hòa nộp hoặc hết thời hạn sudden death.",
  no_teams: "Cần ít nhất một đội đăng ký trước khi bắt đầu.",
  competition_failed:
    "Backend Competition V2 chưa sẵn sàng hoặc yêu cầu thất bại. Kiểm tra migration và phiên bản Edge Functions.",
  configuration_frozen: "Cấu hình phiên đã được đóng băng.",
  competition_finalized: "Cuộc thi đã công bố kết quả và không thể sửa điểm.",
};
function message(error: unknown) {
  const code = error instanceof ArenaApiError ? error.code : "request_failed";
  return errors[code] ?? workshopErrorMessage(code);
}

function Deadline({
  deadline,
  serverNow,
  label = "Còn lại phiên",
}: {
  deadline: string | null;
  serverNow: string;
  label?: string;
}) {
  const [now, setNow] = useState(0);
  const anchor = useRef({
    server: Date.parse(serverNow),
    mono: performance.now(),
  });
  useEffect(() => {
    anchor.current = { server: Date.parse(serverNow), mono: performance.now() };
    setNow(0);
  }, [serverNow]);
  useEffect(() => {
    const t = window.setInterval(
      () => setNow(performance.now() - anchor.current.mono),
      1000,
    );
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(deadline) - anchor.current.server - now) / 1000),
  );
  return (
    <span className="competition-deadline" role="timer" aria-label={label}>
      {label}:{" "}
      {seconds
        ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
        : "Đã hết giờ · Chờ MC chốt"}
    </span>
  );
}
export function Leaderboard({ state }: { state: CompetitionState }) {
  const final = state.competition.status === "FINALIZED";
  const winner = state.leaderboard?.find(
    (t) => t.teamId === state.competition.winnerTeamId,
  );
  return (
    <section className="panel competition-section">
      <h2>
        {final
          ? "Bảng xếp hạng CHÍNH THỨC"
          : "Bảng xếp hạng TẠM THỜI · PROVISIONAL"}
      </h2>
      <p>
        Chỉ tổng hợp phiên đã chốt. Mỗi game đóng góp tối đa 50 điểm; không tính
        tốc độ.
      </p>
      {winner && <h2 aria-live="polite">🏆 ĐỘI CHIẾN THẮNG: {winner.name}</h2>}
      {/* Mobile card layout — no horizontal scroll */}
      <ul className="leaderboard-cards">
        {state.leaderboard?.map((t) => (
          <li
            key={t.teamId}
            className={`leaderboard-card${state.competition.winnerTeamId === t.teamId ? " leaderboard-card--winner" : ""}`}
          >
            <div className="leaderboard-card-rank">
              {final && state.competition.winnerTeamId === t.teamId
                ? "🏆"
                : `#${t.rank}`}
            </div>
            <div className="leaderboard-card-body">
              <div className="leaderboard-card-name">
                {t.name}
                {state.competition.winnerTeamId === t.teamId ? " 🏆" : ""}
              </div>
              <div className="leaderboard-card-scores">
                <span title="Accessibility /50">
                  A: {Number(t.accessibility50).toFixed(1)}/50
                </span>
                <span title="Robot /50">
                  R: {Number(t.robot50).toFixed(1)}/50
                </span>
                <strong title="Tổng /100">
                  {Number(t.final100).toFixed(1)}/100
                </strong>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {/* Desktop table — hidden on small screens via CSS */}
      <div
        className="round-results-scroll leaderboard-table-wrap"
        role="region"
        aria-label="Bảng điểm đầy đủ"
        tabIndex={0}
      >
        <table className="round-results-table">
          <thead>
            <tr>
              <th>Đội</th>
              <th>Accessibility /50</th>
              <th>Robot /50</th>
              <th>Tổng /100</th>
              <th>Hạng</th>
            </tr>
          </thead>
          <tbody>
            {state.leaderboard?.map((t) => (
              <tr key={t.teamId}>
                <th scope="row">
                  {t.name}
                  {state.competition.winnerTeamId === t.teamId ? " 🏆" : ""}
                </th>
                <td>{Number(t.accessibility50).toFixed(2)}</td>
                <td>{Number(t.robot50).toFixed(2)}</td>
                <td>{Number(t.final100).toFixed(2)}</td>
                <td>
                  {final && state.competition.winnerTeamId === t.teamId
                    ? "1 · THẮNG CUỘC"
                    : t.rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Review({ stage }: { stage: Stage }) {
  if (stage.status !== "finalized") return null;
  return (
    <section className="competition-section panel">
      <h2>
        Tổng kết{" "}
        {stage.stageNo === 1 ? "Accessibility Unlock" : "Robot Commands"}
      </h2>
      {stage.review?.map((r, idx) => {
        const questionTitle =
          stage.stageNo === 1
            ? stage.config?.questions?.find((q) => q.id === r.itemId)?.title ?? r.itemId
            : `Màn ${idx + 1}/4`;
        return (
          <details key={r.itemId}>
            <summary>{questionTitle}</summary>
            {r.explanation && <p>{r.explanation}</p>}
            {r.options && (
              <ul>
                {r.options.map((o) => (
                  <li key={o.id}>
                    {
                      stage.config?.questions
                        ?.find((q) => q.id === r.itemId)
                        ?.options.find((x) => x.id === o.id)?.label
                    }
                    : {o.score} XP
                  </li>
                ))}
              </ul>
            )}
            {r.optimalCommands && (
              <p>
                Ghost Path · {r.optimalCommands.length} lệnh:{" "}
                {r.optimalCommands
                  .map((c) => (c === "forward" ? "↑" : c === "left" ? "↶" : "↷"))
                  .join(" ")}
              </p>
            )}
          </details>
        );
      })}
    </section>
  );
}

export default function CompetitionPortal({
  resolvedCompetitionId,
}: {
  resolvedCompetitionId?: string;
}) {
  const path = window.location.pathname,
    params = new URLSearchParams(window.location.search),
    join = parseJoinRoute(path);
  const isPresentation = path.startsWith("/present/");
  const competitionId = join
    ? (resolvedCompetitionId ?? params.get("competition") ?? "")
    : (path.split("/")[2] ?? "");
  const presentationToken =
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
  const [stageNo, setStageNo] = useState(1),
    [identity, setIdentity] = useState<Identity | null>(() =>
      !join && !isPresentation && isCompetitionId(competitionId)
        ? loadCompetitionIdentity(competitionId, "mc")
        : null,
    );
  const [state, setState] = useState<CompetitionState | null>(null),
    [error, setError] = useState<string | null>(null),
    [connection, setConnection] = useState("Đang kết nối"),
    [busy, setBusy] = useState(false);
  const [a11yViewMode, setA11yViewMode] = useA11ySync("before");
  const [name, setName] = useState(""),
    [credential, setCredential] = useState(""),
    [cardCredential, setCardCredential] = useState(""),
    [restore, setRestore] = useState(false),
    [teamId, setTeamId] = useState(""),
    [recoveryRequest, setRecoveryRequest] = useState("");
  const [presentationUrl, setPresentationUrl] = useState(""),
    [qr, setQr] = useState(""),
    [joinQr, setJoinQr] = useState(""),
    [joinInfo, setJoinInfo] = useState<{
      name: string;
      stage: number;
      competitionId: string;
      status: string;
    } | null>(null);
  const busyRef = useRef(false),
    requestSequence = useRef(0);
  const fetchState = useCallback(
    async () =>
      isPresentation
        ? invokeArena<CompetitionState>("arena-get-state", {
            competitionId,
            presentationToken,
          })
        : identity
          ? getCompetitionState(identity)
          : null,
    [competitionId, identity, isPresentation, presentationToken],
  );
  const refresh = async () => {
    const sequence = ++requestSequence.current;
    const next = await fetchState();
    if (next && sequence === requestSequence.current) setState(next);
  };
  const run = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(message(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!join || !competitionId || !isValidRoomCode(join.code)) return;
    let disposed = false;
    void invokeArena<{
      name: string;
      stage: number;
      competitionId: string;
      status: string;
    }>("arena-join-room", {
      mode: "competition",
      action: "inspect",
      code: join.code,
    })
      .then((info) => {
        if (disposed) return;
        if (info.competitionId !== competitionId) {
          setError("Liên kết không khớp cuộc thi.");
          return;
        }
        setJoinInfo(info);
        setStageNo(info.stage);
        setRestore(info.stage === 2 || info.status !== "NOT_STARTED");
        setIdentity(
          loadCompetitionIdentity(competitionId, "team", info.stage) ??
            loadCompetitionIdentity(competitionId, "team", 1),
        );
      })
      .catch((e) => {
        if (!disposed) setError(message(e));
      });
    return () => {
      disposed = true;
    };
  }, [competitionId, join?.code]);
  useEffect(() => {
    if (!identity && !isPresentation) return;
    let disposed = false,
      running = false;
    let timer: number;
    const poll = async () => {
      if (disposed || running) return;
      running = true;
      const sequence = ++requestSequence.current;
      try {
        if (!navigator.onLine) {
          if (!disposed) setConnection("Offline · Chờ kết nối lại");
          return;
        }
        const next = await fetchState();
        if (!disposed && sequence === requestSequence.current && next) {
          setState(next);
          setConnection("Đã kết nối · Cập nhật mỗi 5 giây");
          setError(null);
        }
      } catch (e) {
        if (!disposed && sequence === requestSequence.current) {
          setConnection("Lỗi backend · Đang thử lại");
          setError(message(e));
          if (e instanceof ArenaApiError && e.code === "forbidden")
            setState(null);
        }
      } finally {
        running = false;
        if (!disposed) timer = window.setTimeout(() => void poll(), 5000);
      }
    };
    void poll();
    const online = () => {
      clearTimeout(timer);
      void poll();
    };
    window.addEventListener("online", online);
    return () => {
      disposed = true;
      ++requestSequence.current;
      clearTimeout(timer);
      window.removeEventListener("online", online);
    };
  }, [identity, isPresentation, fetchState]);
  useEffect(() => {
    if (!presentationUrl) {
      setQr("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(presentationUrl, { width: 280, margin: 4 }).then(
      (value) => {
        if (!cancelled) setQr(value);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [presentationUrl]);
  const roomCode =
    state?.joinCode ??
    state?.stages.find((s) => s.stageNo === 1)?.roomCode ??
    "";
  const activeJoinUrl =
    (state?.role === "mc" || state?.role === "presentation") && roomCode
      ? joinLink(state.competition.id, roomCode)
      : "";
  useEffect(() => {
    if (!activeJoinUrl) return;
    let cancelled = false;
    void QRCode.toDataURL(activeJoinUrl, { width: 280, margin: 4 }).then(
      (value) => {
        if (!cancelled) setJoinQr(value);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [activeJoinUrl]);
  const control = async (
    action: string,
    extra: Record<string, unknown> = {},
  ) => {
    if (!identity) return;
    const result = await controlCompetition(identity, action, extra);
    if (result.presentationToken) {
      const activeCode =
        state?.joinCode ||
        state?.stages.find((s) => s.stageNo === 1)?.roomCode ||
        "";
      setPresentationUrl(
        presentationLink(competitionId, result.presentationToken, activeCode),
      );
    }
    if (action === "presentation_revoke") setPresentationUrl("");
    await refresh();
  };
  const copy = (text: string) =>
    run(async () => {
      await navigator.clipboard.writeText(text);
    });
  const register = () =>
    run(async () => {
      if (!join || !isValidRoomCode(join.code) || !joinInfo)
        throw new Error("invalid_room_code");
      const recovery = restore ? credential.trim() : capability();
      const result = await invokeArena<{
        competitionId: string;
        competitionTeamId: string;
        team: { id: string; name: string };
        teamToken: string;
      }>("arena-join-room", {
        mode: "competition",
        code: join.code,
        register: !restore,
        name: restore ? undefined : name.trim(),
        recoveryCredential: recovery,
      });
      const session: Identity = {
        competitionId: result.competitionId,
        competitionTeamId: result.competitionTeamId,
        role: "team",
        token: result.teamToken,
        teamId: result.team.id,
        stage: stageNo,
        code: join.code,
      };
      saveCompetitionIdentity(session);
      // One securely issued capability covers both pre-associated room teams.
      saveCompetitionIdentity({ ...session, stage: 1 });
      saveCompetitionIdentity({ ...session, stage: 2 });
      setCardCredential(recovery);
      setIdentity(session);
    });
  const submitAnswer = async (item: string, answer: string) => {
    if (!identity || !state) return;
    const stage = state.stages.find((s) => s.stageNo === stageNo);
    if (!stage?.roundId) return;
    await invokeArena(
      "arena-submit-accessibility",
      {
        roundId: stage.roundId,
        teamId: state.own?.teamId ?? identity.teamId,
        itemId: item,
        answerId: answer,
        idempotencyKey: `${stage.roundId}:${state.own?.teamId ?? identity.teamId}:${item}`,
      },
      headers(identity),
    );
    await refresh();
  };
  const submitRobot = async (item: string, commands: Command[]) => {
    if (!identity || !state) return;
    const stage = state.stages.find((s) => s.stageNo === 2);
    if (!stage?.roundId) return;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(commands.join(",")),
    );
    const key = [...new Uint8Array(digest)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 24);
    await invokeArena(
      "arena-submit-robot",
      {
        roundId: stage.roundId,
        teamId: state.own?.teamId ?? identity.teamId,
        itemId: item,
        commands,
        idempotencyKey: `${stage.roundId}:${state.own?.teamId ?? identity.teamId}:${item}:${key}`,
      },
      headers(identity),
    );
    await refresh();
  };
  const submitTie = async (answer: string) => {
    if (!identity || !state?.tie) return;
    await invokeArena(
      "arena-submit-accessibility",
      {
        action: "submit_tiebreak",
        competitionId,
        teamId: state.own?.teamId ?? identity.teamId,
        attempt: state.tie.attempt,
        answerId: answer,
      },
      headers(identity),
    );
    await refresh();
  };

  return (
    <main className="competition-shell">
      <header className="competition-header">
        <a href="/" className="brand">
          SAYNTAX · GAME ARENA
        </a>
        <span>
          {isPresentation
            ? "TRÌNH CHIẾU · CHỈ XEM"
            : join
              ? "ĐỘI THI ĐẤU"
              : "COMPETITION CONTROL"}
        </span>
      </header>
      <p role="status">
        {standaloneMode
          ? "Chưa cấu hình backend. Chế độ thi đấu cần Competition V2; luyện tập vẫn hoạt động ở trang chủ."
          : identity || isPresentation
            ? connection
            : "Đăng ký / khôi phục phiên an toàn"}
      </p>
      {error && (
        <p className="backend-error" role="alert">
          {error}
        </p>
      )}
      {join && identity?.role === "team" && (
        <button
          className="button button-ghost"
          onClick={() => {
            ++requestSequence.current;
            clearCompetitionIdentity(identity);
            setIdentity(null);
            setState(null);
            setRestore(true);
            setCardCredential("");
            setCredential("");
            setError(null);
          }}
        >
          Khôi phục lại phiên đội bằng credential
        </button>
      )}
      {!state && !isPresentation && !join && (
        <section className="panel competition-section">
          <h1>Tổ chức cuộc thi hai giai đoạn</h1>
          <p>
            Accessibility 10 phút → nghỉ workshop → Robot 15 phút → một đội
            thắng chung cuộc.
          </p>
          {competitionId && !isCompetitionId(competitionId) ? (
            <div>
              <p role="alert">
                Liên kết cuộc thi không hợp lệ. Backend phiên bản cũ có thể đã
                trả về phản hồi tạo phòng thay vì cuộc thi.
              </p>
              <a className="button button-primary" href="/competition">
                Về trang tạo cuộc thi
              </a>
            </div>
          ) : competitionId && !identity ? (
            <div>
              <p>
                Không tìm thấy phiên quản trị của cuộc thi này trong trình
                duyệt. Hãy mở bằng phiên MC đã tạo cuộc thi; đường dẫn không cấp
                quyền quản trị.
              </p>
              <a className="button button-ghost" href="/competition">
                Về trang tạo cuộc thi
              </a>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const result = await createCompetition(
                    name || "SAYNTAX Workshop 2026",
                  );
                  saveCompetitionIdentity({
                    competitionId: result.competitionId,
                    role: "mc",
                    token: result.mcToken,
                  });
                  window.location.assign(
                    `/competition/${result.competitionId}`,
                  );
                });
              }}
            >
              <label>
                Tên cuộc thi
                <input
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button
                className="button button-primary"
                disabled={busy || standaloneMode}
              >
                Tạo cuộc thi
              </button>
            </form>
          )}
        </section>
      )}
      {join && !identity && (
        <section className="panel competition-section">
          <h1>{joinInfo?.name ?? "Tham gia cuộc thi"}</h1>
          <p>
            Phiên {stageNo}:{" "}
            {stageNo === 1 ? "Accessibility Unlock" : "Robot Commands"} · Mã
            phòng {join.code}
          </p>
          {!isValidRoomCode(join.code) && (
            <p role="alert">Mã phòng không hợp lệ.</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              register();
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={restore}
                onChange={(e) => setRestore(e.target.checked)}
                disabled={stageNo === 2 || joinInfo?.status !== "NOT_STARTED"}
              />{" "}
              Khôi phục đội đã đăng ký
            </label>
            {restore ? (
              <label>
                Credential phục hồi đội
                <input
                  autoComplete="off"
                  type="password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  required
                  minLength={32}
                />
              </label>
            ) : (
              <label>
                Tên đội
                <input
                  value={name}
                  minLength={2}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
            )}
            <button
              className="button button-primary"
              disabled={busy || !joinInfo || !isValidRoomCode(join.code)}
            >
              {restore ? "Khôi phục đội" : "Đăng ký đội"}
            </button>
          </form>
          <details>
            <summary>Mất credential? Yêu cầu MC cấp lại</summary>
            <p>
              Nhập ID đội trên thẻ đã lưu. MC phải xác minh đội trực tiếp trước
              khi duyệt. Tên đội không phải mật khẩu.
            </p>
            <label>
              ID đội
              <input
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              />
            </label>
            <button
              className="button button-ghost"
              disabled={busy || !teamId || !joinInfo}
              onClick={() =>
                void run(async () => {
                  const next = capability();
                  const result = await invokeArena<{ requestId: string }>(
                    "arena-join-room",
                    {
                      mode: "competition",
                      action: "request_recovery",
                      code: join.code,
                      competitionTeamId: teamId,
                      recoveryCredential: next,
                    },
                  );
                  setCredential(next);
                  setRestore(true);
                  setRecoveryRequest(result.requestId);
                })
              }
            >
              Tạo yêu cầu phục hồi
            </button>
            {recoveryRequest && (
              <p role="status">
                Mã yêu cầu: {recoveryRequest}. Đưa mã này cho MC. Sau khi được
                duyệt, bấm Khôi phục đội.
              </p>
            )}
          </details>
        </section>
      )}
      {state && (
        <>
          {state.role !== "presentation" && (
            <>
              <h1>{state.competition.name}</h1>
              <p className="competition-state">{state.competition.status}</p>
            </>
          )}
          {state.role === "mc" && (
            <>
              <p>
                Đội đã đăng ký: {state.teams?.length ?? 0}/8 · MC chỉ quản lý và
                xem nội dung, không nộp bài.
              </p>
              {state.demoStage && (
                <Demo
                  key={state.demoStage}
                  stage={state.demoStage}
                  readOnly
                  canControlViewMode={true}
                  viewMode={a11yViewMode}
                  onViewModeChange={setA11yViewMode}
                />
              )}
              <div className="competition-stages">
                {state.stages.map((s) => (
                  <AdminStage
                    key={s.stageNo}
                    stage={s}
                    state={state}
                    busy={busy}
                    viewMode={a11yViewMode}
                    onViewModeChange={setA11yViewMode}
                    onControl={(action, extra) =>
                      run(() => control(action, extra))
                    }
                  />
                ))}
              </div>
              <section className="competition-section panel">
                <h2>Một QR tham gia xuyên suốt cuộc thi</h2>
                <p>
                  Đăng ký một lần. Dùng lại cùng QR cho cả Accessibility và
                  Robot; thiết bị khác dùng thẻ phục hồi.
                </p>
                {/^https?:\/\/(localhost|127\.|0\.0\.0\.0)/.test(activeJoinUrl) && (
                  <p role="alert" className="backend-error">
                    ⚠️ URL đang trỏ đến localhost — QR này chỉ dùng được trên máy
                    local, không thể scan từ điện thoại khác. Triển khai lên
                    Vercel và mở lại trang trên domain thật trước khi bắt đầu thi.
                  </p>
                )}
                <p className="competition-url">{activeJoinUrl}</p>
                <button
                  className="button button-ghost"
                  onClick={() => void copy(activeJoinUrl)}
                >
                  Sao chép link đội
                </button>
                {joinQr && (
                  <img
                    src={joinQr}
                    alt="QR tham gia cuộc thi · cả hai phiên"
                    width={280}
                    height={280}
                  />
                )}
              </section>
              <section className="competition-section panel">
                <h2>Presentation · Quyền chỉ xem</h2>
                <p>
                  Link trình chiếu độc lập với token MC/đội, hết hạn sau tối đa
                  8 giờ. Tạo lại link sẽ thu hồi link cũ.
                </p>
                <div className="competition-actions">
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={() =>
                      void run(() => control("presentation_rotate"))
                    }
                  >
                    {state.presentationEnabled
                      ? "Tạo lại link trình chiếu"
                      : "Tạo link trình chiếu"}
                  </button>
                  <button
                    className="button button-ghost"
                    disabled={busy || !state.presentationEnabled}
                    onClick={() =>
                      void run(() => control("presentation_revoke"))
                    }
                  >
                    Thu hồi link trình chiếu
                  </button>
                </div>
                {presentationUrl && (
                  <>
                    <a
                      className="button button-ghost"
                      href={presentationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở Presentation
                    </a>
                    <button
                      className="button button-ghost"
                      onClick={() => void copy(presentationUrl)}
                    >
                      Sao chép link trình chiếu
                    </button>
                    {qr && (
                      <img
                        src={qr}
                        alt="QR trình chiếu chỉ xem"
                        width={280}
                        height={280}
                      />
                    )}
                  </>
                )}
              </section>
              {!!state.recoveryRequests?.length && (
                <section className="competition-section panel">
                  <h2>Yêu cầu phục hồi</h2>
                  {state.recoveryRequests.map((r) => (
                    <div key={r.id}>
                      <p>
                        {state.teams?.find((t) => t.id === r.teamId)?.name} ·{" "}
                        {r.id}
                      </p>
                      <button
                        className="button button-ghost"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Đã xác minh trực tiếp đội và mã yêu cầu? Duyệt sẽ thu hồi các phiên đội cũ; MC không nhận credential hoặc token đội.",
                            )
                          )
                            void run(() =>
                              control("approve_recovery", { requestId: r.id }),
                            );
                        }}
                      >
                        Xác minh và duyệt phục hồi
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {state.role === "team" && (
            <>
              {state.demoStage && (
                <Demo key={state.demoStage} stage={state.demoStage} />
              )}
              <section className="competition-section panel">
                <h2>{state.own?.name}</h2>
                <p className="competition-team-id-hint">
                  Mã phục hồi: <code>{state.own?.competitionTeamId?.slice(-8).toUpperCase()}</code>
                  <small> (dùng cho MC khi cần xác minh danh tính)</small>
                </p>
                {cardCredential && (
                  <>
                    <p>
                      Lưu thẻ phục hồi trước khi rời trang. Thẻ dùng được trên
                      thiết bị khác cho phiên 2; không chia sẻ công khai.
                    </p>
                    <button
                      className="button button-primary"
                      onClick={() =>
                        downloadCard(
                          `SAYNTAX · ${state.competition.name}\nĐội: ${state.own?.name}\nCompetition: ${competitionId}\nTeam ID: ${state.own?.competitionTeamId}\nRecovery credential: ${cardCredential}\nStage 2: ${joinLink(competitionId, state.joinCode ?? state.stages.find((s) => s.stageNo === 1)?.roomCode ?? "")}\n`,
                        )
                      }
                    >
                      Tải thẻ phục hồi đội
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => void copy(cardCredential)}
                    >
                      Sao chép credential phục hồi
                    </button>
                  </>
                )}
              </section>
              <Participant
                stage={state.stages.find(
                  (s) =>
                    s.stageNo ===
                    (state.competition.status === "NOT_STARTED" ||
                    state.competition.status === "STAGE_1_ACTIVE"
                      ? 1
                      : 2),
                )!}
                state={state}
                busy={busy}
                viewMode={a11yViewMode}
                onAnswer={(item, answer) =>
                  run(() => submitAnswer(item, answer))
                }
                onRobot={(item, commands) =>
                  run(() => submitRobot(item, commands))
                }
              />
            </>
          )}
          {state.role === "presentation" && (
            <Presentation state={state} viewMode={a11yViewMode} />
          )}
          {state.role !== "presentation" && (
            <>
              {state.tie?.active && (
                <section className="competition-section panel">
                  <h2>Sudden death · Lượt {state.tie.attempt}</h2>
                  <Deadline
                    deadline={state.tie.deadlineAt}
                    serverNow={state.serverNow}
                  />
                  {state.role === "team" &&
                  state.tie.candidates.includes(state.own!.competitionTeamId) &&
                  state.tie.challenge ? (
                    <QuestionPlayer
                      question={state.tie.challenge}
                      busy={busy || state.own!.tieSubmitted}
                      answer={state.own!.tieSubmitted ? "submitted" : null}
                      onAnswer={(answer) => run(() => submitTie(answer))}
                    />
                  ) : state.tie.challenge ? (
                    <Prompt question={state.tie.challenge} />
                  ) : null}
                </section>
              )}
              <Leaderboard state={state} />
              {state.stages
                .filter((s) => s.status === "finalized")
                .map((s) => (
                  <Review key={s.stageNo} stage={s} />
                ))}
              {state.role === "mc" &&
                state.competition.status === "STAGE_2_FINALIZED" && (
                  <section className="competition-section panel">
                    <h2>Chốt kết quả chung cuộc</h2>
                    <p>
                      Hòa điểm: xét số câu Accessibility đạt 100, rồi số màn
                      Robot tối ưu. Nếu còn hòa, dùng sudden death, không dùng
                      tốc độ.
                    </p>
                    <div className="competition-actions">
                      <button
                        className="button button-ghost"
                        disabled={
                          busy ||
                          state.tie?.active ||
                          (state.tie?.candidates.length ?? 0) < 2
                        }
                        onClick={() =>
                          void run(() => control("start_tiebreak"))
                        }
                      >
                        Bắt đầu sudden death
                      </button>
                      <button
                        className="button button-ghost"
                        disabled={busy || !state.tie?.active}
                        onClick={() =>
                          void run(() => control("finalize_tiebreak"))
                        }
                      >
                        Chốt sudden death
                      </button>
                      <button
                        className="button button-primary"
                        disabled={
                          busy ||
                          state.tie?.active ||
                          state.tie?.candidates.length !== 1
                        }
                        onClick={() => void run(() => control("publish"))}
                      >
                        Công bố đội chiến thắng
                      </button>
                    </div>
                  </section>
                )}
            </>
          )}
        </>
      )}
    </main>
  );
}

export function AdminStage({
  stage: s,
  state,
  busy,
  onControl,
  viewMode,
  onViewModeChange,
}: {
  stage: Stage;
  state: CompetitionState;
  busy: boolean;
  onControl: (action: string, extra: Record<string, unknown>) => Promise<void>;
  viewMode?: "before" | "after";
  onViewModeChange?: (mode: "before" | "after") => void;
}) {
  const [ids, setIds] = useState<string[]>(() =>
      s.stageNo === 1
        ? (s.config?.scenarioIds ?? [])
        : (s.config?.levelIds ?? []),
    ),
    [preview, setPreview] = useState(false),
    // Gate: MC must show the demo before the stage can start.
    // Once demoShown is true it persists for the component lifetime.
    [demoShown, setDemoShown] = useState(() => state.demoStage === s.stageNo);

  const content = s.stageNo === 1 ? s.config?.questions : s.config?.maps;
  const allowed =
    s.stageNo === 1
      ? state.competition.status === "NOT_STARTED"
      : state.competition.status === "STAGE_1_FINALIZED";
  return (
    <section className="panel competition-section">
      <span className="eyebrow accent">
        STAGE 0{s.stageNo} · {s.stageNo === 1 ? "10 PHÚT" : "15 PHÚT"}
      </span>
      <h2>{s.stageNo === 1 ? "Accessibility Unlock" : "Robot Commands"}</h2>
      <p>
        Trạng thái: {s.status} ·{" "}
        {s.stageNo === 1 ? "600 XP → 50 điểm" : "400 điểm → 50 điểm"}
      </p>
      <Deadline
        deadline={s.status === "active" ? s.deadlineAt : null}
        serverNow={state.serverNow}
      />
      <details>
        <summary>Cấu hình {s.stageNo === 1 ? "6 câu hỏi" : "4 màn"}</summary>
        <fieldset disabled={busy || s.status !== "pending"}>
          {(s.stageNo === 1
            ? questionIds
            : Array.from({ length: 9 }, (_, i) => String(i + 1))
          ).map((id, i) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={ids.includes(id)}
                disabled={
                  !ids.includes(id) && ids.length >= (s.stageNo === 1 ? 6 : 4)
                }
                onChange={() =>
                  setIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((x) => x !== id)
                      : [...prev, id],
                  )
                }
              />
              {s.stageNo === 1 ? labels[i] : `Màn ${id}`}
            </label>
          ))}
          <p>Thứ tự: {ids.join(" → ")}</p>
          <button
            className="button button-ghost"
            disabled={ids.length !== (s.stageNo === 1 ? 6 : 4)}
            onClick={() =>
              void onControl("configure", {
                stage: s.stageNo,
                config:
                  s.stageNo === 1 ? { scenarioIds: ids } : { levelIds: ids },
              })
            }
          >
            Lưu cấu hình
          </button>
        </fieldset>
      </details>
      <div className="competition-actions">
        <button
          className="button button-ghost"
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Ẩn Preview" : "Preview chỉ xem"}
        </button>
        <button
          className="button button-ghost"
          disabled={busy || !allowed || s.status !== "pending"}
          onClick={() => {
            setDemoShown(true);
            void onControl("show_demo", { stage: s.stageNo });
          }}
        >
          {demoShown ? "▶ Demo đã hiển thị" : "Hiển thị Demo phiên " + s.stageNo}
        </button>
        <button
          className="button button-primary"
          disabled={busy || !allowed || s.status !== "pending" || !demoShown}
          title={!demoShown ? "Phải hiển thị Demo trước khi bắt đầu phiên thi" : undefined}
          onClick={() => void onControl("start_stage", { stage: s.stageNo })}
        >
          Bắt đầu phiên {s.stageNo}
        </button>
        <button
          className="button button-ghost"
          disabled={busy || s.status !== "active"}
          onClick={() => {
            if (
              window.confirm(
                "Chốt phiên ngay? Các đội sẽ không thể nộp thêm bài sau thao tác này.",
              )
            )
              void onControl("finalize_stage", { stage: s.stageNo });
          }}
        >
          Chốt phiên {s.stageNo}
        </button>
      </div>
      {s.status === "active" && (
        <>
          <h3>
            Thử thách {s.activeIndex + 1}/
            {s.totalItems ?? (s.stageNo === 1 ? 6 : 4)}
          </h3>
          <Progress stage={s} />
          <Deadline
            deadline={s.itemDeadline ?? null}
            label="Còn lại thử thách"
            serverNow={state.serverNow}
          />
          <ul className="competition-team-status">
            {s.teamStatus?.map((t) => (
              <li key={t.name}>
                {t.name} · {t.submitted ? "Đã nộp" : "Đang chờ"}
              </li>
            ))}
          </ul>
          <div className="competition-actions">
            <button
              className="button button-ghost"
              disabled={busy || Boolean(s.itemFinalizedAt)}
              onClick={() =>
                void onControl("close_challenge", {
                  stage: s.stageNo,
                  index: s.activeIndex,
                })
              }
            >
              Đóng thử thách
            </button>
            <button
              className="button button-primary"
              disabled={busy || s.activeIndex >= (s.stageNo === 1 ? 5 : 3)}
              onClick={() =>
                void onControl("advance_challenge", {
                  stage: s.stageNo,
                  index: s.activeIndex,
                })
              }
            >
              Thử thách tiếp theo
            </button>
          </div>
          <p>
            Chuyển khi mọi đội đã nộp hoặc hết giờ thử thách. Đội chưa nộp nhận
            0 điểm. Đồng hồ phiên vẫn là giới hạn chung.
          </p>
        </>
      )}
      {(preview || s.status === "active") &&
        content?.[s.activeIndex] &&
        ("options" in content[s.activeIndex] ? (
          <Prompt
            question={content[s.activeIndex] as Question}
            isClosed={Boolean(s.itemFinalizedAt || s.status === "finalized")}
            review={s.review?.find(
              (r) => r.itemId === (content[s.activeIndex] as Question).id,
            )}
            canControlViewMode={true}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        ) : (
          <MapPrompt map={content[s.activeIndex] as MapDefinition} />
        ))}
    </section>
  );
}
export function Participant({
  stage,
  state,
  busy,
  onAnswer,
  onRobot,
  viewMode,
}: {
  stage: Stage;
  state: CompetitionState;
  busy: boolean;
  onAnswer: (item: string, answer: string) => Promise<void>;
  onRobot: (item: string, commands: Command[]) => Promise<void>;
  viewMode?: "before" | "after";
}) {
  if (!stage) return null;
  if (stage.status !== "active")
    return (
      <section className="competition-section panel">
        <h2>
          {stage.status === "finalized"
            ? "Phiên đã chốt"
            : "Chờ MC bắt đầu phiên"}
        </h2>
        <p>
          Hai game được chơi ở hai thời điểm riêng. Bạn có thể đóng trình duyệt
          và quay lại bằng thẻ phục hồi cho phiên 2.
        </p>
      </section>
    );
  const item = stage.challenge;
  const closed =
    Boolean(stage.itemFinalizedAt) ||
    Date.parse(stage.itemDeadline ?? stage.deadlineAt ?? "") <=
      Date.parse(state.serverNow);
  return (
    <section className="competition-section panel">
      <h2>
        Phiên {stage.stageNo} ·{" "}
        {stage.stageNo === 1 ? "Accessibility Unlock" : "Robot Commands"}
      </h2>
      <Deadline deadline={stage.deadlineAt} serverNow={state.serverNow} />
      <span className="eyebrow accent">OFFICIAL COMPETITION — SCORED</span>
      <h3>
        Thử thách {stage.activeIndex + 1}/
        {stage.totalItems ?? (stage.stageNo === 1 ? 6 : 4)} · MC điều khiển
      </h3>
      <Progress stage={stage} />
      <Deadline
        deadline={stage.itemDeadline ?? null}
        label="Còn lại thử thách"
        serverNow={state.serverNow}
      />
      {closed && <p role="status">Thử thách đã đóng · Chờ MC chuyển tiếp.</p>}
      {item &&
        ("options" in item ? (
          <QuestionPlayer
            question={item}
            key={item.id}
            busy={busy || closed}
            isClosed={Boolean(stage.itemFinalizedAt)}
            review={stage.review?.find((r) => r.itemId === item.id)}
            canControlViewMode={false}
            viewMode={viewMode}
            answer={
              state.own?.submissions.find((x) => x.itemId === item.id)?.answerId
            }
            onAnswer={(answer) => onAnswer(item.id, answer)}
          />
        ) : (
          <RobotPlayer
            key={item.id}
            map={item}
            busy={busy || closed}
            score={
              state.own?.submissions.find((x) => x.itemId === item.id)?.score
            }
            onSubmit={(commands) => onRobot(item.id, commands)}
          />
        ))}
    </section>
  );
}
export function PresentationJoinPanel({
  competitionId,
  roomCode,
  teamsCount,
  isLanding = false,
}: {
  competitionId: string;
  roomCode: string;
  teamsCount: number;
  isLanding?: boolean;
}) {
  const [qr, setQr] = useState<string>("");
  const joinUrl = roomCode ? joinLink(competitionId, roomCode) : "";
  const isLocal = isLocalDevUrl(joinUrl);
  const isValid = isValidJoinUrl(joinUrl);

  useEffect(() => {
    if (!joinUrl || !isValid) return;
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, {
      width: isLanding ? 320 : 220,
      margin: 2,
      color: { dark: "#121212", light: "#ffffff" },
    }).then((data) => {
      if (!cancelled) setQr(data);
    });
    return () => {
      cancelled = true;
    };
  }, [joinUrl, isLanding, isValid]);

  return (
    <aside
      className={`presentation-join-panel ${isLanding ? "is-landing-panel" : "is-sidebar-panel"}`}
      aria-label="Thông tin đăng ký đội thi"
    >
      <div className="join-panel-badge">
        <span className="dot dot-green" />
        <span>THAM GIA TRANH TÀI</span>
      </div>

      <p className="join-panel-instruction">
        {isLanding
          ? "Quét mã QR bằng điện thoại để đăng ký đội thi"
          : "Quét mã QR để gia nhập hoặc theo dõi"}
      </p>

      {qr ? (
        <div className="join-panel-qr-frame">
          <img
            src={qr}
            alt={`Mã QR gia nhập phòng ${roomCode}`}
            className="join-panel-qr-img"
            width={isLanding ? 280 : 180}
            height={isLanding ? 280 : 180}
          />
        </div>
      ) : (
        <div className="join-panel-qr-placeholder">Đang chuẩn bị mã QR...</div>
      )}

      <div className="join-panel-meta">
        <div className="join-meta-row room-code-box">
          <span className="meta-label">MÃ PHÒNG:</span>
          <strong className="meta-value code-accent">{roomCode || "CHỜ PHÒNG"}</strong>
        </div>

        <div className="join-meta-row short-url-box">
          <span className="meta-label">LINK GIA NHẬP:</span>
          <span className="meta-value url-text" title={joinUrl}>
            {joinUrl ? joinUrl.replace(/^https?:\/\//, "") : "Đang kết nối..."}
          </span>
        </div>

        <div className="join-meta-row teams-count-box">
          <span className="meta-label">ĐỘI ĐÃ SẴN SÀNG:</span>
          <span className="meta-value teams-badge">
            {teamsCount > 0 ? `${teamsCount}/8 đội` : "Đang chờ các đội..."}
          </span>
        </div>
      </div>

      {isLocal && (
        <div className="join-panel-dev-warning" role="alert">
          <small>⚠️ Môi trường Local Test · Không quét từ mạng ngoài được</small>
        </div>
      )}

      <div className="join-panel-persistent-note">
        <small>✓ Dùng 1 mã QR cố định duy nhất cho cả 2 chặng thi đấu</small>
      </div>
    </aside>
  );
}

export function PresentationLandingScreen({
  state,
  roomCode,
  teamsCount,
}: {
  state: CompetitionState;
  roomCode: string;
  teamsCount: number;
}) {
  return (
    <div className="presentation-landing-shell">
      {/* Ambient background glow orbs */}
      <div className="landing-bg-glow glow-1" aria-hidden="true" />
      <div className="landing-bg-glow glow-2" aria-hidden="true" />

      <div className="landing-layout-grid">
        {/* Main Editorial Hero Area (approx 74%) */}
        <div className="landing-main-hero">
          <div className="landing-brand-strip">
            <span className="brand-logo-tag">SAYNTAX</span>
            <span className="brand-sub-tag">GAME ARENA</span>
            <span className="brand-status-live">
              <span className="live-pulse-dot" />
              LIVE WORKSHOP
            </span>
          </div>

          <h2 className="landing-waiting-heading">
            {state.competition.status === "NOT_STARTED"
              ? "Chờ MC mở thử thách"
              : "Phiên đã kết thúc · Chờ hoạt động tiếp theo"}
          </h2>

          <h1 className="landing-hero-heading">
            ĐẤU TRƯỜNG LẬP TRÌNH &amp; THIẾT KẾ TIẾP CẬN
          </h1>

          <p className="landing-intro-text">
            Chào mừng các đội thi! Hãy chuẩn bị tinh thần bước vào 2 chặng thử thách kịch tính để
            khẳng định năng lực tối ưu trải nghiệm cho mọi người dùng và chinh phục mê cung thuật toán.
          </p>

          {/* Central Futuristic Hero Showcase Artwork (inspired by original Game Arena) */}
          <div className="landing-hero-showcase" aria-hidden="true">
            <div className="showcase-glow-sphere glow-cyan" />
            <div className="showcase-glow-sphere glow-mint" />

            <div className="showcase-card card-a11y-float">
              <div className="showcase-badge badge-mint">ACCESSIBILITY</div>
              <div className="showcase-stat">4.5:1</div>
              <span className="showcase-caption">Tương phản chuẩn WCAG 2.1 AA</span>
            </div>

            <div className="showcase-card card-code-float">
              <div className="showcase-code-header">
                <span className="code-dot red" />
                <span className="code-dot yellow" />
                <span className="code-dot green" />
                <span className="code-title">inclusive_builder.ts</span>
              </div>
              <div className="showcase-code-body">
                <code><span className="token-keyword">if</span> (everyone_included) &#123;</code>
                <code>&nbsp;&nbsp;<span className="token-fn">build_accessible_future</span>();</code>
                <code>&#125;</code>
              </div>
            </div>

            <div className="showcase-card card-robot-float">
              <div className="showcase-badge badge-violet">ROBOT BFS</div>
              <div className="showcase-stat">24 LỆNH PAR</div>
              <span className="showcase-caption">Thuật toán tìm đường tối ưu</span>
            </div>
          </div>

          <div className="landing-cards-grid">
            <div className="landing-card card-a11y">
              <div className="card-top-icon">♿</div>
              <div className="card-content">
                <span className="card-eyebrow">CHẶNG 1 · ACCESSIBILITY UNLOCK</span>
                <h3>6 Thử Thách Giao Diện Thực Chiến</h3>
                <p>
                  Quan sát trực quan các rào cản tiếp cận thực tế (contrast, keyboard focus, captions,
                  color, touch target, navigation) và lựa chọn phương án tối ưu chuẩn WCAG.
                </p>
                <div className="card-badge-row">
                  <span className="mini-badge">6 câu hỏi</span>
                  <span className="mini-badge">100 XP / câu</span>
                  <span className="mini-badge accent-badge">Tối đa 50 XP toàn giải</span>
                </div>
              </div>
            </div>

            <div className="landing-card card-robot">
              <div className="card-top-icon">🤖</div>
              <div className="card-content">
                <span className="card-eyebrow">CHẶNG 2 · ROBOT COMMANDS</span>
                <h3>4 Mê Cung Thuật Toán BFS</h3>
                <p>
                  Lập trình robot né chướng ngại vật bằng 3 lệnh: Đi thẳng (↑), Rẽ trái (↶), Rẽ phải (↷).
                  Tối ưu hành trình ngắn nhất chinh phục Par mục tiêu trong tối đa 24 lệnh.
                </p>
                <div className="card-badge-row">
                  <span className="mini-badge">4 bản đồ</span>
                  <span className="mini-badge">Tối đa 24 lệnh</span>
                  <span className="mini-badge accent-badge">Tối đa 50 XP toàn giải</span>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-format-banner">
            <span className="format-label">QUY THỨC THI ĐẤU:</span>
            <span>6 Câu Hỏi A11y + 4 Màn Mê Cung Robot · Tổng Điểm 100 XP (50% A11y + 50% Robot)</span>
          </div>
        </div>

        {/* Persistent Join Panel (approx 26%) */}
        <div className="landing-side-panel">
          <PresentationJoinPanel
            competitionId={state.competition.id}
            roomCode={roomCode}
            teamsCount={teamsCount}
            isLanding={true}
          />
        </div>
      </div>
    </div>
  );
}

export function Presentation({
  state,
  viewMode,
}: {
  state: CompetitionState;
  viewMode?: "before" | "after";
}) {
  const stage = state.stages.find((s) => s.status === "active");
  const isFinalized = state.competition.status === "FINALIZED";
  const urlRoomCode =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("code") || ""
      : "";
  const roomCode =
    state.joinCode ||
    state.stages.find((s) => s.stageNo === 1)?.roomCode ||
    urlRoomCode ||
    "";
  const teamsCount =
    state.teamsCount ?? state.teams?.length ?? (state.stages[0]?.progress?.total ?? 0);

  // 1. Landing state when competition is NOT started or between stages without active challenge
  if (!state.demoStage && !stage && !isFinalized) {
    return (
      <PresentationLandingScreen
        state={state}
        roomCode={roomCode}
        teamsCount={teamsCount}
      />
    );
  }

  // 2. Wrap all active states in 2-column layout (Main Challenge ~75% + Persistent Join Panel ~25%)
  return (
    <div className="presentation-split-layout">
      <main className="presentation-main-stage">
        {state.demoStage ? (
          <div className="competition-presentation panel">
            <span className="eyebrow accent">MÀN HÌNH MINH HỌA · TRÌNH CHIẾU MC</span>
            <Demo
              key={state.demoStage}
              stage={state.demoStage}
              readOnly
              canControlViewMode={false}
              viewMode={viewMode}
            />
          </div>
        ) : isFinalized ? (
          <div className="presentation-final-board">
            <Leaderboard state={state} />
          </div>
        ) : stage ? (
          <section className="competition-section panel competition-presentation">
            <div className="presentation-stage-header">
              <span className="eyebrow accent">
                PHIÊN {stage.stageNo} · THỬ THÁCH {stage.activeIndex + 1}/
                {stage.totalItems ?? (stage.stageNo === 1 ? 6 : 4)} · CHỈ XEM
              </span>
              <Deadline deadline={stage.deadlineAt} serverNow={state.serverNow} />
            </div>
            <Progress stage={stage} />

            {stage.itemFinalizedAt && (
              <div className="item-finalized-banner" role="status">
                <span>✓ Thử thách đã chốt! Xem kết quả và phân tích giải pháp bên dưới.</span>
              </div>
            )}

            {stage.challenge &&
              ("options" in stage.challenge ? (
                <Prompt
                  question={stage.challenge}
                  isClosed={Boolean(stage.itemFinalizedAt || stage.status === "finalized")}
                  review={stage.review?.find(
                    (r) => r.itemId === (stage.challenge as Question).id,
                  )}
                  canControlViewMode={false}
                  viewMode={viewMode}
                />
              ) : (
                <MapPrompt map={stage.challenge} />
              ))}
          </section>
        ) : null}
      </main>

      <aside className="presentation-side-rail">
        <PresentationJoinPanel
          competitionId={state.competition.id}
          roomCode={roomCode}
          teamsCount={teamsCount}
          isLanding={false}
        />
      </aside>
    </div>
  );
}

function Progress({ stage }: { stage: Stage }) {
  return (
    <p className="competition-progress" role="status">
      Đã nộp {stage.progress?.submitted ?? 0}/{stage.progress?.total ?? 0} đội ·
      Đang chờ{" "}
      {Math.max(
        0,
        (stage.progress?.total ?? 0) - (stage.progress?.submitted ?? 0),
      )}{" "}
      đội
    </p>
  );
}
