import { lazy, Suspense } from "react";
import CompetitionPortal from "./features/competition/CompetitionPortal";
import { standaloneMode } from "./lib/workshop";
const StandaloneCompetition = lazy(() => import("./features/competition/StandaloneCompetition"));
const JoinEntry = lazy(() => import("./features/competition/JoinEntry"));
const LegacyApp = lazy(() => import("./LegacyApp"));
export default function App() {
  let path = window.location.pathname;
  // Keep older/bookmarked competition links on the canonical competition route.
  if (/^\/competitive(?:\/|$)/.test(path)) {
    path = path.replace(/^\/competitive/, "/competition");
    window.history.replaceState(
      window.history.state,
      "",
      `${path}${window.location.search}${window.location.hash}`,
    );
  }
  if (path === "/competition/preview" || (standaloneMode && /^\/competition\/?$/.test(path)))
    return <Suspense fallback={<p role="status">Đang tải giao diện diễn tập…</p>}><StandaloneCompetition /></Suspense>;
  if (
    /^\/competition(?:\/|$)/.test(path) ||
    path.startsWith("/present/") ||
    (path.startsWith("/join/") &&
      new URLSearchParams(window.location.search).has("competition"))
  )
    return <CompetitionPortal />;
  return (
    <Suspense fallback={<p role="status">Đang tải SAYNTAX Arena…</p>}>
      {path.startsWith("/join/") ? <JoinEntry /> : <LegacyApp />}
    </Suspense>
  );
}
