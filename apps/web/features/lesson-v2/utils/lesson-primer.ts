export const LESSON_PRIMERS: Record<string, { concept: string; purpose: string; example: string; goal: string }> = {
  "start-and-sequence-v2": {
    concept: "Chương trình là tập hợp các chỉ dẫn để máy tính biết phải làm gì — giống như hướng dẫn từng bước cho một người thực hiện công việc.",
    purpose: "Mọi chương trình đều cần điểm Bắt đầu, rồi nối tiếp các khối lệnh theo thứ tự. Khối In giúp hiển thị một dòng chữ ra màn hình.",
    example: 'Bắt đầu → In "Xin chào" → khi chạy, màn hình hiển thị: Xin chào',
    goal: "Bạn sẽ tạo khối Bắt đầu, thêm khối In và chạy chương trình đầu tiên của mình.",
  },
  "print-output-v2": {
    concept: "Máy tính thực hiện lần lượt từng lệnh từ trên xuống dưới. Lệnh ở trên chạy trước, lệnh ở dưới chạy sau.",
    purpose: "Thứ tự các khối In quyết định thứ tự các dòng chữ xuất hiện trên màn hình — đổi thứ tự khối là đổi kết quả.",
    example: 'In "Xin chào" → In "Bạn làm được!" → kết quả: Xin chào / Bạn làm được!',
    goal: "Bạn sẽ đặt hai khối In đúng thứ tự và quan sát kết quả thay đổi khi hoán đổi chúng.",
  },
  "repeat-loops-v2": {
    concept: "Vòng lặp giúp thực hiện cùng một hành động nhiều lần mà không cần lặp lại lệnh. Đặt lệnh vào trong khối Lặp — máy tính sẽ tự lặp lại.",
    purpose: "Thay vì viết In 5 lần, bạn chỉ cần Lặp 5 lần → In một lần bên trong. Chương trình ngắn hơn, gọn hơn.",
    example: 'Lặp 3 lần { In "Cố lên!" } → kết quả: Cố lên! / Cố lên! / Cố lên!',
    goal: "Bạn sẽ đặt khối In vào trong khối Lặp, đặt số lần lặp và chạy thử.",
  },
  "if-basics-v2": {
    concept: "Điều kiện giúp chương trình tự quyết định: nếu điều kiện đúng thì làm, nếu không thì bỏ qua. Đây là cách máy tính 'suy nghĩ'.",
    purpose: "Lệnh bên trong khối Nếu chỉ chạy khi điều kiện là đúng (true). Khi điều kiện sai, khối đó bị bỏ qua hoàn toàn.",
    example: 'Nếu (đúng) thì { In "Sẵn sàng!" } → kết quả: Sẵn sàng!',
    goal: "Bạn sẽ đặt một khối điều kiện, gán giá trị true/false và quan sát khi nào lệnh bên trong được thực hiện.",
  },
  "variables-basics-v2": {
    concept: "Biến là một ô nhớ có tên, dùng để lưu một giá trị và sử dụng lại nhiều lần. Giá trị có thể thay đổi được trong suốt chương trình.",
    purpose: "Thay vì viết trực tiếp một con số, bạn đặt vào biến rồi dùng tên biến đó ở bất kỳ đâu — thay đổi một nơi, cập nhật khắp nơi.",
    example: "diem = 5 → In diem → kết quả: 5. Đổi diem = 10 → In diem → kết quả: 10",
    goal: "Bạn sẽ tạo biến, gán giá trị cho biến và in giá trị đó ra màn hình.",
  },
};
