import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { signUpAction } from "@/features/auth/server/actions";
import { getCurrentAppUser, getRedirectPathForUser } from "@/features/auth/server/data";

interface SignUpPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const appUser = await getCurrentAppUser();
  if (appUser) {
    redirect(getRedirectPathForUser(appUser));
  }

  const params = await searchParams;

  return (
    <AuthShell
      description="Tạo tài khoản học sinh để bắt đầu bài học có hướng dẫn, hoặc dùng email được cho phép để vào vai trò quản trị."
      eyebrow="Tài khoản mới"
      title="Tạo tài khoản SheCanCode Voice"
    >
      <CardHeader>
        <CardTitle>Bắt đầu học với sự hỗ trợ phù hợp</CardTitle>
        <CardDescription>
          Phiên bản đầu tiên hỗ trợ đăng ký bằng email và mật khẩu, kèm chọn vai trò và onboarding đơn giản.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthMessage message={params.error} tone="error" />
        <form action={signUpAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input autoComplete="email" id="email" name="email" placeholder="ban@example.com" required type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              autoComplete="new-password"
              id="password"
              minLength={8}
              name="password"
              placeholder="Chọn mật khẩu an toàn"
              required
              type="password"
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-800">Vai trò</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-[#fffdf8] p-4">
              <input defaultChecked name="role" type="radio" value="student" />
              <span>
                <span className="block font-semibold text-slate-900">Học sinh</span>
                <span className="block text-sm leading-6 text-slate-600">Bài học có hướng dẫn, theo dõi tiến độ và tự đánh giá mức tự tin.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-[#fffdf8] p-4">
              <input name="role" type="radio" value="admin" />
              <span>
                <span className="block font-semibold text-slate-900">Quản trị viên / Người hướng dẫn</span>
                <span className="block text-sm leading-6 text-slate-600">
                  Email nằm trong danh sách cho phép có thể quản lý bài học, nội dung truyền cảm hứng và hoạt động của học sinh.
                </span>
              </span>
            </label>
          </fieldset>
          <Button className="w-full" size="lg" type="submit">
            Tạo tài khoản
          </Button>
        </form>
        <p className="text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link className="font-semibold text-accent underline-offset-4 hover:underline" href="/sign-in">
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </AuthShell>
  );
}
