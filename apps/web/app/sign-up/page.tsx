import Link from "next/link";
import { redirect } from "next/navigation";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { signUpAction } from "@/features/auth/server/actions";
import { getCurrentAppUser, getRedirectPathForUser } from "@/features/auth/server/data";
import { isSupabaseConfigured } from "@/lib/env";

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
  const authConfigured = isSupabaseConfigured();

  return (
    <AuthShell
      description="Lưu tiến độ và tiếp tục học bất cứ lúc nào."
      eyebrow="Tài khoản mới"
      title="Tạo tài khoản SAYNTAX"
    >
      <CardHeader>
        <CardTitle>Bắt đầu hành trình của bạn</CardTitle>
        <CardDescription>
          Lưu tiến độ học của bạn bằng tài khoản email và mật khẩu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="min-h-12 space-y-2">
          <AuthMessage message={params.error} tone="error" />
          {!authConfigured && (
            <AuthMessage
              message="Đăng ký tạm thời chưa sẵn sàng. Bạn vẫn có thể học thử mà không cần tài khoản."
              tone="error"
            />
          )}
        </div>
        <form action={signUpAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input autoCapitalize="none" spellCheck={false} autoComplete="email" id="email" name="email" placeholder="ban@example.com" required type="email" />
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
              aria-describedby="password-help"
            />
            <p className="text-sm text-slate-600" id="password-help">Mật khẩu có ít nhất 8 ký tự.</p>
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-800">Vai trò</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 focus-within:ring-2 focus-within:ring-black">
              <input defaultChecked className="mt-1 h-5 w-5 shrink-0 accent-black" name="role" type="radio" value="student" />
              <span>
                <span className="block font-semibold text-slate-900">Học sinh</span>
                <span className="block text-sm leading-6 text-slate-600">Bài học có hướng dẫn, theo dõi tiến độ và tự đánh giá mức tự tin.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 focus-within:ring-2 focus-within:ring-black">
              <input className="mt-1 h-5 w-5 shrink-0 accent-black" name="role" type="radio" value="admin" />
              <span>
                <span className="block font-semibold text-slate-900">Quản trị viên / Người hướng dẫn</span>
                <span className="block text-sm leading-6 text-slate-600">
                  Dành cho email được cho phép xem chỉ số học tập tổng hợp.
                </span>
              </span>
            </label>
          </fieldset>
          <FormSubmitButton className="w-full" disabled={!authConfigured} pendingLabel="Đang tạo tài khoản..." size="lg">
            Tạo tài khoản
          </FormSubmitButton>
        </form>
        <Link className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline" href="/demo">
          Học thử không cần tài khoản
        </Link>
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
