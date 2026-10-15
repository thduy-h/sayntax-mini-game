import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppNav } from "@/components/app-nav";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SwitchField } from "@/components/ui/switch-field";
import { Textarea } from "@/components/ui/textarea";
import { AuthMessage } from "@/features/auth/components/auth-message";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { completeOnboardingAction } from "@/features/onboarding/server/actions";

interface OnboardingPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent("/onboarding")}`);
  }

  if (appUser.onboarding_completed) {
    redirect(appUser.role === "admin" ? "/admin" : "/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8 sm:px-10">
      <AppNav />
      <Card className="bg-slate-900 text-white">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200">Thiết lập ban đầu</p>
          <CardTitle className="text-white">
            {appUser.role === "admin" ? "Thiết lập không gian quản trị" : "Hãy cho chúng tôi biết cách hỗ trợ việc học của bạn"}
          </CardTitle>
          <CardDescription className="text-slate-200">
            {appUser.role === "admin"
              ? "Quản trị viên có thể xác nhận thiết lập cốt lõi ngay bây giờ và quản lý nội dung sau khi hoàn tất."
              : "Học sinh có thể lưu hồ sơ và thiết lập trợ năng trước khi vào bảng học tập."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <AuthMessage message={params.error} tone="error" />
          <form action={completeOnboardingAction} className="space-y-8">
            {appUser.role === "student" ? <section className="space-y-5">
              <div>
                <h2 className="font-heading text-2xl text-slate-900">Hồ sơ</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Phần này giúp cá nhân hóa trải nghiệm học tập và lưu tiến độ của riêng bạn.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Tên hiển thị</Label>
                  <Input id="displayName" name="displayName" placeholder="Chúng tôi nên gọi bạn là gì?" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ageRange">Độ tuổi (không bắt buộc)</Label>
                  <select
                    className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
                    defaultValue=""
                    id="ageRange"
                    name="ageRange"
                  >
                    <option value="">Chọn độ tuổi</option>
                    <option value="15-17">15–17</option>
                    <option value="18-19">18–19</option>
                    <option value="20-24">20–24</option>
                    <option value="25-29">25–29</option>
                    <option value="30-35">30–35</option>
                    <option value="prefer-not-to-say">Không muốn cung cấp</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Khối lớp (không bắt buộc)</Label>
                  <Input id="gradeLevel" name="gradeLevel" placeholder="Ví dụ: Lớp 7" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Trường hoặc chương trình học (không bắt buộc)</Label>
                  <Input id="schoolName" name="schoolName" placeholder="Không bắt buộc" />
                </div>
              </div>
              {appUser.role === "student" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="goals">Mục tiêu học tập (không bắt buộc)</Label>
                    <Textarea id="goals" name="goals" placeholder="Bạn muốn học hoặc tạo ra điều gì trước?" />
                  </div>
                </>
              ) : null}
            </section> : null}

            <section className="space-y-5">
              <div>
                <h2 className="font-heading text-2xl text-slate-900">Thiết lập trợ năng</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Các thiết lập này sẽ được lưu và áp dụng trong giao diện bài học khi tính năng tương ứng đã sẵn sàng.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontScale">Cỡ chữ</Label>
                <select
                  className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
                  defaultValue="default"
                  id="fontScale"
                  name="fontScale"
                >
                  <option value="default">Mặc định</option>
                  <option value="large">Lớn</option>
                  <option value="x-large">Rất lớn</option>
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SwitchField
                  defaultChecked
                  description="Tăng kích thước vùng bấm để thao tác dễ hơn."
                  label="Nút bấm lớn"
                  name="largeTouchTargets"
                />
                <SwitchField
                  description="Tăng độ tương phản trong giao diện."
                  label="Chế độ tương phản cao"
                  name="highContrast"
                />
                <SwitchField
                  description="Giảm hiệu ứng chuyển động khi có thể."
                  label="Giảm chuyển động"
                  name="reducedMotion"
                />
                <SwitchField
                  defaultChecked
                  description="Phát hoặc hỗ trợ hướng dẫn bằng âm thanh khi có."
                  label="Hướng dẫn âm thanh"
                  name="audioInstructions"
                />
                <SwitchField
                  defaultChecked
                  description="Giữ nhãn và focus rõ ràng để hỗ trợ điều hướng bằng bàn phím của trình duyệt."
                  label="Nhãn và focus rõ ràng"
                  name="keyboardNavigationHints"
                />
              </div>
            </section>

            <p className="text-sm leading-6 text-slate-600">
              Nếu muốn nhận bản sao hoặc yêu cầu xóa dữ liệu tài khoản, hãy liên hệ người phụ trách chương trình của bạn.
            </p>

            <FormSubmitButton pendingLabel="Đang lưu thiết lập..." size="lg">
              Hoàn tất thiết lập
            </FormSubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
