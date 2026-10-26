export type PrimerVisual = "program" | "block" | "roles" | "sequence" | "create-run" | "output-order" | "repeat" | "condition" | "variable";

export interface PrimerSection {
  id: string;
  title: string;
  explanation: string[];
  example: string;
  practice: string;
  visual?: PrimerVisual;
  takeaway?: string;
  program?: { blocks: string[]; output: string[] };
  steps?: { task: string; voice: string; drag: string }[];
}

export interface LessonPrimer {
  concept: string;
  purpose: string;
  example: string;
  goal: string;
  sections?: PrimerSection[];
  visual?: PrimerVisual;
  takeaway?: string;
}

export const LESSON_PRIMERS: Record<string, LessonPrimer> = {
  "start-and-sequence-v2": {
    concept: "Chương trình là các chỉ dẫn rõ ràng để máy tính thực hiện một công việc.",
    purpose: "Trong SAYNTAX, bạn ghép khối Bắt đầu với các khối lệnh, rồi chạy để xem máy tính thực hiện chúng.",
    example: 'Bắt đầu → In "Xin chào" → khi chạy, kết quả là: Xin chào',
    goal: "Tạo khối Bắt đầu, thêm khối In, đặt lời chào và chạy chương trình đầu tiên.",
    sections: [
      {
        id: "program",
        visual: "program",
        takeaway: "Trong SAYNTAX, bạn tạo chương trình bằng cách ghép các khối lệnh theo đúng trình tự.",
        title: "Chương trình máy tính là gì?",
        explanation: [
          "Một chương trình là những chỉ dẫn cho máy tính biết phải làm gì. Viết chương trình là chia điều mình muốn làm thành các bước cụ thể mà máy tính có thể thực hiện.",
          "Bạn có thể hình dung một công thức pha nước chanh: cho nước vào cốc, thêm chanh, rồi khuấy. Người làm theo công thức cần biết từng việc và thứ tự của chúng. Máy tính cũng cần chỉ dẫn rõ ràng; nó không tự đoán lời chào hay kết quả mà bạn đang nghĩ tới.",
        ],
        example: "Muốn máy tính hiện một lời chào, ta cần chỉ dẫn: bắt đầu chương trình, rồi hiển thị dòng chữ Xin chào. Chỉ nghĩ đến lời chào chưa tạo ra kết quả trên màn hình.",
        practice: "Trong bài này, bạn sẽ tạo một chương trình chỉ có điểm Bắt đầu và một lệnh In. Một chương trình ngắn như vậy đã đủ để máy tính làm một việc có ý nghĩa: chào bạn.",
      },
      {
        id: "blocks",
        visual: "block",
        title: "Làm quen với khối lệnh và Blockly",
        explanation: [
          "Khối lệnh là một mảnh trực quan biểu diễn một chỉ dẫn hoặc một phần của chương trình. Chữ trên khối cho biết nó dùng để làm gì. Một số khối còn có ô để bạn điền thông tin, chẳng hạn dòng chữ cần hiển thị.",
          "Blockly là công cụ xếp các khối này thành chương trình. Vùng xếp khối là nơi bạn tạo và ghép chúng; vùng kết quả là nơi bạn xem điều xảy ra sau khi chạy. Hai vùng có nhiệm vụ khác nhau: xếp khối là đưa ra chỉ dẫn, xem kết quả là kiểm tra chỉ dẫn ấy đã làm được gì.",
        ],
        example: 'Trong khối In "Xin chào", tên In cho biết hành động cần làm; Xin chào là nội dung bạn muốn máy tính hiển thị. Đổi nội dung trong ô sẽ đổi lời nhắn khi chạy lại.',
        practice: "Bạn có thể kéo khối từ danh sách vào vùng xếp khối, hoặc dùng giọng nói tiếng Việt để tạo cùng một khối. Hai cách này cùng tạo chương trình bằng Blockly; bạn không cần sử dụng chuột khi học bằng giọng nói.",
      },
      {
        id: "start-and-print",
        visual: "roles",
        takeaway: "Bắt đầu đánh dấu điểm khởi động; In tạo dòng chữ để bạn đọc trong vùng kết quả.",
        title: "Khối Bắt đầu và khối In có nhiệm vụ gì?",
        explanation: [
          "Khối Bắt đầu đánh dấu điểm khởi động của chương trình trong SAYNTAX. Hãy đặt nó trước chuỗi lệnh bạn muốn thực hiện. Nó không tự hiển thị lời chào. Nếu thiếu khối này, SAYNTAX sẽ báo chương trình cần có khối bắt đầu khi bạn chạy.",
          "Khối In yêu cầu máy tính hiển thị nội dung ra vùng kết quả trên màn hình. Từ In ở đây không có nghĩa là in ra giấy và bạn không cần máy in. Dòng chữ nhận được sau khi chạy gọi là đầu ra: đó là điều chương trình đưa lại cho bạn quan sát.",
        ],
        example: 'Bắt đầu là điểm khởi động; In "Xin chào" là việc cần làm tiếp theo. Khi chạy hai khối đó, đầu ra là một dòng Xin chào. Chỉ có Bắt đầu thì chưa có lệnh nào yêu cầu hiện chữ.',
        practice: "Ở bước đầu của tab Thực hành, hãy tạo khối Bắt đầu. Sau đó thêm khối In và đặt nội dung cho nó. Bạn sẽ thấy từng khối đảm nhiệm một việc riêng.",
      },
      {
        id: "sequence",
        visual: "sequence",
        title: "Ghép các khối theo trình tự",
        explanation: [
          "Trình tự là thứ tự thực hiện các việc. Với chuỗi lệnh đơn giản trong bài này, bạn đọc các khối từ trên xuống dưới: Bắt đầu ở trên, rồi đến lệnh In. Khối phía trên được thực hiện trước khối phía dưới.",
          "Khi kéo thả, đưa khối In tới chỗ nối bên dưới Bắt đầu và thả để hai khối khớp vào nhau. Đặt hai khối gần nhau trên màn hình chưa có nghĩa là đã ghép chúng. Hãy nhìn đường nối giữa các khối để nhận ra chuỗi lệnh của mình.",
        ],
        example: 'Nếu một chuỗi có In "Xin chào" ở trên và In "Hẹn gặp lại" ở dưới, lời chào xuất hiện trước lời tạm biệt. Đổi thứ tự hai lệnh sẽ đổi thứ tự hai dòng kết quả; bạn sẽ thực hành thêm điều này ở Bài 2.',
        practice: "Trong Bài 1, hãy giữ chuỗi Bắt đầu → In. Khi dùng lệnh thêm khối bằng giọng nói ở các bước này, SAYNTAX hỗ trợ ghép khối mới; bạn có thể quan sát chuỗi để hiểu kết quả của thao tác vừa thực hiện.",
      },
      {
        id: "complete-example",
        title: "Ví dụ: một chương trình chào bạn",
        explanation: [
          "Hãy đọc ví dụ dưới đây như một chỉ dẫn gồm hai phần: khởi động, rồi hiển thị lời chào. Trước khi chạy, ta mới có các khối mô tả công việc. Sau khi chạy, máy tính thực hiện chỉ dẫn và tạo ra dòng kết quả.",
          "Chữ Xin chào trong khối In là nội dung cần hiển thị. Dấu ngoặc kép trong ví dụ giúp bạn nhận ra phần nội dung ấy; kết quả dự kiến bên dưới chỉ có dòng chữ Xin chào. Ví dụ này là hình minh họa, chưa tự tạo hay chạy khối trong bài của bạn.",
        ],
        example: "Đọc từ trên xuống: Bắt đầu → In lời chào. Chọn Chạy thì nhận được một dòng Xin chào trong vùng kết quả.",
        program: { blocks: ["Bắt đầu", 'In "Xin chào"'], output: ["Xin chào"] },
        practice: "Khi tự làm, hãy đối chiếu cả hai phần: các khối của bạn có giống chuỗi minh họa không, và dòng kết quả sau khi chạy có đúng là Xin chào không?",
      },
      {
        id: "create-and-run",
        visual: "create-run",
        takeaway: "Tạo là chuẩn bị chỉ dẫn. Chạy là thực hiện chỉ dẫn để quan sát kết quả. Sửa xong, hãy chạy lại.",
        title: "Tạo chương trình khác gì chạy chương trình?",
        explanation: [
          "Tạo chương trình là thêm khối, nhập nội dung và ghép chúng theo thứ tự. Công việc này giống như viết một công thức. Chạy chương trình là yêu cầu máy tính làm theo các chỉ dẫn đã tạo, giống như thực hiện công thức đó.",
          "Vì vậy, xếp xong khối chưa có nghĩa là chương trình đã chạy. Bạn cần chọn Chạy hoặc nói Chạy chương trình trong tab Thực hành để quan sát đầu ra. Nếu đổi nội dung trong khối In, hãy chạy lại để xem lời nhắn mới.",
        ],
        example: 'Tạo khối In và đặt chữ Xin chào là chuẩn bị chỉ dẫn. Chạy chương trình mới cho bạn kiểm tra rằng kết quả có dòng Xin chào. Nếu đặt chữ Chào bạn rồi chạy lại, bạn sẽ nhận lời nhắn mới.',
        practice: "Nếu kết quả chưa đúng, hãy đọc thông báo, kiểm tra có khối Bắt đầu và nội dung trong khối In, rồi sửa và chạy lại. Thử, quan sát và sửa là một phần bình thường của việc học lập trình.",
      },
      {
        id: "apply",
        title: "Trong Bài 1, bạn sẽ thực hiện những gì?",
        explanation: [
          "Bạn sẽ áp dụng các khái niệm vừa học qua bốn bước dưới đây. Mỗi bước trong tab Thực hành chỉ yêu cầu một việc; bạn không cần ghi nhớ cả danh sách câu lệnh trước khi bắt đầu.",
          "Chọn tab Thực hành hoặc nói Thực hành để bắt đầu. Khi muốn đọc lại, chọn tab Ôn lại kiến thức hoặc nói Xem kiến thức. Các câu lệnh tạo khối dưới đây dùng trong tab Thực hành; khi đang đọc kiến thức, hãy dùng Cuộn xuống hoặc Cuộn lên để di chuyển trong bài đọc.",
        ],
        example: "Mục tiêu cuối cùng là tự tạo chuỗi Bắt đầu → In, đặt đúng lời chào Xin chào và chạy để nhìn thấy lời chào đó trong vùng kết quả.",
        practice: "Trước khi thực hành, thử tự trả lời: khối nào khởi động chương trình, khối nào hiển thị chữ, và khi nào máy tính thực hiện những chỉ dẫn đó? Bạn có thể quay lại phần giải thích tương ứng bất cứ lúc nào.",
        steps: [
          { task: "Tạo điểm khởi động", voice: "Thêm khối bắt đầu", drag: "Kéo khối Bắt đầu vào vùng xếp khối." },
          { task: "Thêm lệnh hiển thị", voice: "Thêm khối in", drag: "Kéo khối In và ghép bên dưới Bắt đầu." },
          { task: "Đặt lời chào", voice: "Đặt chữ Xin chào", drag: "Chọn khối In rồi điền Xin chào vào ô nội dung." },
          { task: "Chạy và quan sát", voice: "Chạy chương trình", drag: "Chọn Chạy và đọc dòng Xin chào trong vùng kết quả." },
        ],
      },
    ],
  },
  "print-output-v2": {
    visual: "output-order",
    takeaway: "Thứ tự khối In cũng là thứ tự các dòng đầu ra.",
    concept: "Máy tính thực hiện lần lượt từng lệnh từ trên xuống dưới. Lệnh ở trên chạy trước, lệnh ở dưới chạy sau.",
    purpose: "Thứ tự các khối In quyết định thứ tự các dòng chữ xuất hiện trên màn hình — đổi thứ tự khối là đổi kết quả.",
    example: 'In "Xin chào" → In "Bạn làm được!" → kết quả: Xin chào / Bạn làm được!',
    goal: "Bạn sẽ sắp xếp hai khối In đúng thứ tự và quan sát kết quả thay đổi khi hoán đổi chúng.",
  },
  "repeat-loops-v2": {
    visual: "repeat",
    takeaway: "Chỉ các lệnh nằm bên trong khối Lặp mới được lặp lại.",
    concept: "Vòng lặp giúp thực hiện cùng một hành động nhiều lần mà không cần lặp lại lệnh. Đặt lệnh vào trong khối Lặp — máy tính sẽ tự lặp lại.",
    purpose: "Thay vì viết In 5 lần, bạn chỉ cần Lặp 5 lần chứa một khối In bên trong. Chương trình ngắn gọn và dễ đọc hơn.",
    example: 'Lặp 3 lần { In "Cố lên!" } → kết quả: Cố lên! / Cố lên! / Cố lên!',
    goal: "Bạn sẽ đặt khối In vào bên trong khối Lặp, đặt số lần lặp và chạy thử.",
  },
  "if-basics-v2": {
    visual: "condition",
    takeaway: "Điều kiện đúng: thực hiện lệnh bên trong. Điều kiện sai: bỏ qua lệnh đó.",
    concept: "Điều kiện giúp chương trình tự đưa ra quyết định: nếu điều kiện đúng thì thực hiện hành động, nếu sai thì bỏ qua.",
    purpose: "Lệnh bên trong khối Nếu chỉ chạy khi điều kiện là đúng (true). Khi điều kiện sai, lệnh bên trong bị bỏ qua.",
    example: 'Nếu (đúng) thì { In "Sẵn sàng!" } → kết quả: Sẵn sàng!',
    goal: "Bạn sẽ đặt khối điều kiện, gán giá trị đúng/sai và quan sát khi nào lệnh bên trong được thực hiện.",
  },
  "variables-basics-v2": {
    visual: "variable",
    takeaway: "In tên biến để xem giá trị của nó tại thời điểm lệnh được thực hiện.",
    concept: "Biến là một ô nhớ có tên, dùng để lưu một giá trị và sử dụng lại nhiều lần. Giá trị có thể thay đổi trong chương trình.",
    purpose: "Bạn dùng tên biến để lấy giá trị đang được lưu. Sau khi gán giá trị mới, lệnh sử dụng biến ở phía sau sẽ nhận giá trị mới đó.",
    example: "diem = 5 → In diem → kết quả: 5. Đổi diem = 10 → In diem → kết quả: 10",
    goal: "Bạn sẽ tạo biến, gán giá trị cho biến và in giá trị đó ra màn hình.",
  },
};
