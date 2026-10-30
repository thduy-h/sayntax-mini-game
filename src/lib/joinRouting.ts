// Match the database room-code contract, including older codes containing I/O.
export const ROOM_CODE_PATTERN = /^[A-Z2-9]{6}$/;
export const ROOM_CODE_HELP = "Mã phòng phải gồm 6 ký tự A–Z hoặc 2–9 (không dùng 0, 1).";

export function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidRoomCode(value: string) {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
}

// The existing application switches views with React state; no router library is
// needed to enter the player view from a full-document deep link.
export function parseJoinRoute(pathname: string): { code: string } | null {
  if (!/^\/join(?:\/|$)/.test(pathname)) return null;
  const match = pathname.match(/^\/join\/([^/]+)\/?$/);
  if (!match) return { code: "" };
  try {
    return { code: normalizeRoomCode(decodeURIComponent(match[1])) };
  } catch {
    return { code: "" };
  }
}

export function buildJoinUrl(origin: string, code: string): string | null {
  if (!isValidRoomCode(code)) return null;
  // Always share the frontend's current origin, never the Supabase/API origin.
  const base = new URL(origin);
  if (base.protocol !== "https:" && base.protocol !== "http:") return null;
  return new URL(`/join/${encodeURIComponent(normalizeRoomCode(code))}`, base.origin).href;
}

export function workshopErrorMessage(code: string) {
  return ({
    invalid_room_code: ROOM_CODE_HELP,
    room_team_limit_reached: "Phòng đã đủ 8 đội.",
    team_name_taken: "Tên đội đã được sử dụng.",
    forbidden: "Phiên truy cập không hợp lệ hoặc đã bị thu hồi.",
    rate_limited: "Bạn thao tác quá nhanh. Hãy chờ một chút.",
    // The existing join endpoint intentionally groups absent/expired/non-lobby
    // rooms into not_found. Do not claim we can distinguish these server states.
    not_found: "Không thể vào phòng: mã không tồn tại, phòng đã hết hạn hoặc MC đã khóa/đóng phòng. Kiểm tra mã hoặc liên hệ MC để được hỗ trợ.",
    room_not_joinable: "MC đã khóa hoặc đóng phòng. Hãy liên hệ MC để được hỗ trợ.",
    room_locked: "MC đã khóa phòng. Hãy liên hệ MC để được hỗ trợ.",
    room_expired: "Phòng đã hết hạn. Hãy xin MC mã phòng mới.",
    team_join_failed: "Chưa thể vào phòng. Phòng có thể vừa bị khóa hoặc đóng; hãy kiểm tra với MC rồi thử lại.",
  } as Record<string, string>)[code] ?? "Không thể kết nối backend workshop. Kiểm tra mạng rồi thử lại.";
}
