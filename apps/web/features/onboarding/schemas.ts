import { z } from "zod";

export const onboardingSchema = z.object({
  ageRange: z.string().optional(),
  audioInstructions: z.boolean().optional(),
  disabilitySupportNotes: z.string().optional(),
  displayName: z.string().min(2, "Tên hiển thị là bắt buộc."),
  fontScale: z.enum(["default", "large", "x-large"]),
  goals: z.string().optional(),
  gradeLevel: z.string().optional(),
  highContrast: z.boolean().optional(),
  keyboardNavigationHints: z.boolean().optional(),
  largeTouchTargets: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  schoolName: z.string().optional(),
});
