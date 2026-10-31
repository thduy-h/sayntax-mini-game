import type { MapDefinition, Question, Stage } from "./types";

export const DEFAULT_QUESTIONS = [
  "keyboard",
  "touch",
  "captions",
  "color",
  "time",
  "navigation",
] as const;

export const DEFAULT_LEVELS = ["1", "2", "6", "4"] as const;

export const CANONICAL_QUESTIONS: Record<string, Question> = {
  contrast: {
    id: "contrast",
    title: "Đăng ký dưới ánh nắng",
    context:
      "Nút đăng ký có chữ nhỏ màu xám nhạt trên nền trắng. Bạn có một giờ để sửa CSS, cần giữ nguyên nội dung và bố cục điện thoại.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label:
          "Tăng cỡ chữ và độ đậm, giữ cặp màu hiện tại để tránh ảnh hưởng nhận diện.",
      },
      {
        id: "o2",
        label:
          "Đổi cặp màu chữ/nền đạt tối thiểu 4.5:1 và kiểm tra trạng thái thường, hover, focus.",
      },
      {
        id: "o3",
        label:
          "Thêm bóng đổ và gradient quanh nút để thu hút chú ý mà không đổi chữ.",
      },
    ],
  },
  keyboard: {
    id: "keyboard",
    title: "Thanh điều hướng dùng phím Tab",
    context:
      "Tab đã đi đúng thứ tự nhưng người không dùng chuột không thấy mình đang ở nút nào. Cần bản sửa hoạt động trong toàn bộ thanh điều hướng.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label:
          "Dùng :focus-visible với viền rõ trên mọi nút và kiểm tra khi Tab, Shift+Tab.",
      },
      {
        id: "o2",
        label:
          "Thêm biểu tượng bàn phím và dòng hướng dẫn dùng phím Tab ở đầu trang.",
      },
      {
        id: "o3",
        label:
          "Tô sáng nút khi chuột hover, dùng cùng màu đó cho thanh điều hướng.",
      },
    ],
  },
  captions: {
    id: "captions",
    title: "Bài giảng đang diễn ra",
    context:
      "Trong hội trường ồn có người khiếm thính. Video dài 3 phút đã có transcript nhưng chưa có phụ đề đồng bộ; bạn có thể thêm track phụ đề trước giờ chiếu.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label: "Gửi transcript sau buổi học để người học đọc lại đầy đủ.",
      },
      {
        id: "o2",
        label:
          "Hiển thị transcript cạnh video, người xem tự tìm đoạn đang phát.",
      },
      {
        id: "o3",
        label:
          "Thêm phụ đề đã kiểm tra thời điểm và tên người nói, cho phép bật/tắt.",
      },
    ],
  },
  language: {
    id: "language",
    title: "Lỗi ngày sinh trong biểu mẫu",
    context:
      "Người dùng nhập 31/02/2005. Hệ thống giữ dữ liệu nhưng chỉ báo Invalid input. Bạn cần giúp họ sửa mà không phải hỏi nhân viên.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label: "Viết Nhập ngày theo DD/MM/YYYY ngay dưới ô, giữ thông báo lỗi chung.",
      },
      {
        id: "o2",
        label:
          "Viết Tháng 2/2005 không có ngày 31; nhập ngày hợp lệ, ví dụ 15/02/2005; liên kết lỗi với ô nhập.",
      },
      {
        id: "o3",
        label:
          "Hiện mã lỗi kèm nút thử gửi lại để hệ thống tự kiểm tra lần nữa.",
      },
    ],
  },
  touch: {
    id: "touch",
    title: "Hai nút sát nhau trên điện thoại",
    context:
      "Nút Lưu và Xóa chỉ rộng 18px, thường bị chạm nhầm. Cần giảm lỗi mà vẫn dùng được trên màn hình nhỏ.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label:
          "Mở rộng vùng chạm khoảng 44px và tạo khoảng cách rõ giữa hai nút.",
      },
      {
        id: "o2",
        label:
          "Giữ kích thước, thêm tooltip khi rê chuột giải thích chức năng.",
      },
      {
        id: "o3",
        label: "Thêm hộp xác nhận trước khi Xóa, giữ nguyên hai vùng chạm.",
      },
    ],
  },
  color: {
    id: "color",
    title: "Bảng trạng thái giao bài",
    context:
      "Bảng chỉ dùng chấm đỏ/xanh cho trạng thái. Người không phân biệt màu vẫn cần đọc và in bảng đen trắng.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label: "Đổi sang cặp đỏ/xanh đậm hơn và tăng kích thước chấm.",
      },
      {
        id: "o2",
        label:
          "Thêm chú giải màu trên đầu bảng, giữ nguyên các dòng hiện tại.",
      },
      {
        id: "o3",
        label:
          "Thêm nhãn Đã nộp/Cần bổ sung và ký hiệu khác nhau ở từng dòng.",
      },
    ],
  },
  time: {
    id: "time",
    title: "Phiên nhập thông tin",
    context:
      "Biểu mẫu hết hạn sau 2 phút vì phiên đăng nhập. Có người cần đọc chậm; dữ liệu chưa gửi có thể được giữ an toàn trên máy trong phiên.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label: "Tăng thời hạn cố định lên 4 phút cho tất cả người dùng.",
      },
      {
        id: "o2",
        label:
          "Cảnh báo trước khi hết hạn, cho gia hạn và giữ dữ liệu khi cần xác thực lại.",
      },
      {
        id: "o3",
        label:
          "Hiện đồng hồ đếm ngược lớn để người dùng điều chỉnh tốc độ nhập.",
      },
    ],
  },
  motion: {
    id: "motion",
    title: "Banner chuyển động liên tục",
    context:
      "Banner gây chóng mặt với một số người dùng. Nội dung vẫn có ý nghĩa nếu đứng yên và thiết bị có cài đặt giảm chuyển động.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label:
          "Tôn trọng prefers-reduced-motion và cung cấp nút dừng, giữ đủ thông tin ở trạng thái tĩnh.",
      },
      {
        id: "o2",
        label:
          "Giảm tốc chuyển động nhưng vẫn chạy lặp tự động cho mọi thiết bị.",
      },
      {
        id: "o3",
        label:
          "Chỉ phát chuyển động sau khi người dùng bật, nhưng không đọc tùy chọn hệ điều hành.",
      },
    ],
  },
  alt: {
    id: "alt",
    title: "Sơ đồ tìm phòng học",
    context:
      "Ảnh là sơ đồ duy nhất chỉ phòng A201 tầng 2 và lối có thang máy. Người dùng trình đọc màn hình cần tìm được phòng.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label:
          "Dùng alt Sơ đồ phòng học và để nguyên ảnh chứa mọi chỉ dẫn.",
      },
      {
        id: "o2",
        label:
          "Dùng tên file so-do-a201.png làm alt để người dùng biết ảnh nào được nhắc tới.",
      },
      {
        id: "o3",
        label:
          "Cung cấp alt nêu mục đích và chỉ dẫn bằng văn bản về phòng, tầng, lối thang máy.",
      },
    ],
  },
  plain: {
    id: "plain",
    title: "Hướng dẫn nhận vé",
    context:
      "Thông báo yêu cầu khởi tạo định danh điện tử để provisioning quyền tham dự. Đối tượng gồm người mới dùng biểu mẫu online.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label: "Giữ câu hiện tại và thêm mục thuật ngữ ở cuối trang.",
      },
      {
        id: "o2",
        label:
          "Viết Nhập email rồi nhấn Xác nhận. Vé sẽ được gửi đến email của bạn.",
      },
      {
        id: "o3",
        label:
          "Rút gọn thành Khởi tạo định danh để provisioning vé cho câu ngắn hơn.",
      },
    ],
  },
  audio: {
    id: "audio",
    title: "Gửi bài khi tắt tiếng",
    context:
      "Hệ thống chỉ phát tiếng ding sau khi gửi bài. Phòng học đông và một số thiết bị đang tắt tiếng.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label:
          "Thêm xác nhận bằng chữ được trình đọc màn hình thông báo, giữ âm báo tùy chọn.",
      },
      {
        id: "o2",
        label: "Tăng âm lượng mặc định và cho phép phát lại âm báo.",
      },
      {
        id: "o3",
        label:
          "Cho phép rung khi gửi thành công nhưng chưa bổ sung xác nhận trên màn hình.",
      },
    ],
  },
  navigation: {
    id: "navigation",
    title: "Menu đổi vị trí khi chuyển trang",
    context:
      "Mỗi trang học sắp xếp menu khác nhau. Người dùng hay quay nhầm trang; nhóm chỉ đủ thời gian sửa một cách nhất quán trên toàn website.",
    question:
      "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
    options: [
      {
        id: "o1",
        label:
          "Thêm thanh tìm kiếm trên mỗi trang nhưng giữ thứ tự menu thay đổi.",
      },
      {
        id: "o2",
        label: "Thêm hướng dẫn ban đầu ghi lại vị trí menu của từng trang.",
      },
      {
        id: "o3",
        label:
          "Giữ thứ tự, tên và vị trí menu nhất quán; đánh dấu trang hiện tại và thêm đường dẫn cấp trang.",
      },
    ],
  },
};

export const CANONICAL_LEVELS: Record<string, MapDefinition> = {
  "1": {
    id: "1",
    name: "Màn 1/4 · Bước đầu làm quen",
    width: 6,
    height: 6,
    start: { x: 0, y: 4 },
    goal: { x: 4, y: 4 },
    walls: ["2,3"],
    initialDirection: 1,
    maxCommands: 24,
  },
  "2": {
    id: "2",
    name: "Màn 2/4 · Cú rẽ định mệnh",
    width: 6,
    height: 6,
    start: { x: 0, y: 4 },
    goal: { x: 4, y: 1 },
    walls: ["2,4", "2,3", "2,2"],
    initialDirection: 1,
    maxCommands: 24,
  },
  "6": {
    id: "6",
    name: "Màn 3/4 · Bức tường lệch",
    width: 6,
    height: 6,
    start: { x: 1, y: 1 },
    goal: { x: 4, y: 5 },
    walls: ["1,2", "2,2", "3,2", "3,4"],
    initialDirection: 2,
    maxCommands: 24,
  },
  "4": {
    id: "4",
    name: "Màn 4/4 · Cửa ngõ xanh",
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    goal: { x: 5, y: 2 },
    walls: ["2,0", "2,1", "4,2"],
    initialDirection: 1,
    maxCommands: 24,
  },
};

export function resolveStageChallenge(
  stage: Stage | undefined | null,
): Question | MapDefinition | null {
  if (!stage) return null;

  // 1. Direct challenge from server payload
  if (
    stage.challenge &&
    typeof stage.challenge === "object" &&
    ("options" in stage.challenge || "walls" in stage.challenge)
  ) {
    return stage.challenge;
  }

  // 2. Extracted from stage.config if available
  if (
    stage.stageNo === 1 &&
    stage.config?.questions &&
    Array.isArray(stage.config.questions) &&
    stage.config.questions[stage.activeIndex]
  ) {
    return stage.config.questions[stage.activeIndex];
  }

  if (
    stage.stageNo === 2 &&
    stage.config?.maps &&
    Array.isArray(stage.config.maps) &&
    stage.config.maps[stage.activeIndex]
  ) {
    return stage.config.maps[stage.activeIndex];
  }

  // 3. Fallback lookup by ID
  if (stage.stageNo === 1) {
    const activeId =
      stage.activeItemId ??
      stage.config?.scenarioIds?.[stage.activeIndex] ??
      DEFAULT_QUESTIONS[stage.activeIndex] ??
      DEFAULT_QUESTIONS[0];

    if (activeId && activeId in CANONICAL_QUESTIONS) {
      return CANONICAL_QUESTIONS[activeId];
    }
  }

  if (stage.stageNo === 2) {
    const activeLevelId =
      stage.activeItemId ??
      stage.config?.levelIds?.[stage.activeIndex] ??
      DEFAULT_LEVELS[stage.activeIndex] ??
      DEFAULT_LEVELS[0];

    if (activeLevelId && activeLevelId in CANONICAL_LEVELS) {
      return CANONICAL_LEVELS[activeLevelId];
    }
  }

  return null;
}
