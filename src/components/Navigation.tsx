import { useState } from "react";
import {
  Activity,
  ChevronRight,
  CircleHelp,
  Code2,
  Menu,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
  Keyboard,
} from "lucide-react";
import { standaloneMode } from "../lib/workshop";
import { sound } from "../lib/audio";
import type { GameId } from "../types";

export type View = "home" | GameId | "workshop";

interface NavigationProps {
  view: View;
  setView: (view: View) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`} aria-label="SAYNTAX Game Arena">
      <img
        className="brand-image"
        src={compact ? "/brand/sayntax-v2-icon-only.png" : "/brand/sayntax-v2-primary-horizontal.png"}
        alt="SAYNTAX"
        onError={(e) => {
          // If image fails, graceful text fallback
          (e.target as HTMLElement).style.display = "none";
        }}
      />
      <span className="brand-fallback-text">SAYNTAX</span>
    </div>
  );
}

export function Sidebar({
  view,
  setView,
  menuOpen,
  setMenuOpen,
}: NavigationProps) {
  const navItems = [
    { id: "home" as View, icon: Activity, label: "Tổng quan", tag: "" },
    { id: "accessibility" as View, icon: Sparkles, label: "Accessibility Unlock", tag: "01" },
    { id: "robot" as View, icon: Code2, label: "Robot Commands", tag: "02" },
    { id: "workshop" as View, icon: Users, label: "Workshop mode", tag: "LIVE" },
  ];

  return (
    <>
      <div
        className={`sidebar-overlay ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            type="button"
            className="icon-button mobile-only"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">
          <span>KHÔNG GIAN HỌC</span>
          <span className="online-dot" />
          <span>{standaloneMode ? "Offline/Rehearsal" : "Online Room"}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          <a className="nav-item" href="/competition">
            <Users size={18} />
            <span>Cuộc thi hai giai đoạn</span>
            <span className="nav-tag live-tag">MC</span>
          </a>
          {navItems.map(({ id, icon: Icon, label, tag }) => {
            const isActive = view === id;
            return (
              <button
                key={id}
                type="button"
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  sound.playClick();
                  setView(id);
                  setMenuOpen(false);
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
                {tag && (
                  <span className={`nav-tag ${tag === "LIVE" ? "live-tag" : ""}`}>
                    {tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-tip-card">
          <div className="tip-icon-wrap">
            <CircleHelp size={18} />
          </div>
          <div>
            <strong>Mẹo tổ chức lớp:</strong>
            <p>Mở Cuộc thi hai giai đoạn để điều phối Accessibility và Robot cho cùng tám đội.</p>
          </div>
        </div>

        <div className="profile-card">
          <div className="avatar-chip">MC</div>
          <div className="profile-info">
            <strong>Người điều phối</strong>
            <span>SAYNTAX Arena 2026</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Topbar({
  view,
  toggleMenu,
}: {
  view: View;
  toggleMenu: () => void;
}) {
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const toggleSound = () => {
    sound.enabled = !soundEnabled;
    setSoundEnabled(sound.enabled);
    if (sound.enabled) sound.playClick();
  };

  const getBreadcrumbTitle = () => {
    switch (view) {
      case "home":
        return "Tổng quan";
      case "accessibility":
        return "Accessibility Unlock";
      case "robot":
        return "Robot Commands";
      case "workshop":
        return "Workshop mode";
    }
  };

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="icon-button mobile-only"
          onClick={toggleMenu}
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>

        <div className="mobile-brand">
          <Brand compact />
        </div>

        <div className="breadcrumbs">
          <span>ARENA</span>
          <ChevronRight size={14} />
          <strong>{getBreadcrumbTitle()}</strong>
        </div>

        <div className="top-actions">
          <button
            type="button"
            className="icon-button top-sound-btn"
            onClick={toggleSound}
            title={soundEnabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
            aria-label="Chuyển đổi âm thanh"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-slate-400" />}
          </button>

          <span className={`connection ${standaloneMode ? "connection-local" : "connection-realtime"}`}>
            <span className="online-dot" />
            <span>{standaloneMode ? "Standalone" : "Workshop API"}</span>
          </span>

          <button
            type="button"
            className="icon-button top-help-btn"
            onClick={() => setShowHelpModal(true)}
            aria-label="Hướng dẫn sử dụng và phím tắt"
            title="Xem phím tắt và hướng dẫn"
          >
            <CircleHelp size={18} />
          </button>

          <div className="small-avatar" title="Người điều phối workshop">
            MC
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-help-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-help-header">
              <div className="flex items-center gap-2">
                <Keyboard size={20} className="text-indigo-600" />
                <h3>Hướng dẫn thao tác & Phím tắt</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowHelpModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-help-body">
              <div className="help-section">
                <h4>🎯 Game 01: Accessibility Unlock</h4>
                <ul className="help-list">
                  <li><strong>1, 2, 3 hoặc A, B, C:</strong> Chọn phương án giải pháp.</li>
                  <li><strong>Enter:</strong> Tiếp tục sang câu hỏi tiếp theo.</li>
                  <li><strong>R:</strong> Thử chọn lại câu hiện tại khi chọn nhầm.</li>
                </ul>
              </div>

              <div className="help-section">
                <h4>🤖 Game 02: Robot Commands</h4>
                <ul className="help-list">
                  <li><strong>F hoặc Phím Mũi tên Lên:</strong> Thêm lệnh Đi thẳng (Forward).</li>
                  <li><strong>L hoặc Phím Mũi tên Trái:</strong> Thêm lệnh Rẽ trái (Left).</li>
                  <li><strong>R hoặc Phím Mũi tên Phải:</strong> Thêm lệnh Rẽ phải (Right).</li>
                  <li><strong>Backspace:</strong> Xóa lệnh vừa thêm gần nhất.</li>
                  <li><strong>Phím Cách (Space) / Enter:</strong> Chạy toàn bộ chương trình.</li>
                  <li><strong>S:</strong> Bước tiếp từng lệnh một (Step debug).</li>
                </ul>
              </div>

              <div className="help-section">
                <h4>👥 Chế độ Workshop</h4>
                <p className="text-sm text-slate-600">
                  MC có thể chiếu mã QR lên màn hình lớn. Người chơi dùng camera quét trực tiếp trên điện thoại để thi đua cùng nhau mà không cần cài đặt gì.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
