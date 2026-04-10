import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutAction } from "@/features/auth/server/actions";
import { getCurrentAppUser } from "@/features/auth/server/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/sign-in");
  }

  if (!appUser.onboarding_completed) {
    redirect("/onboarding");
  }

  if (appUser.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <Card className="border-0 bg-[linear-gradient(155deg,#52304f,#374d69)] text-white">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-100">Bảng quản trị</p>
          <CardTitle className="text-white">Điểm vào quản lý nội dung</CardTitle>
          <CardDescription className="text-slate-200">
            Chỉnh sửa bài học, quản lý nội dung truyền cảm hứng, thống kê tiến độ và nhật ký giọng nói là mốc tiếp theo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">CRUD bài học sẽ làm ở milestone tiếp theo</div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Thống kê tiến độ học sinh đang chờ triển khai</div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">Màn hình xem log giọng nói đang chờ triển khai</div>
        </CardContent>
      </Card>

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
