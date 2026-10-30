import { useState, useEffect } from "react";
import { accessibilityScenarios } from "../lib/gameLogic";
import { ExtendedAccessibilityDemo } from "./ExtendedAccessibilityDemo";
import { Sun, Moon, Volume2, VolumeX, Eye, AlertCircle, CheckCircle2, Sparkles, Keyboard as KeyboardIcon } from "lucide-react";

interface AccessibilitySimulatorProps {
  scenarioId: string;
  isFixed: boolean;
  canCompare?: boolean;
}

export function AccessibilitySimulator({ scenarioId, isFixed: answerFixed, canCompare = false }: AccessibilitySimulatorProps) {
  const [comparison, setComparison] = useState<boolean | null>(null);
  const isFixed = comparison ?? answerFixed;
  const scenario = accessibilityScenarios.find((item) => item.id === scenarioId);
  // Scenario 1: Contrast glare simulation
  const [glareMode, setGlareMode] = useState(true);

  // Scenario 2: Keyboard Tab simulation
  const [tabIndex, setTabIndex] = useState(1);

  // Scenario 3: Captions simulation
  const [captionsOn, setCaptionsOn] = useState(isFixed);

  // Scenario 4: Error fix simulation
  const [formInput, setFormInput] = useState("31/02/2005");

  useEffect(() => {
    setCaptionsOn(isFixed);
  }, [isFixed]);

  return (
    <div className="simulator-card panel">
      <div className="simulator-header">
        <div className="simulator-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="simulator-title">
          <Eye size={14} />
          <span>Mô phỏng Giao diện Thực tế</span>
        </div>
        <div className="simulator-badge">
          {isFixed ? (
            <span className="badge-pass">
              <CheckCircle2 size={13} /> Đã tối ưu A11y
            </span>
          ) : (
            <span className="badge-fail">
              <AlertCircle size={13} /> Gặp rào cản
            </span>
          )}
        </div>
      </div>

      <div className="simulator-body">
        {canCompare && <div className="sim-toolbar" role="group" aria-label="So sánh trước và sau">
          <button type="button" className="sim-tool-btn" aria-pressed={!isFixed} onClick={() => setComparison(false)}>Trước khi sửa</button>
          <button type="button" className="sim-tool-btn" aria-pressed={isFixed} onClick={() => setComparison(true)}>Sau khi sửa</button>
        </div>}
        {/* SCENARIO 1: CONTRAST */}
        {scenarioId === "contrast" && (
          <div className={`sim-contrast-wrap ${glareMode ? "glare-active" : ""}`}>
            <div className="sim-toolbar">
              <span className="sim-toolbar-label">Môi trường:</span>
              <button
                type="button"
                className={`sim-tool-btn ${glareMode ? "active" : ""}`}
                onClick={() => setGlareMode(!glareMode)}
                title="Bật/tắt mô phỏng ánh nắng ngoài trời"
              >
                {glareMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} />}
                <span>{glareMode ? "Ngoài trời nắng gắt (Chói)" : "Trong nhà râm mát"}</span>
              </button>
            </div>

            <div className={`sim-mockup-card ${glareMode ? "sun-glare" : ""}`}>
              <div className="sim-course-header">
                <span className="sim-tag">Hội thảo trực tuyến</span>
                <h4>Nhập môn Lập trình Sáng tạo</h4>
                <p>Khám phá cách tư duy logic qua trò chơi tương tác số.</p>
              </div>

              <div className="sim-button-preview">
                {isFixed ? (
                  <button type="button" className="sim-btn-fixed">
                    Đăng ký tham gia ngay →
                  </button>
                ) : (
                  <button type="button" className="sim-btn-broken">
                    Đăng ký tham gia ngay →
                  </button>
                )}
              </div>
            </div>

            <div className="sim-meter">
              <div className="meter-label">
                <span>Tỷ lệ tương phản chữ/nền:</span>
                <strong>{isFixed ? "8.6 : 1 (Đạt chuẩn WCAG AAA)" : "1.8 : 1 (Thất bại WCAG AA)"}</strong>
              </div>
              <div className="meter-bar">
                <div
                  className={`meter-fill ${isFixed ? "meter-pass" : "meter-fail"}`}
                  style={{ width: isFixed ? "95%" : "22%" }}
                />
              </div>
              <p className="meter-note">
                {isFixed
                  ? "✓ Màu chữ đậm trên nền nổi bật giúp người dùng đọc tốt ngay cả dưới ánh nắng 12h trưa."
                  : "⚠ Chữ xám mờ trên nền trắng khiến mắt người dùng không thể nhận biết được nút bấm."}
              </p>
            </div>
          </div>
        )}

        {/* SCENARIO 2: KEYBOARD FOCUS */}
        {scenarioId === "keyboard" && (
          <div className="sim-keyboard-wrap">
            <div className="sim-toolbar">
              <span className="sim-toolbar-label">Thao tác:</span>
              <button
                type="button"
                className="sim-tool-btn"
                onClick={() => setTabIndex((prev) => (prev % 4) + 1)}
              >
                <KeyboardIcon size={14} />
                <span>Nhấn phím Tab thử nghiệm (Bước {tabIndex}/4)</span>
              </button>
            </div>

            <div className="sim-menu-preview">
              <div className="sim-menu-bar">
                {[
                  { id: 1, label: "Trang chủ" },
                  { id: 2, label: "Khóa học" },
                  { id: 3, label: "Bảng điểm" },
                  { id: 4, label: "Tài liệu" },
                ].map((item) => {
                  const isCurrent = tabIndex === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`sim-nav-btn ${isCurrent ? (isFixed ? "nav-focused-good" : "nav-focused-bad") : ""}`}
                      onClick={() => setTabIndex(item.id)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="sim-focus-inspector">
                {isFixed ? (
                  <div className="focus-status good">
                    <CheckCircle2 size={16} />
                    <span>
                      Tiêu điểm rõ ràng: Viền sáng 3px đang bao quanh mục <strong>{["Trang chủ", "Khóa học", "Bảng điểm", "Tài liệu"][tabIndex - 1]}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="focus-status bad">
                    <AlertCircle size={16} />
                    <span>
                      Mất dấu tiêu điểm: Không có viền nhận diện! Người dùng bàn phím hoàn toàn không biết con trỏ đang ở đâu.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="sim-helper-box">
              <Sparkles size={15} />
              <span>
                Người dùng khiếm thị hoặc khuyết tật vận động sử dụng phím Tab để lướt qua các thành phần tương tác.
              </span>
            </div>
          </div>
        )}

        {/* SCENARIO 3: CAPTIONS */}
        {scenarioId === "captions" && (
          <div className="sim-captions-wrap">
            <div className="sim-toolbar">
              <span className="sim-toolbar-label">Trạng thái phụ đề:</span>
              <button
                type="button"
                className={`sim-tool-btn ${captionsOn ? "active" : ""}`}
                onClick={() => setCaptionsOn(!captionsOn)}
              >
                {captionsOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{captionsOn ? "Phụ đề: Đang BẬT" : "Phụ đề: Đang TẮT"}</span>
              </button>
            </div>

            <div className="sim-video-player">
              <div className="sim-video-screen">
                <div className="sim-speaker-avatar">
                  <span className="speaker-wave wave-1" />
                  <span className="speaker-wave wave-2" />
                  <span className="speaker-face">👨‍🏫</span>
                </div>
                <div className="sim-speaker-info">
                  <strong>Thầy Nam — Diễn giả Workshop</strong>
                  <span>Hội trường ồn ào · 85 dB</span>
                </div>

                {/* Subtitles Overlay */}
                {captionsOn ? (
                  <div className="sim-captions-banner">
                    <span className="caption-text">
                      [Thầy Nam] "Mỗi dòng lệnh các bạn viết hôm nay đều có thể tạo ra sản phẩm cho tất cả mọi người."
                    </span>
                  </div>
                ) : (
                  <div className="sim-no-captions-hint">
                    <VolumeX size={16} />
                    <span>(Tiếng ồn hội trường lấn át, học viên khiếm thính không tiếp nhận được lời nói)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sim-helper-box">
              <Sparkles size={15} />
              <span>
                Phụ đề không chỉ giúp người điếc/khiếm thính, mà hơn 80% người xem trên mạng xã hội xem video ở chế độ tắt tiếng.
              </span>
            </div>
          </div>
        )}

        {!["contrast", "keyboard", "captions", "language"].includes(scenarioId) && (
          <ExtendedAccessibilityDemo key={`${scenarioId}-${isFixed}`} scenarioId={scenarioId} isFixed={isFixed} />
        )}

        {/* SCENARIO 4: ERROR MESSAGES */}
        {scenarioId === "language" && (
          <div className="sim-error-wrap">
            <div className="sim-form-card">
              <label className="sim-form-label" htmlFor="dob-input">
                Ngày sinh của bạn:
              </label>
              <div className="sim-input-wrapper">
                <input
                  id="dob-input"
                  className={`sim-form-input ${isFixed ? "input-fixed" : "input-error"}`}
                  value={formInput}
                  onChange={(e) => setFormInput(e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {isFixed ? (
                <div className="sim-feedback-box good">
                  <CheckCircle2 size={15} />
                  <div>
                    <strong>Hướng dẫn khắc phục cụ thể:</strong>
                    <p>Tháng 2 không có ngày 31. Vui lòng nhập ngày từ 01/02 đến 29/02 theo định dạng DD/MM/YYYY (ví dụ: 15/02/2005).</p>
                  </div>
                </div>
              ) : (
                <div className="sim-feedback-box bad">
                  <AlertCircle size={15} />
                  <div>
                    <strong>Thông báo lỗi tối nghĩa:</strong>
                    <p>Invalid input error code 0x404. Input validation failed.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="sim-helper-box">
              <Sparkles size={15} />
              <span>
                Đừng để người dùng đoán mò lý do bị lỗi. Hãy nói rõ: Sai ở đâu? Sai cái gì? Và sửa như thế nào!
              </span>
            </div>
          </div>
        )}
        {canCompare && <p className="sim-helper-box">Nguyên tắc: {scenario?.principle}</p>}
      </div>
    </div>
  );
}
