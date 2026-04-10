import type { ProgramWorkspace, WorkspaceBlock } from "@shecancode/shared-types";

import type { LessonStepV2 } from "./action-model";

export interface LessonV2Preview {
  id: string;
  slug: string;
  databaseLessonId: string;
  orderIndex: number;
  stepCount: number;
  title: string;
  summary: string;
}

export interface LessonV2WithSteps extends LessonV2Preview {
  description: string;
  estimatedMinutes: number;
  learningGoals: string[];
  steps: LessonStepV2[];
}

function workspace(blocks: WorkspaceBlock[]): ProgramWorkspace {
  return { version: 1, blocks };
}

export const lessonsV2 = [
  {
    id: "v2-lesson-1",
    slug: "start-and-sequence-v2",
    databaseLessonId: "40000000-0000-0000-0000-000000000001",
    orderIndex: 1,
    stepCount: 4,
    title: "Bắt đầu và tuần tự",
    summary: "Học cách tạo điểm khởi động và nối một lệnh in đầu tiên bằng giọng nói.",
    description: "Làm quen với khái niệm chương trình cần một khối bắt đầu, sau đó đến các khối chạy theo thứ tự. Học sinh học bốn thao tác nền tảng trong một bài.",
    estimatedMinutes: 10,
    learningGoals: ["Biết mọi chương trình cần một khối bắt đầu", "Thêm khối bằng giọng nói", "Đổi nội dung văn bản của một khối in", "Chạy thử và quan sát kết quả"],
    steps: [
      {
        id: "v2-lesson-1-step-1",
        databaseStepId: "40000000-0000-0000-0000-000000000101",
        orderIndex: 1,
        title: "Thêm khối bắt đầu",
        instructions: "Chào mừng! Hãy nói: **Thêm khối bắt đầu** để tạo điểm khởi động cho chương trình.",
        hints: ["Mỗi chương trình đều cần một điểm bắt đầu.", "Bạn chỉ cần nói câu lệnh hoặc kéo khối bắt đầu từ hộp bên trái.", "Thử chính xác: Thêm khối bắt đầu."],
        action: { kind: "add_block", blockType: "start" },
        starterWorkspace: workspace([]),
      },
      {
        id: "v2-lesson-1-step-2",
        databaseStepId: "40000000-0000-0000-0000-000000000102",
        orderIndex: 2,
        title: "Thêm khối in",
        instructions: "Tuyệt vời! Giờ hãy nói: **Thêm khối in** để chuẩn bị in ra một lời chào.",
        hints: ["Khối in sẽ hiển thị chữ ra màn hình.", "Thêm khối mới, không cần xoá khối bắt đầu.", "Thử: Thêm khối in."],
        action: { kind: "add_block", blockType: "print" },
        starterWorkspace: workspace([{ id: "v2-l1-start", type: "start" }]),
      },
      {
        id: "v2-lesson-1-step-3",
        databaseStepId: "40000000-0000-0000-0000-000000000103",
        orderIndex: 3,
        title: "Đặt lời chào",
        instructions: "Chọn khối in rồi hãy nói: **Đặt chữ Xin chào** để nhập nội dung.",
        hints: ["Câu lệnh bắt đầu bằng 'Đặt chữ'.", "Nội dung cần đúng là: Xin chào.", "Thử nguyên câu: Đặt chữ Xin chào."],
        action: { kind: "set_text", blockId: "v2-l1-print", field: "text", expectedText: "Xin chào" },
        starterWorkspace: workspace([{ id: "v2-l1-start", type: "start" }, { id: "v2-l1-print", type: "print", fields: { text: "" } }]),
      },
      {
        id: "v2-lesson-1-step-4",
        databaseStepId: "40000000-0000-0000-0000-000000000104",
        orderIndex: 4,
        title: "Chạy chương trình",
        instructions: "Bạn sẵn sàng rồi! Hãy nói: **Chạy chương trình** để xem kết quả.",
        hints: ["Chương trình sẽ chạy từ khối bắt đầu xuống dưới.", "Nếu chưa thấy kết quả, kiểm tra khối in.", "Thử: Chạy chương trình."],
        action: { kind: "run_program", expectedOutput: ["Xin chào"] },
        starterWorkspace: workspace([{ id: "v2-l1-start", type: "start" }, { id: "v2-l1-print", type: "print", fields: { text: "Xin chào" } }]),
      },
    ],
  },
  {
    id: "v2-lesson-2",
    slug: "print-output-v2",
    databaseLessonId: "40000000-0000-0000-0000-000000000002",
    orderIndex: 2,
    stepCount: 5,
    title: "In và đầu ra",
    summary: "Học cách dùng hai khối in để hiển thị nhiều dòng theo thứ tự.",
    description: "Luyện tập thao tác in nhiều thông điệp và hiểu rằng đầu ra chạy tuần tự từ trên xuống dưới.",
    estimatedMinutes: 14,
    learningGoals: ["Biết mỗi khối in cho ra một dòng", "Đặt nhiều nội dung khác nhau", "Hiểu đầu ra theo thứ tự khối", "Chạy chương trình nhiều dòng"],
    steps: [
      {
        id: "v2-lesson-2-step-1",
        databaseStepId: "40000000-0000-0000-0000-000000000201",
        orderIndex: 1,
        title: "Thêm khối in đầu tiên",
        instructions: "Hãy nói: **Thêm khối in** để chuẩn bị dòng đầu tiên.",
        hints: ["Khối in sẽ nằm sau khối bắt đầu.", "Chỉ cần một khối in mới.", "Thử: Thêm khối in."],
        action: { kind: "add_block", blockType: "print" },
        starterWorkspace: workspace([{ id: "v2-l2-start", type: "start" }]),
      },
      {
        id: "v2-lesson-2-step-2",
        databaseStepId: "40000000-0000-0000-0000-000000000202",
        orderIndex: 2,
        title: "Đặt nội dung dòng 1",
        instructions: "Chọn khối in đầu tiên và hãy nói: **Đặt chữ Xin chào**.",
        hints: ["Nội dung cần đúng chính tả: Xin chào.", "Dùng câu lệnh bắt đầu bằng 'Đặt chữ'.", "Thử: Đặt chữ Xin chào."],
        action: { kind: "set_text", blockId: "v2-l2-print-1", field: "text", expectedText: "Xin chào" },
        starterWorkspace: workspace([{ id: "v2-l2-start", type: "start" }, { id: "v2-l2-print-1", type: "print", fields: { text: "" } }]),
      },
      {
        id: "v2-lesson-2-step-3",
        databaseStepId: "40000000-0000-0000-0000-000000000203",
        orderIndex: 3,
        title: "Thêm khối in thứ hai",
        instructions: "Bây giờ hãy nói: **Thêm khối in** để tạo dòng thứ hai.",
        hints: ["Khối mới sẽ nằm dưới khối in cũ.", "Không cần sửa khối in đầu tiên.", "Thử: Thêm khối in."],
        action: { kind: "add_block", blockType: "print" },
        starterWorkspace: workspace([{ id: "v2-l2-start", type: "start" }, { id: "v2-l2-print-1", type: "print", fields: { text: "Xin chào" } }]),
      },
      {
        id: "v2-lesson-2-step-4",
        databaseStepId: "40000000-0000-0000-0000-000000000204",
        orderIndex: 4,
        title: "Đặt nội dung dòng 2",
        instructions: "Chọn khối in thứ hai và hãy nói: **Đặt chữ Bạn làm được**.",
        hints: ["Đây là nội dung cho dòng thứ hai.", "Viết đúng: Bạn làm được.", "Thử: Đặt chữ Bạn làm được."],
        action: { kind: "set_text", blockId: "v2-l2-print-2", field: "text", expectedText: "Bạn làm được" },
        starterWorkspace: workspace([
            { id: "v2-l2-start", type: "start" },
            { id: "v2-l2-print-1", type: "print", fields: { text: "Xin chào" } },
            { id: "v2-l2-print-2", type: "print", fields: { text: "" } },
          ]),
      },
      {
        id: "v2-lesson-2-step-5",
        databaseStepId: "40000000-0000-0000-0000-000000000205",
        orderIndex: 5,
        title: "Chạy để xem hai dòng",
        instructions: "Hãy nói: **Chạy chương trình** để xem cả hai dòng xuất hiện.",
        hints: ["Đầu ra sẽ có hai dòng.", "Dòng đầu là 'Xin chào', dòng sau là 'Bạn làm được'.", "Thử: Chạy chương trình."],
        action: { kind: "run_program", expectedOutput: ["Xin chào", "Bạn làm được"] },
        starterWorkspace: workspace([
            { id: "v2-l2-start", type: "start" },
            { id: "v2-l2-print-1", type: "print", fields: { text: "Xin chào" } },
            { id: "v2-l2-print-2", type: "print", fields: { text: "Bạn làm được" } },
          ]),
      },
    ],
  },
  {
    id: "v2-lesson-3",
    slug: "repeat-loops-v2",
    databaseLessonId: "40000000-0000-0000-0000-000000000003",
    orderIndex: 3,
    stepCount: 5,
    title: "Vòng lặp lặp lại",
    summary: "Học cách đặt khối in vào bên trong vòng lặp để tiết kiệm thao tác.",
    description: "Bài đầu tiên giới thiệu thao tác 'đưa vào trong'. Học sinh lồng khối in trong khối lặp và điều chỉnh số lần lặp.",
    estimatedMinutes: 16,
    learningGoals: ["Biết khối lặp chạy đi chạy lại", "Lồng khối in vào bên trong khối lặp", "Đổi số lần lặp bằng giọng nói", "Quan sát nhiều dòng cùng nội dung"],
    steps: [
      {
        id: "v2-lesson-3-step-1",
        databaseStepId: "40000000-0000-0000-0000-000000000301",
        orderIndex: 1,
        title: "Thêm khối lặp",
        instructions: "Hãy nói: **Thêm khối lặp** để tạo một vòng lặp.",
        hints: ["Khối lặp sẽ chạy đi chạy lại các khối bên trong nó.", "Chỉ cần thêm, chưa cần đặt gì vào trong.", "Thử: Thêm khối lặp."],
        action: { kind: "add_block", blockType: "repeat" },
        starterWorkspace: workspace([{ id: "v2-l3-start", type: "start" }]),
      },
      {
        id: "v2-lesson-3-step-2",
        databaseStepId: "40000000-0000-0000-0000-000000000302",
        orderIndex: 2,
        title: "Đặt khối in vào trong vòng lặp",
        instructions: "Hãy nói: **Đặt vào trong khối lặp** rồi thêm khối in, hoặc kéo khối in vào bên trong khối lặp.",
        hints: ["Khối in phải nằm bên trong vùng chứa của khối lặp.", "Có thể kéo khối in từ hộp bên trái vào trong.", "Thử: Đặt vào trong khối lặp."],
        action: { kind: "insert_into", parentBlockType: "repeat", childBlockType: "print" },
        starterWorkspace: workspace([{ id: "v2-l3-start", type: "start" }, { id: "v2-l3-repeat", type: "repeat", fields: { times: 2 }, children: [] }]),
      },
      {
        id: "v2-lesson-3-step-3",
        databaseStepId: "40000000-0000-0000-0000-000000000303",
        orderIndex: 3,
        title: "Đặt số lần lặp",
        instructions: "Chọn khối lặp và hãy nói: **Đặt số 3** để lặp ba lần.",
        hints: ["Số lần lặp cần là 3.", "Câu lệnh bắt đầu bằng 'Đặt số'.", "Thử: Đặt số 3."],
        action: { kind: "set_number", blockId: "v2-l3-repeat", field: "times", expectedNumber: 3 },
        starterWorkspace: workspace([
            { id: "v2-l3-start", type: "start" },
            {
              id: "v2-l3-repeat",
              type: "repeat",
              fields: { times: 2 },
              children: [{ id: "v2-l3-inner-print", type: "print", fields: { text: "" } }],
            },
          ]),
      },
      {
        id: "v2-lesson-3-step-4",
        databaseStepId: "40000000-0000-0000-0000-000000000304",
        orderIndex: 4,
        title: "Đặt nội dung cho khối in bên trong",
        instructions: "Chọn khối in bên trong vòng lặp và hãy nói: **Đặt chữ Cố lên**.",
        hints: ["Nội dung cần là: Cố lên.", "Đây là dòng sẽ lặp ba lần.", "Thử: Đặt chữ Cố lên."],
        action: { kind: "set_text", blockId: "v2-l3-inner-print", field: "text", expectedText: "Cố lên" },
        starterWorkspace: workspace([
            { id: "v2-l3-start", type: "start" },
            {
              id: "v2-l3-repeat",
              type: "repeat",
              fields: { times: 3 },
              children: [{ id: "v2-l3-inner-print", type: "print", fields: { text: "" } }],
            },
          ]),
      },
      {
        id: "v2-lesson-3-step-5",
        databaseStepId: "40000000-0000-0000-0000-000000000305",
        orderIndex: 5,
        title: "Chạy vòng lặp",
        instructions: "Hãy nói: **Chạy chương trình** để thấy 'Cố lên' xuất hiện 3 lần.",
        hints: ["Đầu ra có ba dòng giống nhau.", "Nếu chỉ thấy một dòng, kiểm tra số trong khối lặp.", "Thử: Chạy chương trình."],
        action: { kind: "run_program", expectedOutput: ["Cố lên", "Cố lên", "Cố lên"] },
        starterWorkspace: workspace([
            { id: "v2-l3-start", type: "start" },
            {
              id: "v2-l3-repeat",
              type: "repeat",
              fields: { times: 3 },
              children: [{ id: "v2-l3-inner-print", type: "print", fields: { text: "Cố lên" } }],
            },
          ]),
      },
    ],
  },
  {
    id: "v2-lesson-4",
    slug: "if-basics-v2",
    databaseLessonId: "40000000-0000-0000-0000-000000000004",
    orderIndex: 4,
    stepCount: 5,
    title: "Cơ bản về điều kiện if",
    summary: "Học cách đưa một khối in vào bên trong khối điều kiện.",
    description: "Học sinh làm quen với cấu trúc rẽ nhánh đơn giản: khi điều kiện đúng, chương trình in một thông điệp.",
    estimatedMinutes: 14,
    learningGoals: ["Nhận ra khối điều kiện quyết định chạy hay không", "Lồng hành động vào bên trong khối điều kiện", "Viết nội dung cho hành động trong điều kiện", "Quan sát kết quả khi điều kiện đúng"],
    steps: [
      {
        id: "v2-lesson-4-step-1",
        databaseStepId: "40000000-0000-0000-0000-000000000401",
        orderIndex: 1,
        title: "Thêm khối điều kiện",
        instructions: "Hãy nói: **Thêm khối điều kiện** để thêm một khối if.",
        hints: ["Khối điều kiện giúp chương trình ra quyết định.", "Chỉ cần thêm khối, chưa cần đặt gì bên trong.", "Thử: Thêm khối điều kiện."],
        action: { kind: "add_block", blockType: "if" },
        starterWorkspace: workspace([{ id: "v2-l4-start", type: "start" }]),
      },
      {
        id: "v2-lesson-4-step-2",
        databaseStepId: "40000000-0000-0000-0000-000000000402",
        orderIndex: 2,
        title: "Đặt khối in vào trong điều kiện",
        instructions: "Hãy nói: **Đặt vào trong khối điều kiện** rồi thêm khối in, hoặc kéo khối in vào trong.",
        hints: ["Khối in phải nằm trong phần thân của khối điều kiện.", "Khi điều kiện đúng, khối in sẽ chạy.", "Thử: Đặt vào trong khối điều kiện."],
        action: { kind: "insert_into", parentBlockType: "if", childBlockType: "print" },
        starterWorkspace: workspace([{ id: "v2-l4-start", type: "start" }, { id: "v2-l4-if", type: "if", fields: { condition: true }, children: [] }]),
      },
      {
        id: "v2-lesson-4-step-3",
        databaseStepId: "40000000-0000-0000-0000-000000000403",
        orderIndex: 3,
        title: "Đặt nội dung cho khối in bên trong",
        instructions: "Chọn khối in trong điều kiện và hãy nói: **Đặt chữ Sẵn sàng**.",
        hints: ["Nội dung cần là: Sẵn sàng.", "Đây là thông điệp chỉ in khi điều kiện đúng.", "Thử: Đặt chữ Sẵn sàng."],
        action: { kind: "set_text", blockId: "v2-l4-inner-print", field: "text", expectedText: "Sẵn sàng" },
        starterWorkspace: workspace([
            { id: "v2-l4-start", type: "start" },
            {
              id: "v2-l4-if",
              type: "if",
              fields: { condition: true },
              children: [{ id: "v2-l4-inner-print", type: "print", fields: { text: "" } }],
            },
          ]),
      },
      {
        id: "v2-lesson-4-step-4",
        databaseStepId: "40000000-0000-0000-0000-000000000404",
        orderIndex: 4,
        title: "Chạy chương trình có điều kiện",
        instructions: "Hãy nói: **Chạy chương trình** để xem 'Sẵn sàng' được in ra.",
        hints: ["Vì điều kiện đang đúng, khối in sẽ chạy.", "Nếu không thấy gì, kiểm tra khối in đã nằm trong điều kiện chưa.", "Thử: Chạy chương trình."],
        action: { kind: "run_program", expectedOutput: ["Sẵn sàng"] },
        starterWorkspace: workspace([
            { id: "v2-l4-start", type: "start" },
            {
              id: "v2-l4-if",
              type: "if",
              fields: { condition: true },
              children: [{ id: "v2-l4-inner-print", type: "print", fields: { text: "Sẵn sàng" } }],
            },
          ]),
      },
      {
        id: "v2-lesson-4-step-5",
        databaseStepId: "40000000-0000-0000-0000-000000000405",
        orderIndex: 5,
        title: "Mở gợi ý để ôn lại",
        instructions: "Trước khi kết thúc, hãy nói: **Xin gợi ý** để xem tóm tắt về khối điều kiện.",
        hints: ["Gợi ý giúp bạn ôn lại ý chính.", "Có thể nói 'gợi ý' hoặc 'giúp'.", "Thử: Xin gợi ý."],
        action: { kind: "ask_hint" },
        starterWorkspace: workspace([
            { id: "v2-l4-start", type: "start" },
            {
              id: "v2-l4-if",
              type: "if",
              fields: { condition: true },
              children: [{ id: "v2-l4-inner-print", type: "print", fields: { text: "Sẵn sàng" } }],
            },
          ]),
      },
    ],
  },
  {
    id: "v2-lesson-5",
    slug: "variables-basics-v2",
    databaseLessonId: "40000000-0000-0000-0000-000000000005",
    orderIndex: 5,
    stepCount: 6,
    title: "Cơ bản về biến",
    summary: "Tạo một biến, đặt tên và gán giá trị số.",
    description: "Học sinh làm quen với khái niệm biến: một nơi lưu trữ có tên và giá trị. Bài này tập trung vào tạo, đặt tên và gán số.",
    estimatedMinutes: 16,
    learningGoals: ["Biết biến là nơi lưu giá trị", "Đặt tên biến bằng giọng nói", "Gán giá trị số cho biến", "Kết hợp biến với khối in trong cùng một chương trình"],
    steps: [
      {
        id: "v2-lesson-5-step-1",
        databaseStepId: "40000000-0000-0000-0000-000000000501",
        orderIndex: 1,
        title: "Thêm khối biến",
        instructions: "Hãy nói: **Thêm khối biến** để tạo một biến mới.",
        hints: ["Khối biến giúp chương trình nhớ một giá trị.", "Chỉ cần thêm khối, chưa cần đặt tên.", "Thử: Thêm khối biến."],
        action: { kind: "add_block", blockType: "variable" },
        starterWorkspace: workspace([{ id: "v2-l5-start", type: "start" }]),
      },
      {
        id: "v2-lesson-5-step-2",
        databaseStepId: "40000000-0000-0000-0000-000000000502",
        orderIndex: 2,
        title: "Đặt tên biến",
        instructions: "Chọn khối biến và hãy nói: **Đặt chữ diem** để đặt tên biến là 'diem'.",
        hints: ["Tên biến nên ngắn và dễ hiểu.", "Trong bài này, tên cần đúng là: diem.", "Thử: Đặt chữ diem."],
        action: { kind: "set_text", blockId: "v2-l5-variable", field: "name", expectedText: "diem" },
        starterWorkspace: workspace([{ id: "v2-l5-start", type: "start" }, { id: "v2-l5-variable", type: "variable", fields: { name: "", value: 0 } }]),
      },
      {
        id: "v2-lesson-5-step-3",
        databaseStepId: "40000000-0000-0000-0000-000000000503",
        orderIndex: 3,
        title: "Gán giá trị cho biến",
        instructions: "Với khối biến đang chọn, hãy nói: **Đặt số 10** để gán giá trị 10.",
        hints: ["Giá trị cần là số 10.", "Câu lệnh bắt đầu bằng 'Đặt số'.", "Thử: Đặt số 10."],
        action: { kind: "set_number", blockId: "v2-l5-variable", field: "value", expectedNumber: 10 },
        starterWorkspace: workspace([{ id: "v2-l5-start", type: "start" }, { id: "v2-l5-variable", type: "variable", fields: { name: "diem", value: 0 } }]),
      },
      {
        id: "v2-lesson-5-step-4",
        databaseStepId: "40000000-0000-0000-0000-000000000504",
        orderIndex: 4,
        title: "Thêm khối in",
        instructions: "Hãy nói: **Thêm khối in** để chuẩn bị hiển thị thông tin.",
        hints: ["Khối in sẽ nằm sau khối biến.", "Không cần xoá khối biến.", "Thử: Thêm khối in."],
        action: { kind: "add_block", blockType: "print" },
        starterWorkspace: workspace([{ id: "v2-l5-start", type: "start" }, { id: "v2-l5-variable", type: "variable", fields: { name: "diem", value: 10 } }]),
      },
      {
        id: "v2-lesson-5-step-5",
        databaseStepId: "40000000-0000-0000-0000-000000000505",
        orderIndex: 5,
        title: "Đặt nhãn cho khối in",
        instructions: "Chọn khối in và hãy nói: **Đặt chữ diem** để ghi nhớ biến bạn đang theo dõi.",
        hints: ["Đây là nhãn nhắc bạn về biến 'diem'.", "Nội dung cần đúng là: diem.", "Thử: Đặt chữ diem."],
        action: { kind: "set_text", blockId: "v2-l5-print", field: "text", expectedText: "diem" },
        starterWorkspace: workspace([
            { id: "v2-l5-start", type: "start" },
            { id: "v2-l5-variable", type: "variable", fields: { name: "diem", value: 10 } },
            { id: "v2-l5-print", type: "print", fields: { text: "" } },
          ]),
      },
      {
        id: "v2-lesson-5-step-6",
        databaseStepId: "40000000-0000-0000-0000-000000000506",
        orderIndex: 6,
        title: "Chạy chương trình",
        instructions: "Hãy nói: **Chạy chương trình** để kiểm tra mọi thứ hoạt động.",
        hints: ["Chương trình tạo biến rồi in nhãn.", "Nếu có lỗi, kiểm tra lại khối biến.", "Thử: Chạy chương trình."],
        action: { kind: "run_program" },
        starterWorkspace: workspace([
            { id: "v2-l5-start", type: "start" },
            { id: "v2-l5-variable", type: "variable", fields: { name: "diem", value: 10 } },
            { id: "v2-l5-print", type: "print", fields: { text: "diem" } },
          ]),
      },
    ],
  },
] satisfies LessonV2WithSteps[];

export function listSeedV2Lessons(): LessonV2Preview[] {
  return lessonsV2.map(({ id, slug, databaseLessonId, orderIndex, stepCount, title, summary }) => ({
    id,
    slug,
    databaseLessonId,
    orderIndex,
    stepCount,
    title,
    summary,
  }));
}

export function getSeedV2LessonById(id: string): LessonV2WithSteps | null {
  return lessonsV2.find((lesson) => lesson.id === id) ?? null;
}

export function getSeedV2LessonBySlug(slug: string): LessonV2WithSteps | null {
  return lessonsV2.find((lesson) => lesson.slug === slug) ?? null;
}
