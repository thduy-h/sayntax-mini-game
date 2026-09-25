import { NextResponse } from "next/server";
import { logOperation } from "@/lib/operations/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    logOperation("auth_failure", { phase: "validation" });
    return NextResponse.redirect(new URL("/sign-in?error=Liên%20kết%20xác%20nhận%20không%20hợp%20lệ.", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logOperation("auth_failure", { phase: "session" });
    return NextResponse.redirect(new URL("/sign-in?error=Liên%20kết%20xác%20nhận%20đã%20hết%20hạn%20hoặc%20không%20hợp%20lệ.", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
}
