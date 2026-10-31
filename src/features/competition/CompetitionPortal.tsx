import { AccessibilityDisplayContext } from "../../lib/accessibilityDisplay";
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
  RobotExecution,
  CompetitionState,
  Identity,
  MapDefinition,
  Question,
  Stage,
} from "./types";
import { isCompetitionId, isDefinitiveRobotRejection } from "./contracts";
import { Demo } from "./Demo";
import { AwardCeremony, CeremonyControls, ScoreBreakdown } from "./V5";
import { MapPrompt, Prompt, QuestionPlayer, RobotPlayer } from "./Content";
import { resolveStageChallenge } from "./canonicalQuestions";

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
  display_sync_unavailable: "Backend chưa hỗ trợ đồng bộ Trước/Sau giữa thiết bị. Cần áp dụng bản cập nhật đồng bộ hiển thị.",
  stale_demo_version: "Demo vừa thay đổi từ phiên MC khác. Đã tải lại, hãy thực hiện lại thao tác.",
  optimization_required: "Chọn Tối ưu lại để bắt đầu lượt chạy có phí sau thành công đầu tiên.",
  optimization_limit: "Đã dùng hết hai lượt tối ưu cho cấp này.",
  already_optimal: "Đã đạt lời giải tối ưu; không cần chạy có phí thêm.",
  ceremony_required: "Dùng bảng điều khiển trao giải để công bố kết quả theo từng bước.",
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
  const final = state.competition.status === "FINALIZED" || state.resultsState === "RESULTS_READY";
  const winner = state.leaderboard?.find(
    (t) => t.teamId === state.competition.winnerTeamId,
  );
  return (
    <section className="panel competition-section">
      <h2>
        {state.role === "mc" && state.resultsState === "RESULTS_READY"
          ? "Kết quả đã chốt · RIÊNG MC · Chưa công bố"
          : final ? "Bảng xếp hạng CHÍNH THỨC"
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
  // Production display state comes from the authenticated backend, across devices.
  const a11yViewMode = state?.a11yViewMode ?? "before";
  const [localDemoStage, setLocalDemoStage] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const compId = isCompetitionId(competitionId) ? competitionId : "";
      if (compId) {
        const stored = localStorage.getItem(`sayntax-demo-${compId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < 3600000) return parsed.stage;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    const compId = state?.competition?.id || (isCompetitionId(competitionId) ? competitionId : "");
    if (typeof window === "undefined" || !compId) return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`sayntax-comp-${compId}`);
      bc.onmessage = (event) => {
        if (event.data?.type === "show_demo") {
          setLocalDemoStage(event.data.stage);
        } else if (event.data?.type === "clear_demo") {
          setLocalDemoStage(null);
        }
      };
    } catch {
      // ignore
    }
    return () => {
      bc?.close();
    };
  }, [state?.competition?.id, competitionId]);

  const activeDemoStage = state?.rulesVersion === "v5" ? state.demoStage : state?.demoStage ?? localDemoStage;

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
    let pollInterval = 5000;
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
          pollInterval = next.demoStage === 2 && next.robotDemo ? 1000 : 5000;
          setConnection(pollInterval === 1000 ? "Đã kết nối · Demo trực tiếp mỗi giây" : "Đã kết nối · Cập nhật mỗi 5 giây");
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
        if (!disposed) timer = window.setTimeout(() => void poll(), pollInterval);
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
  const setA11yViewMode = (mode: "before" | "after") => {
    if (identity?.role !== "mc") return;
    void run(async () => {
      if (!state?.a11yViewScope) {
        throw new ArenaApiError("display_sync_unavailable");
      }
      await control("set_a11y_view", {
        viewMode: mode,
        viewScope: state.a11yViewScope,
      });
    });
  };
  const setColorblindSim = (enabled: boolean) => {
    if (identity?.role !== "mc") return;
    void run(async () => {
      if (!state?.a11yViewScope || typeof state.a11yColorblindSim !== "boolean") {
        throw new ArenaApiError("display_sync_unavailable");
      }
      await control("set_a11y_vision", { enabled, viewScope: state.a11yViewScope });
    });
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
  const submitRobot = async (item: string, commands: Command[], optimization = false) => {
    if (!identity || !state) throw new Error("forbidden");
    const stage = state.stages.find((s) => s.stageNo === 2);
    if (!stage?.roundId) throw new Error("round_not_running");
    const pendingKey = `arena-official-run:${stage.roundId}:${state.own?.teamId ?? identity.teamId}:${item}`;
    const payload = JSON.stringify({ commands, optimization });
    let pending: { payload: string; key: string } | null = null;
    try { pending = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null"); } catch { /* regenerate invalid local retry cache */ }
    if (pending && pending.payload !== payload) throw new Error("pending_official_run");
    const key = pending?.key ?? crypto.randomUUID();
    sessionStorage.setItem(pendingKey, JSON.stringify({ payload, key }));
    const result = await invokeArena<{ accepted: boolean; execution?: RobotExecution }>(
      "arena-submit-robot",
      {
        roundId: stage.roundId,
        teamId: state.own?.teamId ?? identity.teamId,
        itemId: item,
        commands,
        optimization,
        idempotencyKey: key,
      },
      headers(identity),
    ).catch(async (e) => {
      if (isDefinitiveRobotRejection(e)) {
        sessionStorage.removeItem(pendingKey);
        await refresh().catch(() => undefined);
      }
      throw e;
    });
    if (!result.accepted) throw new Error("submission_failed");
    sessionStorage.removeItem(pendingKey);
    await refresh().catch((e) => setError(message(e)));
    return result.execution;
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
    <AccessibilityDisplayContext.Provider value={{
      colorblindSim: state?.a11yColorblindSim ?? false,
      busy,
      onColorblindSimChange: state?.role === "mc" ? setColorblindSim : undefined,
    }}>
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
              {activeDemoStage && (
                <Demo
                  key={activeDemoStage}
                  stage={activeDemoStage}
                  canControlViewMode={true}
                  viewMode={a11yViewMode}
                  robotDemo={state.robotDemo}
                  busy={busy}
                  onRobotDemo={(op, commands) => void run(() => control("robot_demo", { demo: { version: state.robotDemo?.version, op, commands } }))}
                  onViewModeChange={setA11yViewMode}
                  onClose={() => {
                    if (state.rulesVersion === "v5") void run(() => control("end_demo"));
                    setLocalDemoStage(null);
                    try {
                      const compId = state.competition.id;
                      const bc = new BroadcastChannel(`sayntax-comp-${compId}`);
                      bc.postMessage({ type: "clear_demo" });
                      localStorage.removeItem(`sayntax-demo-${compId}`);
                    } catch {
                      // ignore
                    }
                  }}
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
                    activeDemoStage={activeDemoStage}
                    onSetLocalDemoStage={setLocalDemoStage}
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
              {activeDemoStage && (
                <Demo key={activeDemoStage} stage={activeDemoStage} viewMode={a11yViewMode} robotDemo={state.robotDemo} />
              )}
              <section className="competition-section panel">
                <h2>{state.own?.name}</h2>
                <p className="competition-team-id-hint">
                  <span>ID đội: {state.own?.competitionTeamId}</span>
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
                onRobot={async (item, commands, optimization) => {
                  if (busyRef.current) throw new Error("busy");
                  busyRef.current = true; setBusy(true); setError(null);
                  try { return await submitRobot(item, commands, optimization); }
                  catch (e) { setError(message(e)); throw e; }
                  finally { busyRef.current = false; setBusy(false); }
                }}
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
              <div className="competition-results" aria-label={state.role === "mc" ? "Kết quả riêng MC" : "Kết quả của đội"}>
                <Leaderboard state={state} />
                {state.scoreExplanations?.map(e => <ScoreBreakdown key={e.teamId} explanation={e} />)}
              </div>
              {state.stages
                .filter((s) => s.status === "finalized")
                .map((s) => (
                  <Review key={s.stageNo} stage={s} />
                ))}
              {state.role === "mc" &&
                (state.competition.status === "STAGE_2_FINALIZED" || (state.rulesVersion === "v5" && state.competition.status === "FINALIZED")) && (
                  <section className="competition-section panel">
                    <h2>Chốt kết quả chung cuộc</h2>
                    <p>
                      {state.rulesVersion === "v5" ? "Luật V5: điểm tổng → số cấp Robot tối ưu → ít lượt chạy Robot chính thức → số câu Accessibility hoàn hảo → sudden death. Không xét tốc độ." : "Hòa điểm: Accessibility hoàn hảo → Robot tối ưu → sudden death."}
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
                      {state.rulesVersion === "v5" ? <CeremonyControls state={state} busy={busy} onControl={(action, extra) => void run(() => control(action, extra))} /> : <button
                        className="button button-primary"
                        disabled={busy || state.tie?.active || state.tie?.candidates.length !== 1}
                        onClick={() => void run(() => control("publish"))}
                      >Công bố đội chiến thắng</button>}
                    </div>
                  </section>
                )}
            </>
          )}
        </>
      )}
    </main>
    </AccessibilityDisplayContext.Provider>
  );
}

export function AdminStage({
  stage: s,
  state,
  busy,
  onControl,
  viewMode,
  onViewModeChange,
  activeDemoStage,
  onSetLocalDemoStage,
}: {
  stage: Stage;
  state: CompetitionState;
  busy: boolean;
  onControl: (action: string, extra: Record<string, unknown>) => Promise<void>;
  viewMode?: "before" | "after";
  onViewModeChange?: (mode: "before" | "after") => void;
  activeDemoStage?: number | null;
  onSetLocalDemoStage?: (stage: number | null) => void;
}) {
  const [ids, setIds] = useState<string[]>(() =>
      s.stageNo === 1
        ? (s.config?.scenarioIds ?? [])
        : (s.config?.levelIds ?? []),
    ),
    [preview, setPreview] = useState(false);
  const isDemoActiveForThisStage = (activeDemoStage ?? state.demoStage) === s.stageNo;
  const [localDemoShown, setLocalDemoShown] = useState(() => isDemoActiveForThisStage);
  const demoShown = isDemoActiveForThisStage || localDemoShown;

  const content = s.stageNo === 1 ? s.config?.questions : s.config?.maps;
  const totalItems = s.totalItems ?? content?.length;
  const registeredTeams = state.teams?.length;
  const synchronized = Boolean(s.progress) && typeof s.itemDeadline === "string" &&
    (registeredTeams === undefined || s.progress?.total === registeredTeams);

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
        {(totalItems ?? (s.stageNo === 1 ? 6 : 4)) * 100} {s.stageNo === 1 ? "XP" : "điểm"} → 50 điểm
      </p>
      <Deadline
        deadline={s.status === "active" ? s.deadlineAt : null}
        serverNow={state.serverNow}
      />
      <details>
        <summary>Cấu hình {totalItems ?? (s.stageNo === 1 ? 6 : 4)} {s.stageNo === 1 ? "câu hỏi" : "màn"}</summary>
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
                  !ids.includes(id) && ids.length >= (totalItems ?? (s.stageNo === 1 ? 6 : 4))
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
            disabled={ids.length !== (totalItems ?? (s.stageNo === 1 ? 6 : 4))}
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
            setLocalDemoShown(true);
            onSetLocalDemoStage?.(s.stageNo);
            try {
              const bc = new BroadcastChannel(`sayntax-comp-${state.competition.id}`);
              bc.postMessage({ type: "show_demo", stage: s.stageNo });
              localStorage.setItem(
                `sayntax-demo-${state.competition.id}`,
                JSON.stringify({ stage: s.stageNo, timestamp: Date.now() }),
              );
            } catch {
              // ignore
            }
            void onControl("show_demo", { stage: s.stageNo });
            setTimeout(() => {
              document.getElementById("competition-demo-section")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        >
          {demoShown ? "▶ Demo đã hiển thị" : "Hiển thị Demo phiên " + s.stageNo}
        </button>
        <button
          className="button button-primary"
          disabled={busy || !allowed || s.status !== "pending" || !demoShown}
          title={!demoShown ? "Phải hiển thị Demo trước khi bắt đầu phiên thi" : undefined}
          onClick={() => {
            setLocalDemoShown(false);
            onSetLocalDemoStage?.(null);
            try {
              const bc = new BroadcastChannel(`sayntax-comp-${state.competition.id}`);
              bc.postMessage({ type: "clear_demo" });
              localStorage.removeItem(`sayntax-demo-${state.competition.id}`);
            } catch {
              // ignore
            }
            void onControl("start_stage", { stage: s.stageNo });
          }}
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
      {demoShown && s.status === "pending" && (
        <div className="demo-active-banner" role="status">
          <div className="demo-banner-header">
            <span className="dot dot-green" />
            <strong>⚡ Demo phiên {s.stageNo} đang phát sóng trực tiếp!</strong>
          </div>
          <p>
            Khung Demo đang hiển thị ở phần trên màn hình MC, đồng thời xuất hiện trên Máy chiếu và Thiết bị đội thi.
          </p>
          <div className="demo-banner-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                document.getElementById("competition-demo-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              ⬆ Cuộn lên xem &amp; điều khiển Demo
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                if (state.rulesVersion === "v5") void onControl("end_demo", {});
                setLocalDemoShown(false);
                onSetLocalDemoStage?.(null);
                try {
                  const bc = new BroadcastChannel(`sayntax-comp-${state.competition.id}`);
                  bc.postMessage({ type: "clear_demo" });
                  localStorage.removeItem(`sayntax-demo-${state.competition.id}`);
                } catch {
                  // ignore
                }
              }}
            >
              ✕ Ẩn Demo
            </button>
          </div>
        </div>
      )}
      {s.status === "active" && (
        <>
          <h3>
            Thử thách {s.activeIndex + 1}/
            {totalItems ?? "?"}
          </h3>
          <Progress stage={s} registeredTeams={state.teams?.length} />
          {!synchronized && (
            <p role="alert">
              Backend chưa cung cấp trạng thái điều khiển từng thử thách. Cần cập nhật
              migration và Edge Functions tương thích trước khi chuyển câu;
              không thể suy ra lượt nộp từ danh sách đội.
            </p>
          )}
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
              disabled={busy || !synchronized || Boolean(s.itemFinalizedAt)}
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
              disabled={busy || !synchronized || !totalItems || s.activeIndex >= totalItems - 1}
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
  onRobot: (item: string, commands: Command[], optimization?: boolean) => Promise<RobotExecution | void>;
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
  const item = resolveStageChallenge(stage);
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
            pendingRunKey={`arena-official-run:${stage.roundId}:${state.own?.teamId}:${item.id}`}
            busy={busy || closed}
            score={
              state.own?.submissions.find((x) => x.itemId === item.id)?.score
            }
            strategic={state.rulesVersion === "v5"}
            level={state.robotLevels?.find(r => r.itemId === item.id)}
            onSubmit={(commands, optimization) => onRobot(item.id, commands, optimization)}
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
            <span className="brand-status-live competition-state">
              <span className="live-pulse-dot" />
              LIVE WORKSHOP · {state.competition.status}
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
  const ceremony = state.rulesVersion === "v5" && ["STAGE_2_FINALIZED", "FINALIZED"].includes(state.competition.status);
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

  const [localDemoStage, setLocalDemoStage] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(`sayntax-demo-${state.competition.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 3600000) return parsed.stage;
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !state.competition.id) return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`sayntax-comp-${state.competition.id}`);
      bc.onmessage = (event) => {
        if (event.data?.type === "show_demo") {
          setLocalDemoStage(event.data.stage);
        } else if (event.data?.type === "clear_demo") {
          setLocalDemoStage(null);
        }
      };
    } catch {
      // ignore
    }
    return () => {
      bc?.close();
    };
  }, [state.competition.id]);

  const effectiveDemoStage = state.rulesVersion === "v5" ? state.demoStage : state.demoStage ?? (!stage ? localDemoStage : null);
  const presentationItem = stage ? resolveStageChallenge(stage) : null;

  // 1. Landing state when competition is NOT started or between stages without active challenge
  if (!effectiveDemoStage && !stage && !isFinalized && !ceremony) {
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
        {ceremony ? <AwardCeremony state={state} /> : effectiveDemoStage ? (
          <div className="competition-presentation panel">
            <span className="eyebrow accent">MÀN HÌNH MINH HỌA · TRÌNH CHIẾU MC</span>
            <span className="competition-state brand-status-live" style={{ marginLeft: "12px" }}>
              <span className="live-pulse-dot" /> {state.competition.status}
            </span>
            <Demo
              key={effectiveDemoStage}
              stage={effectiveDemoStage}
              robotDemo={state.robotDemo}
              readOnly
              canControlViewMode={false}
              viewMode={viewMode}
            />
          </div>
        ) : isFinalized ? (
          <div className="presentation-final-board">
            <span className="competition-state brand-status-live">
              <span className="live-pulse-dot" /> {state.competition.status}
            </span>
            <Leaderboard state={state} />
          </div>
        ) : stage ? (
          <section className="competition-section panel competition-presentation">
            <div className="presentation-stage-header">
              <span className="eyebrow accent">
                PHIÊN {stage.stageNo} · THỬ THÁCH {stage.activeIndex + 1}/
                {stage.totalItems ?? (stage.stageNo === 1 ? 6 : 4)} · CHỈ XEM
              </span>
              <span className="competition-state brand-status-live" style={{ marginLeft: "12px" }}>
                <span className="live-pulse-dot" /> {state.competition.status}
              </span>
              <Deadline deadline={stage.deadlineAt} serverNow={state.serverNow} />
            </div>
            <Progress stage={stage} />

            {stage.itemFinalizedAt && (
              <div className="item-finalized-banner" role="status">
                <span>✓ Thử thách đã chốt! Xem kết quả và phân tích giải pháp bên dưới.</span>
              </div>
            )}

            {presentationItem &&
              ("options" in presentationItem ? (
                <Prompt
                  question={presentationItem}
                  isClosed={Boolean(stage.itemFinalizedAt || stage.status === "finalized")}
                  review={stage.review?.find(
                    (r) => r.itemId === (presentationItem as Question).id,
                  )}
                  canControlViewMode={false}
                  viewMode={viewMode}
                />
              ) : (
                <MapPrompt map={presentationItem} />
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

function Progress({ stage, registeredTeams }: { stage: Stage; registeredTeams?: number }) {
  if (!stage.progress || (registeredTeams !== undefined && stage.progress.total !== registeredTeams)) return (
    <p className="competition-progress" role="status">
      {registeredTeams === undefined ? "" : `Đã đăng ký ${registeredTeams} đội · `}
      Chưa nhận được tiến độ nộp bài từ backend.
    </p>
  );
  return (
    <p className="competition-progress" role="status">
      Đã nộp {stage.progress.submitted}/{stage.progress.total} đội · Đang chờ{" "}
      {Math.max(0, stage.progress.total - stage.progress.submitted)} đội
    </p>
  );
}
