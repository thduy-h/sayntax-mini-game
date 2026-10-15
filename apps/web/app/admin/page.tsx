import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutAction } from "@/features/auth/server/actions";
import { getCurrentAppUser, isAdminUser } from "@/features/auth/server/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAdminSnapshot() {
  try {
    const supabase = await createServerSupabaseClient();
    const [runsCount, studentsCount, completedCount, voiceCount, unsupportedCount] = await Promise.all([
      supabase.from("program_runs").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("lesson_v2_progress").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("voice_command_logs").select("id", { count: "exact", head: true }),
      supabase.from("voice_command_logs").select("id", { count: "exact", head: true }).eq("status", "unsupported"),
    ]);

    return {
      available: ![runsCount, studentsCount, completedCount, voiceCount, unsupportedCount].some((result) => result.error),
      metrics: {
        completedSteps: completedCount.error ? 0 : completedCount.count ?? 0,
        programRuns: runsCount.error ? 0 : runsCount.count ?? 0,
        students: studentsCount.error ? 0 : studentsCount.count ?? 0,
        unsupportedCommands: unsupportedCount.error ? 0 : unsupportedCount.count ?? 0,
        voiceCommands: voiceCount.error ? 0 : voiceCount.count ?? 0,
      },
    };
  } catch {
    return { available: false, metrics: { completedSteps: 0, programRuns: 0, students: 0, unsupportedCommands: 0, voiceCommands: 0 } };
  }
}

export default async function AdminPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent("/admin")}`);
  }

  if (!appUser.onboarding_completed) {
    redirect("/onboarding");
  }

  if (!isAdminUser(appUser)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-8 sm:px-10">
        <AppNav />
        <Card className="bg-[#fff6fb]">
          <CardHeader>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-black">Không có quyền</p>
            <CardTitle>Bạn không có quyền truy cập khu vực quản trị</CardTitle>
            <CardDescription>
              Tài khoản hiện tại là học viên. Hãy quay lại dashboard để tiếp tục bài học hoặc đăng nhập bằng tài khoản quản trị.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a className="inline-flex min-h-12 items-center rounded-[1rem] border-4 border-black bg-[#7df2c3] px-5 py-3 font-black uppercase text-black shadow-[6px_6px_0_#121212]" href="/dashboard">
              Về dashboard
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  const snapshot = await getAdminSnapshot();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <AppNav />
      {!snapshot.available ? <p role="alert" className="rounded-2xl bg-amber-100 p-4 text-amber-950">Chưa thể tải đầy đủ chỉ số. Vui lòng tải lại trang sau ít phút.</p> : null}
      <Card className="border-0 bg-[linear-gradient(155deg,#52304f,#374d69)] text-white">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-100">Quản trị SAYNTAX</p>
          <CardTitle className="text-white">Tình hình học tập và lệnh giọng nói</CardTitle>
          <CardDescription className="text-slate-200">
            Theo dõi các chỉ số tổng hợp về học tập và lệnh giọng nói.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Các khu vực quản trị">
        {[
          ["programs", "Bài học", "Theo dõi hoạt động học tập qua các chỉ số bên dưới."],
          ["program-runs-overview", "Lượt học", "Theo dõi tổng số lần chạy chương trình."],
          ["progress-overview", "Tiến độ người học", "Theo dõi tổng số bước đã hoàn thành."],
          ["voice-logs-overview", "Lệnh giọng nói", "Theo dõi tổng số lệnh và lệnh chưa hiểu mà không hiển thị bản chép lệnh."],
        ].map(([id, title, description]) => (
          <Card className="bg-[#fffdf3]" id={id} key={id}>
            <CardHeader>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-black">Admin</p>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Chỉ số học tập">
        {[
          ["Học viên", snapshot.metrics.students],
          ["Bước đã hoàn thành", snapshot.metrics.completedSteps],
          ["Lượt chạy", snapshot.metrics.programRuns],
          ["Lệnh thoại", snapshot.metrics.voiceCommands],
          ["Lệnh chưa hiểu", snapshot.metrics.unsupportedCommands],
        ].map(([label, value]) => (
          <Card className="bg-white" key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{snapshot.available ? value : "—"}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Phiên làm việc</CardTitle>
          <CardDescription>Bạn đang đăng nhập bằng tài khoản có quyền quản trị.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Đăng xuất
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
