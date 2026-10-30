import type { ArenaState } from "../types";
import { roundResults } from "../lib/roundResults";

export function WorkshopRoundSummary({ state }: { state: ArenaState }) {
  const result = roundResults(state);
  if (!result || (!result.completed && !result.interrupted)) return null;
  return <section className="workshop-round-summary panel" aria-label={`Tổng kết ${result.title}`}>
    <div className="panel-header-enhanced">
      <div><span className="eyebrow accent">{result.interrupted ? "PHIÊN ĐÃ GIÁN ĐOẠN" : "PHIÊN ĐÃ KẾT THÚC"}</span><h2>Tổng kết {result.title}</h2></div>
      <span className="status-chip">Tối đa {result.maximum} XP / đội</span>
    </div>
    <p>Điểm của phiên {result.title} được tính riêng. Các đội giữ nguyên mã phòng để chờ MC mở phiên tiếp theo.</p>
    <div className="round-results-scroll"><table className="round-results-table">
      <caption>Bảng điểm được máy chủ xác minh · {result.title}</caption>
      <thead><tr><th scope="col">Hạng</th><th scope="col">Đội</th><th scope="col">Điểm phiên</th></tr></thead>
      <tbody>{result.teams.map((team) => <tr key={team.id}><td>{team.rank}</td><th scope="row">{team.name}</th><td>{team.score.toLocaleString("vi-VN")} XP</td></tr>)}</tbody>
    </table></div>
    {!result.teams.length && <p>Chưa có đội tham gia phiên này.</p>}
  </section>;
}
