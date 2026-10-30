import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Keyboard,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { accessibilityScenarios } from "../lib/gameLogic";
import { sound } from "../lib/audio";
import { AccessibilitySimulator } from "./AccessibilitySimulator";
import type { AccessibilityOption, AccessibilityScenario } from "../types";

interface AccessibilityGameProps {
  onBack: () => void;
  onGoToRobot?: () => void;
  onReturnToWorkshop?: () => void;
  scenarioIds?: string[];
  onSubmit?: (scenarioId: string, optionId: string) => Promise<void>;
}

export function AccessibilityGame({ onBack, onGoToRobot, onReturnToWorkshop, scenarioIds, onSubmit }: AccessibilityGameProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [isFreePlay, setIsFreePlay] = useState(false);
  const [complete, setComplete] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const configuredScenarios = scenarioIds
    ?.map((id) => accessibilityScenarios.find((item) => item.id === id))
    .filter((item): item is AccessibilityScenario => Boolean(item));
  const roundScenarios = configuredScenarios?.length
    ? configuredScenarios
    : isFreePlay ? accessibilityScenarios : accessibilityScenarios.slice(0, 4);

  const scenario = roundScenarios[step];
  const totalScore = scores.reduce((sum, val) => sum + val, 0);

  const selectedOption = scenario.options.find((opt) => opt.id === selected);
  const isCorrect = selectedOption?.correct ?? false;

  const pick = (option: AccessibilityOption) => {
    if (selected) return; // Prevent double clicking
    setSelected(option.id);

    const newScores = [...scores];
    newScores[step] = option.points;
    setScores(newScores);
    if (onSubmit) {
      setSubmitState("sending");
      void onSubmit(scenario.id, option.id)
        .then(() => setSubmitState("sent"))
        .catch(() => setSubmitState("error"));
    }

    if (option.correct) {
      sound.playSuccess();
    } else {
      sound.playBump();
    }
  };

  const handleRetryCurrent = () => {
    sound.playClick();
    setSelected(null);
  };

  const next = () => {
    sound.playClick();
    if (step === roundScenarios.length - 1) {
      setComplete(true);
    } else {
      setStep((current) => current + 1);
      setSelected(null);
      setSubmitState("idle");
    }
  };

  // Keyboard shortcut listener for options (1, 2, 3 or A, B, C)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (complete || submitState === "sending" || submitState === "error") return;
      if (e.target instanceof HTMLElement && e.target.closest("button, input, textarea, select, a, [contenteditable]")) return;
      if (!selected) {
        if (e.key === "1" || e.key.toLowerCase() === "a") {
          if (scenario.options[0]) pick(scenario.options[0]);
        } else if (e.key === "2" || e.key.toLowerCase() === "b") {
          if (scenario.options[1]) pick(scenario.options[1]);
        } else if (e.key === "3" || e.key.toLowerCase() === "c") {
          if (scenario.options[2]) pick(scenario.options[2]);
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          next();
        } else if (e.key.toLowerCase() === "r" && !isCorrect) {
          handleRetryCurrent();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, complete, step, scenario, isCorrect, submitState]);

  return (
    <div className="page-content game-page">
      <div className="game-nav-bar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} /> {onReturnToWorkshop ? "Về phòng workshop" : "Quay về danh sách game"}
        </button>
        <div className="game-heading-tools">
          <span className="kbd-hint">
            <Keyboard size={15} /> Phím tắt: 1, 2, 3 hoặc A, B, C · Enter: Tiếp tục
          </span>
        </div>
      </div>

      <div className="game-heading">
        <div>
          <div className="eyebrow accent">MINI-GAME 01 · THIẾT KẾ TIẾP CẬN</div>
          <h1>Accessibility Unlock</h1>
          <p>
            Mỗi lựa chọn là một bước gỡ bỏ rào cản. Hãy chọn giải pháp giúp sản phẩm số trở nên thân thiện và dễ dùng với tất cả mọi người.
          </p>
          {!scenarioIds && <button type="button" className="button button-ghost" onClick={() => { setIsFreePlay((value) => !value); setStep(0); setSelected(null); setScores([]); setComplete(false); }}>
            {isFreePlay ? "Dùng preset workshop 4 câu" : "Mở toàn bộ ngân hàng 12 câu"}
          </button>}
        </div>
      </div>

      {/* Game HUD */}
      <div className="game-hud">
        <div className="hud-scenario-info">
          <span className="hud-label">TÌNH HUỐNG HIỆN TẠI</span>
          <strong>
            {String(step + 1).padStart(2, "0")}{" "}
            <span>/ {String(roundScenarios.length).padStart(2, "0")}</span>
          </strong>
        </div>

        <div className="hud-progress-wrap">
          <div className="hud-progress-header">
            <span>Tiến trình hoàn thành: {Math.round(((step + (complete ? 1 : selected ? 0.5 : 0)) / roundScenarios.length) * 100)}%</span>
          </div>
          <div className="hud-progress">
            <i
              style={{
                width: `${((step + (complete ? 1 : selected ? 0.5 : 0)) / roundScenarios.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="hud-score-display">
          <span className="score-pill">
            <Zap size={14} fill="currentColor" /> {totalScore} XP
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {complete ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="result-card-enhanced panel"
          >
            <div className="result-top-banner">
              <div className="result-trophy-badge">
                <Trophy size={40} />
              </div>
              <div className="result-headline">
                <span className="eyebrow accent">HOÀN THÀNH XUẤT SẮC</span>
                <h2>Chúc mừng bạn đã mở khóa 4 kỹ năng Tiếp cận số!</h2>
                <p>
                  Bạn đã ghi được tổng cộng <strong>{totalScore} / {roundScenarios.length * 100} XP</strong>. Bạn đã nắm vững các nguyên tắc cốt lõi giúp hàng triệu người dùng tiếp cận ứng dụng một cách dễ dàng.
                </p>
              </div>
            </div>

            <div className="recap-grid">
              <div className="recap-card">
                <span className="recap-num">01</span>
                <strong>Độ tương phản (Contrast)</strong>
                <p>Đảm bảo tỷ lệ ít nhất 4.5:1 để đọc tốt dưới ánh sáng gắt.</p>
              </div>
              <div className="recap-card">
                <span className="recap-num">02</span>
                <strong>Tiêu điểm phím (Focus Ring)</strong>
                <p>Luôn có viền sáng rõ cho người điều khiển bằng bàn phím.</p>
              </div>
              <div className="recap-card">
                <span className="recap-num">03</span>
                <strong>Phụ đề video (Captions)</strong>
                <p>Đồng bộ thời gian thực cho người khiếm thính và nơi ồn ào.</p>
              </div>
              <div className="recap-card">
                <span className="recap-num">04</span>
                <strong>Thông báo lỗi (Clear Errors)</strong>
                <p>Nêu rõ vị trí sai và ví dụ khắc phục cụ thể, dễ hiểu.</p>
              </div>
            </div>

            <div className="result-actions">
              <button
                className="button button-ghost"
                onClick={() => {
                  setStep(0);
                  setSelected(null);
                  setScores([]);
                  setComplete(false);
                }}
              >
                <RotateCcw size={16} /> Chơi lại từ đầu
              </button>
              {onReturnToWorkshop && <button className="button button-primary" onClick={onReturnToWorkshop}>Về phòng xem bảng điểm <ArrowRight size={16} /></button>}
              {onGoToRobot && (
                <button className="button button-primary" onClick={onGoToRobot}>
                  Thử thách tiếp: Robot Commands <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="accessibility-layout-enhanced"
          >
            {/* Interactive Live Simulator Preview */}
            <div className="accessibility-left-col">
              <AccessibilitySimulator
                key={`${scenario.id}-${selected ?? "unanswered"}`}
                scenarioId={scenario.id}
                isFixed={isCorrect}
                canCompare={Boolean(selected)}
              />
            </div>

            {/* Decision and Learning Panel */}
            <div className="decision-panel-enhanced panel">
              <div className="scenario-story-header">
                <div className="eyebrow accent">{scenario.eyebrow}</div>
                <h2>{scenario.title}</h2>
                <p className="scenario-context-text">{scenario.context}</p>

                <div className="prompt-box">
                  <div className="prompt-icon">
                    <CircleHelp size={18} />
                  </div>
                  <strong>{scenario.cue}</strong>
                </div>
              </div>

              <div className="option-list-enhanced">
                {scenario.options.map((option, index) => {
                  const isSelected = selected === option.id;
                  const charLabel = String.fromCharCode(65 + index);

                  let optionClass = "option-card";
                  if (isSelected) {
                    optionClass += option.correct ? " is-correct" : " is-incorrect";
                  } else if (selected && !isSelected) {
                    optionClass += " is-dimmed";
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={optionClass}
                      onClick={() => pick(option)}
                      disabled={Boolean(selected) || submitState === "sending"}
                    >
                      <div className="option-badge-key">
                        <span>{charLabel}</span>
                      </div>

                      <div className="option-content">
                        <div className="option-main-label">{option.label}</div>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="option-detail-box"
                          >
                            <p>{option.detail}</p>
                            <div className="points-badge">
                              {option.correct ? (
                                <span className="text-emerald-700">
                                  <Check size={14} /> +{option.points} XP (Tối đa)
                                </span>
                              ) : (
                                <span className="text-amber-700">
                                  <AlertTriangle size={14} /> +{option.points} XP
                                </span>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>

                      <div className="option-state-indicator">
                        {isSelected ? (
                          option.correct ? (
                            <div className="state-circle state-correct">
                              <Check size={16} />
                            </div>
                          ) : (
                            <div className="state-circle state-incorrect">
                              <X size={16} />
                            </div>
                          )
                        ) : (
                          <div className="state-circle state-idle">
                            <span className="idle-key-hint">{index + 1}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="feedback-footer-panel"
                >
                  <div className="principle-banner">
                    <div className="principle-icon-wrap">
                      <Lightbulb size={18} />
                    </div>
                    <div>
                      <strong>Bài học cốt lõi:</strong>
                      <p>{scenario.principle}</p>
                    </div>
                  </div>

                  <div className="feedback-action-row">
                    {!isCorrect && !onSubmit && (
                      <button
                        className="button button-ghost btn-retry"
                        onClick={handleRetryCurrent}
                      >
                        <RotateCcw size={14} /> Thử chọn lại
                      </button>
                    )}
                    <button className="button button-primary btn-next" onClick={next} disabled={submitState === "sending" || submitState === "error"}>
                      {step === roundScenarios.length - 1
                        ? "Xem tổng kết điểm số"
                        : "Tiếp tục sang tình huống tiếp"}{" "}
                      <ArrowRight size={16} />
                    </button>
                    {submitState === "sending" && <span className="submit-note">Đang xác minh điểm…</span>}
                    {submitState === "sent" && <span className="submit-note">Điểm đã được máy chủ xác minh.</span>}
                    {submitState === "error" && <button className="button button-ghost" onClick={() => { if (!selected || !onSubmit) return; setSubmitState("sending"); void onSubmit(scenario.id, selected).then(() => setSubmitState("sent")).catch(() => setSubmitState("error")); }}>Gửi lại đáp án</button>}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
