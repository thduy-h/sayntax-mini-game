import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Flag,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  StepForward,
  Trophy,
  Trash2,
  Undo2,
  Zap,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  directionAngle,
  directionLabel,
  robotLevels,
  runRobot,
  scoreRobot,
} from "../lib/gameLogic";
import { sound } from "../lib/audio";
import type { Direction, RobotCommand, RobotRunResult } from "../types";

const commandLabels: Record<RobotCommand, string> = {
  forward: "Đi thẳng",
  left: "Rẽ trái",
  right: "Rẽ phải",
};

const commandSymbols: Record<RobotCommand, string> = {
  forward: "↑",
  left: "↶",
  right: "↷",
};

interface RobotGameProps {
  onBack: () => void;
  onGoToWorkshop?: () => void;
  levelIds?: number[];
  onSubmit?: (levelId: number, commands: RobotCommand[]) => Promise<void>;
}

export function RobotGame({ onBack, onGoToWorkshop, levelIds, onSubmit }: RobotGameProps) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [commands, setCommands] = useState<RobotCommand[]>([]);
  const [completedLevels, setCompletedLevels] = useState<Record<number, boolean>>({});

  // Execution state
  const [runResult, setRunResult] = useState<RobotRunResult | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1); // -1 = start/idle, 0..steps.length-1
  const [isRunning, setIsRunning] = useState(false);
  const [runSpeed, setRunSpeed] = useState<"normal" | "fast">("normal");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const gameLevels = levelIds?.length ? robotLevels.filter((item) => levelIds.includes(item.id)) : robotLevels;
  const level = gameLevels[levelIndex] ?? gameLevels[0];
  const timerRef = useRef<number | null>(null);

  // Derived robot position and direction
  let currentPos = level.start;
  let currentDirection: Direction = level.initialDirection ?? 1;
  let activeCommandIndex: number | null = null;
  let isBlockedNow = false;

  if (runResult && activeStepIndex >= 0 && activeStepIndex < runResult.steps.length) {
    const step = runResult.steps[activeStepIndex];
    currentPos = step.position;
    currentDirection = step.direction;
    activeCommandIndex = step.commandIndex;
    isBlockedNow = step.blocked;
  }

  const isAtGoal =
    runResult?.reachedGoal &&
    activeStepIndex === runResult.steps.length - 1 &&
    !isRunning;

  const score = isAtGoal ? scoreRobot(level, commands) : 0;

  // Mark completed when goal reached
  useEffect(() => {
    if (isAtGoal) {
      setCompletedLevels((prev) => ({ ...prev, [level.id]: true }));
      sound.playSuccess();
      if (onSubmit && submitState === "idle") {
        setSubmitState("sending");
        void onSubmit(level.id, commands).then(() => setSubmitState("sent")).catch(() => setSubmitState("error"));
      }
    }
  }, [isAtGoal, level.id, onSubmit, commands, submitState]);

  // Command management
  const addCommand = (cmd: RobotCommand) => {
    if (commands.length >= 24 || isRunning) return;
    sound.playClick();
    setCommands((prev) => [...prev, cmd]);
    resetExecutionState();
  };

  const removeLastCommand = () => {
    if (commands.length === 0 || isRunning) return;
    sound.playClick();
    setCommands((prev) => prev.slice(0, -1));
    resetExecutionState();
  };

  const removeCommandAtIndex = (idx: number) => {
    if (isRunning) return;
    sound.playClick();
    setCommands((prev) => prev.filter((_, i) => i !== idx));
    resetExecutionState();
  };

  const clearAllCommands = () => {
    if (isRunning) return;
    sound.playClick();
    setCommands([]);
    resetExecutionState();
  };

  const resetExecutionState = () => {
    stopAutoRun();
    setRunResult(null);
    setActiveStepIndex(-1);
  };

  // Execution runner
  const executeProgram = () => {
    if (commands.length === 0) return;
    sound.playClick();
    const result = runRobot(level, commands);
    setRunResult(result);
    setActiveStepIndex(0);
    setIsRunning(true);
  };

  const stepOnce = () => {
    if (commands.length === 0) return;
    stopAutoRun();

    let result = runResult;
    if (!result) {
      result = runRobot(level, commands);
      setRunResult(result);
    }

    const nextIndex = activeStepIndex + 1;
    if (nextIndex < result.steps.length) {
      setActiveStepIndex(nextIndex);
      const step = result.steps[nextIndex];
      if (step.command === "forward") sound.playStep();
      else sound.playTurn();

      if (step.blocked) sound.playBump();
    } else {
      // Reached the end of steps
      setActiveStepIndex(result.steps.length - 1);
    }
  };

  const stopAutoRun = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  };

  // Auto-run interval
  useEffect(() => {
    if (!isRunning || !runResult) return;

    const delay = runSpeed === "fast" ? 170 : 320;
    timerRef.current = window.setInterval(() => {
      setActiveStepIndex((curr) => {
        const next = curr + 1;
        if (next >= runResult.steps.length) {
          stopAutoRun();
          return runResult.steps.length - 1;
        }

        const step = runResult.steps[next];
        if (step.command === "forward") sound.playStep();
        else sound.playTurn();

        if (step.blocked) {
          sound.playBump();
          stopAutoRun();
        }
        return next;
      });
    }, delay);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isRunning, runResult, runSpeed]);

  // Level switcher
  const changeLevel = (idx: number) => {
    setLevelIndex(idx);
    setCommands([]);
    setSubmitState("idle");
    resetExecutionState();
  };

  const nextLevel = () => {
    if (levelIndex < gameLevels.length - 1) {
      changeLevel(levelIndex + 1);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === "f" || key === "arrowup") {
        e.preventDefault();
        addCommand("forward");
      } else if (key === "l" || key === "arrowleft") {
        e.preventDefault();
        addCommand("left");
      } else if (key === "r" || key === "arrowright") {
        e.preventDefault();
        addCommand("right");
      } else if (key === "backspace") {
        e.preventDefault();
        removeLastCommand();
      } else if (key === " " || key === "enter") {
        e.preventDefault();
        if (isRunning) stopAutoRun();
        else executeProgram();
      } else if (key === "s") {
        e.preventDefault();
        stepOnce();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commands, isRunning, runResult, activeStepIndex]);

  return (
    <div className="page-content game-page">
      <div className="game-nav-bar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} /> {onSubmit ? "Về phòng workshop" : "Quay về danh sách game"}
        </button>
        <div className="game-heading-tools">
          <span className="kbd-hint">
            <Keyboard size={15} /> Phím tắt: F (Đi thẳng) · L (Rẽ trái) · R (Rẽ phải) · Space (Chạy) · Backspace (Undo)
          </span>
        </div>
      </div>

      <div className="game-heading">
        <div>
          <div className="eyebrow accent">MINI-GAME 02 · TƯ DUY THUẬT TOÁN</div>
          <h1>Robot Commands</h1>
          <p>
            Lập trình chuỗi lệnh điều khiển robot vượt chướng ngại vật về đích. Tối ưu số bước bằng hoặc ít hơn par để đạt trọn vẹn điểm số.
          </p>
        </div>
      </div>

      {/* Robot HUD */}
      <div className="game-hud robot-hud-enhanced">
        <div className="hud-level-select">
          <span className="hud-label">CHỌN MÀN CHƠI:</span>
          <div className="level-tabs-enhanced">
            {gameLevels.map((item, idx) => {
              const isSelected = idx === levelIndex;
              const isDone = completedLevels[item.id];
              return (
                <button
                  key={item.id}
                  className={`level-tab-btn ${isSelected ? "selected" : ""} ${isDone ? "is-done" : ""}`}
                  onClick={() => changeLevel(idx)}
                >
                  <span>Màn {item.id}</span>
                  {isDone && <Check size={12} className="check-done" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hud-par-info">
          <span className="hud-label">MỤC TIÊU PAR</span>
          <div className="par-display">
            <strong>{level.par}</strong> <span>lệnh tối ưu</span>
          </div>
        </div>

        <div className="hud-score-display">
          <span className="hud-label">ĐIỂM ĐẠT ĐƯỢC</span>
          <span className="score-pill">
            <Zap size={14} fill="currentColor" /> {score > 0 ? `${score} XP` : "—"}
          </span>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="robot-layout-enhanced">
        {/* Left Column: Board and Status */}
        <div className="robot-board-panel panel">
          <div className="board-header-enhanced">
            <div>
              <span className="eyebrow accent">{level.name}</span>
              <h3>{level.hint}</h3>
            </div>
            <div className="robot-heading-indicator">
              <span>Hướng mặt:</span>
              <strong className="badge-heading">{directionLabel(currentDirection)}</strong>
            </div>
          </div>

          {/* 6x6 Grid Board */}
          <div className="robot-board-container">
            <div className="robot-board" role="grid" aria-label="Bản đồ mê cung robot">
              {Array.from({ length: 36 }, (_, index) => {
                const x = index % 6;
                const y = Math.floor(index / 6);
                const isWall = level.walls.includes(`${x},${y}`);
                const isGoal = x === level.goal.x && y === level.goal.y;
                const isRobot = x === currentPos.x && y === currentPos.y;
                const isStart = x === level.start.x && y === level.start.y;
                const wasVisited = runResult?.path.some((cell) => cell.x === x && cell.y === y);

                let cellClass = "board-cell";
                if (isWall) cellClass += " is-wall";
                if (isGoal) cellClass += " is-goal";
                if (wasVisited && !isRobot && !isGoal) cellClass += " is-visited";
                if (isRobot) cellClass += " has-robot";

                return (
                  <div key={`${x}-${y}`} className={cellClass} role="gridcell">
                    {/* Goal flag */}
                    {isGoal && (
                      <div className="goal-flag-wrap">
                        <Flag size={20} className="goal-flag-icon" />
                        <span className="goal-ping" />
                      </div>
                    )}

                    {/* Start marker if not robot */}
                    {isStart && !isRobot && <span className="start-marker">S</span>}

                    {/* Wall icon / texture */}
                    {isWall && <div className="wall-block" />}

                    {/* Robot Sprite */}
                    {isRobot && (
                      <motion.div
                        layoutId="robot"
                        className="robot-sprite"
                        role="img"
                        aria-label={`Robot đang nhìn hướng ${directionLabel(currentDirection)}`}
                      >
                        {/* Layout movement and facing rotation need separate transforms:
                            Motion owns the outer transform while this inner layer faces the next move. */}
                        <div
                          className="robot-facing"
                          data-direction={currentDirection}
                          style={{ transform: `rotate(${directionAngle(currentDirection)}deg)` }}
                        >
                          <div className={`robot-head ${isBlockedNow ? "robot-bump-shake" : ""}`} aria-hidden="true">
                            <span className="robot-arrow-pointer">▲</span>
                            <div className="robot-eyes">
                              <span className="eye" />
                              <span className="eye" />
                            </div>
                            <span className="robot-mouth" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Board Legend */}
          <div className="board-legend-enhanced">
            <span>
              <i className="legend-chip chip-robot" /> Robot (mặt và mũi tên chỉ hướng đi)
            </span>
            <span>
              <i className="legend-chip chip-goal" /> Ô cờ đích đến
            </span>
            <span>
              <i className="legend-chip chip-wall" /> Tường chắn
            </span>
            <span>
              <i className="legend-chip chip-trail" /> Dấu chân đã đi qua
            </span>
          </div>

          {/* Feedback & Result Banners */}
          <AnimatePresence>
            {isAtGoal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="success-banner-enhanced"
              >
                <div className="banner-left">
                  <div className="banner-trophy">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h4>Chúc mừng! Robot đã cập bến an toàn!</h4>
                    <p>
                      Bạn đã dùng {commands.length} lệnh (Par: {level.par}). Điểm thưởng: <strong>+{score} XP</strong>
                    </p>
                    {submitState === "sending" && <p>Đang xác minh chương trình với máy chủ…</p>}
                    {submitState === "sent" && <p>Điểm đã được máy chủ xác minh.</p>}
                    {submitState === "error" && <button className="button button-ghost" onClick={() => { if (!onSubmit) return; setSubmitState("sending"); void onSubmit(level.id, commands).then(() => setSubmitState("sent")).catch(() => setSubmitState("error")); }}>Gửi lại kết quả</button>}
                  </div>
                </div>

                <div className="ghost-path-summary" aria-live="polite">
                  <strong>GHOST PATH</strong>
                  <span>Bạn: {commands.length} lệnh · Tối ưu: {level.optimalCommands?.length ?? level.par} lệnh · Chênh lệch: +{Math.max(0, commands.length - (level.optimalCommands?.length ?? level.par))}</span>
                  <small>Chuỗi tối ưu: {(level.optimalCommands ?? []).map((command) => command === "forward" ? "↑" : command === "left" ? "↶" : "↷").join(" ")}</small>
                </div>

                {levelIndex < gameLevels.length - 1 ? (
                  <button className="button button-primary btn-next-level" onClick={nextLevel}>
                    Sang Màn {levelIndex + 2} <ArrowRight size={16} />
                  </button>
                ) : (
                  <button className="button button-primary btn-next-level" onClick={onGoToWorkshop}>
                    Mở Workshop Cùng Cả Phòng <ArrowRight size={16} />
                  </button>
                )}
              </motion.div>
            )}

            {runResult && !runResult.reachedGoal && !isRunning && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="error-banner-enhanced"
              >
                <AlertCircle size={22} className="text-rose-600 flex-shrink-0" />
                <div>
                  <strong>
                    {runResult.blockedAt !== null
                      ? `Robot va vào vật cản ở Lệnh số ${runResult.blockedAt + 1} (${commandLabels[commands[runResult.blockedAt]]})`
                      : "Chưa tới đích: Chuỗi lệnh đã kết thúc nhưng robot chưa vào ô cờ"}
                  </strong>
                  <p>Mẹo: Hãy bấm nút "Từng bước" để xem robot đi tới đâu hoặc xóa lệnh bị nhầm.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Command Sequence Builder */}
        <div className="command-panel-enhanced panel">
          <div className="command-header-enhanced">
            <div>
              <span className="eyebrow accent">BẢNG LỆNH ĐIỀU KHIỂN</span>
              <h3>Chuỗi hành trình ({commands.length}/24)</h3>
            </div>

            <div className="command-seq-actions">
              <button
                type="button"
                className="btn-seq-tool"
                onClick={removeLastCommand}
                disabled={commands.length === 0 || isRunning}
                title="Xóa lệnh vừa thêm (Backspace)"
              >
                <Undo2 size={15} /> Xóa lệnh cuối
              </button>
              <button
                type="button"
                className="btn-seq-tool text-rose-600"
                onClick={clearAllCommands}
                disabled={commands.length === 0 || isRunning}
                title="Xóa toàn bộ chương trình"
              >
                <Trash2 size={15} /> Xóa hết
              </button>
            </div>
          </div>

          {/* Sequence Tokens Box */}
          <div className="sequence-box-enhanced" aria-live="polite">
            {commands.length === 0 ? (
              <div className="sequence-placeholder-wrap">
                <p>Chưa có lệnh nào. Bấm các nút lệnh bên dưới để xếp chương trình.</p>
                <span>(Mẹo: Bạn có thể nhấn phím F, L, R trên bàn phím)</span>
              </div>
            ) : (
              commands.map((cmd, idx) => {
                const isActive = activeCommandIndex === idx;
                const isBlockedToken = runResult?.blockedAt === idx;

                let tokenClass = "command-token-enhanced";
                if (isActive) tokenClass += " is-active";
                if (isBlockedToken) tokenClass += " is-blocked";

                return (
                  <motion.button
                    type="button"
                    key={`${cmd}-${idx}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={tokenClass}
                    onClick={() => removeCommandAtIndex(idx)}
                    title={`Lệnh ${idx + 1}: ${commandLabels[cmd]} (Bấm để xóa)`}
                  >
                    <span className="token-symbol">{commandSymbols[cmd]}</span>
                    <span className="token-num">{idx + 1}</span>
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Par comparison helper */}
          <div className="par-helper-row">
            {commands.length <= level.par ? (
              <span className="badge-par-good">
                <Sparkles size={14} /> Tối ưu: Đang nằm trong mức Par ({commands.length}/{level.par})
              </span>
            ) : (
              <span className="badge-par-over">
                <CircleHelp size={14} /> Đã vượt Par +{commands.length - level.par} lệnh (thử tìm đường ngắn hơn)
              </span>
            )}
          </div>

          {/* Command Buttons Palette */}
          <div className="command-palette">
            {(["forward", "left", "right"] as RobotCommand[]).map((cmd) => (
              <button
                key={cmd}
                type="button"
                className={`command-btn-card btn-${cmd}`}
                onClick={() => addCommand(cmd)}
                disabled={commands.length >= 24 || isRunning}
              >
                <span className="btn-cmd-symbol">{commandSymbols[cmd]}</span>
                <span className="btn-cmd-label">{commandLabels[cmd]}</span>
                <span className="btn-cmd-key">
                  {cmd === "forward" ? "[F]" : cmd === "left" ? "[L]" : "[R]"}
                </span>
              </button>
            ))}
          </div>

          {/* Execution Control Action Bar */}
          <div className="execution-control-row">
            {isRunning ? (
              <button className="button button-primary btn-exec" onClick={stopAutoRun}>
                <Pause size={17} /> Tạm dừng
              </button>
            ) : (
              <button
                className="button button-primary btn-exec"
                onClick={executeProgram}
                disabled={commands.length === 0}
              >
                <Play size={17} fill="currentColor" /> Chạy chương trình
              </button>
            )}

            <button
              type="button"
              className="button button-ghost btn-step"
              onClick={stepOnce}
              disabled={commands.length === 0 || isRunning}
              title="Chạy từng lệnh một để kiểm tra lỗi"
            >
              <StepForward size={16} /> Từng bước
            </button>

            <button
              type="button"
              className="button button-ghost btn-reset"
              onClick={resetExecutionState}
              disabled={activeStepIndex === -1 && !runResult}
              title="Đặt lại vị trí ban đầu"
            >
              <RotateCcw size={16} /> Đặt lại
            </button>
          </div>

          {/* Algorithmic Thinking Guide */}
          <div className="robot-educational-tip">
            <HelpCircle size={17} className="tip-icon-orange" />
            <div>
              <strong>Quy tắc đổi hướng (Rẽ trái / Rẽ phải):</strong>
              <p>
                Lệnh Rẽ chỉ xoay mặt robot tại chỗ, robot <em>chưa di chuyển</em> sang ô khác cho đến khi bạn ra lệnh "Đi thẳng". Mặt và mũi tên trên robot luôn chỉ hướng của lệnh Đi thẳng tiếp theo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
