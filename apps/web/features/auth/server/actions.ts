"use server";

import { redirect } from "next/navigation";
import { logOperation } from "@/lib/operations/logger";
import { getSiteUrl, isAdminEmailAllowed, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAppUser, getRedirectPathForUser } from "@/features/auth/server/data";
import { signInSchema, signUpSchema } from "@/features/auth/schemas";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function redirectWithMessage(path: string, key: "error" | "message", value: string): never {
  if (key === "error") logOperation("auth_failure", { phase: "session" });
  redirect(`${path}?${key}=${encodeURIComponent(value)}`);
}

function safeCallbackPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/sign-in") || value.startsWith("/sign-up")) return null;
  return value;
}

export async function signInAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithMessage("/sign-in", "error", "Supabase chưa được cấu hình. Hãy dùng chế độ demo hoặc thiết lập biến môi trường trước khi đăng nhập.");
  }

  const parsed = signInSchema.safeParse({
    email: getString(formData, "email"),
    password: getString(formData, "password"),
  });

  if (!parsed.success) {
    redirectWithMessage("/sign-in", "error", parsed.error.issues[0]?.message ?? "Thông tin đăng nhập không hợp lệ.");
  }

  const credentials = parsed.data;
  const callbackUrl = safeCallbackPath(getString(formData, "callbackUrl"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirectWithMessage("/sign-in", "error", error.message);
  }

  const user = await getCurrentAppUser();
  if (!user) {
    redirectWithMessage("/sign-in", "error", "Hồ sơ tài khoản của bạn chưa sẵn sàng. Vui lòng thử lại sau ít phút.");
  }

  if (!user.onboarding_completed) {
    redirect("/onboarding");
  }

  if (callbackUrl && !(callbackUrl.startsWith("/admin") && user.role !== "admin")) {
    redirect(callbackUrl);
  }

  redirect(getRedirectPathForUser(user));
}

export async function signUpAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithMessage("/sign-up", "error", "Supabase chưa được cấu hình. Hãy dùng chế độ demo hoặc thiết lập biến môi trường trước khi đăng ký.");
  }

  const parsed = signUpSchema.safeParse({
    email: getString(formData, "email"),
    password: getString(formData, "password"),
    role: getString(formData, "role"),
  });

  if (!parsed.success) {
    redirectWithMessage("/sign-up", "error", parsed.error.issues[0]?.message ?? "Thông tin đăng ký không hợp lệ.");
  }

  const payload = parsed.data;

  if (payload.role === "admin" && !isAdminEmailAllowed(payload.email)) {
    redirectWithMessage(
      "/sign-up",
      "error",
      "Email này không nằm trong danh sách được phép vào vai trò quản trị. Hãy dùng tài khoản học sinh hoặc nhờ thiết lập quyền quản trị.",
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        requested_role: payload.role,
      },
    },
  });

  if (error) {
    redirectWithMessage("/sign-up", "error", error.message);
  }

  if (payload.role === "admin" && data.user?.id) {
    const serviceSupabase = createServiceRoleSupabaseClient();
    const { error: roleError } = await serviceSupabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", data.user.id);

    if (roleError) {
      redirectWithMessage("/sign-up", "error", "Tài khoản đã được tạo nhưng kích hoạt quyền quản trị thất bại.");
    }
  }

  if (data.session) {
    redirect("/onboarding");
  }

  redirectWithMessage("/sign-in", "message", "Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận đăng nhập.");
}

export async function signOutAction() {
  if (!isSupabaseConfigured()) {
    redirect("/sign-in");
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) logOperation("auth_failure", { phase: "session" });
  redirect("/sign-in");
}
