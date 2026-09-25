import Link from "next/link";
import { redirect } from "next/navigation";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { signInAction } from "@/features/auth/server/actions";
import { getCurrentAppUser, getRedirectPathForUser } from "@/features/auth/server/data";
import { isSupabaseConfigured } from "@/lib/env";

interface SignInPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
    callbackUrl?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const appUser = await getCurrentAppUser();
  if (appUser) {
    redirect(getRedirectPathForUser(appUser));
  }

  const params = await searchParams;
  const authConfigured = isSupabaseConfigured();

  return (
    <AuthShell
      description="Dùng tài khoản của bạn để tiếp tục bài học, theo dõi tiến độ và truy cập nội dung phù hợp với vai trò."
      eyebrow="Truy cập tài khoản"
      title="Đăng nhập vào SAYNTAX"
    >
      <CardHeader>
        <CardTitle>Chào mừng bạn quay lại</CardTitle>
        <CardDescription>Học sinh sẽ quay về bảng học tập, còn quản trị viên quay về khu vực quản lý nội dung.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthMessage message={params.message} />
        <AuthMessage message={params.error} tone="error" />
        {!authConfigured && (
          <AuthMessage
            message="Đăng nhập chưa sẵn sàng vì Supabase chưa được cấu hình. Bạn vẫn có thể vào chế độ demo công khai."
            tone="error"
          />
        )}
        <form action={signInAction} className="space-y-5">
          {params.callbackUrl ? <input name="callbackUrl" type="hidden" value={params.callbackUrl} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input autoComplete="email" id="email" name="email" placeholder="hocvien@example.com" required type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              autoComplete="current-password"
              id="password"
              name="password"
              placeholder="Tối thiểu 8 ký tự"
              required
              type="password"
            />
          </div>
          <FormSubmitButton className="w-full" disabled={!authConfigured} pendingLabel="Đang đăng nhập..." size="lg">
            Đăng nhập
          </FormSubmitButton>
        </form>
        <Link className="inline-flex font-semibold text-accent underline-offset-4 hover:underline" href="/demo">
          Trải nghiệm demo không cần đăng nhập
        </Link>
        <p className="text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link className="font-semibold text-accent underline-offset-4 hover:underline" href="/sign-up">
            Tạo tài khoản
          </Link>
        </p>
      </CardContent>
    </AuthShell>
  );
}
