import type {
  BlockKind,
  CourseSummary,
  LessonCompletionLogic,
  LessonPreview,
  LessonStepEvaluationResult,
  LessonWithSteps,
  ProgramExecutionResult,
  ProgramWorkspace,
  WorkspaceBlock,
} from "@shecancode/shared-types";

import { comparableValue, findVariableBlock, flattenBlocks, normalizeText, validatePrintText } from "./helpers";

const COURSE_ID = "10000000-0000-0000-0000-000000000001";

function workspace(blocks: ProgramWorkspace["blocks"]): ProgramWorkspace {
  return { version: 1, blocks };
}

const lessons: LessonWithSteps[] = [
  {
    id: "lesson-1",
    slug: "start-and-sequence",
    databaseLessonId: "20000000-0000-0000-0000-000000000001",
    orderIndex: 1,
    stepCount: 3,
    title: "Bắt đầu và tuần tự",
    summary: "Làm quen với điểm bắt đầu và thứ tự chạy từ trên xuống dưới của chương trình.",
    description: "Học sinh hiểu một chương trình cần khối bắt đầu, sau đó các khối được thực thi theo trình tự rõ ràng.",
    estimatedMinutes: 12,
    learningGoals: [
      "Biết chương trình cần một điểm bắt đầu",
      "Hiểu thứ tự khối từ trên xuống dưới",
      "Tạo một chuỗi lệnh cơ bản",
    ],
    steps: [
      {
        id: "lesson-1-step-1",
        databaseStepId: "30000000-0000-0000-0000-000000000101",
        orderIndex: 1,
        title: "Thêm khối bắt đầu",
        instructions: "Thêm một khối bắt đầu để tạo điểm khởi động cho chương trình.",
        hints: ["Khối bắt đầu nên đứng ở đầu chương trình.", "Bước này chỉ cần một khối bắt đầu là đủ."],
        expectedResult: { requiredBlocks: ["start"] },
        completionLogic: { type: "required_block_types", blockTypes: ["start"] },
        starterWorkspace: workspace([]),
      },
      {
        id: "lesson-1-step-2",
        databaseStepId: "30000000-0000-0000-0000-000000000102",
        orderIndex: 2,
        title: "Nối thêm khối in",
        instructions: "Đặt một khối in sau khối bắt đầu để tạo chuỗi lệnh đầu tiên.",
        hints: ["Khối in nên nằm sau khối bắt đầu.", "Hãy thử nhập một lời chào ngắn."],
        expectedResult: { requiredBlocks: ["start", "print"] },
        completionLogic: { type: "ordered_block_types", blockTypes: ["start", "print"] },
        starterWorkspace: workspace([{ id: "seed-start", type: "start" }]),
      },
      {
        id: "lesson-1-step-3",
        databaseStepId: "30000000-0000-0000-0000-000000000103",
        orderIndex: 3,
        title: "Quan sát thứ tự chạy",
        instructions: "Chạy chương trình và kiểm tra rằng khối bắt đầu chạy trước, sau đó mới in ra thông điệp.",
        hints: ["Hãy nhìn theo thứ tự từ trên xuống dưới.", "Nếu kết quả chưa đúng, kiểm tra lại vị trí các khối."],
        expectedResult: { message: "Chương trình bắt đầu trước, sau đó in ra một thông điệp." },
        completionLogic: { type: "ordered_block_types", blockTypes: ["start", "print"] },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          { id: "seed-print", type: "print", fields: { text: "Xin chào" } },
        ]),
      },
    ],
  },
  {
    id: "lesson-2",
    slug: "print-output",
    databaseLessonId: "20000000-0000-0000-0000-000000000002",
    orderIndex: 2,
    stepCount: 3,
    title: "In và đầu ra",
    summary: "Sử dụng khối in để hiển thị thông điệp và quan sát đầu ra của chương trình.",
    description: "Học sinh thực hành thay đổi nội dung văn bản và so sánh đầu ra sau khi chạy chương trình.",
    estimatedMinutes: 14,
    learningGoals: [
      "Biết khối in dùng để hiển thị thông tin",
      "Thay đổi nội dung đầu ra theo yêu cầu",
      "Hiểu đầu ra phụ thuộc vào giá trị bên trong khối",
    ],
    steps: [
      {
        id: "lesson-2-step-1",
        databaseStepId: "30000000-0000-0000-0000-000000000201",
        orderIndex: 1,
        title: "In lời chào",
        instructions: "Thêm một khối in và nhập nội dung “Xin chào”.",
        hints: ["Nhấn vào ô văn bản trong khối in để sửa.", "Bạn có thể dùng câu chào ngắn gọn."],
        expectedResult: { output: ["Xin chào"] },
        completionLogic: { type: "print_text", text: "Xin chào" },
        starterWorkspace: workspace([{ id: "seed-start", type: "start" }]),
      },
      {
        id: "lesson-2-step-2",
        databaseStepId: "30000000-0000-0000-0000-000000000202",
        orderIndex: 2,
        title: "In hai thông điệp đúng thứ tự",
        instructions: "Dùng hai khối in để hiển thị “Xin chào” rồi đến “Bạn làm được!”.",
        hints: ["Bạn cần hai khối in.", "Thứ tự hai thông điệp rất quan trọng."],
        expectedResult: { output: ["Xin chào", "Bạn làm được!"] },
        completionLogic: { type: "print_sequence", texts: ["Xin chào", "Bạn làm được!"] },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          { id: "seed-print", type: "print", fields: { text: "Xin chào" } },
        ]),
      },
      {
        id: "lesson-2-step-3",
        databaseStepId: "30000000-0000-0000-0000-000000000203",
        orderIndex: 3,
        title: "Khớp đầu ra mục tiêu",
        instructions: "Điều chỉnh chương trình để đầu ra đúng chính xác là “SheCanCode Voice”.",
        hints: ["Đọc kỹ đầu ra mục tiêu.", "Nếu chưa đúng, hãy sửa lại nội dung của khối in."],
        expectedResult: { output: ["SheCanCode Voice"] },
        completionLogic: { type: "print_text", text: "SheCanCode Voice" },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          { id: "seed-print", type: "print", fields: { text: "" } },
        ]),
      },
    ],
  },
  {
    id: "lesson-3",
    slug: "repeat-loops",
    databaseLessonId: "20000000-0000-0000-0000-000000000003",
    orderIndex: 3,
    stepCount: 3,
    title: "Vòng lặp lặp lại",
    summary: "Khám phá cách dùng vòng lặp để giảm thao tác lặp đi lặp lại.",
    description: "Học sinh dùng khối lặp để tạo mẫu đơn giản và thấy lợi ích của việc không cần viết nhiều khối giống nhau.",
    estimatedMinutes: 16,
    learningGoals: [
      "Hiểu ý nghĩa của việc lặp lại",
      "Biết đặt số lần lặp",
      "Đưa khối in vào bên trong vòng lặp",
    ],
    steps: [
      {
        id: "lesson-3-step-1",
        databaseStepId: "30000000-0000-0000-0000-000000000301",
        orderIndex: 1,
        title: "Lặp khối in 3 lần",
        instructions: "Thêm khối lặp đặt giá trị 3 và đặt một khối in bên trong.",
        hints: ["Số lần lặp cần là 3.", "Khối in phải nằm bên trong vùng chứa của khối lặp."],
        expectedResult: { output: ["Tap", "Tap", "Tap"] },
        completionLogic: { type: "repeat_print", count: 3, text: "Tap" },
        starterWorkspace: workspace([{ id: "seed-start", type: "start" }]),
      },
      {
        id: "lesson-3-step-2",
        databaseStepId: "30000000-0000-0000-0000-000000000302",
        orderIndex: 2,
        title: "Đổi số lần lặp",
        instructions: "Cập nhật khối lặp để thông điệp “Cố gắng lên!” xuất hiện 5 lần.",
        hints: ["Sửa số trong khối lặp.", "Bạn vẫn cần một khối in ở bên trong vòng lặp."],
        expectedResult: { output: ["Cố gắng lên!", "Cố gắng lên!", "Cố gắng lên!", "Cố gắng lên!", "Cố gắng lên!"] },
        completionLogic: { type: "repeat_print", count: 5, text: "Cố gắng lên!" },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          {
            id: "seed-repeat",
            type: "repeat",
            fields: { times: 3 },
            children: [{ id: "seed-print", type: "print", fields: { text: "Cố gắng lên!" } }],
          },
        ]),
      },
      {
        id: "lesson-3-step-3",
        databaseStepId: "30000000-0000-0000-0000-000000000303",
        orderIndex: 3,
        title: "Dùng loop gọn hơn sequence",
        instructions: "Hoàn thành bài bằng một khối lặp thay vì thêm nhiều khối in giống nhau.",
        hints: ["Một vòng lặp có thể thay cho nhiều khối lặp lại.", "Giữ lời giải ngắn gọn."],
        expectedResult: { requiredBlocks: ["start", "repeat", "print"], maxTopLevelBlocks: 2 },
        completionLogic: { type: "max_top_level_blocks", blockTypes: ["start", "repeat"], max: 2 },
        starterWorkspace: workspace([{ id: "seed-start", type: "start" }]),
      },
    ],
  },
  {
    id: "lesson-4",
    slug: "if-basics",
    databaseLessonId: "20000000-0000-0000-0000-000000000004",
    orderIndex: 4,
    stepCount: 3,
    title: "Cơ bản về điều kiện if",
    summary: "Làm quen với cách chương trình ra quyết định khi điều kiện đúng.",
    description: "Học sinh thực hành đặt khối in vào bên trong điều kiện và quan sát kết quả khi điều kiện thay đổi.",
    estimatedMinutes: 18,
    learningGoals: [
      "Nhận biết vai trò của điều kiện",
      "Đặt nội dung bên trong khối if",
      "Quan sát sự khác nhau giữa đúng và sai",
    ],
    steps: [
      {
        id: "lesson-4-step-1",
        databaseStepId: "30000000-0000-0000-0000-000000000401",
        orderIndex: 1,
        title: "Thêm khối điều kiện",
        instructions: "Thêm một khối điều kiện sau khối bắt đầu.",
        hints: ["Khối điều kiện nằm trong nhóm logic.", "Nó giúp chương trình quyết định có chạy hành động hay không."],
        expectedResult: { requiredBlocks: ["start", "if"] },
        completionLogic: { type: "required_block_types", blockTypes: ["start", "if"] },
        starterWorkspace: workspace([{ id: "seed-start", type: "start" }]),
      },
      {
        id: "lesson-4-step-2",
        databaseStepId: "30000000-0000-0000-0000-000000000402",
        orderIndex: 2,
        title: "In khi điều kiện đúng",
        instructions: "Đặt một khối in bên trong điều kiện để chương trình in “Đúng” khi điều kiện đúng.",
        hints: ["Kéo khối in vào bên trong khối điều kiện.", "Nội dung cần in là “Đúng”."],
        expectedResult: { output: ["Đúng"] },
        completionLogic: { type: "if_print", text: "Đúng" },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          { id: "seed-if", type: "if", fields: { condition: true }, children: [] },
        ]),
      },
      {
        id: "lesson-4-step-3",
        databaseStepId: "30000000-0000-0000-0000-000000000403",
        orderIndex: 3,
        title: "Đọc logic quyết định đơn giản",
        instructions: "Hoàn thiện chương trình để chỉ in “Sẵn sàng” khi điều kiện là đúng.",
        hints: ["Văn bản cần nằm trong khối in bên trong điều kiện.", "Giữ giá trị điều kiện ở trạng thái đúng."],
        expectedResult: { output: ["Sẵn sàng"] },
        completionLogic: { type: "if_print", text: "Sẵn sàng" },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          {
            id: "seed-if",
            type: "if",
            fields: { condition: true },
            children: [{ id: "seed-print", type: "print", fields: { text: "" } }],
          },
        ]),
      },
    ],
  },
  {
    id: "lesson-5",
    slug: "variables-basics",
    databaseLessonId: "20000000-0000-0000-0000-000000000005",
    orderIndex: 5,
    stepCount: 3,
    title: "Cơ bản về biến",
    summary: "Tạo biến, gán giá trị và dùng lại giá trị đó trong đầu ra.",
    description: "Học sinh làm quen với khối biến để lưu thông tin và quan sát cách dữ liệu được dùng lại trong chương trình.",
    estimatedMinutes: 20,
    learningGoals: [
      "Biết biến là nơi lưu trữ giá trị",
      "Đặt tên và gán giá trị cho biến",
      "Dùng biến để hiển thị thông tin",
    ],
    steps: [
      {
        id: "lesson-5-step-1",
        databaseStepId: "30000000-0000-0000-0000-000000000501",
        orderIndex: 1,
        title: "Tạo khối biến",
        instructions: "Thêm một khối biến và đặt tên biến là “score”.",
        hints: ["Tên biến nên ngắn và dễ hiểu.", "Bước này dùng đúng tên “score”."],
        expectedResult: { requiredBlocks: ["start", "variable"] },
        completionLogic: { type: "variable_name", name: "score" },
        starterWorkspace: workspace([{ id: "seed-start", type: "start" }]),
      },
      {
        id: "lesson-5-step-2",
        databaseStepId: "30000000-0000-0000-0000-000000000502",
        orderIndex: 2,
        title: "Đặt giá trị cho biến",
        instructions: "Gán giá trị 5 cho biến “score”.",
        hints: ["Sửa ô giá trị bên trong khối biến.", "Giá trị cần là số 5."],
        expectedResult: { variable: { name: "score", value: 5 } },
        completionLogic: { type: "variable_value", name: "score", value: 5 },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          { id: "seed-variable", type: "variable", fields: { name: "score", value: 0 } },
        ]),
      },
      {
        id: "lesson-5-step-3",
        databaseStepId: "30000000-0000-0000-0000-000000000503",
        orderIndex: 3,
        title: "Dùng biến trong đầu ra",
        instructions: "Hoàn thiện chương trình để in ra giá trị hiện tại của biến sau khi đã gán.",
        hints: ["Bạn cần một khối biến và một khối in.", "Đầu ra nên thể hiện đúng giá trị 5."],
        expectedResult: { output: ["5"] },
        completionLogic: { type: "variable_then_print", name: "score", value: 5 },
        starterWorkspace: workspace([
          { id: "seed-start", type: "start" },
          { id: "seed-variable", type: "variable", fields: { name: "score", value: 5 } },
        ]),
      },
    ],
  },
];

function hasBlockTypes(blocks: WorkspaceBlock[], requiredTypes: BlockKind[]) {
  const types = new Set(blocks.map((block) => block.type));
  return requiredTypes.every((type) => types.has(type));
}

function orderedTopLevelTypes(blocks: WorkspaceBlock[], requiredTypes: BlockKind[]) {
  return requiredTypes.every((type, index) => blocks[index]?.type === type);
}

function evaluateCompletionLogic(
  completionLogic: LessonCompletionLogic,
  program: ProgramWorkspace,
  executionResult: ProgramExecutionResult,
): LessonStepEvaluationResult {
  const allBlocks = flattenBlocks(program.blocks);

  switch (completionLogic.type) {
    case "required_block_types":
      return hasBlockTypes(allBlocks, completionLogic.blockTypes)
        ? { completed: true, feedback: "Bạn đã thêm đúng các khối cần thiết cho bước này." }
        : { completed: false, feedback: "Bước này vẫn thiếu một số khối quan trọng. Hãy nhìn lại gợi ý bên phải." };

    case "ordered_block_types":
      return orderedTopLevelTypes(program.blocks, completionLogic.blockTypes)
        ? { completed: true, feedback: "Thứ tự khối đã đúng. Bạn có thể tiếp tục." }
        : { completed: false, feedback: "Các khối chính chưa nằm đúng thứ tự từ trên xuống dưới." };

    case "print_text":
      return validatePrintText(executionResult.output, completionLogic.text)
        ? { completed: true, feedback: "Đầu ra đã khớp với mục tiêu của bài." }
        : { completed: false, feedback: "Đầu ra chưa khớp với thông điệp cần in." };

    case "print_sequence": {
      const matches =
        executionResult.output.length === completionLogic.texts.length &&
        completionLogic.texts.every(
          (text, index) => normalizeText(executionResult.output[index] ?? "") === normalizeText(text),
        );

      return matches
        ? { completed: true, feedback: "Bạn đã in đúng chuỗi thông điệp theo thứ tự." }
        : { completed: false, feedback: "Các thông điệp in ra chưa đúng nội dung hoặc thứ tự." };
    }

    case "repeat_print": {
      const expectedOutput = Array.from({ length: completionLogic.count }, () => completionLogic.text);
      const matches =
        executionResult.output.length === expectedOutput.length &&
        expectedOutput.every(
          (text, index) => normalizeText(executionResult.output[index] ?? "") === normalizeText(text),
        );

      return matches
        ? { completed: true, feedback: "Vòng lặp đang hoạt động đúng như mong đợi." }
        : { completed: false, feedback: "Vòng lặp chưa cho ra đúng số lần hoặc đúng thông điệp." };
    }

    case "max_top_level_blocks":
      return orderedTopLevelTypes(program.blocks, completionLogic.blockTypes) && program.blocks.length <= completionLogic.max
        ? { completed: true, feedback: "Lời giải gọn và đúng. Bạn đang dùng vòng lặp hiệu quả." }
        : { completed: false, feedback: "Bài này cần lời giải ngắn gọn hơn với số khối cấp cao ít hơn." };

    case "if_print": {
      const ifBlock = allBlocks.find((block) => block.type === "if");
      const childPrint = ifBlock?.children?.find((child) => child.type === "print");
      const matchesOutput = validatePrintText(executionResult.output, completionLogic.text);
      const matchesChild =
        typeof childPrint?.fields?.text === "string" &&
        normalizeText(childPrint.fields.text) === normalizeText(completionLogic.text);

      return matchesOutput && matchesChild
        ? { completed: true, feedback: "Khối điều kiện đã chứa đúng hành động cần thực hiện." }
        : { completed: false, feedback: "Khối điều kiện hoặc nội dung bên trong chưa đúng với yêu cầu." };
    }

    case "variable_name":
      return findVariableBlock(allBlocks, completionLogic.name)
        ? { completed: true, feedback: "Bạn đã tạo đúng biến cần dùng trong bài." }
        : { completed: false, feedback: "Khối biến chưa có đúng tên được yêu cầu." };

    case "variable_value": {
      const variableBlock = findVariableBlock(allBlocks, completionLogic.name);
      const currentValue = variableBlock?.fields?.value;

      return comparableValue(currentValue as string | number | boolean) === comparableValue(completionLogic.value)
        ? { completed: true, feedback: "Biến đã được gán đúng giá trị." }
        : { completed: false, feedback: "Giá trị của biến vẫn chưa khớp với yêu cầu." };
    }

    case "variable_then_print": {
      const variableBlock = findVariableBlock(allBlocks, completionLogic.name);
      const variableMatches =
        comparableValue(variableBlock?.fields?.value as string | number | boolean) === comparableValue(completionLogic.value);
      const outputMatches = validatePrintText(executionResult.output, String(completionLogic.value));

      return variableMatches && outputMatches
        ? { completed: true, feedback: "Bạn đã lưu và dùng lại giá trị của biến đúng cách." }
        : { completed: false, feedback: "Chương trình vẫn chưa dùng biến đúng như yêu cầu của bài." };
    }
  }
}

export function getSeedCourseOverview(): CourseSummary {
  return {
    id: COURSE_ID,
    slug: "computational-thinking-foundations",
    title: "Nền tảng tư duy tính toán",
    description: "Khóa học nhập môn với block đơn giản, hướng dẫn từng bước và hỗ trợ giọng nói tiếng Việt.",
    estimatedMinutes: 80,
    lessonCount: lessons.length,
  };
}

export function listSeedLessons(): LessonPreview[] {
  return lessons.map(({ databaseLessonId, id, orderIndex, slug, stepCount, summary, title }) => ({
    id,
    slug,
    databaseLessonId,
    orderIndex,
    stepCount,
    summary,
    title,
  }));
}

export function getSeedLessonById(id: string) {
  return lessons.find((lesson) => lesson.id === id) ?? null;
}

export function evaluateLessonStep(
  lessonId: string,
  stepId: string,
  program: ProgramWorkspace,
  executionResult: ProgramExecutionResult,
) {
  const lesson = getSeedLessonById(lessonId);

  if (!lesson) {
    return {
      completed: false,
      feedback: "Không tìm thấy bài học hiện tại.",
    } satisfies LessonStepEvaluationResult;
  }

  const step = lesson.steps.find((entry) => entry.id === stepId);

  if (!step) {
    return {
      completed: false,
      feedback: "Không tìm thấy bước hiện tại của bài học.",
    } satisfies LessonStepEvaluationResult;
  }

  if (!executionResult.success) {
    return {
      completed: false,
      feedback: executionResult.errors[0] ?? "Chương trình chưa chạy thành công nên chưa thể chấm bước này.",
    } satisfies LessonStepEvaluationResult;
  }

  return evaluateCompletionLogic(step.completionLogic, program, executionResult);
}
export * from "./seed-v2";
