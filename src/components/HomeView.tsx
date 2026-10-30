import { motion } from "motion/react";
import {
  ArrowRight,
  Code2,
  ExternalLink,
  Keyboard,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { GameId } from "../types";

interface HomeViewProps {
  onSelectGame: (gameId: GameId) => void;
  onOpenWorkshop: () => void;
}

export function HomeView({ onSelectGame, onOpenWorkshop }: HomeViewProps) {
  return (
    <div className="page-content home-page">
      <a className="button button-primary competition-entry" href="/competition">Tổ chức cuộc thi hai giai đoạn →</a>
      {/* Hero Block */}
      <section className="hero-block-enhanced">
        <div className="hero-copy-enhanced">
          <div className="eyebrow accent">
            <span className="eyebrow-line" /> PHÒNG THỰC HÀNH KỸ NĂNG SỐ TƯƠNG TÁC
          </div>
          <h1>
            Chơi để <span>thấu hiểu</span>,<br />
            Lập trình để <span>sáng tạo</span>.
          </h1>
          <p>
            Hai mini-game độc đáo, tích hợp sẵn chế độ workshop cho lớp học. Trải nghiệm cách thiết kế giao diện tiếp cận (A11y) và rèn luyện tư duy thuật toán trực quan.
          </p>

          <div className="hero-actions-enhanced">
            <button
              type="button"
              className="button button-primary"
              onClick={() => onSelectGame("accessibility")}
            >
              <Sparkles size={17} /> Chơi Accessibility Unlock <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => onSelectGame("robot")}
            >
              <Code2 size={17} /> Chơi Robot Commands
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={onOpenWorkshop}
            >
              <Users size={17} /> Mở Workshop cả lớp
            </button>
          </div>

          <div className="hero-meta-enhanced">
            <span>
              <span className="online-dot" /> Miễn phí & Không cần đăng ký
            </span>
            <span>·</span>
            <span>Giao diện Tiếng Việt thân thiện</span>
            <span>·</span>
            <span>Hỗ trợ cả máy tính & điện thoại</span>
          </div>
        </div>

        <div className="hero-art-enhanced" aria-hidden="true">
          <div className="art-card-floating card-1">
            <div className="floating-badge">ACCESSIBILITY</div>
            <div className="floating-stat">4.5:1</div>
            <span className="floating-caption">Tương phản đạt chuẩn</span>
          </div>

          <div className="art-card-floating card-2">
            <div className="floating-code">
              <code>if (everyone_included) &#123;</code>
              <code>&nbsp;&nbsp;build_better_future();</code>
              <code>&#125;</code>
            </div>
          </div>

          <div className="art-sticker-pulse">
            <span>SAYNTAX<br /><strong>ARENA</strong></span>
          </div>
        </div>
      </section>

      {/* Choose your challenge */}
      <section className="section-heading-enhanced">
        <div>
          <div className="eyebrow accent">THỬ THÁCH DÀNH CHO BẠN</div>
          <h2>Hai tựa game. Hai phong cách học.</h2>
        </div>
      </section>

      <div className="game-grid-enhanced">
        {/* Game 1 Card */}
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          className="game-card-enhanced tone-coral"
          onClick={() => onSelectGame("accessibility")}
        >
          <div className="game-card-header">
            <span className="game-tag-num">GAME 01</span>
            <span className="game-time-tag">~5 phút · 4 bài học</span>
          </div>

          <div className="game-card-icon-wrap icon-sparkles">
            <Sparkles size={28} />
          </div>

          <h3>Accessibility Unlock</h3>
          <p>
            Nhìn giao diện qua góc nhìn của người dùng khuyết tật thị giác, vận động, thính giác. Khám phá 4 nguyên tắc vàng để xây dựng sản phẩm ai cũng dùng được.
          </p>

          <div className="game-card-features">
            <span>✓ Mô phỏng chói nắng WCAG</span>
            <span>✓ Tiêu điểm phím Tab</span>
            <span>✓ Phụ đề video</span>
          </div>

          <div className="game-card-cta">
            <span className="cta-text">Khám phá ngay</span>
            <ArrowRight size={16} />
          </div>
        </motion.div>

        {/* Game 2 Card */}
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          className="game-card-enhanced tone-indigo"
          onClick={() => onSelectGame("robot")}
        >
          <div className="game-card-header">
            <span className="game-tag-num">GAME 02</span>
            <span className="game-time-tag">~8 phút · 3 màn chơi</span>
          </div>

          <div className="game-card-icon-wrap icon-code">
            <Code2 size={28} />
          </div>

          <h3>Robot Commands</h3>
          <p>
            Xếp chuỗi câu lệnh (Đi thẳng, Rẽ trái, Rẽ phải) để đưa robot vượt qua mê cung vật cản về đích an toàn. Tối ưu thuật toán để đạt Par Score.
          </p>

          <div className="game-card-features">
            <span>✓ Robot xoay hướng trực quan</span>
            <span>✓ Chạy từng bước (Step Debug)</span>
            <span>✓ Thử thách par score</span>
          </div>

          <div className="game-card-cta">
            <span className="cta-text">Lập trình ngay</span>
            <ArrowRight size={16} />
          </div>
        </motion.div>
      </div>

      {/* Workshop Callout */}
      <section className="workshop-callout-panel panel">
        <div className="callout-icon-box">
          <Users size={32} />
        </div>
        <div className="callout-content">
          <div className="eyebrow accent">DÀNH CHO GIẢNG VIÊN & ĐIỀU PHỐI VIÊN</div>
          <h3>Bạn muốn tổ chức thi đấu cho cả lớp?</h3>
          <p>
            Bật chế độ Workshop để mở phòng thi đấu, tạo mã QR chiếu lên máy chiếu. Các đội quét mã từ điện thoại để tham gia và xem bảng xếp hạng nhảy điểm trực tiếp!
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={onOpenWorkshop}
          >
            Mở bảng điều phối Workshop <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
