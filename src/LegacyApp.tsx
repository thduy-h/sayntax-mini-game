import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { LockKeyhole } from "lucide-react";
import { Sidebar, Topbar, Brand, type View } from "./components/Navigation";
import { HomeView } from "./components/HomeView";
import { AccessibilityGame } from "./components/AccessibilityGame";
import { RobotGame } from "./components/RobotGame";
import { WorkshopView } from "./components/WorkshopView";
import { parseJoinRoute } from "./lib/joinRouting";
import { loadIdentity, pollArenaState, submitAccessibility, submitRobot } from "./lib/workshop";
import type { ArenaState, GameId, WorkshopIdentity } from "./types";

export default function App() {
  const joinRoute = parseJoinRoute(window.location.pathname);
  const [view, setView] = useState<View>(() => joinRoute || loadIdentity() ? "workshop" : "home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [workshopSession, setWorkshopSession] = useState<{ identity: WorkshopIdentity; state: ArenaState } | null>(null);

  const openWorkshopGame = (gameId: GameId, identity?: WorkshopIdentity, state?: ArenaState) => {
    setWorkshopSession(identity && state ? { identity, state } : null);
    setView(gameId);
  };

  const returnToWorkshop = () => { setWorkshopSession(null); setView("workshop"); };
  const navigate = (next: View) => { setWorkshopSession(null); setView(next); };
  const [gameConnection, setGameConnection] = useState<"online" | "offline" | "error">("online");
  const activeIdentity = workshopSession?.identity;
  const activeRoundId = workshopSession?.state.round?.id;
  // The workshop view unmounts during play. Keep exactly one polling loop here
  // so MC termination also reaches teams still inside a game.
  useEffect(() => {
    if (!activeIdentity || !activeRoundId || (view !== "accessibility" && view !== "robot")) return;
    return pollArenaState(activeIdentity, (state) => {
      if (state.round?.id !== activeRoundId || state.round.status !== "running" || state.room.status !== "running") {
        setWorkshopSession(null);
        setView("workshop");
      }
    }, setGameConnection);
  }, [activeIdentity, activeRoundId, view]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <Sidebar
          view={view}
          setView={navigate}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
        <main className="main-area">
          <Topbar view={view} toggleMenu={() => setMenuOpen(!menuOpen)} />

          {view === "home" && (
            <HomeView
              onSelectGame={navigate}
              onOpenWorkshop={() => setView("workshop")}
            />
          )}

          {workshopSession && gameConnection !== "online" && <p role="status" className="backend-error">{gameConnection === "offline" ? "Đang offline. Chưa thể cập nhật trạng thái phiên; chờ kết nối lại." : "Chưa thể cập nhật trạng thái phiên từ máy chủ. Đang thử kết nối lại."}</p>}
          {view === "accessibility" && (
            <AccessibilityGame
              onBack={() => workshopSession ? returnToWorkshop() : setView("home")}
              onGoToRobot={workshopSession ? undefined : () => setView("robot")}
              onReturnToWorkshop={workshopSession ? returnToWorkshop : undefined}
              scenarioIds={workshopSession?.state.round?.game === "accessibility" ? workshopSession.state.round.config.scenarioIds : undefined}
              onSubmit={workshopSession?.identity.role === "team" && workshopSession.state.round?.game === "accessibility"
                ? (scenarioId, optionId) => submitAccessibility(workshopSession.identity as WorkshopIdentity & { role: "team" }, workshopSession.state.round!.id, scenarioId, optionId).then(() => undefined)
                : undefined}
            />
          )}

          {view === "robot" && (
            <RobotGame
              onBack={() => workshopSession ? returnToWorkshop() : setView("home")}
              onGoToWorkshop={returnToWorkshop}
              levelIds={workshopSession?.state.round?.game === "robot" ? workshopSession.state.round.config.levelIds?.map(Number) : undefined}
              onSubmit={workshopSession?.identity.role === "team" && workshopSession.state.round?.game === "robot"
                ? (levelId, commands) => submitRobot(workshopSession.identity as WorkshopIdentity & { role: "team" }, workshopSession.state.round!.id, String(levelId), commands).then(() => undefined)
                : undefined}
            />
          )}

          {view === "workshop" && (
            <WorkshopView
              onStartGame={openWorkshopGame}
              initialTab={joinRoute ? "join" : "control"}
              initialCode={joinRoute?.code}
            />
          )}

          <footer className="site-footer">
            <Brand compact />
            <span>SAYNTAX Game Arena · Nền tảng thực hành kỹ năng số 2026</span>
            <div className="footer-right">
              <LockKeyhole size={14} />
              <span>Chế độ Standalone & Realtime</span>
            </div>
          </footer>
        </main>
      </div>
    </MotionConfig>
  );
}
