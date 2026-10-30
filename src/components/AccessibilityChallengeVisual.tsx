import { useState, useEffect } from "react";
import {
  Keyboard as KeyboardIcon,
  Eye,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Clock,
  Smartphone,
  Palette,
  Compass,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

export interface AccessibilityChallengeVisualProps {
  scenarioId: string;
  isClosed?: boolean;
  review?: {
    itemId?: string;
    explanation?: string;
    options?: { id: string; score: number }[];
  };
  options?: { id: string; label: string }[];
  readOnly?: boolean;
  allowDemoToggle?: boolean;
  viewMode?: "before" | "after";
  onViewModeChange?: (mode: "before" | "after") => void;
  canControlViewMode?: boolean;
}

interface ScenarioData {
  title: string;
  eyebrow: string;
  principle: string;
  explanation: string;
  optionRationales: Record<string, string>;
}

const SCENARIO_KNOWLEDGE: Record<string, ScenarioData> = {
  "demo-contrast-button": {
    title: "Demo · Nút xác nhận khó đọc",
    eyebrow: "A11Y DEMO · ĐỘ TƯƠNG PHẢN",
    principle: "Văn bản thông thường cần đạt tỷ lệ tương phản tối thiểu 4.5:1 với nền (WCAG 1.4.3 Contrast Minimum).",
    explanation: "Đổi màu chữ sang màu tối bảo đảm tương phản chữ/nền ít nhất 4.5:1 giúp nhãn đọc được rõ ràng trong mọi điều kiện ánh sáng.",
    optionRationales: {
      larger: "50 XP · Chưa triệt để: Nút lớn hơn giúp bấm dễ hơn nhưng chữ xám mờ vẫn không thể đọc được dưới ánh nắng mặt trời.",
      contrast: "100 XP · Tối ưu nhất: Đổi chữ sang màu tối bảo đảm tương phản chữ/nền ít nhất 4.5:1, giải quyết tận gốc vấn đề đọc chữ.",
      shadow: "0 XP · Lạc hướng: Thêm bóng đổ quanh nút chỉ thay đổi viền ngoài, không cải thiện độ tương phản của chữ.",
    },
  },
  keyboard: {
    title: "Thanh điều hướng dùng phím Tab",
    eyebrow: "A11Y · BÀN PHÍM & TIÊU ĐIỂM",
    principle: "Focus ring rõ ràng và thứ tự tab hợp lý là kim chỉ nam cho người dùng bàn phím (WCAG 2.4.7 Focus Visible).",
    explanation: "Focus-visible thông báo vị trí hiện tại; hướng dẫn có ích nhưng không thay thế chỉ báo tiêu điểm.",
    optionRationales: {
      o1: "100 XP · Tối ưu nhất: :focus-visible với viền rõ giúp người dùng nhận diện ngay nút đang chọn khi Tab.",
      o2: "50 XP · Hỗ trợ một phần: Hướng dẫn có ích nhưng khi lướt tab qua các nút người dùng vẫn bị mù tiêu điểm.",
      o3: "0 XP · Không hiệu quả: Chuột hover hoàn toàn vô dụng với người điều khiển bằng bàn phím.",
    },
  },
  touch: {
    title: "Hai nút sát nhau trên điện thoại",
    eyebrow: "A11Y · VÙNG CHẠM CẢM ỨNG",
    principle: "Mục tiêu chạm tối thiểu 44×44px và có khoảng cách rõ ràng giữa các nút (WCAG 2.5.5 Target Size).",
    explanation: "Xác nhận hạn chế hậu quả nhưng không sửa thao tác chạm khó chính xác; vùng chạm và khoảng cách giải quyết nguyên nhân.",
    optionRationales: {
      o1: "100 XP · Tối ưu nhất: Mở rộng vùng chạm ~44px và tạo khoảng cách ngăn chặn triệt để bấm nhầm.",
      o2: "0 XP · Không khả thi: Màn hình cảm ứng điện thoại không có thao tác rê chuột (hover).",
      o3: "50 XP · Giải pháp tạm thời: Hộp thoại xác nhận giảm hậu quả nhưng gây phiền toái và không sửa lỗi chạm.",
    },
  },
  captions: {
    title: "Bài giảng đang diễn ra",
    eyebrow: "A11Y · PHỤ ĐỀ ĐỒNG BỘ",
    principle: "Captions đồng bộ truyền tải lời nói và âm thanh quan trọng đúng thời điểm theo video (WCAG 1.2.2 Captions).",
    explanation: "Thông tin phải đến đúng thời điểm. Transcript song song hỗ trợ một phần; gửi sau không giúp tiếp cận buổi chiếu.",
    optionRationales: {
      o1: "0 XP · Bỏ rơi người học: Gửi sau buổi học khiến người khiếm thính hoàn toàn không thể tham gia trực tiếp.",
      o2: "50 XP · Bất tiện: Transcript bên cạnh buộc người học vừa nhìn hình vừa dò chữ, mất tập trung.",
      o3: "100 XP · Tối ưu nhất: Phụ đề đồng bộ xuất hiện đúng lúc người nói phát âm, cho phép bật/tắt linh hoạt.",
    },
  },
  color: {
    title: "Bảng trạng thái giao bài",
    eyebrow: "A11Y · KHÔNG PHỤ THUỘC MÀU SẮC",
    principle: "Không bao giờ dùng màu sắc làm tín hiệu duy nhất để truyền tải thông tin hoặc trạng thái (WCAG 1.4.1 Use of Color).",
    explanation: "Ý nghĩa cần có tín hiệu khác màu ngay tại nơi sử dụng; chú giải màu chỉ hỗ trợ một phần.",
    optionRationales: {
      o1: "0 XP · Vô tác dụng: Đậm màu hơn vẫn biến thành cùng một sắc độ xám khi in đen trắng hoặc mắt mù màu.",
      o2: "50 XP · Hỗ trợ một phần: Chú giải ở đầu bảng vẫn bắt người dùng phải đối chiếu mã màu khó khăn.",
      o3: "100 XP · Tối ưu nhất: Nhãn chữ kèm biểu tượng (✓, ⚠️) giúp phân biệt tức thì trong mọi điều kiện.",
    },
  },
  time: {
    title: "Phiên nhập thông tin",
    eyebrow: "A11Y · KIỂM SOÁT THỜI GIAN",
    principle: "Cung cấp đủ thời gian: Cảnh báo trước khi hết hạn, cho phép gia hạn và lưu dữ liệu (WCAG 2.2.1 Timing Adjustable).",
    explanation: "Thời gian cần điều chỉnh theo nhu cầu; đồng hồ không tạo thêm thời gian và một mốc cố định vẫn có thể chưa đủ.",
    optionRationales: {
      o1: "50 XP · Chưa linh hoạt: 4 phút vẫn là mốc cố định cứng nhắc, không đáp ứng được người khuyết tật vận động.",
      o2: "100 XP · Tối ưu nhất: Cảnh báo sớm, cho phép gia hạn linh hoạt và tự động giữ lại bản nháp.",
      o3: "0 XP · Tăng căng thẳng: Đồng hồ đếm ngược to chỉ tạo áp lực tâm lý chứ không tạo thêm thời gian thực.",
    },
  },
  navigation: {
    title: "Menu đổi vị trí khi chuyển trang",
    eyebrow: "A11Y · ĐIỀU HƯỚNG NHẤT QUÁN",
    principle: "Cấu trúc điều hướng phải ổn định và dự đoán được trên toàn bộ website (WCAG 3.2.3 Consistent Navigation).",
    explanation: "Cấu trúc ổn định giảm việc tìm lại mỗi khi chuyển trang. Tìm kiếm hỗ trợ nhưng không thay thế điều hướng dễ dự đoán.",
    optionRationales: {
      o1: "50 XP · Hỗ trợ một phần: Thanh tìm kiếm giúp tìm nội dung nhưng không giải quyết được menu hỗn loạn.",
      o2: "0 XP · Tăng tải nhận thức: Bắt người dùng phải ghi nhớ vị trí khác nhau của từng trang là phản thiết kế.",
      o3: "100 XP · Tối ưu nhất: Giữ nguyên thứ tự, vị trí và đánh dấu trang hiện tại giúp định hướng tức thì.",
    },
  },
  contrast: {
    title: "Đăng ký dưới ánh nắng",
    eyebrow: "A11Y · ĐỘ TƯƠNG PHẢN",
    principle: "Văn bản thông thường cần đạt tỷ lệ tương phản tối thiểu 4.5:1 với nền (WCAG 1.4.3 Contrast Minimum).",
    explanation: "Cần sửa tương phản chữ/nền thực tế; chữ lớn chỉ giảm một phần rào cản, hiệu ứng trang trí không bảo đảm đọc được.",
    optionRationales: {
      o1: "50 XP · Không triệt để: Chữ lớn chỉ giảm một phần rào cản, ngoài trời nắng vẫn rất khó đọc.",
      o2: "100 XP · Tối ưu nhất: Đổi cặp màu đạt tối thiểu 4.5:1 đảm bảo nhận diện rõ trong mọi điều kiện ánh sáng.",
      o3: "0 XP · Lạc hướng: Bóng đổ trang trí không giải quyết được vấn đề độ tương phản chữ.",
    },
  },
  language: {
    title: "Lỗi ngày sinh trong biểu mẫu",
    eyebrow: "A11Y · HƯỚNG DẪN XỬ LÝ LỖI",
    principle: "Xác định lỗi và cung cấp hướng dẫn khắc phục cụ thể, rõ ràng bằng ngôn ngữ tự nhiên (WCAG 3.3.3 Error Suggestion).",
    explanation: "Hướng dẫn phải giải thích lỗi cụ thể và cách sửa. Định dạng đúng vẫn có thể chứa một ngày không tồn tại.",
    optionRationales: {
      o1: "50 XP · Chung chung: Chỉ nêu định dạng DD/MM/YYYY không giải thích tại sao ngày 31/02 không hợp lệ.",
      o2: "100 XP · Tối ưu nhất: Giải thích rõ tháng 2 không có ngày 31 và đưa ra ví dụ ngày hợp lệ cụ thể.",
      o3: "0 XP · Tối nghĩa: Mã lỗi kỹ thuật 0x404 chỉ gây hoang mang và chặn đứng người dùng.",
    },
  },
  motion: {
    title: "Banner chuyển động liên tục",
    eyebrow: "A11Y · KIỂM SOÁT CHUYỂN ĐỘNG",
    principle: "Cung cấp nút dừng chuyển động và tôn trọng tùy chọn prefers-reduced-motion của thiết bị (WCAG 2.2.2 Pause, Stop, Hide).",
    explanation: "Tùy chọn hệ điều hành cùng điều khiển tại chỗ hỗ trợ cả nhu cầu sẵn có lẫn nhu cầu phát sinh; chậm hơn vẫn có thể gây khó chịu.",
    optionRationales: {
      o1: "100 XP · Tối ưu nhất: Tôn trọng prefers-reduced-motion và cung cấp nút dừng cho phép kiểm soát hoàn toàn.",
      o2: "0 XP · Gây mệt mỏi: Chuyển động chậm vẫn lặp vô tận và tiếp tục gây khó chịu cho người rối loạn tiền đình.",
      o3: "50 XP · Thiếu đồng bộ: Không đọc thiết lập hệ điều hành bỏ qua lựa chọn an toàn của người dùng.",
    },
  },
  alt: {
    title: "Sơ đồ tìm phòng học",
    eyebrow: "A11Y · VĂN BẢN THAY THẾ (ALT)",
    principle: "Hình ảnh mang thông tin chức năng cần có văn bản thay thế truyền tải đầy đủ ý nghĩa (WCAG 1.1.1 Non-text Content).",
    explanation: "Văn bản thay thế cần truyền đạt thông tin và mục đích thực tế; tên tệp không hướng dẫn được lộ trình.",
    optionRationales: {
      o1: "50 XP · Chưa đủ: Alt chung chung không hướng dẫn được phòng ở đâu, tầng mấy, đi lối nào.",
      o2: "0 XP · Vô nghĩa: Tên file so-do-a201.png không mang lại bất kỳ thông tin điều hướng nào.",
      o3: "100 XP · Tối ưu nhất: Mô tả rõ ràng phòng A201 tại tầng 2 và chỉ dẫn lối thang máy tiếp cận.",
    },
  },
  plain: {
    title: "Hướng dẫn nhận vé",
    eyebrow: "A11Y · NGÔN NGỮ ĐƠN GIẢN",
    principle: "Sử dụng từ ngữ thông dụng, câu ngắn và hành động cụ thể, tránh thuật ngữ kỹ thuật (WCAG 3.1.5 Reading Level).",
    explanation: "Ngôn ngữ quen thuộc và hành động cụ thể giảm tải nhận thức; bảng thuật ngữ có ích nhưng vẫn buộc người đọc chuyển qua lại.",
    optionRationales: {
      o1: "50 XP · Gây phiền: Giữ thuật ngữ khó hiểu rồi bắt người dùng tra cứu bảng thuật ngữ làm đứt đoạn thao tác.",
      o2: "100 XP · Tối ưu nhất: Hành động cụ thể: 'Nhập email rồi nhấn Xác nhận. Vé sẽ được gửi đến email'.",
      o3: "0 XP · Tệ hơn: Rút gọn mà vẫn giữ từ kỹ thuật 'provisioning' không giúp người dùng hiểu cách làm.",
    },
  },
  audio: {
    title: "Gửi bài khi tắt tiếng",
    eyebrow: "A11Y · PHẢN HỒI ĐA GIÁC QUAN",
    principle: "Mọi thông báo âm thanh phải có phản hồi thị giác hoặc văn bản tương đương (WCAG 1.3.3 Sensory Characteristics).",
    explanation: "Phản hồi bằng chữ và live region không phụ thuộc loa hoặc khả năng rung của thiết bị.",
    optionRationales: {
      o1: "100 XP · Tối ưu nhất: Thông báo bằng văn bản trên màn hình kết hợp live region cho trình đọc màn hình.",
      o2: "0 XP · Bất khả thi: Thiết bị đang tắt tiếng hoặc loa hỏng thì tăng âm lượng không có tác dụng.",
      o3: "50 XP · Chưa trọn vẹn: Rung chỉ hỗ trợ điện thoại, không hỗ trợ máy tính để bàn hoặc thiết bị không rung.",
    },
  },
};

export function AccessibilityChallengeVisual({
  scenarioId,
  isClosed = false,
  review,
  options = [],
  readOnly = false,
  allowDemoToggle = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  canControlViewMode = false,
}: AccessibilityChallengeVisualProps) {
  const isDemo = scenarioId.startsWith("demo-") || allowDemoToggle;
  // When closed or demo, MC can toggle between before and after
  const [internalViewMode, setInternalViewMode] = useState<"before" | "after">(
    isDemo ? "before" : (isClosed ? "after" : "before")
  );
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: "before" | "after") => {
    if (!canControlViewMode) return;
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  // Keep viewMode in sync: when closed and uncontrolled, default to "after" view
  useEffect(() => {
    if (isDemo || controlledViewMode !== undefined) return;
    if (isClosed) {
      setInternalViewMode("after");
    } else {
      setInternalViewMode("before");
    }
  }, [isClosed, isDemo, controlledViewMode]);

  // Actual fixed state shown in the mockup:
  // Before question is closed (and not demo): ALWAYS false (strictly before)
  // After question is closed or in demo mode: controlled by viewMode
  const isFixed = (isClosed || isDemo) ? viewMode === "after" : false;

  // Interactive mockup state
  const [tabIndex, setTabIndex] = useState(1);
  const [touchResult, setTouchResult] = useState<string | null>(null);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [colorblindSim, setColorblindSim] = useState(false);
  const [extendedTime, setExtendedTime] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(105);
  const [activeNavPage, setActiveNavPage] = useState("Trang chủ");
  const [glareMode, setGlareMode] = useState(true);
  const [motionPaused, setMotionPaused] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState<string | null>(null);

  // Sync captions state when fixed changes
  useEffect(() => {
    if (isFixed) {
      setCaptionsOn(true);
    }
  }, [isFixed]);

  const knowledge = SCENARIO_KNOWLEDGE[scenarioId] ?? {
    title: "Thử thách tiếp cận",
    eyebrow: "A11Y CHALLENGE",
    principle: "Đảm bảo mọi người dùng đều có thể tiếp nhận và tương tác với giao diện.",
    explanation: review?.explanation ?? "Giải pháp tối ưu giải quyết rào cản cốt lõi mà không gây cản trở người dùng.",
    optionRationales: {},
  };

  return (
    <div className="a11y-mockup-container">
      {/* Simulation Header */}
      <div className="a11y-mockup-header">
        <div className="a11y-mockup-controls-left">
          <span className="a11y-dot dot-red" />
          <span className="a11y-dot dot-yellow" />
          <span className="a11y-dot dot-green" />
          <span className="a11y-mockup-tag">
            <Eye size={13} />
            MÔ PHỎNG THỰC TẾ
          </span>
        </div>

        <div className="a11y-mockup-status-badge">
          {isClosed || isDemo ? (
            isFixed ? (
              <span className="badge-pass">
                <CheckCircle2 size={13} /> Sau khi sửa (AFTER)
              </span>
            ) : (
              <span className="badge-fail">
                <AlertCircle size={13} /> Trước khi sửa (BEFORE)
              </span>
            )
          ) : (
            <span className="badge-fail">
              <AlertCircle size={13} /> Gặp rào cản (BEFORE)
            </span>
          )}
        </div>
      </div>

      {/* Before / After toggle toolbar — visible when question is closed OR when in demo mode */}
      {(isClosed || isDemo) && (
        <div className="a11y-compare-toolbar" role="group" aria-label="So sánh trước và sau khi chốt">
          <button
            type="button"
            className={`a11y-compare-btn ${viewMode === "before" ? "active" : ""}`}
            aria-pressed={viewMode === "before"}
            disabled={!canControlViewMode}
            title={canControlViewMode ? "Chuyển sang xem Trước khi sửa (BEFORE)" : "Đồng bộ theo MC · Chỉ MC có quyền điều khiển"}
            onClick={() => canControlViewMode && setViewMode("before")}
          >
            <AlertCircle size={14} />
            1. Trước khi sửa (BEFORE)
          </button>
          <button
            type="button"
            className={`a11y-compare-btn ${viewMode === "after" ? "active" : ""}`}
            aria-pressed={viewMode === "after"}
            disabled={!canControlViewMode}
            title={canControlViewMode ? "Chuyển sang xem Sau khi sửa (AFTER)" : "Đồng bộ theo MC · Chỉ MC có quyền điều khiển"}
            onClick={() => canControlViewMode && setViewMode("after")}
          >
            <CheckCircle2 size={14} />
            2. Sau khi sửa (AFTER)
          </button>
          {!canControlViewMode && (
            <span className="a11y-mc-sync-badge" title="Chế độ hiển thị do MC điều khiển">
              🔒 MC điều khiển
            </span>
          )}
        </div>
      )}

      {/* Main Miniature UI Mockup Canvas */}
      <div className={`a11y-mockup-canvas ${colorblindSim ? "is-grayscale" : ""}`}>
        {/* SCENARIO 1: KEYBOARD FOCUS */}
        {scenarioId === "keyboard" && (
          <div className="sim-box sim-keyboard-box">
            <div className="sim-box-toolbar">
              <span className="sim-toolbar-label">Mô phỏng bàn phím:</span>
              <button
                type="button"
                className="sim-tool-btn"
                onClick={() => setTabIndex((prev) => (prev % 4) + 1)}
              >
                <KeyboardIcon size={14} />
                <span>Nhấn phím Tab (Vị trí {tabIndex}/4)</span>
              </button>
            </div>

            <nav className="sim-navbar-preview" aria-label="Điều hướng mô phỏng">
              <div className="sim-nav-brand">SAYNTAX</div>
              <div className="sim-nav-links">
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
                      className={`sim-nav-item ${
                        isCurrent
                          ? isFixed
                            ? "nav-item-focused-after"
                            : "nav-item-focused-before"
                          : ""
                      }`}
                      onClick={() => setTabIndex(item.id)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Tiêu điểm rõ ràng (:focus-visible):</strong>
                    <p>
                      Viền tương phản cao 3px đang bao quanh mục{" "}
                      <strong>
                        {["Trang chủ", "Khóa học", "Bảng điểm", "Tài liệu"][tabIndex - 1]}
                      </strong>
                      . Người dùng bàn phím định hướng chính xác tức thì.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Mất dấu tiêu điểm hoàn toàn:</strong>
                    <p>
                      Không có viền nhận diện! Người dùng phím Tab hoàn toàn không biết con trỏ
                      đang ở nút nào trên màn hình.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 2: TOUCH TARGETS */}
        {scenarioId === "touch" && (
          <div className="sim-box sim-touch-box">
            <div className="sim-mobile-frame">
              <div className="sim-mobile-screen">
                <div className="sim-doc-card">
                  <div className="sim-doc-icon">📄</div>
                  <div className="sim-doc-details">
                    <strong>Do_An_Tot_Nghiep_Final.pdf</strong>
                    <span>14.8 MB · Cập nhật 5 phút trước</span>
                  </div>
                </div>

                <div className="sim-touch-actions-wrap">
                  <span className="sim-touch-label">Thao tác tài liệu:</span>
                  {isFixed ? (
                    <div className="sim-touch-row-fixed">
                      <button
                        type="button"
                        className="sim-btn-large-primary"
                        onClick={() =>
                          setTouchResult("✓ Bạn vừa nhấn nút 'Lưu'. Thao tác an toàn và chuẩn xác.")
                        }
                      >
                        Lưu tài liệu
                      </button>
                      <button
                        type="button"
                        className="sim-btn-large-danger"
                        onClick={() =>
                          setTouchResult("⚠️ Bạn đã nhấn nút 'Xóa'. Vùng chạm 48px riêng biệt ngăn bấm nhầm.")
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  ) : (
                    <div className="sim-touch-row-broken">
                      <button
                        type="button"
                        className="sim-btn-tiny"
                        onClick={() =>
                          setTouchResult("❌ CHẠM NHẦM! Ngón tay vô tình chạm trúng nút Xóa bên cạnh thay vì Lưu! Vùng chạm 18px quá nhỏ.")
                        }
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        className="sim-btn-tiny"
                        onClick={() =>
                          setTouchResult("❌ Chạm nút Xóa! Hai nút chỉ cách nhau 2px trên màn hình cảm ứng.")
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>

                {touchResult && (
                  <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
                    <p>{touchResult}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCENARIO 3: CAPTIONS */}
        {scenarioId === "captions" && (
          <div className="sim-box sim-captions-box">
            <div className="sim-box-toolbar">
              <span className="sim-toolbar-label">Điều khiển phụ đề:</span>
              <button
                type="button"
                className={`sim-tool-btn ${captionsOn ? "active" : ""}`}
                onClick={() => setCaptionsOn(!captionsOn)}
              >
                {captionsOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{captionsOn ? "Phụ đề: BẬT" : "Phụ đề: TẮT"}</span>
              </button>
            </div>

            <div className="sim-video-canvas">
              <div className="sim-video-inner">
                <div className="sim-speaker-card">
                  <div className="sim-speaker-avatar">👨‍🏫</div>
                  <div>
                    <strong>Thầy Nam — Diễn giả Workshop</strong>
                    <span className="sim-noise-badge">📍 Hội trường ồn ào · 85 dB</span>
                  </div>
                </div>

                {captionsOn ? (
                  <div className="sim-captions-overlay">
                    <span className="sim-captions-cc-badge">CC</span>
                    <span className="sim-captions-text">
                      [Thầy Nam] "Mỗi dòng lệnh các bạn viết hôm nay đều có thể tạo ra sản phẩm cho tất cả mọi người."
                    </span>
                  </div>
                ) : (
                  <div className="sim-no-captions-overlay">
                    <VolumeX size={16} />
                    <span>(Tiếng ồn hội trường lấn át hoàn toàn giọng nói — Không có phụ đề!)</span>
                  </div>
                )}
              </div>
            </div>

            <div className={`sim-feedback-card ${captionsOn ? "is-good" : "is-bad"}`}>
              {captionsOn ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Phụ đề đồng bộ xuất hiện đúng lúc:</strong>
                    <p>Người khiếm thính và người trong không gian ồn theo dõi trọn vẹn nội dung.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Rào cản thông tin:</strong>
                    <p>Không có phụ đề đồng bộ, người xem khiếm thính hoàn toàn bị cô lập trong buổi chiếu.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 4: COLOR-ONLY INDICATOR */}
        {scenarioId === "color" && (
          <div className="sim-box sim-color-box">
            <div className="sim-box-toolbar">
              <span className="sim-toolbar-label">Thị giác mô phỏng:</span>
              <button
                type="button"
                className={`sim-tool-btn ${colorblindSim ? "active" : ""}`}
                onClick={() => setColorblindSim(!colorblindSim)}
              >
                <Palette size={14} />
                <span>{colorblindSim ? "Đang xem: Đen trắng / Mù màu" : "Bật mô phỏng Mù màu / In đen trắng"}</span>
              </button>
            </div>

            <table className="sim-table-preview" aria-label="Bảng theo dõi bài tập">
              <thead>
                <tr>
                  <th>Sinh viên</th>
                  <th>Bài tập</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nguyễn Văn An</td>
                  <td>Đồ án UI/UX</td>
                  <td>
                    {isFixed ? (
                      <span className="sim-status-chip chip-success">
                        <Check size={12} /> Đã nộp
                      </span>
                    ) : (
                      <span className="sim-dot-only dot-only-green" title="Chấm xanh" />
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Trần Thị Bình</td>
                  <td>Báo cáo Lab 3</td>
                  <td>
                    {isFixed ? (
                      <span className="sim-status-chip chip-warning">
                        <AlertTriangle size={12} /> Cần bổ sung
                      </span>
                    ) : (
                      <span className="sim-dot-only dot-only-red" title="Chấm đỏ" />
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Lê Hoàng Cường</td>
                  <td>Bài tập A11y</td>
                  <td>
                    {isFixed ? (
                      <span className="sim-status-chip chip-success">
                        <Check size={12} /> Đã nộp
                      </span>
                    ) : (
                      <span className="sim-dot-only dot-only-green" title="Chấm xanh" />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Đa phương thức (Chữ + Biểu tượng):</strong>
                    <p>Nhãn chữ "Đã nộp" / "Cần bổ sung" kèm icon (✓, ⚠️) đọc tốt trong mọi điều kiện kể cả khi in đen trắng.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Rào cản độc quyền màu sắc:</strong>
                    <p>Chỉ dùng chấm đỏ/xanh khiến người mù màu hoặc khi in đen trắng hoàn toàn không phân biệt được trạng thái.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 5: TIME ADJUSTABLE */}
        {scenarioId === "time" && (
          <div className="sim-box sim-time-box">
            <div className="sim-form-preview">
              <div className="sim-form-header">
                <strong>Biểu mẫu đăng ký dự án nghiên cứu</strong>
                <span className="sim-badge-neutral">Mã: CS-2026</span>
              </div>

              {isFixed ? (
                <div className="sim-time-banner-fixed">
                  <div className="sim-time-info">
                    <Clock size={16} />
                    <span>
                      {extendedTime
                        ? "Đã gia hạn thành công thêm 5 phút. Bản nháp đã lưu tự động an toàn."
                        : "Phiên làm việc còn 5 phút. Dữ liệu của bạn được tự động lưu tạm."}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sim-tool-btn active"
                    onClick={() => {
                      setExtendedTime(true);
                      setTimeRemaining((t) => t + 300);
                    }}
                  >
                    + Gia hạn thêm 5 phút
                  </button>
                </div>
              ) : (
                <div className="sim-time-banner-broken">
                  <div className="sim-time-info">
                    <AlertTriangle size={16} />
                    <span>
                      CẢNH BÁO: Phiên sẽ tự hủy sau:{" "}
                      <strong>
                        {Math.floor(timeRemaining / 60)}:
                        {String(timeRemaining % 60).padStart(2, "0")}
                      </strong>
                    </span>
                  </div>
                  <span className="sim-badge-danger">Không thể gia hạn!</span>
                </div>
              )}

              <div className="sim-input-row">
                <input
                  type="text"
                  readOnly
                  value="Nguyễn Văn An — Sinh viên Khoa CNTT"
                  className="sim-input-mock"
                />
              </div>
            </div>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Kiểm soát thời gian linh hoạt:</strong>
                    <p>Cảnh báo trước khi hết hạn, cho phép gia hạn và giữ lại dữ liệu nháp của người dùng.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Hết hạn đột ngột làm mất dữ liệu:</strong>
                    <p>Mốc thời gian 2 phút cố định không cho gia hạn chặn đứng người cần thời gian đọc chậm hoặc khó thao tác.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 6: CONSISTENT NAVIGATION */}
        {scenarioId === "navigation" && (
          <div className="sim-box sim-nav-box">
            <div className="sim-box-toolbar">
              <span className="sim-toolbar-label">Chuyển đổi trang:</span>
              {(["Trang chủ", "Khóa học", "Tài liệu"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`sim-tool-btn ${activeNavPage === p ? "active" : ""}`}
                  onClick={() => setActiveNavPage(p)}
                >
                  <span>Mở {p}</span>
                </button>
              ))}
            </div>

            <div className="sim-site-header">
              <div className="sim-breadcrumbs">
                SAYNTAX &gt; {activeNavPage} &gt; Tổng quan
              </div>

              {/* In broken mode, navigation order changes randomly across pages! */}
              <nav className="sim-site-nav" aria-label="Thanh điều hướng">
                {(isFixed || activeNavPage === "Trang chủ"
                  ? ["Trang chủ", "Khóa học", "Tài liệu", "Trợ giúp"]
                  : activeNavPage === "Khóa học"
                  ? ["Tài liệu", "Trợ giúp", "Khóa học", "Trang chủ"]
                  : ["Trợ giúp", "Trang chủ", "Khóa học", "Tài liệu"]
                ).map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={`sim-site-nav-btn ${
                      activeNavPage === label ? "is-active-page" : ""
                    }`}
                    onClick={() => setActiveNavPage(label)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Điều hướng nhất quán và dễ đoán:</strong>
                    <p>Thứ tự và vị trí menu được cố định trên toàn bộ các trang, giúp người dùng xây dựng mô hình tinh thần ổn định.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Vị trí menu bị đảo lộn giữa các trang:</strong>
                    <p>Mỗi trang sắp xếp một kiểu khiến người dùng bị lạc, mất phương hướng và liên tục bấm nhầm.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 7: CONTRAST & DEMO CONTRAST */}
        {(scenarioId === "contrast" || scenarioId === "demo-contrast-button") && (
          <div className="sim-box sim-contrast-box">
            <div className="sim-box-toolbar">
              <span className="sim-toolbar-label">Môi trường:</span>
              <button
                type="button"
                className={`sim-tool-btn ${glareMode ? "active" : ""}`}
                onClick={() => setGlareMode(!glareMode)}
              >
                {glareMode ? <Sun size={14} /> : <Moon size={14} />}
                <span>{glareMode ? "Ngoài trời nắng gắt (Chói)" : "Trong nhà râm mát"}</span>
              </button>
            </div>

            <div className={`sim-contrast-canvas ${glareMode ? "is-glare" : ""}`}>
              <div className="sim-banner-card">
                <h4>
                  {scenarioId === "demo-contrast-button"
                    ? "SAYNTAX WORKSHOP · TIẾP CẬN SỐ"
                    : "Hội thảo Trực tuyến: Lập trình Tiếp cận"}
                </h4>
                <p>
                  {scenarioId === "demo-contrast-button"
                    ? "Xác nhận tham gia buổi thực hành giao diện tiếp cận và rèn luyện tư duy lập trình."
                    : "Khám phá cách tư duy bao trùm cho lập trình viên hiện đại."}
                </p>
                {scenarioId === "demo-contrast-button" && (
                  <div className="sim-demo-form-section">
                    <label className="sim-demo-input-label">Email đăng ký:</label>
                    <input
                      type="text"
                      readOnly
                      value="team1@sayntax.edu.vn"
                      className="sim-input-mock"
                    />
                  </div>
                )}
                <div className="sim-btn-container">
                  {isFixed ? (
                    <button type="button" className="sim-btn-contrast-good">
                      {scenarioId === "demo-contrast-button"
                        ? "Xác nhận tham gia"
                        : "Đăng ký tham gia ngay →"}
                    </button>
                  ) : (
                    <button type="button" className="sim-btn-contrast-bad">
                      {scenarioId === "demo-contrast-button"
                        ? "Xác nhận tham gia"
                        : "Đăng ký tham gia ngay →"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sim-meter-card">
              <div className="meter-label">
                <span>Tỷ lệ tương phản chữ/nền:</span>
                <strong>
                  {isFixed
                    ? (scenarioId === "demo-contrast-button" ? "12.6 : 1 (Đạt chuẩn WCAG AAA)" : "8.6 : 1 (Đạt chuẩn WCAG AAA)")
                    : "1.8 : 1 (Thất bại WCAG AA - Cần tối thiểu 4.5:1)"}
                </strong>
              </div>
              <div className="meter-track">
                <div
                  className={`meter-bar ${isFixed ? "bar-pass" : "bar-fail"}`}
                  style={{ width: isFixed ? "95%" : "22%" }}
                />
              </div>
            </div>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Tương phản cao đạt chuẩn WCAG:</strong>
                    <p>
                      Màu chữ tối đậm trên nền sáng tạo độ tương phản cao ({scenarioId === "demo-contrast-button" ? "12.6:1" : "8.6:1"}), nhãn nút đọc được rõ ràng ngay cả dưới ánh nắng gắt mà không bị lóa mờ.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Chữ xám nhạt gần như biến mất dưới nắng:</strong>
                    <p>
                      Tỷ lệ tương phản 1.8:1 thấp hơn nhiều so với chuẩn tối thiểu 4.5:1. Người dùng khiếm thị hoặc thao tác ngoài trời nắng không thể nhận biết nhãn nút để thao tác.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 8: LANGUAGE / ERROR HANDLING */}
        {scenarioId === "language" && (
          <div className="sim-box sim-language-box">
            <div className="sim-form-card">
              <label htmlFor="dob-demo" className="sim-label">
                Ngày sinh của bạn:
              </label>
              <input
                id="dob-demo"
                type="text"
                readOnly
                value="31/02/2005"
                className={`sim-input-mock ${isFixed ? "input-valid" : "input-invalid"}`}
              />
              {isFixed ? (
                <div className="sim-feedback-card is-good">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Hướng dẫn sửa cụ thể và nhân văn:</strong>
                    <p>Tháng 2/2005 không có ngày 31. Vui lòng nhập ngày từ 01/02 đến 28/02 theo định dạng DD/MM/YYYY (ví dụ: 15/02/2005).</p>
                  </div>
                </div>
              ) : (
                <div className="sim-feedback-card is-bad">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Thông báo lỗi tối nghĩa:</strong>
                    <p>Invalid input error code 0x404. Input validation failed.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 9: MOTION */}
        {scenarioId === "motion" && (
          <div className="sim-box sim-motion-box">
            <div className="sim-box-toolbar">
              <span className="sim-toolbar-label">Chuyển động:</span>
              <button
                type="button"
                className="sim-tool-btn active"
                onClick={() => setMotionPaused((p) => !p)}
              >
                <span>{motionPaused || isFixed ? "▶ Tiếp tục chuyển động" : "⏸ Dừng chuyển động"}</span>
              </button>
            </div>

            <div className="sim-motion-container">
              <div className={`sim-motion-track ${motionPaused || isFixed ? "is-paused" : "is-animating"}`}>
                <span className="sim-ticker-item">🔥 ƯU ĐÃI WORKSHOP SAYNTAX ARENA 2026 🔥</span>
                <span className="sim-ticker-item">⚡ TRANH TÀI CÔNG NGHỆ ⚡</span>
              </div>
            </div>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Tôn trọng giảm chuyển động:</strong>
                    <p>Cung cấp nút dừng tại chỗ và tôn trọng cài đặt prefers-reduced-motion của hệ điều hành.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Chuyển động liên tục gây chóng mặt:</strong>
                    <p>Banner chuyển động không thể dừng gây mất tập trung và nguy cơ buồn nôn cho người rối loạn tiền đình.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 10: ALT TEXT */}
        {scenarioId === "alt" && (
          <div className="sim-box sim-alt-box">
            <div className="sim-map-mock">
              <div className="sim-map-visual">
                <Compass size={32} />
                <div className="sim-map-text">
                  <strong>SƠ ĐỒ PHÒNG A201</strong>
                  <span>Tầng 2 · Lối vào có thang máy và dốc thoai thoải</span>
                </div>
              </div>
              <div className="sim-alt-code-badge">
                {isFixed ? (
                  <code>alt="Workshop tại phòng A201, tầng 2, lối vào có thang máy và dốc thoai thoải"</code>
                ) : (
                  <code>alt="so-do-a201.png"</code>
                )}
              </div>
            </div>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Alt text truyền tải thông tin thực tế:</strong>
                    <p>Người dùng trình đọc màn hình nắm rõ số phòng, tầng và lối vào tiếp cận được.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Alt text vô dụng:</strong>
                    <p>Tên tệp không truyền tải được bất kỳ hướng dẫn định hướng nào.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 11: PLAIN LANGUAGE */}
        {scenarioId === "plain" && (
          <div className="sim-box sim-plain-box">
            <div className="sim-message-card">
              {isFixed ? (
                <div className="sim-plain-good">
                  <strong>Hướng dẫn nhận vé:</strong>
                  <p>Nhập email rồi nhấn <strong>Xác nhận</strong>. Vé sẽ được gửi trực tiếp đến hộp thư của bạn.</p>
                </div>
              ) : (
                <div className="sim-plain-bad">
                  <strong>Thông báo hệ thống:</strong>
                  <p>Khởi tạo định danh điện tử để tiến hành provisioning quyền tham dự cơ sở dữ liệu.</p>
                </div>
              )}
            </div>

            <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
              {isFixed ? (
                <>
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Ngôn ngữ giản dị, hành động cụ thể:</strong>
                    <p>Người mới dùng biểu mẫu hiểu ngay cần làm gì mà không bị chặn bởi thuật ngữ kỹ thuật.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Biệt ngữ kỹ thuật gây hoang mang:</strong>
                    <p>Từ ngữ 'provisioning' và 'định danh' làm tăng tải nhận thức, khiến người dùng lúng túng.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SCENARIO 12: AUDIO FEEDBACK */}
        {scenarioId === "audio" && (
          <div className="sim-box sim-audio-box">
            <div className="sim-box-toolbar">
              <span className="sim-toolbar-label">Thử nghiệm:</span>
              <button
                type="button"
                className="sim-tool-btn active"
                onClick={() =>
                  setAudioFeedback(
                    isFixed
                      ? "✓ Đã nộp bài tập thành công! Bạn có thể tiếp tục câu hỏi tiếp theo."
                      : "(Chỉ phát tiếng chuông 'ding' trong loa — không có thông báo trên màn hình)"
                  )
                }
              >
                <span>Nhấn nút Nộp bài tập</span>
              </button>
            </div>

            {audioFeedback && (
              <div className={`sim-feedback-card ${isFixed ? "is-good" : "is-bad"}`}>
                <p>{audioFeedback}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REVEAL ACCORDION / EXPLANATION BOX — VISIBLE AFTER CLOSE OR IN DEMO AFTER STATE */}
      {(isClosed || (isDemo && isFixed)) && (
        <div className="a11y-reveal-card" role="region" aria-label="Phân tích kết quả thử thách">
          <div className="a11y-reveal-header">
            <Sparkles size={18} />
            <h3>GIẢI MÃ THỬ THÁCH &amp; NGUYÊN TẮC TIẾP CẬN</h3>
          </div>

          <div className="a11y-reveal-body">
            {/* 1. Core Principle */}
            <div className="reveal-block principle-block">
              <span className="reveal-label">💡 NGUYÊN TẮC TIẾP CẬN CỐT LÕI:</span>
              <p className="principle-text">{knowledge.principle}</p>
            </div>

            {/* 2. Official Solution Explanation */}
            <div className="reveal-block explanation-block">
              <span className="reveal-label">🏆 TẠI SAO PHƯƠNG ÁN ĐÚNG LÀ TỐI ƯU NHẤT?</span>
              <p className="explanation-text">{review?.explanation ?? knowledge.explanation}</p>
            </div>

            {/* 3. Detailed Breakdown of Options */}
            {options.length > 0 && (
              <div className="reveal-block options-breakdown-block">
                <span className="reveal-label">📊 PHÂN TÍCH CHI TIẾT TỪNG PHƯƠNG ÁN:</span>
                <ul className="reveal-options-list">
                  {options.map((opt) => {
                    const reviewScore = review?.options?.find((o) => o.id === opt.id)?.score;
                    const demoScore = opt.id === "contrast" ? 100 : opt.id === "larger" ? 50 : 0;
                    const score = reviewScore ?? (isDemo ? demoScore : undefined);
                    const rationale = knowledge.optionRationales[opt.id];
                    const isOptimal = score === 100;
                    const isPartial = score === 50;

                    return (
                      <li
                        key={opt.id}
                        className={`reveal-option-item ${
                          isOptimal ? "opt-optimal" : isPartial ? "opt-partial" : "opt-harmful"
                        }`}
                      >
                        <div className="opt-header">
                          <span className="opt-label">{opt.label}</span>
                          {score !== undefined && (
                            <span
                              className={`opt-score-badge ${
                                isOptimal ? "score-100" : isPartial ? "score-50" : "score-0"
                              }`}
                            >
                              {score} XP
                            </span>
                          )}
                        </div>
                        {rationale && <p className="opt-rationale">{rationale}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
