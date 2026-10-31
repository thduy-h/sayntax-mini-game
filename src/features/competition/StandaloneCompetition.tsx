import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { accessibilityScenarios, robotLevels } from "../../lib/gameLogic";
import { AdminStage, Leaderboard, Participant, Presentation } from "./CompetitionPortal";
import { Demo } from "./Demo";
import type { CompetitionState, Stage } from "./types";
import { useA11ySync } from "../../lib/a11ySync";

const questions = accessibilityScenarios.map(q => ({
  id: q.id, title: q.title, context: q.context, question: q.cue,
  options: q.options.map(({ id, label }) => ({ id, label })),
}));
const maps = robotLevels.map(m => ({ ...m, id: String(m.id), width: 6, height: 6,
  initialDirection: m.initialDirection ?? 1, maxCommands: 24 }));
function initialState(): CompetitionState {
  const now = new Date().toISOString();
  return {
    mode: "competition", role: "mc", serverNow: now,
    joinCode: "SAYNTAX-PREVIEW",
    competition: { id: "local-preview", name: "SAYNTAX · Cuộc thi diễn tập", status: "NOT_STARTED", expiresAt: now, winnerTeamId: null },
    teams: Array.from({length: 8}, (_, i) => ({ id: `demo-${i}`, name: `Đội mẫu ${i + 1}` })),
    own: { teamId: "demo-0", competitionTeamId: "demo-0", name: "Đội mẫu 1", submissions: [], tieSubmitted: false },
    stages: [1, 2].map(stageNo => ({ stageNo, status: "pending", roundId: null, activeIndex: 0,
      startedAt: null, deadlineAt: null,
      // V4: 6 questions for Accessibility, 4 levels for Robot
      totalItems: stageNo === 1 ? 6 : 4,
      config: stageNo === 1
        ? { questions: questions.slice(0, 6), scenarioIds: questions.slice(0, 6).map(q => q.id) }
        : { maps: maps.slice(0, 4), levelIds: maps.slice(0, 4).map(m => m.id) },
      progress: { total: 8, submitted: 0 },
    })),
    leaderboard: Array.from({length: 8}, (_, i) => ({ teamId: `demo-${i}`, name: `Đội mẫu ${i + 1}`,
      accessibility: 0, robot: 0, accessibility50: 0, robot50: 0, final100: 0, rank: i + 1,
      perfectAccessibility: 0, optimalRobot: 0 })),
  };
}

// Explicit local preview; never invokes Edge Functions or saves production identities.
export default function StandaloneCompetition() {
  const [state, setState] = useState(initialState);
  const [role, setRole] = useState<CompetitionState["role"]>(() => {
    const value = new URLSearchParams(window.location.search).get("view");
    return value === "team" || value === "presentation" ? value : "mc";
  });
  const [qr, setQr] = useState("");
  const [a11yViewMode, setA11yViewMode] = useA11ySync("before");
  const joinUrl = `${window.location.origin}/competition/preview?view=team`;
  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, { width: 280, margin: 4 }).then(url => { if (!cancelled) setQr(url); });
    return () => { cancelled = true; };
  }, [joinUrl]);
  async function control(action: string, extra: Record<string, unknown>) {
    setState(previous => {
      const next = structuredClone(previous);
      const stage = next.stages.find(s => s.stageNo === extra.stage);
      const now = new Date().toISOString();
      next.serverNow = now;
      if (!stage) return previous;
      if (action === "configure" && stage.status === "pending") {
        const config = extra.config as { scenarioIds?: string[]; levelIds?: string[] };
        stage.config = stage.stageNo === 1
          ? { scenarioIds: config.scenarioIds, questions: config.scenarioIds?.map(id => questions.find(q => q.id === id)!).filter(Boolean) }
          : { levelIds: config.levelIds, maps: config.levelIds?.map(id => maps.find(m => m.id === id)!).filter(Boolean) };
      }
      if (action === "show_demo") {
        next.demoStage = stage.stageNo;
        setA11yViewMode("before");
      }
      if (action === "start_stage") {
        next.demoStage = null;
        next.competition.status = `STAGE_${stage.stageNo}_ACTIVE`;
        stage.status = "active";
        stage.roundId = "local-round";
        stage.startedAt = now;
        stage.deadlineAt = new Date(Date.now() + (stage.stageNo === 1 ? 600 : 900) * 1000).toISOString();
        setA11yViewMode("before");
      }
      if (action === "advance_challenge") {
        stage.activeIndex = Math.min(stage.activeIndex + 1, (stage.totalItems ?? 1) - 1);
        stage.itemFinalizedAt = null;
        stage.progress = { total: 8, submitted: 0 };
        setA11yViewMode("before");
      }
      if (action === "close_challenge") {
        stage.itemFinalizedAt = now;
        setA11yViewMode("after");
        const currentId = (stage.stageNo === 1 ? stage.config?.scenarioIds : stage.config?.levelIds)?.[stage.activeIndex];
        if (currentId && stage.stageNo === 1) {
          stage.review = stage.review ?? [];
          if (!stage.review.some(r => r.itemId === currentId)) {
            stage.review.push({
              itemId: currentId,
              explanation: "Phương án tối ưu giải quyết rào cản cốt lõi mà không gây cản trở người dùng.",
              options: [
                { id: "o1", score: 100 },
                { id: "o2", score: 50 },
                { id: "o3", score: 0 },
              ],
            });
          }
        }
      }
      if (action === "finalize_stage") {
        stage.status = "finalized";
        next.competition.status = stage.stageNo === 2 ? "FINALIZED" : `STAGE_${stage.stageNo}_FINALIZED`;
        if (stage.stageNo === 2) {
          next.competition.winnerTeamId = "demo-0";
        }
      }
      if (action === "start_stage" || action === "advance_challenge") {
        stage.itemStartedAt = now;
        stage.itemDeadline = stage.deadlineAt;
        stage.challenge = (stage.stageNo === 1 ? stage.config?.questions : stage.config?.maps)?.[stage.activeIndex];
      }
      return next;
    });
  }
  async function submit(itemId: string, answerId: string | null) {
    setState(previous => {
      const next = structuredClone(previous);
      if (!next.own!.submissions.some(s => s.itemId === itemId)) {
        next.own!.submissions.push({ itemId, answerId, score: null });
        const stage = next.stages.find(s => s.status === "active");
        if (stage) stage.progress = { total: 8, submitted: 1 };
      }
      return next;
    });
  }
  const active = state.stages.find(s => s.status === "active") ?? state.stages.find(s => s.status === "pending") ?? state.stages[1];
  return (
    <main className={`competition-shell ${role === "presentation" ? "presentation-shell-mode" : ""}`}>
      {role !== "presentation" ? (
        <>
          <header className="competition-header">
            <a className="brand" href="/">SAYNTAX · GAME ARENA</a>
            <span>{role === "mc" ? "COMPETITION CONTROL" : "ĐỘI THI ĐẤU"}</span>
          </header>
          <section className="panel competition-section" aria-label="Điều khiển xem thử">
            <strong>STANDALONE · XEM THỬ GIAO DIỆN</strong>
            <p>Cùng giao diện cuộc thi production. Dữ liệu mẫu trên thiết bị này; không gửi bài, tính điểm chính thức hay đồng bộ thiết bị. Tải lại để đặt lại.</p>
            <div className="competition-actions">
              {([['mc', 'Màn hình MC'], ['team', 'Màn hình đội'], ['presentation', 'Màn hình trình chiếu']] as const).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`button ${role === value ? 'button-primary' : 'button-ghost'}`}
                  aria-pressed={role === value}
                  onClick={() => setRole(value)}
                >
                  {label}
                </button>
              ))}
              <button className="button button-ghost" onClick={() => setState(initialState())}>Đặt lại diễn tập</button>
            </div>
          </section>
          <h1>{state.competition.name}</h1>
          <p className="competition-state">{state.competition.status}</p>
        </>
      ) : (
        <aside className="standalone-harness-bar" aria-label="Điều khiển xem thử">
          <span className="harness-tag">STANDALONE · XEM THỬ GIAO DIỆN</span>
          <div className="harness-actions">
            {([['mc', 'Màn hình MC'], ['team', 'Màn hình đội'], ['presentation', 'Màn hình trình chiếu']] as const).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`button ${role === value ? 'button-primary' : 'button-ghost'}`}
                aria-pressed={role === value}
                onClick={() => setRole(value)}
              >
                {label}
              </button>
            ))}
            <button className="button button-ghost" onClick={() => setState(initialState())}>Đặt lại diễn tập</button>
          </div>
        </aside>
      )}
      {role === 'mc' ? (
        <>
          <p>Đội đã đăng ký: 8/8 · Dữ liệu mẫu</p>
          {state.demoStage && (
            <Demo
              stage={state.demoStage}
              canControlViewMode={true}
              viewMode={a11yViewMode}
              onViewModeChange={setA11yViewMode}
            />
          )}
          <div className="competition-stages">
            {state.stages.map(s => (
              <AdminStage
                key={s.stageNo}
                stage={s}
                state={state}
                busy={false}
                viewMode={a11yViewMode}
                onViewModeChange={setA11yViewMode}
                onControl={control}
              />
            ))}
          </div>
          <section className="panel competition-section">
            <h2>Một QR tham gia xuyên suốt cuộc thi</h2>
            <p>QR xem thử giao diện đội; không đăng ký phòng thật.</p>
            {qr && <img src={qr} width={280} height={280} alt="QR xem thử màn hình đội" />}
            <p><a href={joinUrl}>Mở màn hình đội diễn tập</a></p>
          </section>
        </>
      ) : role === 'presentation' ? (
        <Presentation
          state={{ ...state, role, joinCode: state.joinCode || "SAYNTAX-PREVIEW" }}
          viewMode={a11yViewMode}
        />
      ) : (
        <>
          {state.demoStage && (
            <Demo
              stage={state.demoStage}
              canControlViewMode={false}
              viewMode={a11yViewMode}
            />
          )}
          <Participant
            stage={active as Stage}
            state={state}
            busy={false}
            viewMode={a11yViewMode}
            onAnswer={submit}
            onRobot={async item => submit(item, null)}
          />
        </>
      )}
      {role !== 'presentation' && <Leaderboard state={state} />}
    </main>
  );
}
