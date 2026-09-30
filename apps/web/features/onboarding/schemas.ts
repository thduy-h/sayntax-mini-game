import { z } from "zod";

export const onboardingSchema = z.object({
  ageRange: z.string().max(40, "Nhóm tuổi tối đa 40 ký tự.").optional(),
  audioInstructions: z.boolean().optional(),
  disabilitySupportNotes: z.string().max(2000, "Ghi chú hỗ trợ tối đa 2000 ký tự.").optional(),
  displayName: z.string().min(2, "Tên hiển thị là bắt buộc.").max(100, "Tên hiển thị tối đa 100 ký tự."),
  fontScale: z.enum(["default", "large", "x-large"]),
  goals: z.string().max(1000, "Mục tiêu tối đa 1000 ký tự.").optional(),
  gradeLevel: z.string().max(80, "Trình độ tối đa 80 ký tự.").optional(),
  highContrast: z.boolean().optional(),
  keyboardNavigationHints: z.boolean().optional(),
  largeTouchTargets: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  schoolName: z.string().max(200, "Tên trường tối đa 200 ký tự.").optional(),
});

export function studentProfileFromOnboarding(userId: string, data: z.infer<typeof onboardingSchema>) {
  return {
    user_id: userId,
    age_range: data.ageRange || null,
    display_name: data.displayName,
    goals: data.goals || null,
    grade_level: data.gradeLevel || null,
    school_name: data.schoolName || null,
  };
}
