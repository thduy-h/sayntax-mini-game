import type {
  LessonCompletionLogic,
  LessonStepEvaluationResult,
  ProgramExecutionResult,
  ProgramWorkspace,
} from "@shecancode/shared-types";

import { isBlockStructureCompletionLogic } from "./completion-logic-helpers";
import { evaluateBlockStructureLogic } from "./evaluate-block-structure";
import { evaluateRuntimeLogic } from "./evaluate-runtime";

function feedbackFor(logic: LessonCompletionLogic): { pass: string; fail: string } {
  switch (logic.type) {
    case "required_block_types":
      return { pass: "Bạn đã thêm đúng các khối cần thiết cho bước này.", fail: "Bước này vẫn thiếu một số khối quan trọng. Hãy nhìn lại gợi ý bên phải." };
    case "ordered_block_types":
      return { pass: "Thứ tự khối đã đúng. Bạn có thể tiếp tục.", fail: "Các khối chính chưa nằm đúng thứ tự từ trên xuống dưới." };
    case "max_top_level_blocks":
      return { pass: "Lời giải gọn và đúng. Bạn đang dùng vòng lặp hiệu quả.", fail: "Bài này cần lời giải ngắn gọn hơn với số khối cấp cao ít hơn." };
    case "variable_name":
      return { pass: "Bạn đã tạo đúng biến cần dùng trong bài.", fail: "Khối biến chưa có đúng tên được yêu cầu." };
    case "print_text":
      return { pass: "Đầu ra đã khớp với mục tiêu của bài.", fail: "Đầu ra chưa khớp với thông điệp cần in." };
    case "print_sequence":
      return { pass: "Bạn đã in đúng chuỗi thông điệp theo thứ tự.", fail: "Các thông điệp in ra chưa đúng nội dung hoặc thứ tự." };
    case "repeat_print":
      return { pass: "Vòng lặp đang hoạt động đúng như mong đợi.", fail: "Vòng lặp chưa cho ra đúng số lần hoặc đúng thông điệp." };
    case "if_print":
      return { pass: "Khối điều kiện đã chứa đúng hành động cần thực hiện.", fail: "Khối điều kiện hoặc nội dung bên trong chưa đúng với yêu cầu." };
    case "variable_value":
      return { pass: "Biến đã được gán đúng giá trị.", fail: "Giá trị của biến vẫn chưa khớp với yêu cầu." };
    case "variable_then_print":
      return { pass: "Bạn đã lưu và dùng lại giá trị của biến đúng cách.", fail: "Chương trình vẫn chưa dùng biến đúng như yêu cầu của bài." };
    default: {
      const _exhaustive: never = logic;
      return _exhaustive;
    }
  }
}

export function evaluateStepCompletion(
  logic: LessonCompletionLogic,
  workspace: ProgramWorkspace,
  executionResult: ProgramExecutionResult,
): LessonStepEvaluationResult {
  const completed = isBlockStructureCompletionLogic(logic)
    ? evaluateBlockStructureLogic(logic, workspace)
    : evaluateRuntimeLogic(logic, workspace, executionResult);
  const feedback = feedbackFor(logic);

  return { completed, feedback: completed ? feedback.pass : feedback.fail };
}
