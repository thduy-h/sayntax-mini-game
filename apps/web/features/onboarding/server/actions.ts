"use server";

import { redirect } from "next/navigation";
import { logOperation } from "@/lib/operations/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { onboardingSchema, studentProfileFromOnboarding } from "@/features/onboarding/schemas";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "true";
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/sign-in?error=Vui%20lòng%20đăng%20nhập%20lại.");
  }

  const parsed = onboardingSchema.safeParse({
    ageRange: getString(formData, "ageRange"),
    audioInstructions: getBoolean(formData, "audioInstructions"),
    displayName: user.role === "admin" ? "Quản trị viên" : getString(formData, "displayName"),
    fontScale: getString(formData, "fontScale"),
    goals: getString(formData, "goals"),
    gradeLevel: getString(formData, "gradeLevel"),
    highContrast: getBoolean(formData, "highContrast"),
    keyboardNavigationHints: getBoolean(formData, "keyboardNavigationHints"),
    largeTouchTargets: getBoolean(formData, "largeTouchTargets"),
    reducedMotion: getBoolean(formData, "reducedMotion"),
    schoolName: getString(formData, "schoolName"),
  });

  if (!parsed.success) {
    logOperation("onboarding_failure", { phase: "validation" });
    redirect(`/onboarding?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin thiết lập.")}`);
  }

  const supabase = await createServerSupabaseClient();

  const { error: accessibilityError } = await supabase.from("accessibility_settings").upsert({
    user_id: user.id,
    audio_instructions: parsed.data.audioInstructions ?? true,
    font_scale: parsed.data.fontScale,
    high_contrast: parsed.data.highContrast ?? false,
    keyboard_navigation_hints: parsed.data.keyboardNavigationHints ?? true,
    large_touch_targets: parsed.data.largeTouchTargets ?? true,
    reduced_motion: parsed.data.reducedMotion ?? false,
  });

  if (accessibilityError) {
    logOperation("onboarding_failure", { phase: "persistence" });
    redirect(`/onboarding?error=${encodeURIComponent("Chưa thể lưu thiết lập. Vui lòng thử lại; thông tin đã nhập chưa được lưu đầy đủ.")}`);
  }

  if (user.role === "student") {
    const { error: profileError } = await supabase.from("student_profiles").upsert(studentProfileFromOnboarding(user.id, parsed.data));

    if (profileError) {
      logOperation("onboarding_failure", { phase: "persistence" });
      redirect(`/onboarding?error=${encodeURIComponent("Chưa thể lưu thiết lập. Vui lòng thử lại; thông tin đã nhập chưa được lưu đầy đủ.")}`);
    }
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (userError) {
    logOperation("onboarding_failure", { phase: "persistence" });
    redirect(`/onboarding?error=${encodeURIComponent("Chưa thể lưu thiết lập. Vui lòng thử lại; thông tin đã nhập chưa được lưu đầy đủ.")}`);
  }

  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}
