// SERVER ONLY. Do not import this module into any frontend component.
import {
  ROBOT_LEVELS,
  type RobotCommand,
  type RobotLevel,
} from "./canonical.ts";
export const COMPETITION_VERSION = "competition-v2-1";
// V4: 6 official questions, balanced difficulty (easy → moderate → challenging)
export const DEFAULT_QUESTIONS = [
  "keyboard",   // Q1: Easy-Moderate — foundational focus indicator
  "touch",      // Q2: Easy-Moderate — touch target with plausible alternatives
  "captions",   // Q3: Moderate — synchronised vs. asynchronous alternatives
  "color",      // Q4: Moderate — non-color cue trade-offs
  "time",       // Q5: Moderate-Challenging — session timeout prioritization
  "navigation", // Q6: Moderate-Challenging — consistency vs. search trade-off
];
// V4: 4 competition levels selected by BFS difficulty (par: 4, 9, 9, 12)
// Level 1 (par=4) → Level 2 (par=9) → Level 6 (par=9, richer layout) → Level 4 (par=12)
export const DEFAULT_LEVELS = ["1", "2", "6", "4"];
type Question = {
  id: string;
  title: string;
  context: string;
  question: string;
  options: { id: string; label: string }[];
};
type Entry = { public: Question; scores: number[]; explanation: string };
const entries: Record<string, Entry> = {};
function question(
  id: string,
  title: string,
  context: string,
  options: string[],
  scores: number[],
  explanation: string,
) {
  entries[id] = {
    public: {
      id,
      title,
      context,
      question:
        "Trong điều kiện này, phương án nào giải quyết rào cản hiệu quả nhất?",
      options: options.map((label, i) => ({ id: `o${i + 1}`, label })),
    },
    scores,
    explanation,
  };
}
question(
  "contrast",
  "Đăng ký dưới ánh nắng",
  "Nút đăng ký có chữ nhỏ màu xám nhạt trên nền trắng. Bạn có một giờ để sửa CSS, cần giữ nguyên nội dung và bố cục điện thoại.",
  [
    "Tăng cỡ chữ và độ đậm, giữ cặp màu hiện tại để tránh ảnh hưởng nhận diện.",
    "Đổi cặp màu chữ/nền đạt tối thiểu 4.5:1 và kiểm tra trạng thái thường, hover, focus.",
    "Thêm bóng đổ và gradient quanh nút để thu hút chú ý mà không đổi chữ.",
  ],
  [50, 100, 0],
  "Cần sửa tương phản chữ/nền thực tế; chữ lớn chỉ giảm một phần rào cản, hiệu ứng trang trí không bảo đảm đọc được.",
);
question(
  "keyboard",
  "Thanh điều hướng dùng phím Tab",
  "Tab đã đi đúng thứ tự nhưng người không dùng chuột không thấy mình đang ở nút nào. Cần bản sửa hoạt động trong toàn bộ thanh điều hướng.",
  [
    "Dùng :focus-visible với viền rõ trên mọi nút và kiểm tra khi Tab, Shift+Tab.",
    "Thêm biểu tượng bàn phím và dòng hướng dẫn dùng phím Tab ở đầu trang.",
    "Tô sáng nút khi chuột hover, dùng cùng màu đó cho thanh điều hướng.",
  ],
  [100, 50, 0],
  "Focus-visible thông báo vị trí hiện tại; hướng dẫn có ích nhưng không thay thế chỉ báo tiêu điểm.",
);
question(
  "captions",
  "Bài giảng đang diễn ra",
  "Trong hội trường ồn có người khiếm thính. Video dài 3 phút đã có transcript nhưng chưa có phụ đề đồng bộ; bạn có thể thêm track phụ đề trước giờ chiếu.",
  [
    "Gửi transcript sau buổi học để người học đọc lại đầy đủ.",
    "Hiển thị transcript cạnh video, người xem tự tìm đoạn đang phát.",
    "Thêm phụ đề đã kiểm tra thời điểm và tên người nói, cho phép bật/tắt.",
  ],
  [0, 50, 100],
  "Thông tin phải đến đúng thời điểm. Transcript song song hỗ trợ một phần; gửi sau không giúp tiếp cận buổi chiếu.",
);
question(
  "language",
  "Lỗi ngày sinh trong biểu mẫu",
  "Người dùng nhập 31/02/2005. Hệ thống giữ dữ liệu nhưng chỉ báo Invalid input. Bạn cần giúp họ sửa mà không phải hỏi nhân viên.",
  [
    "Viết Nhập ngày theo DD/MM/YYYY ngay dưới ô, giữ thông báo lỗi chung.",
    "Viết Tháng 2/2005 không có ngày 31; nhập ngày hợp lệ, ví dụ 15/02/2005; liên kết lỗi với ô nhập.",
    "Hiện mã lỗi kèm nút thử gửi lại để hệ thống tự kiểm tra lần nữa.",
  ],
  [50, 100, 0],
  "Hướng dẫn phải giải thích lỗi cụ thể và cách sửa. Định dạng đúng vẫn có thể chứa một ngày không tồn tại.",
);
question(
  "touch",
  "Hai nút sát nhau trên điện thoại",
  "Nút Lưu và Xóa chỉ rộng 18px, thường bị chạm nhầm. Cần giảm lỗi mà vẫn dùng được trên màn hình nhỏ.",
  [
    "Mở rộng vùng chạm khoảng 44px và tạo khoảng cách rõ giữa hai nút.",
    "Giữ kích thước, thêm tooltip khi rê chuột giải thích chức năng.",
    "Thêm hộp xác nhận trước khi Xóa, giữ nguyên hai vùng chạm.",
  ],
  [100, 0, 50],
  "Xác nhận hạn chế hậu quả nhưng không sửa thao tác chạm khó chính xác; vùng chạm và khoảng cách giải quyết nguyên nhân.",
);
question(
  "color",
  "Bảng trạng thái giao bài",
  "Bảng chỉ dùng chấm đỏ/xanh cho trạng thái. Người không phân biệt màu vẫn cần đọc và in bảng đen trắng.",
  [
    "Đổi sang cặp đỏ/xanh đậm hơn và tăng kích thước chấm.",
    "Thêm chú giải màu trên đầu bảng, giữ nguyên các dòng hiện tại.",
    "Thêm nhãn Đã nộp/Cần bổ sung và ký hiệu khác nhau ở từng dòng.",
  ],
  [0, 50, 100],
  "Ý nghĩa cần có tín hiệu khác màu ngay tại nơi sử dụng; chú giải màu chỉ hỗ trợ một phần.",
);
question(
  "time",
  "Phiên nhập thông tin",
  "Biểu mẫu hết hạn sau 2 phút vì phiên đăng nhập. Có người cần đọc chậm; dữ liệu chưa gửi có thể được giữ an toàn trên máy trong phiên.",
  [
    "Tăng thời hạn cố định lên 4 phút cho tất cả người dùng.",
    "Cảnh báo trước khi hết hạn, cho gia hạn và giữ dữ liệu khi cần xác thực lại.",
    "Hiện đồng hồ đếm ngược lớn để người dùng điều chỉnh tốc độ nhập.",
  ],
  [50, 100, 0],
  "Thời gian cần điều chỉnh theo nhu cầu; đồng hồ không tạo thêm thời gian và một mốc cố định vẫn có thể chưa đủ.",
);
question(
  "motion",
  "Banner chuyển động liên tục",
  "Banner gây chóng mặt với một số người dùng. Nội dung vẫn có ý nghĩa nếu đứng yên và thiết bị có cài đặt giảm chuyển động.",
  [
    "Tôn trọng prefers-reduced-motion và cung cấp nút dừng, giữ đủ thông tin ở trạng thái tĩnh.",
    "Giảm tốc chuyển động nhưng vẫn chạy lặp tự động cho mọi thiết bị.",
    "Chỉ phát chuyển động sau khi người dùng bật, nhưng không đọc tùy chọn hệ điều hành.",
  ],
  [100, 0, 50],
  "Tùy chọn hệ điều hành cùng điều khiển tại chỗ hỗ trợ cả nhu cầu sẵn có lẫn nhu cầu phát sinh; chậm hơn vẫn có thể gây khó chịu.",
);
question(
  "alt",
  "Sơ đồ tìm phòng học",
  "Ảnh là sơ đồ duy nhất chỉ phòng A201 tầng 2 và lối có thang máy. Người dùng trình đọc màn hình cần tìm được phòng.",
  [
    "Dùng alt Sơ đồ phòng học và để nguyên ảnh chứa mọi chỉ dẫn.",
    "Dùng tên file so-do-a201.png làm alt để người dùng biết ảnh nào được nhắc tới.",
    "Cung cấp alt nêu mục đích và chỉ dẫn bằng văn bản về phòng, tầng, lối thang máy.",
  ],
  [50, 0, 100],
  "Văn bản thay thế cần truyền đạt thông tin và mục đích thực tế; tên tệp không hướng dẫn được lộ trình.",
);
question(
  "plain",
  "Hướng dẫn nhận vé",
  "Thông báo yêu cầu khởi tạo định danh điện tử để provisioning quyền tham dự. Đối tượng gồm người mới dùng biểu mẫu online.",
  [
    "Giữ câu hiện tại và thêm mục thuật ngữ ở cuối trang.",
    "Viết Nhập email rồi nhấn Xác nhận. Vé sẽ được gửi đến email của bạn.",
    "Rút gọn thành Khởi tạo định danh để provisioning vé cho câu ngắn hơn.",
  ],
  [50, 100, 0],
  "Ngôn ngữ quen thuộc và hành động cụ thể giảm tải nhận thức; bảng thuật ngữ có ích nhưng vẫn buộc người đọc chuyển qua lại.",
);
question(
  "audio",
  "Gửi bài khi tắt tiếng",
  "Hệ thống chỉ phát tiếng ding sau khi gửi bài. Phòng học đông và một số thiết bị đang tắt tiếng.",
  [
    "Thêm xác nhận bằng chữ được trình đọc màn hình thông báo, giữ âm báo tùy chọn.",
    "Tăng âm lượng mặc định và cho phép phát lại âm báo.",
    "Cho phép rung khi gửi thành công nhưng chưa bổ sung xác nhận trên màn hình.",
  ],
  [100, 0, 50],
  "Phản hồi bằng chữ và live region không phụ thuộc loa hoặc khả năng rung của thiết bị.",
);
question(
  "navigation",
  "Menu đổi vị trí khi chuyển trang",
  "Mỗi trang học sắp xếp menu khác nhau. Người dùng hay quay nhầm trang; nhóm chỉ đủ thời gian sửa một cách nhất quán trên toàn website.",
  [
    "Thêm thanh tìm kiếm trên mỗi trang nhưng giữ thứ tự menu thay đổi.",
    "Thêm hướng dẫn ban đầu ghi lại vị trí menu của từng trang.",
    "Giữ thứ tự, tên và vị trí menu nhất quán; đánh dấu trang hiện tại và thêm đường dẫn cấp trang.",
  ],
  [50, 0, 100],
  "Cấu trúc ổn định giảm việc tìm lại mỗi khi chuyển trang. Tìm kiếm hỗ trợ nhưng không thay thế điều hướng dễ dự đoán.",
);

export function competitionConfig(stage: number, input: unknown, allowLegacy = false) {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  if (stage === 1) {
    // V4: exactly 6 competition questions
    const ids = value.scenarioIds ?? DEFAULT_QUESTIONS;
    if (
      !Array.isArray(ids) ||
      (![6, ...(allowLegacy ? [4] : [])].includes(ids.length)) ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => typeof id !== "string" || !Object.hasOwn(entries, id))
    )
      throw new Error("invalid_scenario_ids");
    return { scenarioIds: ids, questions: ids.map((id) => entries[id].public) };
  }
  if (stage !== 2) throw new Error("invalid_stage");
  // V4: exactly 4 competition levels
  const ids = Array.isArray(value.levelIds)
    ? value.levelIds.map(String)
    : DEFAULT_LEVELS;
  if (
    (![4, ...(allowLegacy ? [3] : [])].includes(ids.length)) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !Object.hasOwn(ROBOT_LEVELS, id))
  )
    throw new Error("invalid_level_ids");
  return {
    levelIds: ids,
    maps: ids.map((id, seqIndex) => {
      const l = ROBOT_LEVELS[id];
      return {
        id,
        // Friendly sequence name — never exposes raw level ID to participants
        name: `Màn ${seqIndex + 1}/${ids.length}`,
        width: 6,
        height: 6,
        start: l.start,
        goal: l.goal,
        walls: l.walls,
        initialDirection: l.initialDirection,
        maxCommands: 24,
      };
    }),
  };
}
export function competitionAnswer(item: string, option: string) {
  const entry = Object.hasOwn(entries, item) ? entries[item] : undefined;
  const index = entry?.public.options.findIndex((o) => o.id === option) ?? -1;
  if (!entry || index < 0) throw new Error("invalid_answer");
  return entry.scores[index];
}
export function questionReview(item: string) {
  const entry = entries[item];
  return {
    itemId: item,
    explanation: entry.explanation,
    options: entry.public.options.map((o, i) => ({
      id: o.id,
      score: entry.scores[i],
    })),
  };
}
export function shortestCommands(level: RobotLevel): RobotCommand[] {
  const queue = [
    {
      ...level.start,
      direction: level.initialDirection,
      path: [] as RobotCommand[],
    },
  ];
  const seen = new Set<string>();
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head],
      key = `${cur.x},${cur.y},${cur.direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (cur.x === level.goal.x && cur.y === level.goal.y) return cur.path;
    if (cur.path.length >= 24) continue;
    for (const command of ["forward", "left", "right"] as RobotCommand[]) {
      const next = { ...cur, path: [...cur.path, command] };
      if (command === "forward") {
        next.x += [0, 1, 0, -1][cur.direction];
        next.y += [-1, 0, 1, 0][cur.direction];
        if (
          next.x < 0 ||
          next.x > 5 ||
          next.y < 0 ||
          next.y > 5 ||
          level.walls.includes(`${next.x},${next.y}`)
        )
          continue;
      } else
        next.direction = (cur.direction + (command === "left" ? 3 : 1)) % 4;
      queue.push(next);
    }
  }
  throw new Error("invalid_unsolvable_level");
}
export function competitionRobotScore(item: string, commands: unknown) {
  if (
    !Object.hasOwn(ROBOT_LEVELS, item) ||
    !Array.isArray(commands) ||
    commands.length > 24 ||
    commands.some((c) => !["forward", "left", "right"].includes(c))
  )
    throw new Error("invalid_commands");
  const level = ROBOT_LEVELS[item];
  let { x, y } = level.start;
  let direction = level.initialDirection;
  let executed = 0,
    successful = false;
  for (const cmd of commands) {
    executed++;
    if (cmd === "left") direction = (direction + 3) % 4;
    else if (cmd === "right") direction = (direction + 1) % 4;
    else {
      x += [0, 1, 0, -1][direction];
      y += [-1, 0, 1, 0][direction];
      if (x < 0 || x > 5 || y < 0 || y > 5 || level.walls.includes(`${x},${y}`))
        break;
    }
    if (x === level.goal.x && y === level.goal.y) {
      successful = true;
      break;
    }
  }
  return {
    successful,
    score: successful
      ? Math.max(
          60,
          100 - 8 * Math.max(0, executed - shortestCommands(level).length),
        )
      : 0,
    executed,
    optimalCommands: shortestCommands(level).length,
  };
}

const tieQuestions = [
  {
    title: "Sudden death · Thông báo cập nhật",
    context:
      "Sau khi lưu tài liệu, thông báo biến mất sau một giây. Người dùng trình đọc màn hình không biết việc lưu đã xong.",
    options: [
      "Giữ thông báo lâu hơn nhưng không đưa vào live region.",
      "Dùng status/live region và giữ xác nhận đủ lâu, không chuyển focus bất ngờ.",
      "Chuyển focus vào hộp thoại mỗi lần tự động lưu.",
    ],
    scores: [50, 100, 0],
  },
  {
    title: "Sudden death · Nhãn biểu mẫu",
    context:
      "Placeholder Email biến mất khi nhập. Người dùng bàn phím cần nhận biết ô đang sửa và định dạng cần nhập.",
    options: [
      "Dùng label liên kết với ô và hướng dẫn định dạng luôn hiển thị.",
      "Dùng placeholder dài hơn để giải thích cách nhập.",
      "Thêm tooltip hướng dẫn khi rê chuột lên ô.",
    ],
    scores: [100, 0, 50],
  },
  {
    title: "Sudden death · Nội dung phóng to",
    context:
      "Khi phóng to 200%, hộp đăng ký cắt mất nút gửi. Bố cục hiện đặt chiều cao cố định.",
    options: [
      "Giảm cỡ chữ toàn trang khi người dùng phóng to.",
      "Thêm thanh cuộn trong hộp nhưng giữ chiều cao cố định.",
      "Cho nội dung tự giãn và xuống dòng, kiểm tra nút vẫn dùng được khi phóng to.",
    ],
    scores: [0, 50, 100],
  },
];
export function tieQuestion(attempt: number) {
  const q = tieQuestions[(attempt - 1) % tieQuestions.length];
  return {
    id: `tie-${attempt}`,
    title: q.title,
    context: q.context,
    question: "Phương án nào giải quyết nguyên nhân chính?",
    options: q.options.map((label, i) => ({ id: `o${i + 1}`, label })),
  };
}
export function tieAnswer(attempt: number, id: string) {
  if (!Number.isInteger(attempt) || attempt < 1)
    throw new Error("invalid_attempt");
  const i = ["o1", "o2", "o3"].indexOf(id);
  if (i < 0) throw new Error("invalid_answer");
  return tieQuestions[(attempt - 1) % tieQuestions.length].scores[i];
}
