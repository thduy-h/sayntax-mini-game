export function isWorkspaceVoiceRoute(pathname: string | null | undefined) {
  const path = (pathname ?? "").split(/[?#]/)[0]?.replace(/\/+$/, "") || "/";
  return /^\/demo\/[^/]+$/.test(path) || /^\/lessons-v2\/[^/]+$/.test(path);
}
