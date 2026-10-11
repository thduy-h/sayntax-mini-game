# SAYNTAX

SAYNTAX - **Công nghệ không rào cản** - is an accessibility-first Blockly learning platform for girls and women with motor disabilities. The current MVP supports guided lessons, rule-based Vietnamese voice commands, text command fallback, basic progress tracking, protected student/admin routes, and a public guest demo.

## Current Status

- 5 beginner lessons
- 25 guided lesson steps
- Public guest demo at `/demo`
- Authenticated student flow with dashboard, lessons, progress, program runs, and voice command logs
- Lightweight admin pilot dashboard for progress, program runs, and unsupported voice commands
- Rule-based Vietnamese parser only; no LLM dependency

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- npm workspaces monorepo
- Supabase for auth, Postgres, and storage
- Blockly for the learning workspace
- Server-routed ASR: Groq Whisper in production or local `faster-whisper` for workshops, with Web Speech API fallback

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The landing page and `/demo/**` render without Supabase environment variables. Authenticated routes still require Supabase configuration.

## ASR modes

The browser always uploads audio to the same-origin `/api/asr/transcribe` route. API keys, local URLs and tokens remain server-only.

Production:

```bash
ASR_MODE=cloud
GROQ_API_KEY=...
GROQ_ASR_MODEL=whisper-large-v3-turbo
```

Workshop:

```bash
ASR_MODE=local
LOCAL_ASR_URL=http://127.0.0.1:8000
LOCAL_ASR_TOKEN=choose-a-workshop-token
```

Run the local ASR server:

```bash
cd asr-server
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Install and run:

```bash
uv pip install -r requirements.txt
LOCAL_ASR_TOKEN=choose-a-workshop-token uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Check health:

```bash
curl http://127.0.0.1:8000/health
```

First run downloads the Whisper model. Defaults: `ASR_MODEL=base`, `ASR_LANGUAGE=vi`, CUDA with `float16` if available, otherwise CPU with `int8`.

Start FastAPI first, then start Next.js with the workshop variables. A tunnel may expose Next.js for workshop participants; browsers still call only Next.js, and Next.js forwards audio to port 8000. If Groq/local ASR times out, returns 429/5xx, or has a network failure, the client switches to Edge/Chrome Web Speech API. If that is unavailable, the global “Nhập lệnh” bar remains usable.

SAYNTAX does not retain raw audio in this flow. Cloud mode sends audio to Groq for recognition; local mode processes it on the operator machine; browser fallback may use the browser vendor's speech service. Do not expose the FastAPI port publicly without HTTPS, authentication and rate limiting.

`ASR_RATE_LIMIT_PER_MINUTE` is a lightweight per-Next.js-instance guard. It is useful for the MVP but is not a distributed quota across multiple Vercel instances.

## Guest Demo

Use this flow for a live pitch when no account is available:

1. Open `/`.
2. Click “Trải nghiệm ngay — không cần đăng nhập”.
3. Open “Bắt đầu và tuần tự”.
4. Use the text fallback if microphone permissions are unreliable:
   - `thêm khối bắt đầu`
   - `thêm khối in`
   - `đặt chữ Xin chào`
   - `chạy chương trình`
5. Safe commands such as adding blocks, selecting blocks, setting text/numbers, navigation, hints, and running the program execute immediately. Destructive commands such as deleting or moving blocks ask for `đúng rồi` or `hủy`.
6. Demo progress is saved in `localStorage` on the current device only.
7. Use “Đặt lại bản demo” to clear guest progress.

Recommended browser for voice demo: Chrome or Edge on desktop. If Web Speech API is unavailable, use the global “Nhập lệnh” bar; in lessons it uses the same rule-based parser as microphone transcripts.

## Supported Demo Commands

Blockly/programming:

- `thêm khối bắt đầu`
- `thêm khối in`
- `thêm khối in chữ Xin chào`
- `đặt chữ Xin chào`
- `thêm khối lặp 3 lần`
- `chèn sau khối 1`
- `chèn vào trong khối 3`
- `in biến điểm`
- `chạy chương trình`
- `gợi ý`, `kiểm tra bài`, `mình đang ở đâu`

Workspace navigation:

- `cuộn lên`, `cuộn xuống`, `cuộn sang trái`, `cuộn sang phải`
- `về giữa`, `đưa khối 2 về giữa`
- `vừa màn hình`, `phóng to`, `thu nhỏ`, `đặt lại zoom`

Toolbox:

- `mở danh sách khối`, `thu gọn danh sách khối`
- `mở nhóm luồng`, `mở nhóm đầu ra`, `mở nhóm lặp`, `mở nhóm điều kiện`, `mở nhóm giá trị`, `mở nhóm biến`

Confirmation is only needed for risky actions:

- `xóa khối 2` → app asks for `đúng rồi` or `hủy`
- `di chuyển khối 4 lên trên` → app asks for `đúng rồi` or `hủy`

## Main Routes

- `/` — product landing page
- `/demo` — public guest demo lesson list
- `/demo/[slug]` — public guest demo workspace
- `/sign-in` — authenticated login
- `/sign-up` — account creation
- `/onboarding` — profile and accessibility settings
- `/dashboard` — student dashboard
- `/lessons-v2` — authenticated lesson list
- `/lessons-v2/[slug]` — authenticated lesson workspace
- `/admin` — protected admin pilot dashboard

## Environment Variables

`apps/web/.env.local`

```bash
ASR_MODE=cloud
GROQ_API_KEY=
GROQ_ASR_MODEL=whisper-large-v3-turbo
LOCAL_ASR_URL=http://127.0.0.1:8000
LOCAL_ASR_TOKEN=
ASR_MAX_UPLOAD_BYTES=10485760
ASR_RATE_LIMIT_PER_MINUTE=30
ASR_TIMEOUT_MS=20000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_ALLOWLIST_EMAILS=
ADMIN_EMAILS=
```

Notes:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Do not expose `GROQ_API_KEY` or `LOCAL_ASR_TOKEN` with a `NEXT_PUBLIC_` prefix.
- `ADMIN_ALLOWLIST_EMAILS` or `ADMIN_EMAILS` can enable admin sign-up for specific emails. Keep these values server-side.
- Without Supabase env values, public demo still works; sign-in/sign-up show a friendly configuration message.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

In some restricted sandboxes, `next build` with Turbopack may need permission to bind an internal local port. The codebase itself builds normally when that restriction is not present.

## Repository Layout

```text
apps/web                  Next.js app
packages/voice-parser     Rule-based Vietnamese parser
packages/lesson-engine    Seed lessons and validation
packages/block-engine     Program execution
packages/shared-types     Shared domain types
supabase                  Migrations and seed SQL
docs                      Product and architecture notes
```
