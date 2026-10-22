# SAFESIGNAL ESCALATE - PITCH NỘI BỘ CHO CODECOM

## Giới thiệu 2-3 phút

Cả nhóm thử hình dung một tình huống: Lan là điều dưỡng tại một bệnh viện. Trong một ca trực, Lan phát hiện hai loại thuốc có nhãn rất giống nhau. Một đồng nghiệp suýt lấy nhầm nhưng đã kịp phát hiện trước khi đưa thuốc cho bệnh nhân. Đây là một near miss - sự cố suýt xảy ra. Nguy cơ trước mắt đã được xử lý, nhưng vấn đề về cách ghi nhãn và bố trí thuốc có thể vẫn còn.

Bệnh viện vốn đã có hệ thống báo cáo sự cố. Chúng ta **không xây thêm một hệ thống tương tự**. Vấn đề là sau khi báo cáo, nếu Lan không nhận được phản hồi và lo ngại thông tin có thể bị xem bởi người không liên quan, Lan sẽ làm gì? Nếu muốn một bộ phận độc lập có thẩm quyền đánh giá mối quan ngại, ai bảo đảm rằng quản trị viên kỹ thuật không thể tự ý cấp quyền đọc nội dung cho người khác?

Đó là lý do chúng ta đề xuất SafeSignal Escalate: **một lớp bảo vệ chứng cứ và quản trị quyền truy cập khi cần chuyển tiếp mối quan ngại an toàn y tế chưa được xử lý**. Lan gửi một báo cáo giả lập, nội dung được TideCloak mã hóa ngay trong trình duyệt. Máy chủ chỉ lưu dữ liệu mã hóa. Người không có quyền thử mở báo cáo sẽ thất bại.

Nếu cần cấp quyền đọc cho người đánh giá, thay đổi vai trò được đưa vào cơ chế Quorum Enforced Authorization, gọi tắt là QEA. Trong ví dụ ba quản trị viên, một người chấp thuận chưa đủ; khi đủ ngưỡng phê duyệt, quyền mới mới có thể được áp dụng. Nhóm phải kiểm thử việc chia sẻ và giải mã giữa các tài khoản thật trước khi nói rằng demo đã hoàn thành.

Giá trị dài hạn không nằm ở việc có thêm một biểu mẫu. Giá trị là **giảm phụ thuộc vào một bên quản trị khi chuyển giao thông tin nhạy cảm**, giúp chứng cứ có cơ hội được đánh giá trong khuôn khổ có trách nhiệm hơn. Về sau có thể nghiên cứu biên nhận xác nhận đã tiếp nhận và quy trình theo dõi phản hồi, nhưng đó là giai đoạn tiếp theo, chưa phải chức năng TideCloak có sẵn.

Trong hackathon, chúng ta chỉ chứng minh ba việc: nội dung được mã hóa; người sai quyền không đọc được; và thay đổi quyền không thể được một quản trị viên đơn lẻ tự duyệt trong cấu hình nhiều người. Chúng ta không hứa ẩn danh tuyệt đối, không dùng dữ liệu bệnh nhân thật và không thay thế nghĩa vụ báo cáo khẩn cấp.

Thông điệp ngắn nhất là: **SafeSignal không thay hệ thống báo cáo sự cố. Nó thử nghiệm cách chuyển tiếp chứng cứ nhạy cảm mà không phải đặt toàn bộ niềm tin vào một quản trị viên.**

## Ai dùng ứng dụng và nhìn thấy gì?

- **Người gửi báo cáo:** đăng nhập, nhập tóm tắt sự cố giả lập và gửi. Trình duyệt mã hóa nội dung trước khi đưa lên máy chủ.
- **Người xem không có quyền:** thấy mã hồ sơ và trạng thái tối thiểu nếu được phép, nhưng không giải mã được báo cáo.
- **Người đánh giá được cấp quyền:** có thể thử giải mã bằng SDK, *nếu* đội xác nhận được cơ chế chia sẻ ciphertext chéo tài khoản.
- **Các quản trị viên TideCloak:** quản trị việc thay đổi quyền, phải đạt ngưỡng QEA khi áp dụng cấu hình nhiều quản trị viên.

## Vì sao Tide thật sự quan trọng?

Phần mềm có đăng nhập và bảng phân quyền thông thường vẫn có thể phụ thuộc vào quyền thay đổi chính sách của một tài khoản đặc quyền. TideCloak giúp nhóm thử nghiệm một cơ chế khác: nội dung không ở dạng đọc được trên máy chủ, và việc mở rộng quyền cần nhiều quản trị viên phê duyệt. Đây là thay đổi về **thẩm quyền**, không chỉ về giao diện.

## Ba câu hỏi phản biện và trả lời

**Bệnh viện đã có phần mềm báo cáo rồi?** Đúng. SafeSignal nhắm tới lớp chuyển tiếp chứng cứ được bảo vệ, không thay thế quy trình tiếp nhận hoặc xử lý sự cố.

**Có bảo đảm điều dưỡng hoàn toàn ẩn danh không?** Không. Người đọc vẫn có thể suy đoán qua ca trực, vị trí và thời gian; IP/metadata có thể làm lộ thông tin. MVP chỉ chứng minh bảo mật nội dung và quản trị quyền.

**QEA có ngăn được bệnh viện xóa báo cáo không?** Không. Muốn phát hiện xóa/sửa có giá trị chứng cứ cần biên nhận có xác thực và bên lưu bằng chứng độc lập; đó là stretch goal, không nên gán cho Tide.

## Một câu tagline tiếng Anh

**SafeSignal Escalate - Sensitive safety evidence, without unilateral access control.**

## Các tài liệu nền

- Tide E2EE: https://docs.tide.org/Admin/e2ee
- Tide QEA: https://docs.tide.org/Admin/SetupIGA
- Tide Raziel: https://docs.tide.org/ai-agent-pack
- Nghiên cứu BMJ 2026: https://bmjopenquality.bmj.com/content/15/1/e003245
- Thể lệ UNLOCKED: https://tide.org/unlocked/#challenge
