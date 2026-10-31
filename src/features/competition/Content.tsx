import { useEffect, useMemo, useState } from "react";
import type { Command, MapDefinition, Question, RobotLevelSummary, RobotExecution } from "./types";
import { simulate } from "./robotEngine";
import { isDefinitiveRobotRejection } from "./contracts";
import { AccessibilityChallengeVisual } from "../../components/AccessibilityChallengeVisual";

export function Prompt({
  question,
  isClosed = false,
  review,
  viewMode,
  onViewModeChange,
  canControlViewMode = false,
}: {
  question: Question;
  isClosed?: boolean;
  review?: {
    itemId?: string;
    explanation?: string;
    options?: { id: string; score: number }[];
  };
  viewMode?: "before" | "after";
  onViewModeChange?: (mode: "before" | "after") => void;
  canControlViewMode?: boolean;
}) {
  return (
    <article className="competition-prompt">
      <div className="competition-prompt-header">
        <span className="eyebrow accent">THỬ THÁCH TIẾP CẬN · ACCESSIBILITY CHALLENGE</span>
        <h2>{question.title}</h2>
      </div>
      <p className="competition-context">{question.context}</p>

      {/* Visual illustration of the problematic interface */}
      <AccessibilityChallengeVisual
        scenarioId={question.id}
        isClosed={isClosed}
        review={review}
        options={question.options}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        canControlViewMode={canControlViewMode}
      />

      <div className="competition-question-box">
        <h3>{question.question}</h3>
        <ol className="competition-options">
          {question.options.map((o, i) => (
            <li key={o.id} className="competition-option-item">
              <span className="option-letter">{String.fromCharCode(65 + i)}.</span>
              <span className="option-text">{o.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
export function RobotMap({
  map,
  position = map.start,
  direction = map.initialDirection,
}: {
  map: MapDefinition;
  position?: { x: number; y: number };
  direction?: number;
}) {
  return (
    <div
      className="robot-board competition-map"
      style={{
        gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))`,
        aspectRatio: `${map.width} / ${map.height}`,
      }}
      role="grid"
      aria-label={map.name}
    >
      {Array.from({ length: map.width * map.height }, (_, i) => {
        const x = i % map.width,
          y = Math.floor(i / map.width),
          robot = position.x === x && position.y === y,
          goal = map.goal.x === x && map.goal.y === y,
          wall = map.walls.includes(`${x},${y}`);
        return (
          <div
            style={{
              borderRight: x === map.width - 1 ? 0 : undefined,
              borderBottom: y === map.height - 1 ? 0 : undefined,
            }}
            role="gridcell"
            aria-label={`Ô ${x},${y}${wall ? ", tường" : ""}${goal ? ", đích" : ""}`}
            key={i}
            className={`board-cell ${wall ? "is-wall" : ""} ${goal ? "is-goal" : ""}`}
          >
            {robot ? (
              <div
                className="robot-sprite"
                role="img"
                aria-label={`Robot hướng ${["Bắc", "Đông", "Nam", "Tây"][direction]}`}
              >
                <div
                  className="robot-facing"
                  style={{ transform: `rotate(${direction * 90}deg)` }}
                >
                  <div className="robot-head">
                    <span className="robot-arrow-pointer">▲</span>
                    <div className="robot-eyes">
                      <span className="eye" />
                      <span className="eye" />
                    </div>
                    <span className="robot-mouth" />
                  </div>
                </div>
              </div>
            ) : goal ? (
              "⚑"
            ) : wall ? (
              <div className="wall-block" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
export function MapPrompt({ map }: { map: MapDefinition }) {
  return (
    <article className="competition-prompt">
      <h2>{map.name}</h2>
      <p>
        Đưa robot tới ô cờ bằng Đi thẳng, Rẽ trái, Rẽ phải. Tối đa 24 lệnh.
        Chương trình kết thúc ngay khi tới đích.
      </p>
      <RobotMap map={map} />
    </article>
  );
}
export function QuestionPlayer({
  question,
  answer,
  onAnswer,
  busy,
  confirmation,
  isClosed = false,
  review,
  viewMode,
  onViewModeChange,
  canControlViewMode = false,
}: {
  confirmation?: string;
  question: Question;
  answer?: string | null;
  onAnswer: (answer: string) => Promise<void>;
  busy: boolean;
  isClosed?: boolean;
  review?: {
    itemId?: string;
    explanation?: string;
    options?: { id: string; score: number }[];
  };
  viewMode?: "before" | "after";
  onViewModeChange?: (mode: "before" | "after") => void;
  canControlViewMode?: boolean;
}) {
  return (
    <article className="competition-prompt">
      <div className="competition-prompt-header">
        <span className="eyebrow accent">THỬ THÁCH TIẾP CẬN · DÀNH CHO ĐỘI THI</span>
        <h2>{question.title}</h2>
      </div>
      <p className="competition-context">{question.context}</p>

      {/* Synchronized visual illustration of the problematic interface */}
      <AccessibilityChallengeVisual
        scenarioId={question.id}
        isClosed={isClosed}
        review={review}
        options={question.options}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        canControlViewMode={canControlViewMode}
      />

      <div className="competition-question-box">
        <h3>{question.question}</h3>
        <div className="option-list-enhanced">
          {question.options.map((o, i) => (
            <button
              key={o.id}
              className={`option-card ${answer === o.id ? "competition-selected" : ""}`}
              type="button"
              aria-pressed={answer === o.id}
              disabled={busy || Boolean(answer) || isClosed}
              onClick={() => void onAnswer(o.id)}
            >
              <b>{String.fromCharCode(65 + i)}.</b> {o.label}
            </button>
          ))}
        </div>
      </div>
      {answer && !isClosed && (
        <p role="status" className="answer-confirmation-note">
          {confirmation ??
            "✓ Đã ghi nhận lựa chọn. Đáp án và giải thích sẽ mở sau khi MC chốt phiên."}
        </p>
      )}
    </article>
  );
}
function PracticeRobotPlayer({ map, onSubmit, busy }: {
  map: MapDefinition; onSubmit: (commands: Command[], optimization?: boolean) => Promise<void>; busy: boolean;
}) {
  const [commands, setCommands] = useState<Command[]>([]), [step, setStep] = useState(0), [running, setRunning] = useState(false);
  const trace = useMemo(() => simulate(map, commands), [map, commands]);
  const current = trace[Math.min(step, trace.length - 1)];
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (step >= trace.length - 1) setRunning(false); else setStep(step + 1);
    }, 320);
    return () => clearTimeout(timer);
  }, [running, step, trace.length]);
  const edit = (next: Command[]) => { setRunning(false); setStep(0); setCommands(next); };
  return <article className="competition-prompt">
    <h2>{map.name}</h2><p>Luyện tập · 0 XP thi đấu · Ví dụ riêng, không thuộc đề thi.</p>
    <RobotMap map={map} position={current} direction={current.direction} />
    <p role="status">Bước {step}/{commands.length} · Hướng {["Bắc", "Đông", "Nam", "Tây"][current.direction]}{current.blocked ? " · Va chạm" : current.goal ? " · Đã tới đích" : ""}</p>
    <div className="competition-command-list" aria-label="Chương trình robot">{commands.map((cmd, i) => <span key={i}>{i + 1}. {cmd === "forward" ? "↑" : cmd === "left" ? "↶" : "↷"}</span>)}</div>
    <div className="competition-actions">{(["forward", "left", "right"] as Command[]).map((cmd, i) => <button className="button button-ghost" disabled={running || busy || commands.length >= 24} key={cmd} onClick={() => edit([...commands, cmd])}>{["Đi thẳng", "Rẽ trái", "Rẽ phải"][i]}</button>)}</div>
    <div className="competition-actions">
      <button className="button button-primary" disabled={!commands.length || busy} onClick={() => { if (step >= trace.length - 1) setStep(0); setRunning(!running); }}>{running ? "Tạm dừng" : "Chạy thử / Tiếp tục"}</button>
      <button className="button button-ghost" disabled={running || busy || step >= trace.length - 1} onClick={() => setStep(step + 1)}>Từng bước</button>
      <button className="button button-ghost" disabled={busy} onClick={() => { setRunning(false); setStep(0); }}>Đặt lại</button>
      <button className="button button-ghost" disabled={running || busy} onClick={() => edit(commands.slice(0, -1))}>Xóa lệnh cuối</button>
      <button className="button button-ghost" disabled={running || busy} onClick={() => edit([])}>Xóa hết</button>
    </div>
    <button className="button button-primary" disabled={busy || running || !current.goal} onClick={() => void onSubmit(commands)}>So sánh lời giải demo</button>
    <p>Demo chỉ chạy trên thiết bị, không gửi bài và không có điểm thi đấu. Tới đích rồi bấm So sánh lời giải demo để xem cách tối ưu.</p>
  </article>;
}

// All scored routes use this boundary, including legacy competition rooms.
export function RobotPlayer(props: {
  demo?: boolean; level?: RobotLevelSummary; strategic?: boolean; map: MapDefinition; pendingRunKey?: string;
  onSubmit: (commands: Command[], optimization?: boolean) => Promise<RobotExecution | void>;
  busy: boolean; score?: number | null;
}) {
  if (props.demo) return <PracticeRobotPlayer {...props} onSubmit={async (commands, optimization) => { await props.onSubmit(commands, optimization); }} />;
  return <OfficialRobotPlayer {...props} />;
}
function OfficialRobotPlayer({ map, onSubmit, busy, level, score, strategic, pendingRunKey }: Parameters<typeof RobotPlayer>[0]) {
  const [pendingProgram] = useState(() => {
    try { return JSON.parse(JSON.parse(sessionStorage.getItem(pendingRunKey ?? "") ?? "null")?.payload ?? "null") as { commands: Command[]; optimization: boolean } | null; }
    catch { return null; }
  });
  const [retryProgram, setRetryProgram] = useState(pendingProgram);
  const [commands, setCommands] = useState<Command[]>(pendingProgram?.commands ?? []);
  const [trace, setTrace] = useState<RobotExecution["trace"]>([]);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [running, setRunning] = useState(false);
  const [optimizing, setOptimizing] = useState(pendingProgram?.optimization ?? false);
  const [error, setError] = useState<string | null>(null);
  const locked = busy || pending || running;
  const current = trace[step] ?? { ...map.start, direction: map.initialDirection, blocked: false, goal: false };
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (step >= trace.length - 1) setRunning(false);
      else setStep(step + 1);
    }, 320);
    return () => clearTimeout(timer);
  }, [running, step, trace.length]);
  const edit = (next: Command[]) => { if (locked || retryProgram) return; setCommands(next); setTrace([]); setStep(0); };
  const execute = async () => {
    if (locked || !commands.length) return;
    const optimization = retryProgram?.optimization ?? Boolean(level?.successful && optimizing);
    setPending(true); setError(null);
    try {
      // No local simulation: only animate this team's execution after committed RPC acknowledgement.
      const result = await onSubmit([...commands], optimization);
      setRetryProgram(null); setOptimizing(false);
      if (result?.trace.length) { setTrace(result.trace); setStep(0); setRunning(true); }
    } catch (e) {
      if (isDefinitiveRobotRejection(e)) {
        setRetryProgram(null); setOptimizing(false);
        setError("Backend từ chối lượt chạy. Chưa phát mô phỏng; kiểm tra trạng thái thử thách trước khi thử lại.");
      } else {
        setRetryProgram({ commands: [...commands], optimization });
        setError("Chưa xác nhận lượt chạy. Thử lại cùng chương trình để nhận kết quả, không tính trùng lượt.");
      }
    } finally { setPending(false); }
  };
  return <article className="competition-prompt">
    <h2>{map.name}</h2>
    <p>Viết trọn chương trình → RUN PROGRAM → Quan sát kết quả. Tối đa {map.maxCommands ?? 24} lệnh. Mỗi lần chạy được backend ghi nhận.</p>
    <RobotMap map={map} position={current} direction={current.direction} />
    <p role="status">{pending ? "Đang xác nhận lượt chạy…" : trace.length ? `Bước ${step}/${trace.length - 1} · ${current.blocked ? "Va chạm" : current.goal ? "Đã tới đích" : running ? "Đang chạy" : "Đã kết thúc"}` : "Chưa chạy chương trình"}</p>
    <div className="competition-command-list" aria-label="Chương trình robot">{commands.map((cmd, i) => <span key={i}>{i + 1}. {cmd === "forward" ? "↑" : cmd === "left" ? "↶" : "↷"}</span>)}</div>
    <div className="competition-actions">{(["forward", "left", "right"] as Command[]).map((cmd, i) => <button className="button button-ghost" key={cmd} disabled={locked || Boolean(retryProgram) || commands.length >= (map.maxCommands ?? 24)} onClick={() => edit([...commands, cmd])}>{["Đi thẳng", "Rẽ trái", "Rẽ phải"][i]}</button>)}
      <button className="button button-ghost" disabled={locked || Boolean(retryProgram) || !commands.length} onClick={() => edit(commands.slice(0, -1))}>Xóa lệnh cuối</button>
      <button className="button button-ghost" disabled={locked || Boolean(retryProgram) || !commands.length} onClick={() => edit([])}>Xóa hết</button>
    </div>
    <section className="robot-official-scoring" aria-label="Điểm Robot chính thức">
      <p><strong>{level?.finalScore ?? score ?? 0}/100</strong>{strategic && <> · Điểm nền {level?.bestBaseScore ?? 0} − phí tối ưu {level?.penalty ?? 0} · {level?.officialRuns ?? 0} lượt chạy</>}</p>
      {strategic && level?.successful && <>
        <p>Lời giải đầu: {level.firstCommands} lệnh · Tốt nhất: {level.bestCommands} lệnh · Tối ưu lại {level.optimizationAttempts}/2 lượt.</p>
        <button className="button button-ghost" disabled={locked || Boolean(retryProgram) || level.optimizationAttempts >= 2 || optimizing} onClick={() => setOptimizing(true)}>Tối ưu lại</button>
        {optimizing && <p role="alert">Xác nhận: RUN PROGRAM tiếp theo trừ 5 điểm, kể cả thất bại. Chỉnh sửa không mất điểm. Tối đa 2 lượt tối ưu.</p>}
      </>}
      <button className="button button-primary" disabled={locked || !commands.length || Boolean(!retryProgram && strategic && level?.successful && (!optimizing || level.optimizationAttempts >= 2))} onClick={() => void execute()}>{retryProgram ? "RUN PROGRAM — Nhận lại kết quả" : strategic && level?.successful ? "RUN PROGRAM — Tối ưu (−5 điểm)" : "RUN PROGRAM"}</button>
      {optimizing && <button className="button button-ghost" disabled={locked || Boolean(retryProgram)} onClick={() => setOptimizing(false)}>Giữ lời giải hiện tại</button>}
    </section>
    {retryProgram && !error && <p role="alert">Có lượt chạy đang chờ xác nhận. Bấm RUN PROGRAM để nhận lại kết quả; không tính trùng lượt.</p>}
    {error && <p role="alert">{error}</p>}
    <p>Thất bại trước thành công đầu không trừ điểm. Điểm nền 60–100; mỗi lệnh dư trừ 8. Sau thành công đầu: tối đa 2 lượt tối ưu, mỗi lượt trừ 5 kể cả thất bại; điểm có thể còn 50. Không thưởng tốc độ. Lời giải tối ưu chỉ mở sau khi chốt phiên.</p>
  </article>;
}
