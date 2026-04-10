"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { onboardingSchema } from "@/features/onboarding/schemas";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "true";
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/sign-in?error=Please%20sign%20in%20again.");
  }

  const parsed = onboardingSchema.safeParse({
    ageRange: getString(formData, "ageRange"),
    audioInstructions: getBoolean(formData, "audioInstructions"),
    disabilitySupportNotes: getString(formData, "disabilitySupportNotes"),
    displayName: getString(formData, "displayName"),
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
    redirect(`/onboarding?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid onboarding details.")}`);
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
    redirect(`/onboarding?error=${encodeURIComponent(accessibilityError.message)}`);
  }

  if (user.role === "student") {
    const { error: profileError } = await supabase.from("student_profiles").upsert({
      user_id: user.id,
      age_range: parsed.data.ageRange || null,
      disability_support_notes: parsed.data.disabilitySupportNotes || null,
      display_name: parsed.data.displayName,
      goals: parsed.data.goals || null,
      grade_level: parsed.data.gradeLevel || null,
      school_name: parsed.data.schoolName || null,
    });

    if (profileError) {
      redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
    }
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (userError) {
    redirect(`/onboarding?error=${encodeURIComponent(userError.message)}`);
  }

  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}

