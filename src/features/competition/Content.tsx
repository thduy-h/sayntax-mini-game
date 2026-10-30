import { useEffect, useMemo, useState } from "react";
import type { Command, MapDefinition, Question } from "./types";
import { simulate } from "./robotEngine";
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
export function RobotPlayer({
  map,
  onSubmit,
  busy,
  score,
  demo = false,
}: {
  demo?: boolean;
  map: MapDefinition;
  onSubmit: (commands: Command[]) => Promise<void>;
  busy: boolean;
  score?: number | null;
}) {
  const [commands, setCommands] = useState<Command[]>([]),
    [step, setStep] = useState(0),
    [running, setRunning] = useState(false);
  const trace = useMemo(() => simulate(map, commands), [map, commands]);
  const current = trace[Math.min(step, trace.length - 1)];
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (step >= trace.length - 1) setRunning(false);
      else setStep(step + 1);
    }, 320);
    return () => clearTimeout(timer);
  }, [running, step, trace.length]);
  const edit = (next: Command[]) => {
    setRunning(false);
    setStep(0);
    setCommands(next);
  };
  return (
    <article className="competition-prompt">
      <h2>{map.name}</h2>
      <p>
        {demo
          ? "Luyện tập · 0 XP thi đấu"
          : `Điểm tốt nhất đã xác minh: ${score ?? 0}/100`}{" "}
        · Tối đa 24 lệnh · Có thể thử lại.
      </p>
      <RobotMap map={map} position={current} direction={current.direction} />
      <p role="status">
        Bước {step}/{commands.length} · Hướng{" "}
        {["Bắc", "Đông", "Nam", "Tây"][current.direction]}
        {current.blocked ? " · Va chạm" : current.goal ? " · Đã tới đích" : ""}
      </p>
      <div className="competition-command-list" aria-label="Chương trình robot">
        {commands.map((cmd, i) => (
          <span key={i}>
            {i + 1}. {cmd === "forward" ? "↑" : cmd === "left" ? "↶" : "↷"}
          </span>
        ))}
      </div>
      <div className="competition-actions">
        {(["forward", "left", "right"] as Command[]).map((cmd, i) => (
          <button
            className="button button-ghost"
            disabled={running || busy || commands.length >= 24}
            key={cmd}
            onClick={() => edit([...commands, cmd])}
          >
            {["Đi thẳng", "Rẽ trái", "Rẽ phải"][i]}
          </button>
        ))}
      </div>
      <div className="competition-actions">
        <button
          className="button button-primary"
          disabled={!commands.length || busy}
          onClick={() => {
            if (step >= trace.length - 1) setStep(0);
            setRunning(!running);
          }}
        >
          {running ? "Tạm dừng" : "Chạy thử / Tiếp tục"}
        </button>
        <button
          className="button button-ghost"
          disabled={running || busy || step >= trace.length - 1}
          onClick={() => setStep(step + 1)}
        >
          Từng bước
        </button>
        <button
          className="button button-ghost"
          disabled={busy}
          onClick={() => {
            setRunning(false);
            setStep(0);
          }}
        >
          Đặt lại
        </button>
        <button
          className="button button-ghost"
          disabled={running || busy}
          onClick={() => edit(commands.slice(0, -1))}
        >
          Xóa lệnh cuối
        </button>
        <button
          className="button button-ghost"
          disabled={running || busy}
          onClick={() => edit([])}
        >
          Xóa hết
        </button>
      </div>
      <button
        className="button button-primary"
        disabled={busy || running || !current.goal}
        onClick={() => void onSubmit(commands)}
      >
        {demo ? "So sánh lời giải demo" : "Gửi chương trình"}
      </button>
      <p>
        {demo
          ? "Demo chỉ chạy trên thiết bị, không gửi bài và không có điểm thi đấu. Tới đích rồi bấm So sánh lời giải demo để xem cách tối ưu."
          : "Đạt đích: ít nhất 60 điểm; mỗi lệnh dư trừ 8 điểm; tối đa 100. Không có điểm tốc độ. Lời giải mẫu chỉ mở sau khi chốt phiên."}
      </p>
    </article>
  );
}
