import { useEffect, useMemo, useState } from "react";
import { RobotMap } from "./Content";
import { DEMO_MAP } from "./Demo";
import type { Command, CompetitionState, RobotDemoState, ScoreExplanation } from "./types";

const commandLabel = (c: Command) => ({ forward: "↑ Đi thẳng", left: "↶ Rẽ trái", right: "↷ Rẽ phải" })[c];
export type DemoOperation = "queue" | "run" | "resume" | "pause" | "step" | "reset" | "explain";

export function LiveRobotDemo({ state, onAction, busy = false }: {
  state: RobotDemoState; busy?: boolean;
  onAction?: (op: DemoOperation, commands?: Command[]) => void;
}) {
  const [, tick] = useState(0);
  const receivedAt = useMemo(() => performance.now(), [state]);
  useEffect(() => {
    if (state.status !== "running") return;
    const timer = window.setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(timer);
  }, [state]);
  const time = Date.parse(state.serverNow ?? "") + performance.now() - receivedAt;
  const index = state.status === "running" && state.startedAt
    ? Math.min(state.trace.length - 1, (state.playbackOriginStep ?? 0) + Math.max(0, Math.floor((time - Date.parse(state.startedAt)) / 500)))
    : state.currentStepIndex;
  const current = state.trace[index] ?? state.trace[0] ?? { ...DEMO_MAP.start, direction: DEMO_MAP.initialDirection };
  const status = index === state.trace.length - 1 && index > 0 && state.status === "running"
    ? current.goal ? "completed" : "failed" : state.status;
  const edit = (commands: Command[]) => onAction?.("queue", commands);
  return <article className="live-robot-demo" aria-label="Robot Demo trực tiếp">
    <span className="eyebrow accent">ROBOT DEMO · LIVE · 0 ĐIỂM THI ĐẤU</span>
    <h2>Lập trình cùng MC</h2>
    <div className="live-demo-grid">
      <div><RobotMap map={DEMO_MAP} position={current} direction={current.direction} /><p>Xuất phát (0,2) → Cờ (2,1). Rẽ chỉ đổi hướng.</p></div>
      <section className="live-demo-queue" aria-label="Hàng lệnh MC">
        <h3>CHƯƠNG TRÌNH MC</h3>
        <ol>{state.commands.map((cmd, i) => <li key={i} className={i === index - 1 ? "current-command" : ""} aria-current={i === index - 1 ? "step" : undefined}>
          <span>{String(i + 1).padStart(2, "0")} {commandLabel(cmd)}</span>
          {onAction && <span className="queue-edit">
            <button disabled={busy || i === 0} aria-label={`Đưa lệnh ${i + 1} lên`} onClick={() => { const next = [...state.commands]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; edit(next); }}>↑</button>
            <button disabled={busy} aria-label={`Xóa lệnh ${i + 1}`} onClick={() => edit(state.commands.filter((_, n) => n !== i))}>×</button>
          </span>}
        </li>)}</ol>
        {!state.commands.length && <p>Chờ MC thêm lệnh đầu tiên.</p>}
        <p role="status" data-testid="demo-step">Bước {index}/{Math.max(0, state.trace.length - 1)} · {status}</p>
        <p>Vị trí ({current.x},{current.y}) · Hướng {["Bắc", "Đông", "Nam", "Tây"][current.direction]}</p>
      </section>
    </div>
    {onAction && <div className="competition-actions">
      {(["forward", "left", "right"] as Command[]).map(cmd => <button className="button button-ghost" key={cmd} disabled={busy || state.commands.length >= 24} onClick={() => edit([...state.commands, cmd])}>{commandLabel(cmd)}</button>)}
      <button className="button button-primary" disabled={busy || !state.commands.length} onClick={() => onAction(state.status === "running" ? "pause" : "run")}>{state.status === "running" ? "Tạm dừng demo" : "Chạy / Tiếp tục demo"}</button>
      <button className="button button-ghost" disabled={busy} onClick={() => onAction("step")}>Từng bước demo</button>
      <button className="button button-ghost" disabled={busy} onClick={() => onAction("reset")}>Đặt lại demo</button>
      <button className="button button-ghost" disabled={busy} onClick={() => edit([])}>Xóa hàng lệnh</button>
      <button className="button button-ghost" disabled={busy} onClick={() => onAction("explain")}>Giải thích lời giải demo</button>
    </div>}
    {state.explanation && <p className="demo-explanation">Lời giải mẫu riêng cho demo: {state.solution?.map(commandLabel).join(" → ")} (5 lệnh). Không thuộc đề thi chính thức.</p>}
    {!onAction && <p className="eyebrow">CHỈ XEM · MC ĐIỀU KHIỂN</p>}
  </article>;
}

export function ScoreBreakdown({ explanation, robotOnly = false }: { explanation: ScoreExplanation; robotOnly?: boolean }) {
  const t = explanation.totals;
  return <details className="score-breakdown">
    <summary>Vì sao {explanation.name} được số điểm này?{t ? ` ${Number(t.final100).toFixed(2)}/100` : ""}</summary>
    <p>Chỉ kết quả đã chốt. {robotOnly ? "Robot /400 × 100" : "Accessibility /600 × 50 + Robot /400 × 50"}. Chỉ làm tròn khi hiển thị.</p>
    {!robotOnly && <><h3>Accessibility · {t?.accessibility ?? 0}/600 → {Number(t?.accessibility50 ?? 0).toFixed(2)}/50</h3><ul>{explanation.accessibility.map(q => <li key={q.itemId}>{q.label}: <strong>{q.score}/{q.maximum} XP</strong></li>)}</ul></>}
    <h3>Robot · {t?.robot ?? 0}/400 → {Number(t?.robot50 ?? 0).toFixed(2)}/{robotOnly ? 100 : 50}</h3>
    <div className="score-level-list">{explanation.robot.map((r, i) => <article key={r.itemId} className="score-level">
      <h4>{r.label ?? `Robot cấp ${i + 1}`} · {r.finalScore}/100</h4>
      <dl>
        <div><dt>Trạng thái</dt><dd>{r.successful ? "Đã hoàn thành" : "Chưa hoàn thành"}</dd></div>
        <div><dt>Hoàn thành đầu tiên</dt><dd>{r.firstCommands ?? "Chưa hoàn thành"}{r.firstCommands != null ? " lệnh" : ""}</dd></div>
        <div><dt>Tốt nhất / tối ưu</dt><dd>{r.bestCommands ?? "—"} / {r.optimalCommands ?? "—"} lệnh</dd></div>
        <div><dt>Lệnh vượt tối ưu</dt><dd>{r.extraCommands ?? "—"}</dd></div>
        <div><dt>Điểm nền tốt nhất</dt><dd>{r.bestBaseScore}</dd></div>
        <div><dt>Lượt chạy chính thức</dt><dd>{r.officialRuns}</dd></div>
        <div><dt>Tối ưu lại</dt><dd>{r.optimizationAttempts} × −5 = −{r.penalty}</dd></div>
        <div><dt>Điểm cấp này</dt><dd>{r.finalScore}/100</dd></div>
      </dl>
    </article>)}</div>
  </details>;
}

const phases = ["waiting", "intro", "ranking", "winner", "explanation", "closing"] as const;
const phaseLabels = ["Chờ trao giải", "Chuẩn bị công bố", "Hiển thị bảng xếp hạng", "Công bố đội vô địch", "Giải thích điểm số", "Kết thúc trao giải"];
export function CeremonyControls({ state, busy, onControl }: { state: CompetitionState; busy: boolean; onControl: (action: string, extra: Record<string, unknown>) => void }) {
  const phase = state.ceremonyPhase ?? "waiting";
  const n = phases.indexOf(phase);
  const tied = state.tie?.active || state.tie?.candidates.length !== 1;
  return <section className="competition-section panel ceremony-controls">
    <h2>ĐIỀU KHIỂN TRAO GIẢI</h2>
    <p>Kết quả được giữ riêng cho MC tới khi công bố bảng xếp hạng. Không tự chuyển bước.</p>
    <p>{phaseLabels[n]}{tied && n < 2 ? " · Đồng hạng — Chờ phân định" : ""}</p>
    {n < phases.length - 1 && <button className="button button-primary" disabled={busy || (n === 1 && Boolean(tied))} onClick={() => onControl("ceremony", { phase: phases[n + 1], expectedPhase: phase })}>{phaseLabels[n + 1]}</button>}
  </section>;
}

export function AwardCeremony({ state }: { state: CompetitionState }) {
  const phase = state.ceremonyPhase ?? "waiting";
  const winner = state.leaderboard?.find(t => t.teamId === state.competition.winnerTeamId);
  const showRanking = ["ranking", "winner", "explanation", "closing"].includes(phase);
  return <section className={`award-ceremony ceremony-${phase}`} aria-label="Lễ trao giải SAYNTAX">
    <span className="eyebrow">SAYNTAX · GAME ARENA</span>
    <p className="ceremony-kicker">{state.competitionMode === "robot_only" ? "ROBOT COMMANDS · 4 MÀN THỬ THÁCH" : "HAI CHẶNG THỬ THÁCH · MỘT HÀNH TRÌNH"}</p>
    <h1>{phase === "waiting" ? "Hẹn gặp tại lễ trao giải" : phase === "intro" ? "Sẵn sàng cho khoảnh khắc này?" : phase === "ranking" ? "Bảng vàng SAYNTAX" : phase === "closing" ? "Cảm ơn các đội thi!" : "ĐỘI VÔ ĐỊCH"}</h1>
    {!showRanking && <p>Kết quả đã được ghi nhận. MC sẽ công bố vào cuối workshop.</p>}
    {winner && ["winner", "explanation", "closing"].includes(phase) && <div className="champion-announcement">
      <span className="champion-mark" aria-hidden="true">★</span><h2>{winner.name}</h2>
      <strong className="champion-score">{Number(winner.final100).toFixed(2)}<small>/100</small></strong>
      <p>{state.competitionMode === "robot_only" ? <>Robot {Number(winner.robot50).toFixed(2)}/100</> : <>Accessibility {Number(winner.accessibility50).toFixed(2)}/50 · Robot {Number(winner.robot50).toFixed(2)}/50</>}</p>
    </div>}
    {showRanking && <ol className="ceremony-ranking">{state.leaderboard?.map(t => <li key={t.teamId}>
      <span>#{t.rank}</span><strong>{t.name}</strong><span>{state.competitionMode === "robot_only" ? <>R {Number(t.robot50).toFixed(2)}/100</> : <>A {Number(t.accessibility50).toFixed(2)} · R {Number(t.robot50).toFixed(2)}</>}</span><b>{Number(t.final100).toFixed(2)}/100</b>
    </li>)}</ol>}
    {phase === "explanation" && state.scoreExplanations?.map(e => <ScoreBreakdown key={e.teamId} explanation={e} robotOnly={state.competitionMode === "robot_only"} />)}
  </section>;
}
