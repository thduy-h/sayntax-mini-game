import { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import { WorkshopRoundSummary } from "./WorkshopRoundSummary";
import { gameName } from "../lib/roundResults";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  ArenaApiError,
  createRoom,
  getArenaState,
  joinRoom,
  loadIdentity,
  makeRoomCode,
  manageRoom,
  pollArenaState,
  seedTeams,
  standaloneMode,
  startRound,
  teamsFromState,
} from "../lib/workshop";
import { accessibilityScenarios, robotLevels, selectAccessibilityScenarios } from "../lib/gameLogic";
import { buildJoinUrl, isValidRoomCode, normalizeRoomCode, ROOM_CODE_HELP, workshopErrorMessage } from "../lib/joinRouting";
import { sound } from "../lib/audio";
import type { ArenaState, GameId, Team, WorkshopIdentity } from "../types";

interface WorkshopViewProps {
  onStartGame: (gameId: GameId, identity?: WorkshopIdentity, state?: ArenaState) => void;
  initialTab?: "control" | "join";
  initialCode?: string;
}

export function WorkshopView({
  onStartGame,
  initialTab = "control",
  initialCode,
}: WorkshopViewProps) {
  const restoredIdentity = useMemo(() => standaloneMode ? null : loadIdentity(), []);
  const matchingIdentity = restoredIdentity && (initialTab === "join"
    ? restoredIdentity.role === "team" && restoredIdentity.roomCode === initialCode
    : !initialCode || restoredIdentity.roomCode === initialCode) ? restoredIdentity : null;
  const [identity, setIdentity] = useState<WorkshopIdentity | null>(matchingIdentity);
  const [code, setCode] = useState(initialCode ?? restoredIdentity?.roomCode ?? (standaloneMode ? makeRoomCode() : ""));
  const [teams, setTeams] = useState<Team[]>(standaloneMode ? seedTeams : []);
  const [newTeam, setNewTeam] = useState("");
  const [joinName, setJoinName] = useState(matchingIdentity?.role === "team" ? matchingIdentity.teamName : "");
  const [joined, setJoined] = useState(matchingIdentity?.role === "team");
  const [qrImage, setQrImage] = useState<{ url: string; data: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"control" | "join">(initialTab);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [questionMode, setQuestionMode] = useState<"random" | "manual">("random");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(() => selectAccessibilityScenarios({ seed: code, count: 4 }).scenarioIds);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1, 2, 3]);
  const [roundLocked, setRoundLocked] = useState(false);
  const [arenaState, setArenaState] = useState<ArenaState | null>(null);
  const [connection, setConnection] = useState<"online" | "offline" | "error" | "idle">(standaloneMode ? "online" : "idle");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latestRoomVersion = useRef(-1);

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => b.score - a.score), [teams]);

  const joinUrl = buildJoinUrl(window.location.origin, code);
  const codeError = isValidRoomCode(code) ? null : ROOM_CODE_HELP;
  const qr = qrImage?.url === joinUrl ? qrImage.data : null;

  // QR, clipboard and displayed links use this single validated frontend URL.
  useEffect(() => {
    if (!joinUrl) { setQrImage(null); return; }
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((data) => { if (!cancelled) setQrImage({ url: joinUrl, data }); })
      .catch(() => { if (!cancelled) setQrImage(null); });
    return () => { cancelled = true; };
  }, [joinUrl]);

  // Polling is deliberately bounded: one request every five seconds per active client.
  useEffect(() => {
    if (standaloneMode || !identity) return;
    return pollArenaState(identity, (state) => {
      if (state.room.version < latestRoomVersion.current) return;
      latestRoomVersion.current = state.room.version;
      setArenaState(state);
      setTeams(teamsFromState(state));
      setRoundLocked(state.room.status !== "lobby");
    }, setConnection);
  }, [identity]);

  const messageFor = (error: unknown) => {
    const code = error instanceof ArenaApiError ? error.code : "request_failed";
    return workshopErrorMessage(code);
  };

  const runRequest = async (task: () => Promise<void>) => { setBusy(true); setRequestError(null); try { await task(); } catch (error) { setRequestError(messageFor(error)); } finally { setBusy(false); } };

  const createBackendRoom = () => runRequest(async () => { const result = await createRoom(); setIdentity(result.identity); setCode(result.room.code); setSelectedQuestions(selectAccessibilityScenarios({ seed: result.room.code, count: 4 }).scenarioIds); latestRoomVersion.current = result.room.version; setArenaState({ room: result.room, round: null, teams: [], scores: [] }); setTeams([]); });
  const joinBackendRoom = () => runRequest(async () => { if (!isValidRoomCode(code)) throw new ArenaApiError("invalid_room_code"); const result = await joinRoom(code, joinName.trim()); const canonicalUrl = buildJoinUrl(window.location.origin, result.identity.roomCode); if (canonicalUrl) window.history.replaceState(null, "", canonicalUrl); setIdentity(result.identity); setJoined(true); const state = await getArenaState(result.identity); latestRoomVersion.current = state.room.version; setArenaState(state); setTeams(teamsFromState(state)); });
  const manage = (action: "lock" | "reopen" | "end_round" | "end" | "revoke_team", teamId?: string) => runRequest(async () => { if (!identity || identity.role !== "mc") return; await manageRoom(identity, action, teamId); const state = await getArenaState(identity); latestRoomVersion.current = state.room.version; setArenaState(state); setTeams(teamsFromState(state)); setRoundLocked(state.room.status !== "lobby"); });
  const launch = (game: GameId) => runRequest(async () => { if (standaloneMode) { onStartGame(game); return; } if (!identity || identity.role !== "mc") throw new Error("forbidden"); const config = game === "accessibility" ? { scenarioIds: selectedQuestions } : { levelIds: selectedLevels }; await startRound(identity, game, config); const state = await getArenaState(identity); latestRoomVersion.current = state.room.version; setArenaState(state); setTeams(teamsFromState(state)); setRoundLocked(true); });

  const copyJoinLink = async () => {
    if (!joinUrl) return;
    sound.playClick();
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setRequestError("Không thể sao chép tự động. Hãy sao chép liên kết hiển thị bên dưới mã phòng.");
    }
  };

  const addTeam = () => {
    const clean = newTeam.trim();
    if (!clean || teams.length >= 8) return;
    sound.playClick();
    const colors = ["#ff765d", "#8b7bff", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];
    setTeams((curr) => [
      ...curr,
      {
        id: `team-${Date.now()}`,
        name: clean,
        color: colors[curr.length % colors.length],
        score: 0,
        joinedAt: Date.now(),
      },
    ]);
    setNewTeam("");
  };

  const adjustScore = (teamId: string, delta: number) => {
    if (!standaloneMode) return;
    sound.playClick();
    setTeams((curr) =>
      curr.map((t) => (t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t))
    );
  };

  const removeTeam = (teamId: string) => {
    sound.playClick();
    setTeams((curr) => curr.filter((t) => t.id !== teamId));
  };

  const resetAllScores = () => {
    if (!standaloneMode) return;
    sound.playClick();
    setTeams((curr) => curr.map((t) => ({ ...t, score: 0 })));
  };

  return (
    <div className="page-content workshop-page">
      <div className="workshop-heading-enhanced">
        <div>
          <div className="eyebrow accent">{activeTab === "join" ? "THAM GIA CÙNG ĐỘI CỦA BẠN" : "BẢN ĐIỀU PHỐI WORKSHOP DÀNH CHO MC"}</div>
          <h1>{activeTab === "join" ? "Tham gia workshop" : "Workshop Arena"}</h1>
          <p>
            {activeTab === "join" ? "Kiểm tra mã phòng, nhập tên đội và chờ MC bắt đầu." : "Mở phòng chơi, phát mã QR trên màn hình chiếu và dẫn dắt 6–8 đội tranh tài trong không khí sôi nổi, vừa học vừa chơi."}
          </p>
        </div>

        <div className="workshop-mode-badge">
          <span className="online-dot" />
          <span>{standaloneMode ? "Standalone · dữ liệu diễn tập" : connection === "online" ? "Backend đã kết nối · polling 5 giây" : connection === "offline" ? "Đang offline · chờ kết nối lại" : connection === "error" ? "Backend đang lỗi" : "Chưa kết nối phòng"}</span>
        </div>
      </div>

      {arenaState && <WorkshopRoundSummary state={arenaState} />}

      {/* Tabs */}
      <div className="workshop-tabs-enhanced">
        <button
          type="button"
          className={`workshop-tab-btn ${activeTab === "control" ? "is-active" : ""}`}
          onClick={() => setActiveTab("control")}
        >
          <Activity size={17} /> Bảng điều khiển MC
        </button>
        <button
          type="button"
          className={`workshop-tab-btn ${activeTab === "join" ? "is-active" : ""}`}
          onClick={() => setActiveTab("join")}
        >
          <QrCode size={17} /> Màn hình Người chơi (Join)
        </button>
      </div>

      {activeTab === "control" ? (
        <div className="workshop-layout-enhanced">
          {/* Room QR Card */}
          <div className="room-card-enhanced panel">
            <div className="room-card-top">
              <div>
                <span className="eyebrow accent">MÃ PHÒNG (ROOM CODE)</span>
                <h2 className="room-code-display">{code}</h2>
                <span className="room-url-hint">
                  {joinUrl ?? "Tạo phòng để lấy liên kết tham gia"}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  sound.playClick();
                  if (standaloneMode) setCode(makeRoomCode());
                  else void createBackendRoom();
                }}
                title={standaloneMode ? "Tạo mã diễn tập mới" : "Tạo phòng workshop mới"}
                disabled={busy}
              >
                <RotateCcw size={18} />
              </button>
            </div>
            {!standaloneMode && !identity && <button type="button" className="button button-primary" disabled={busy} onClick={() => void createBackendRoom()}><Plus size={16} /> Tạo phòng workshop</button>}

            <div className="qr-container-enhanced">
              <div className="qr-image-box">
                {qr ? (
                  <img src={qr} alt={`Mã QR phòng ${code}`} className="qr-img" />
                ) : (
                  <QrCode size={80} className="text-slate-400" />
                )}
              </div>

              <div className="qr-instructions">
                <strong>Quét mã QR để tham gia</strong>
                <p>Không cần đăng ký tài khoản. Người chơi chỉ cần quét camera điện thoại là vào ngay.</p>

                <div className="qr-button-row">
                  <button type="button" className="button button-ghost btn-copy" onClick={() => void copyJoinLink()} disabled={!joinUrl}>
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? "Đã sao chép link!" : "Sao chép liên kết"}
                  </button>

                  <button
                    type="button"
                    className="button button-ghost btn-fullscreen-qr"
                    onClick={() => setShowQrModal(true)}
                    disabled={!joinUrl}
                    title="Mở to mã QR toàn màn hình để chiếu máy chiếu"
                  >
                    <Maximize2 size={14} /> Chiếu to
                  </button>
                </div>
              </div>
            </div>

            <div className="workshop-config panel" aria-label="Cấu hình round workshop">
              <div className="panel-header-enhanced"><div><span className="eyebrow accent">CẤU HÌNH ROUND</span><h3>SAYNTAX Workshop 2026</h3></div><span className="status-chip">{roundLocked ? "Đã khóa" : "Đang chỉnh sửa"}</span></div>
              <div className="workshop-config-grid">
                <label>Game 1 · Bộ câu hỏi
                  <select value={questionMode} disabled={roundLocked} onChange={(e) => { const mode = e.target.value as "random" | "manual"; setQuestionMode(mode); if (mode === "random") setSelectedQuestions(selectAccessibilityScenarios({ seed: code, count: 4 }).scenarioIds); }}>
                    <option value="random">Random 4 câu (tối đa 400 XP)</option><option value="manual">Tự chọn câu hỏi</option>
                  </select>
                </label>
                {questionMode === "manual" && <div className="config-checklist">{accessibilityScenarios.map((scenario) => <label key={scenario.id}><input type="checkbox" disabled={roundLocked || (!selectedQuestions.includes(scenario.id) && selectedQuestions.length >= 4)} checked={selectedQuestions.includes(scenario.id)} onChange={() => setSelectedQuestions((items) => items.includes(scenario.id) ? items.filter((id) => id !== scenario.id) : [...items, scenario.id])} /> {scenario.code} · {scenario.title}</label>)}</div>}
                <label>Game 2 · 3 màn curated
                  <select disabled={roundLocked} value={selectedLevels.join(",")} onChange={(e) => setSelectedLevels(e.target.value.split(",").map(Number))}>{["1,2,3","4,5,6","7,8,9"].map((value) => <option key={value} value={value}>{value === "1,2,3" ? "Beginner · 3 màn" : value === "4,5,6" ? "Explorer · 3 màn" : "Master · 3 màn"}</option>)}</select>
                </label>
              </div>
              <div className="config-summary">Câu hỏi: {selectedQuestions.length}/4 · Robot: {selectedLevels.map((id) => `L${id} (${robotLevels[id - 1]?.par ?? "—"})`).join(" · ")} · Không tính tốc độ</div>
              <button type="button" className="button button-primary" disabled={busy || (!standaloneMode && (!identity || identity.role !== "mc" || arenaState?.room.status === "running" || arenaState?.room.status === "completed"))} onClick={() => { if (standaloneMode) setRoundLocked((locked) => !locked); else void manage(roundLocked ? "reopen" : "lock"); }}><LockKeyhole size={15} /> {roundLocked ? "Mở lại phòng chờ" : "Khóa phòng và cấu hình"}</button>
            </div>

            <div className="room-quick-launch">
              <span className="launcher-title">Bắt đầu game cho cả phòng:</span>
              <div className="launcher-buttons">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void launch("accessibility")}
                  disabled={busy || (!standaloneMode && arenaState?.room.status !== "locked")}
                >
                  <Sparkles size={16} /> Chơi Accessibility Unlock
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => void launch("robot")}
                  disabled={busy || (!standaloneMode && arenaState?.room.status !== "locked")}
                >
                  <Play size={16} /> Chơi Robot Commands
                </button>
              </div>
              {!standaloneMode && arenaState?.room.status === "running" && <button type="button" className="button button-ghost" disabled={busy} onClick={() => void manage("end_round")}>Kết thúc game và tổng kết</button>}
              {!standaloneMode && identity?.role === "mc" && <button type="button" className="button button-ghost" disabled={busy || arenaState?.room.status === "completed"} onClick={() => void manage("end")}>Đóng workshop</button>}
              {requestError && <p className="backend-error" role="alert">{requestError}</p>}
            </div>
          </div>

          {/* Teams Roster Panel */}
          <div className="teams-panel-enhanced panel">
            <div className="panel-header-enhanced">
              <div>
                <span className="eyebrow accent">DANH SÁCH ĐỘI ({teams.length}/8)</span>
                <h3>Đội tham gia thi đấu</h3>
              </div>
              <button
                type="button"
                className="text-button text-xs text-slate-500"
                onClick={resetAllScores}
                title="Đặt lại điểm số các đội về 0"
              >
                <RotateCcw size={13} /> Reset điểm
              </button>
            </div>

            <div className="teams-list-scroll">
              {teams.length === 0 ? (
                <div className="empty-teams-hint">Chưa có đội nào. Hãy thêm đội ở bên dưới.</div>
              ) : (
                teams.map((team, idx) => (
                  <div className="team-item-row" key={team.id}>
                    <span className="team-num-badge">{idx + 1}</span>
                    <span className="team-color-dot" style={{ backgroundColor: team.color }}>
                      {team.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="team-name-text">{team.name}</span>

                    <div className="score-adjust-group">
                      <button
                        type="button"
                        className="btn-score-pill btn-plus"
                        onClick={() => adjustScore(team.id, 50)}
                        disabled={!standaloneMode}
                        title="Cộng 50 XP (Demo)"
                      >
                        +50
                      </button>
                      <button
                        type="button"
                        className="btn-score-pill btn-plus"
                        onClick={() => adjustScore(team.id, 100)}
                        disabled={!standaloneMode}
                        title="Cộng 100 XP (Demo)"
                      >
                        +100
                      </button>
                      <button
                        type="button"
                        className="btn-score-remove"
                        onClick={() => standaloneMode ? removeTeam(team.id) : void manage("revoke_team", team.id)}
                        disabled={!standaloneMode && identity?.role !== "mc"}
                        title="Xóa đội"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {standaloneMode && teams.length < 8 && (
              <div className="add-team-row">
                <input
                  type="text"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTeam()}
                  placeholder="Nhập tên đội mới (Enter)..."
                  className="add-team-input"
                />
                <button type="button" className="button button-primary btn-add-team" onClick={addTeam}>
                  <Plus size={16} /> Thêm
                </button>
              </div>
            )}
          </div>

          {/* Realtime Leaderboard */}
          <div className="leaderboard-enhanced panel">
            <div className="panel-header-enhanced">
              <div>
                <span className="eyebrow accent">BẢNG ĐIỂM RIÊNG TỪNG PHIÊN</span>
                <h3>{arenaState?.round ? `Điểm ${gameName(arenaState.round.game)}` : "Top Điểm Số"}</h3>
              </div>
              <span className="badge-live-pulse">
                <span className="pulse-dot" /> {arenaState?.round?.status === "completed" ? "ĐÃ CHỐT" : standaloneMode ? "DEMO" : "LIVE"}
              </span>
            </div>

            <div className="leaderboard-list">
              {sortedTeams.map((team, index) => {
                const maxScore = Math.max(...sortedTeams.map((t) => t.score), 1);
                const percent = Math.max(12, (team.score / maxScore) * 100);

                let rankMedal = null;
                if (index === 0) rankMedal = "🥇";
                else if (index === 1) rankMedal = "🥈";
                else if (index === 2) rankMedal = "🥉";

                return (
                  <div key={team.id} className={`leader-item ${index === 0 ? "is-top-one" : ""}`}>
                    <div className="leader-meta">
                      <span className="leader-rank-icon">{rankMedal ?? `#${index + 1}`}</span>
                      <span className="leader-color-tag" style={{ backgroundColor: team.color }} />
                      <strong className="leader-team-title">{team.name}</strong>
                      <span className="leader-score-value">
                        {team.score.toLocaleString("vi-VN")} <small>XP</small>
                      </span>
                    </div>

                    <div className="leader-progress-track">
                      <div
                        className="leader-progress-fill"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: team.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Player Join Screen Preview */
        <div className="join-preview-enhanced panel">
          <div className="join-phone-mockup">
            <div className="phone-notch">
              <span className="notch-speaker" />
              <span className="notch-camera" />
            </div>

            <div className="phone-screen-content">
              <div className="join-phone-header">
                <span className="eyebrow accent">MỜI THAM GIA THI ĐẤU</span>
                <h2>SAYNTAX Game Arena</h2>
                <p>Nhập tên đội của bạn để bắt đầu tranh tài cùng cả phòng.</p>
              </div>

              {joined ? (
                <div className="join-welcome-card">
                  <div className="welcome-check-circle">
                    <Check size={28} />
                  </div>
                  <h3>Đã vào phòng thành công!</h3>
                  <p>
                    Đội: <strong>{joinName}</strong>
                  </p>
                  <span className="room-badge">MÃ PHÒNG: {code}</span>

                  <div className="join-ready-actions">
                    {standaloneMode ? <>
                      <button type="button" className="button button-primary w-full" onClick={() => onStartGame("accessibility")}>Bắt đầu Accessibility Unlock</button>
                      <button type="button" className="button button-ghost w-full mt-2" onClick={() => onStartGame("robot")}>Bắt đầu Robot Commands</button>
                    </> : arenaState?.round?.status === "running" && identity ? (
                      <button type="button" className="button button-primary w-full" onClick={() => onStartGame(arenaState.round!.game, identity, arenaState)}>Vào {arenaState.round.game === "accessibility" ? "Accessibility Unlock" : "Robot Commands"}</button>
                    ) : <p>Đã vào phòng. Hãy chờ MC bắt đầu phiên game tiếp theo.</p>}
                  </div>
                </div>
              ) : (
                <form className="join-form-box" onSubmit={(event) => {
                  event.preventDefault();
                  if (busy || codeError || joinName.trim().length < 2) return;
                  if (standaloneMode) {
                    if (teams.length >= 8) { setRequestError(workshopErrorMessage("room_team_limit_reached")); return; }
                    sound.playSuccess();
                    setTeams((curr) => [...curr, { id: `team-${Date.now()}`, name: joinName.trim(), color: "#8b7bff", score: 0, joinedAt: Date.now() }]);
                    setJoined(true);
                  } else void joinBackendRoom();
                }}>
                  <label htmlFor="join-code-input" className="join-label">Mã phòng:</label>
                  <input
                    id="join-code-input"
                    className="join-input-field"
                    value={code}
                    onChange={(event) => { setCode(normalizeRoomCode(event.target.value)); setRequestError(null); }}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={6}
                    required
                    aria-invalid={Boolean(codeError)}
                    aria-describedby={codeError ? "join-code-error" : undefined}
                  />
                  {codeError && <p id="join-code-error" className="backend-error" role="alert">{codeError}</p>}
                  <label htmlFor="join-name-input" className="join-label">
                    Tên đội của bạn:
                  </label>
                  <input
                    id="join-name-input"
                    type="text"
                    minLength={2}
                    maxLength={40}
                    required
                    autoComplete="off"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Ví dụ: Byte Bạn Bè, Pixel Pro..."
                    className="join-input-field"
                  />

                  <button
                    type="submit"
                    className="button button-primary w-full btn-join-submit"
                    disabled={busy || joinName.trim().length < 2 || Boolean(codeError)}
                  >
                    Vào phòng thi đấu <ArrowRight size={16} />
                  </button>

                  <div className="join-room-tag">
                    Mã phòng: <strong>{code}</strong>
                  </div>
                </form>
              )}
              {requestError && <p className="backend-error" role="alert">{requestError}</p>}
            </div>
          </div>

          <div className="join-preview-guide">
            <span className="eyebrow accent">TRẢI NGHIỆM THI ĐẤU KHÔNG RÀO CẢN</span>
            <h2>Trải nghiệm cho người tham gia</h2>
            <p>
              Được thiết kế tối ưu trên mọi màn hình điện thoại, từ thiết bị cao cấp đến máy cũ. Tải cực nhanh, giao diện thân thiện, không đòi hỏi đăng ký email.
            </p>

            <div className="feature-check-list">
              <div className="feature-check-item">
                <Check size={16} className="text-emerald-600" />
                <span>Không cần tạo tài khoản hoặc tải app</span>
              </div>
              <div className="feature-check-item">
                <Check size={16} className="text-emerald-600" />
                <span>Cập nhật điểm số tự động thời gian thực</span>
              </div>
              <div className="feature-check-item">
                <Check size={16} className="text-emerald-600" />
                <span>Hoạt động mượt mà kể cả khi mạng chập chờn</span>
              </div>
            </div>

            <button
              type="button"
              className="button button-ghost"
              onClick={() => setActiveTab("control")}
            >
              <ArrowLeft size={16} /> Trở về bảng điều phối MC
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen QR Modal */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-qr-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="icon-button modal-close-btn"
              onClick={() => setShowQrModal(false)}
            >
              <X size={22} />
            </button>
            <span className="eyebrow accent text-center">CHIẾU MÀN HÌNH WORKSHOP</span>
            <h2 className="modal-room-code">{code}</h2>
            <p className="modal-url-text">{joinUrl}</p>

            {qr && <img src={qr} alt={`QR ${code}`} className="modal-qr-img" />}

            <div className="modal-tip">
              <span>📱 Mở camera điện thoại quét để tham gia ngay!</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
