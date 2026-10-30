import { useState } from "react";
import { sound } from "../lib/audio";

// Deliberately inaccessible examples stay inside the labelled learning preview.
// Surrounding controls and explanatory feedback remain accessible.
export function ExtendedAccessibilityDemo({ scenarioId, isFixed }: { scenarioId: string; isFixed: boolean }) {
  const [activated, setActivated] = useState(false);
  const [detail, setDetail] = useState("");
  const [imagesHidden, setImagesHidden] = useState(false);
  const [page, setPage] = useState("Trang chủ");
  const [motionPaused, setMotionPaused] = useState(false);
  const activate = () => setActivated(true);

  return <div className="sim-generic-wrap">
    <div className={`sim-generic-preview ${isFixed ? "is-fixed" : "is-before"}`}>
      <span className="sim-generic-label">{isFixed ? "AFTER · ĐÃ CẢI THIỆN" : "BEFORE · CÒN RÀO CẢN"}</span>
      {scenarioId === "audio" && <>
        <strong>Gửi bài tập</strong>
        <p>Thử gửi bài khi thiết bị tắt tiếng. Bạn có biết bài đã được gửi chưa?</p>
        <button type="button" className="sim-demo-button" onClick={() => { sound.playSuccess(); activate(); }}>Gửi bài mẫu</button>
        {activated && <p role="status">{isFixed ? "✓ Đã gửi bài thành công. Bạn có thể tiếp tục bài tiếp theo." : "Mô phỏng: hệ thống chỉ phát tiếng báo, không hiển thị xác nhận gửi bài. Nếu tắt tiếng, bạn sẽ bỏ lỡ phản hồi."}</p>}
      </>}
      {scenarioId === "touch" && <>
        <strong>Chọn thao tác cho tài liệu</strong>
        <p>{isFixed ? "Nút lớn và cách nhau giúp giảm bấm nhầm." : "Các nút nhỏ, sát nhau khiến thao tác chạm khó chính xác."}</p>
        <div className={`sim-targets ${isFixed ? "large" : "small"}`}>
          {["Mở", "Lưu", "Xóa"].map((label) => <button type="button" key={label} onClick={() => setDetail(`Bạn vừa chọn: ${label}. Đây là tài liệu mẫu; không có dữ liệu bị xóa.`)}>{label}</button>)}
        </div>
        <p role="status">{detail}</p>
      </>}
      {scenarioId === "color" && <>
        <strong>Trạng thái bài nộp</strong>
        <p>Chọn một trạng thái để kiểm tra ý nghĩa.</p>
        <div className="sim-demo-row">{["Đã nộp", "Cần bổ sung"].map((label, index) => <button type="button" className="sim-demo-button" key={label} aria-label={isFixed ? label : `Màu trạng thái ${index + 1}`} onClick={() => setDetail(isFixed ? `${label}: ý nghĩa có cả nhãn và ký hiệu.` : "Chỉ có màu; người không phân biệt được màu sẽ không biết ý nghĩa.")}>
          <span className="sim-status-dot" style={{ background: index ? "#d12d54" : "#157347" }} />{isFixed && `${index ? "!" : "✓"} ${label}`}
        </button>)}</div><p role="status">{detail}</p>
      </>}
      {scenarioId === "time" && <>
        <strong>Phiên điền thông tin sắp hết hạn</strong>
        <p>{activated ? (isFixed ? "Đã gia hạn thêm 5 phút. Thông tin của bạn được giữ lại." : "Phiên mẫu đã hết hạn mà không có cách gia hạn.") : "Còn 20 giây (mô phỏng, không có đồng hồ ép thời gian)."}</p>
        <button type="button" className="sim-demo-button" onClick={activate}>{isFixed ? "Gia hạn thêm 5 phút" : "Mô phỏng hết thời gian"}</button>
      </>}
      {scenarioId === "motion" && <>
        <strong>Thông báo chuyển động</strong>
        <div className={`sim-motion-track ${isFixed || motionPaused ? "paused" : ""}`}><span>Ưu đãi workshop</span></div>
        <p>{isFixed ? "Nội dung đứng yên, vẫn truyền tải đủ thông tin." : "Chuyển động lặp có thể gây mất tập trung. Demo cũng tôn trọng cài đặt giảm chuyển động trên thiết bị."}</p>
        <button type="button" className="sim-demo-button" onClick={() => setMotionPaused((value) => !value)}>{motionPaused ? "Tiếp tục demo" : "Dừng chuyển động"}</button>
      </>}
      {scenarioId === "alt" && <>
        <strong>Địa điểm workshop</strong>
        <button type="button" className="sim-demo-button" aria-pressed={imagesHidden} onClick={() => setImagesHidden((value) => !value)}>{imagesHidden ? "Hiện hình ảnh" : "Thử khi không thấy ảnh"}</button>
        {!imagesHidden ? <svg role="img" aria-label={isFixed ? "Workshop tại phòng A201, tầng 2, lối vào có thang máy." : "image123.png"} viewBox="0 0 280 100"><rect width="280" height="100" fill="#c4f4ec" /><text x="12" y="42" fontSize="16">Workshop · Phòng A201</text><text x="12" y="72" fontSize="14">Tầng 2 · Có thang máy</text></svg> : <p role="status">{isFixed ? "Văn bản thay thế: Workshop tại phòng A201, tầng 2, lối vào có thang máy." : "image123.png — tên tệp không cho biết địa điểm."}</p>}
      </>}
      {scenarioId === "plain" && <>
        <strong>Hướng dẫn đăng ký</strong>
        <p>{isFixed ? "Nhập email rồi nhấn Xác nhận. Chúng tôi sẽ gửi vé đến email của bạn." : "Khởi tạo định danh liên lạc điện tử để tiến hành xác thực và provisioning quyền tham dự."}</p>
        <button type="button" className="sim-demo-button" onClick={activate}>Đọc và thử làm theo</button>
        {activated && <p role="status">{isFixed ? "Bước 1: Nhập email của bạn. Bước 2: Nhấn Xác nhận." : "Bạn có tìm được ngay cần nhập thông tin gì và nhấn nút nào không?"}</p>}
      </>}
      {scenarioId === "navigation" && <>
        <strong>Trang đang xem: {page}</strong>
        <nav className="sim-demo-row" aria-label="Điều hướng mẫu">{(isFixed || page === "Trang chủ" ? ["Trang chủ", "Khóa học", "Trợ giúp"] : ["Trợ giúp", "Trang chủ", "Khóa học"]).map((label) => <button type="button" className="sim-demo-button" key={label} aria-current={page === label ? "page" : undefined} onClick={() => { setPage(label); activate(); }}>{label}</button>)}</nav>
        {activated && <p role="status">{isFixed ? "Thứ tự menu giữ nguyên khi đổi trang." : "Menu đã đổi thứ tự khi chuyển trang, khiến bạn phải tìm lại."}</p>}
      </>}
    </div>
    <p className="sim-helper-box">Đây là ví dụ tương tác để quan sát rào cản. Thao tác trong demo không cộng điểm; chọn đáp án ở bên cạnh để tiếp tục.</p>
  </div>;
}
