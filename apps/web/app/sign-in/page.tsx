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
      description="Tiếp tục bài học và theo dõi tiến độ của bạn."
      eyebrow="Truy cập tài khoản"
      title="Đăng nhập vào SAYNTAX"
    >
      <CardHeader>
        <CardTitle>Chào mừng bạn quay lại</CardTitle>
        <CardDescription>Nhập email và mật khẩu để tiếp tục học.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="min-h-12 space-y-2">
          <AuthMessage message={params.message} />
          <AuthMessage message={params.error} tone="error" />
          {!authConfigured && (
            <AuthMessage
              message="Đăng nhập tạm thời chưa sẵn sàng. Bạn vẫn có thể học thử mà không cần tài khoản."
              tone="error"
            />
          )}
        </div>
        <form action={signInAction} className="space-y-5">
          {params.callbackUrl ? <input name="callbackUrl" type="hidden" value={params.callbackUrl} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input autoCapitalize="none" spellCheck={false} autoComplete="email" id="email" name="email" placeholder="hocvien@example.com" required type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              autoComplete="current-password"
              id="password"
              name="password"
              placeholder="Nhập mật khẩu của bạn"
              required
              type="password"
            />
          </div>
          <FormSubmitButton className="w-full" disabled={!authConfigured} pendingLabel="Đang đăng nhập..." size="lg">
            Đăng nhập
          </FormSubmitButton>
        </form>
        <Link className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline" href="/demo">
          Học thử không cần tài khoản
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
