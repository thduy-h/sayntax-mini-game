import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutAction } from "@/features/auth/server/actions";
import { getCurrentAppUser, isAdminUser } from "@/features/auth/server/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ProgramRunRow {
  created_at: string;
  error_message: string | null;
  id: string;
  lesson_id: string;
  lesson_step_id: string;
  status: string;
  user_id: string;
}

interface VoiceLogRow {
  created_at: string;
  failure_reason: string | null;
  id: string;
  status: string;
  transcript: string;
  user_id: string;
}

interface ProgressRow {
  completed_at: string | null;
  lesson_slug: string;
  status: string;
  step_id: string;
  user_id: string;
}

async function getAdminSnapshot() {
  try {
    const supabase = await createServerSupabaseClient();
    const [runs, logs, progress, studentsCount, completedCount, voiceCount, unsupportedCount] = await Promise.all([
      supabase
        .from("program_runs")
        .select("id, user_id, lesson_id, lesson_step_id, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<ProgramRunRow[]>(),
      supabase
        .from("voice_command_logs")
        .select("id, user_id, transcript, status, failure_reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<VoiceLogRow[]>(),
      supabase
        .from("lesson_v2_progress")
        .select("user_id, lesson_slug, step_id, status, completed_at")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(5)
        .returns<ProgressRow[]>(),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("lesson_v2_progress").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("voice_command_logs").select("id", { count: "exact", head: true }),
      supabase.from("voice_command_logs").select("id", { count: "exact", head: true }).eq("status", "unsupported"),
    ]);

    return {
      metrics: {
        completedSteps: completedCount.error ? 0 : completedCount.count ?? 0,
        students: studentsCount.error ? 0 : studentsCount.count ?? 0,
        unsupportedCommands: unsupportedCount.error ? 0 : unsupportedCount.count ?? 0,
        voiceCommands: voiceCount.error ? 0 : voiceCount.count ?? 0,
      },
      progress: progress.error ? [] : progress.data ?? [],
      runs: runs.error ? [] : runs.data ?? [],
      voiceLogs: logs.error ? [] : logs.data ?? [],
    };
  } catch {
    return { metrics: { completedSteps: 0, students: 0, unsupportedCommands: 0, voiceCommands: 0 }, progress: [], runs: [], voiceLogs: [] };
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
  const unsupportedLogs = snapshot.voiceLogs.filter((log) => log.status === "unsupported");
  const misunderstood = [...unsupportedLogs.reduce((map, log) => {
    const key = log.transcript.trim().toLowerCase();
    if (!key) return map;
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const stuckStudents = snapshot.progress.filter((item) => item.status !== "completed").slice(0, 5);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <AppNav />
      <Card className="border-0 bg-[linear-gradient(155deg,#52304f,#374d69)] text-white">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-100">Theo dõi pilot</p>
          <CardTitle className="text-white">Tình hình học tập và lệnh giọng nói</CardTitle>
          <CardDescription className="text-slate-200">
            Các chỉ số bên dưới đọc từ progress, program runs và voice command logs khi tài khoản quản trị có quyền xem dữ liệu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Bài học đang đọc từ lesson engine nội bộ</div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Program runs và progress đã có API bảo vệ session</div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Voice command logs đã có API ghi log cho học viên</div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Các khu vực quản trị">
        {[
          ["programs", "Lộ trình tiếp theo", "Biên tập bài học trong giao diện quản trị sẽ được ưu tiên sau pilot đầu tiên."],
          ["program-runs-overview", "Lượt học", "Theo dõi các lần chạy chương trình gần đây và lỗi nếu có."],
          ["progress-overview", "Tiến độ người học", "Xem các bước đã hoàn thành hoặc đang học từ dữ liệu progress."],
          ["voice-logs-overview", "Voice command logs", "Theo dõi câu lệnh chưa hiểu để cải thiện parser tiếng Việt."],
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số pilot">
        {[
          ["Học viên", snapshot.metrics.students],
          ["Bước đã hoàn thành", snapshot.metrics.completedSteps],
          ["Lệnh thoại", snapshot.metrics.voiceCommands],
          ["Lệnh chưa hiểu", snapshot.metrics.unsupportedCommands],
        ].map(([label, value]) => (
          <Card className="bg-white" key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Theo dõi hỗ trợ học viên">
        <Card className="bg-[#fff6fb]">
          <CardHeader>
            <CardTitle>Câu lệnh hay bị hiểu sai</CardTitle>
            <CardDescription>Top transcript unsupported từ voice logs gần đây.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {misunderstood.length === 0 ? <p className="font-semibold text-zinc-600">Chưa có lệnh unsupported.</p> : null}
            {misunderstood.map(([transcript, count]) => (
              <div className="flex items-center justify-between rounded border-2 border-black bg-white p-2" key={transcript}>
                <span className="font-mono text-black">“{transcript}”</span>
                <span className="font-black text-black">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-[#ffefb8]">
          <CardHeader>
            <CardTitle>Học viên có thể đang kẹt</CardTitle>
            <CardDescription>Các progress gần đây chưa hoàn thành.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {stuckStudents.length === 0 ? <p className="font-semibold text-zinc-600">Chưa thấy học viên bị kẹt trong snapshot.</p> : null}
            {stuckStudents.map((item) => (
              <div className="rounded border-2 border-black bg-white p-2" key={`${item.user_id}-${item.lesson_slug}-${item.step_id}-stuck`}>
                <p className="font-black text-black">{item.lesson_slug}</p>
                <p className="font-mono text-zinc-700">{item.step_id}</p>
                <p className="font-black uppercase text-zinc-700">{item.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Dữ liệu gần đây">
        <Card className="bg-[#e7fff3]" id="program-runs">
          <CardHeader>
            <CardTitle>Lượt chạy gần đây</CardTitle>
            <CardDescription>5 program runs mới nhất nếu admin/RLS cho phép đọc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {snapshot.runs.length === 0 ? <p className="font-semibold text-zinc-600">Chưa có dữ liệu lượt chạy.</p> : null}
            {snapshot.runs.map((run) => (
              <div className="rounded border-2 border-black bg-white p-2" key={run.id}>
                <p className="font-black uppercase text-black">{run.status}</p>
                <p className="font-mono text-zinc-700">{run.lesson_step_id}</p>
                {run.error_message ? <p className="text-red-700">{run.error_message}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#fff6fb]" id="voice-logs">
          <CardHeader>
            <CardTitle>Voice logs gần đây</CardTitle>
            <CardDescription>Transcript và trạng thái parser gần nhất.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {snapshot.voiceLogs.length === 0 ? <p className="font-semibold text-zinc-600">Chưa có voice log.</p> : null}
            {snapshot.voiceLogs.map((log) => (
              <div className="rounded border-2 border-black bg-white p-2" key={log.id}>
                <p className="font-mono text-black">“{log.transcript}”</p>
                <p className="font-black uppercase text-zinc-700">{log.status}</p>
                {log.failure_reason ? <p className="text-red-700">{log.failure_reason}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#ffefb8]" id="progress">
          <CardHeader>
            <CardTitle>Tiến độ gần đây</CardTitle>
            <CardDescription>5 bước bài học được cập nhật gần nhất.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {snapshot.progress.length === 0 ? <p className="font-semibold text-zinc-600">Chưa có dữ liệu tiến độ.</p> : null}
            {snapshot.progress.map((item) => (
              <div className="rounded border-2 border-black bg-white p-2" key={`${item.user_id}-${item.lesson_slug}-${item.step_id}`}>
                <p className="font-black text-black">{item.lesson_slug}</p>
                <p className="font-mono text-zinc-700">{item.step_id}</p>
                <p className="font-black uppercase text-zinc-700">{item.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
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
