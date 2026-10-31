import { useState } from "react";
import { Prompt, QuestionPlayer, RobotPlayer, MapPrompt } from "./Content";
import type { Command, MapDefinition, Question } from "./types";

export const DEMO_QUESTION: Question = {
  id: "demo-contrast-button",
  title: "Demo · Nút xác nhận khó đọc",
  context:
    "Trên màn hình điện thoại, nút Xác nhận dùng chữ xám nhạt trên nền trắng. Người dùng dưới ánh nắng không đọc được nhãn nút.",
  question: "Bạn sẽ sửa nút như thế nào để nhãn dễ đọc?",
  options: [
    { id: "larger", label: "Tăng kích thước nút, giữ nguyên màu chữ." },
    {
      id: "contrast",
      label: "Đổi chữ sang màu tối, bảo đảm tương phản chữ/nền ít nhất 4.5:1.",
    },
    { id: "shadow", label: "Thêm bóng đổ quanh nút, giữ nguyên màu chữ." },
  ],
};
export const DEMO_MAP: MapDefinition = {
  id: "demo-robot-corner",
  name: "Demo · Đi vòng một góc",
  width: 4,
  height: 4,
  start: { x: 0, y: 2 },
  goal: { x: 2, y: 1 },
  walls: ["2,2", "1,3"],
  initialDirection: 1,
  maxCommands: 24,
};
// Dedicated tutorial only: never imported from the official map/answer bank.
export const DEMO_SOLUTION: Command[] = [
  "forward",
  "left",
  "forward",
  "right",
  "forward",
];
export function Demo({
  stage,
  readOnly = false,
  canControlViewMode = false,
  viewMode,
  onViewModeChange,
  onClose,
}: {
  stage: number;
  readOnly?: boolean;
  canControlViewMode?: boolean;
  viewMode?: "before" | "after";
  onViewModeChange?: (mode: "before" | "after") => void;
  onClose?: () => void;
}) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [result, setResult] = useState(false);
  return (
    <section
      id="competition-demo-section"
      className="competition-section panel competition-demo"
      aria-label={stage === 1 ? "Accessibility Demo" : "Robot Demo"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <span className="eyebrow accent">DEMO / PRACTICE — NOT SCORED</span>
          <h2 style={{ margin: "4px 0" }}>
            {stage === 1
              ? "Thử trước khi thi · Accessibility"
              : "Thử trước khi thi · Robot"}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            className="button button-ghost"
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            onClick={onClose}
          >
            ✕ Ẩn Demo này
          </button>
        )}
      </div>
      <p>
        Ví dụ riêng, không thuộc đề thi. 0 XP thi đấu · Không lưu lượt chơi · Có
        thể thử lại nhiều lần.
      </p>
      {stage === 1 ? (
        <>
          {readOnly ? (
            <Prompt
              question={DEMO_QUESTION}
              isClosed={false}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              canControlViewMode={canControlViewMode}
            />
          ) : (
            <>
              <QuestionPlayer
                question={DEMO_QUESTION}
                answer={answer}
                busy={false}
                confirmation="Đã chọn đáp án demo. Giải pháp: đổi màu chữ sang màu tối bảo đảm tương phản chữ/nền ít nhất 4.5:1 đạt chuẩn WCAG AA."
                review={
                  answer
                    ? {
                        itemId: DEMO_QUESTION.id,
                        explanation:
                          "Giải pháp: đổi màu chữ sang màu tối bảo đảm tương phản chữ/nền ít nhất 4.5:1 đạt chuẩn WCAG AA.",
                      }
                    : undefined
                }
                onAnswer={async (value) => {
                  setAnswer(value);
                  if (value === "contrast" && canControlViewMode) {
                    onViewModeChange?.("after");
                  }
                }}
                isClosed={false}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                canControlViewMode={canControlViewMode}
              />
              {answer && (
                <div
                  className="demo-actions"
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      setAnswer(null);
                      if (canControlViewMode) {
                        onViewModeChange?.("before");
                      }
                    }}
                  >
                    Làm lại demo
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <p>
            Robot bắt đầu tại (0,2), nhìn sang Đông. Cờ tại (2,1); các khối đen
            là tường. Đi thẳng đổi ô; Rẽ trái/phải chỉ đổi hướng.
          </p>
          {readOnly ? (
            <MapPrompt map={DEMO_MAP} />
          ) : (
            <RobotPlayer
              map={DEMO_MAP}
              busy={false}
              demo
              onSubmit={async () => setResult(true)}
            />
          )}
          {(result || readOnly) && (
            <p role="status">
              Lời giải demo tối ưu: Đi thẳng → Rẽ trái → Đi thẳng → Rẽ phải → Đi
              thẳng (5 lệnh). Thử thêm lệnh hoặc gặp tường để quan sát khác
              biệt. Không có điểm tốc độ.
            </p>
          )}
        </>
      )}
      {canControlViewMode && (
        <div style={{ marginTop: "18px", borderTop: "2px dashed #121212", paddingTop: "12px" }}>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              document.querySelector(".competition-stages")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            ⬇ Cuộn xuống danh sách phiên thi (Bắt đầu phiên {stage})
          </button>
        </div>
      )}
    </section>
  );
}
