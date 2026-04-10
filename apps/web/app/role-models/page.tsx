import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAppUser } from "@/features/auth/server/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RoleModelRow {
  id: string;
  name: string;
  headline: string;
  summary: string;
  story: string;
  quote: string | null;
  sort_order: number;
}

export default async function RoleModelsPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/sign-in");
  }

  if (!appUser.onboarding_completed) {
    redirect("/onboarding");
  }

  const supabase = await createServerSupabaseClient();
  const { data: roleModels } = await supabase
    .from("role_model_entries")
    .select("id, name, headline, summary, story, quote, sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .returns<RoleModelRow[]>();

  const entries = roleModels ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10">
      <Card className="border-0 bg-[linear-gradient(155deg,#5e335a,#30536a)] text-white">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-100">Truyền cảm hứng</p>
          <CardTitle className="text-white">Những phụ nữ trong STEAM mở rộng giới hạn của điều tưởng như có thể</CardTitle>
          <CardDescription className="text-slate-200">
            Những câu chuyện giúp khẳng định rằng các bạn nữ, bao gồm cả các bạn nữ khuyết tật, hoàn toàn thuộc về lĩnh vực công nghệ.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="bg-[#fffdf8]">
            <CardHeader>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{entry.headline}</p>
              <CardTitle>{entry.name}</CardTitle>
              <CardDescription>{entry.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">{entry.story}</p>
              {entry.quote ? (
                <blockquote className="rounded-[1rem] border-4 border-black bg-[#ffefb8] px-4 py-3 text-sm font-semibold italic text-black shadow-[5px_5px_0_#121212]">
                  &ldquo;{entry.quote}&rdquo;
                </blockquote>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      {entries.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-8 text-center text-sm font-semibold text-zinc-600">
            Chưa có nội dung truyền cảm hứng nào được xuất bản.
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
