export type GlobalVoiceCommand =
  | { kind: "navigate"; href: string; label: string }
  | { kind: "click"; label: string }
  | { kind: "focus"; label: string }
  | { kind: "fill_focused"; value: string }
  | { kind: "clear_focused" }
  | { kind: "scroll"; direction: "up" | "down" | "top" | "bottom" }
  | { kind: "history"; direction: "back" | "forward" }
  | { kind: "help" }
  | { kind: "stop" }
  | { kind: "unknown"; transcript: string };

const DEMO_LESSON_ROUTES = [
  "/demo/start-and-sequence-v2",
  "/demo/print-output-v2",
  "/demo/repeat-loops-v2",
  "/demo/if-basics-v2",
  "/demo/variables-basics-v2",
] as const;

const ROUTES: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ["/", "trang chủ", ["trang chu", "home", "man hinh chinh"]],
  ["/demo", "demo", ["demo", "trai nghiem", "trai nghiem ngay", "hoc thu", "bai hoc demo"]],
  ["/sign-in", "đăng nhập", ["dang nhap", "login"]],
  ["/sign-up", "đăng ký", ["dang ky", "tao tai khoan", "register"]],
  ["/dashboard", "dashboard", ["dashboard", "bang dieu khien", "tong quan hoc vien"]],
  ["/lessons-v2", "bài học", ["bai hoc", "danh sach bai hoc", "lessons"]],
  ["/role-models", "role models", ["role models", "hinh mau", "hinh mau nu", "nu cong nghe"]],
  ["/onboarding", "trợ giúp", ["tro giup", "huong dan", "onboarding"]],
  ["/admin", "admin", ["admin", "quan tri", "khu vuc quan tri"]],
] as const;

export function normalizeVoiceText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPolitePrefix(value: string) {
  return value.replace(/^(?:hay|lam on|giup minh|cho minh|ban oi|em muon)\s+/, "").trim();
}

function routeFor(payload: string) {
  const normalized = normalizeVoiceText(payload);
  for (const [href, label, aliases] of ROUTES) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return { href, label };
    }
  }
  return null;
}

function parseLessonNumber(value: string) {
  if (/^(?:dau tien|mot)$/.test(value)) return 1;
  if (value === "hai") return 2;
  if (value === "ba") return 3;
  if (value === "bon" || value === "tu") return 4;
  if (value === "nam") return 5;
  const numeric = value.match(/\b([1-5])\b/);
  return numeric?.[1] ? Number(numeric[1]) : null;
}

function demoLessonRouteFor(payload: string) {
  const normalized = normalizeVoiceText(payload);
  const match = normalized.match(/^(?:bai|bai hoc|lesson)\s*(?:so|thu)?\s*(.+)$/);
  const lessonNumber = parseLessonNumber(match?.[1]?.trim() ?? normalized);
  if (!lessonNumber) return null;
  const href = DEMO_LESSON_ROUTES[lessonNumber - 1];
  return href ? { href, label: `bài ${lessonNumber}` } : null;
}

function commonClickTarget(normalized: string) {
  const target = {
    "bat micro": "noi",
    "noi": "noi",
    "dung micro": "dung",
    "tat micro": "dung",
    "chay chuong trinh": "chay",
    "chay thu": "chay",
    "run": "chay",
    "kiem tra bai": "chay",
    "kiem tra": "chay",
    "buoc sau": "sau",
    "tiep theo": "sau",
    "sang buoc sau": "sau",
    "buoc truoc": "truoc",
    "quay ve buoc truoc": "truoc",
    "hoan tac": "hoan tac",
    "undo": "hoan tac",
    "dung cau mau": "dung cau mau",
    "cau mau": "dung cau mau",
    "thuc hien": "thuc hien",
    "gui lenh": "thuc hien",
    "doi goi y": "doi",
    "goi y tiep": "doi",
    "goi y": "doi",
    "dat lai demo": "dat lai ban demo",
    "dat lai ban demo": "dat lai ban demo",
    "danh sach bai": "danh sach bai",
    "lam lai": "lam lai",
  } satisfies Record<string, string>;
  return target[normalized as keyof typeof target];
}

export function parseGlobalVoiceCommand(transcript: string): GlobalVoiceCommand {
  const normalized = stripPolitePrefix(normalizeVoiceText(transcript));
  if (!normalized) return { kind: "unknown", transcript };

  if (/^(?:tro giup|lenh gi|co the noi gi|huong dan dieu khien)$/.test(normalized)) {
    return { kind: "help" };
  }
  if (/^(?:tat dieu khien giong noi|dong dieu khien giong noi|dung nghe|ngung nghe)$/.test(normalized)) {
    return { kind: "stop" };
  }
  if (/^(?:quay lai|tro lai|back)$/.test(normalized)) return { kind: "history", direction: "back" };
  if (/^(?:tien toi|di toi|forward)$/.test(normalized)) return { kind: "history", direction: "forward" };

  if (/^(?:cuon xuong|keo xuong|xuong duoi)$/.test(normalized)) return { kind: "scroll", direction: "down" };
  if (/^(?:cuon len|keo len|len tren)$/.test(normalized)) return { kind: "scroll", direction: "up" };
  if (/^(?:len dau trang|ve dau trang|dau trang)$/.test(normalized)) return { kind: "scroll", direction: "top" };
  if (/^(?:xuong cuoi trang|ve cuoi trang|cuoi trang)$/.test(normalized)) return { kind: "scroll", direction: "bottom" };

  const commonTarget = commonClickTarget(normalized);
  if (commonTarget) return { kind: "click", label: commonTarget };

  const navigateMatch = normalized.match(/^(?:mo|di den|toi|vao|chuyen den|truy cap)\s+(.+)$/);
  if (navigateMatch?.[1]) {
    const demoLessonRoute = demoLessonRouteFor(navigateMatch[1]);
    if (demoLessonRoute) return { kind: "navigate", ...demoLessonRoute };
    const route = routeFor(navigateMatch[1]);
    if (route) return { kind: "navigate", ...route };
  }
  const demoLessonRoute = demoLessonRouteFor(normalized);
  if (demoLessonRoute) return { kind: "navigate", ...demoLessonRoute };
  const directRoute = routeFor(normalized);
  if (
    directRoute &&
    /^(?:demo|trai nghiem|trai nghiem ngay|hoc thu|bai hoc demo|dang nhap|dang ky|dashboard|bai hoc|admin|trang chu|tro giup)$/.test(normalized)
  ) {
    return { kind: "navigate", ...directRoute };
  }

  const focusMatch = normalized.match(/^(?:chon o|vao o|focus|dat con tro vao)\s+(.+)$/);
  if (focusMatch?.[1]) return { kind: "focus", label: focusMatch[1].trim() };

  const clickMatch = normalized.match(/^(?:bam|nhan|chon|mo nut|click)\s+(.+)$/);
  if (clickMatch?.[1]) {
    const demoLessonRoute = demoLessonRouteFor(clickMatch[1]);
    if (demoLessonRoute) return { kind: "navigate", ...demoLessonRoute };
    const route = routeFor(clickMatch[1]);
    if (route) return { kind: "navigate", ...route };
    return { kind: "click", label: clickMatch[1].trim() };
  }

  const fillMatch = normalized.match(/^(?:nhap|dien|go)\s+(.+)$/);
  if (fillMatch?.[1]) return { kind: "fill_focused", value: fillMatch[1].trim() };

  if (/^(?:xoa o nay|xoa noi dung|xoa noi dung o nay)$/.test(normalized)) return { kind: "clear_focused" };

  return { kind: "unknown", transcript };
}
