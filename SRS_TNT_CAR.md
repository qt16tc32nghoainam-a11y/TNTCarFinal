HỆ THỐNG TNT CAR
SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

Tên hệ thống: TNT CAR — Nền tảng quản lý khách hàng tiềm năng và hỗ trợ bán xe
Mã tài liệu: SRS-TNTCAR
Phiên bản: 2.0
Ngày: 16/09/2026
Người biên soạn: Nhóm phân tích nghiệp vụ

1. GIỚI THIỆU TÀI LIỆU

1.1. Tổng quan hệ thống

TNT CAR là nền tảng quản lý khách hàng tiềm năng (Lead) và hỗ trợ quy trình bán xe, gồm ba thành phần: ứng dụng di động dạng PWA dành cho nhân viên Sales, cổng quản trị (Admin Portal) dành cho quản lý, và website công khai giới thiệu xe kèm biểu mẫu tiếp nhận yêu cầu của khách hàng.

Mục tiêu của hệ thống là giúp Sales thu thập và chăm sóc Lead nhanh chóng, không bỏ sót khách hàng, đồng thời cung cấp cho quản lý số liệu vận hành để đánh giá hiệu quả kinh doanh. Ứng dụng Sales được thiết kế để hoạt động cả khi không có kết nối Internet và tự đồng bộ dữ liệu khi có mạng trở lại.

Phạm vi trong dự án gồm: quản lý Lead; chăm sóc và theo dõi Lead; tra cứu kho xe và đặt lịch lái thử; tạo hợp đồng bán xe và ghi nhận thanh toán, đặt cọc; quản lý người dùng và phân quyền; dashboard KPI và báo cáo; cơ chế offline và đồng bộ; website danh mục xe công khai; quản lý nội dung website; và tiếp nhận yêu cầu từ website.

Phạm vi nằm ngoài dự án gồm: bàn giao xe và logistics giao xe; ký số hợp đồng; nhận diện ảnh giấy phép lái xe (OCR); và quản trị danh mục xe (danh mục xe chỉ hiển thị ở chế độ đọc, dữ liệu lấy từ hệ thống kho xe hiện có của TNT CAR).

1.2. Quy ước trong tài liệu

Tài liệu sử dụng các ký hiệu: FR cho yêu cầu chức năng, BR cho quy tắc nghiệp vụ, US cho user story, NFR cho yêu cầu phi chức năng. Nhóm quy tắc riêng của chức năng tra cứu kho xe và lái thử được đánh mã BR-INV và BR-TD để phân biệt với nhóm quy tắc chung. Các tiêu chí chấp nhận (Acceptance Criteria) được viết theo cấu trúc Given – When – Then.

2. TỔNG QUAN HỆ THỐNG

2.1. Bối cảnh và khó khăn hiện tại

Hiện nay nhân viên Sales ghi nhận thông tin khách hàng bằng sổ tay hoặc file Excel rời rạc. Cách làm này khiến dữ liệu dễ thất lạc, khó tra cứu, và Sales thường quên gọi lại hoặc quên lịch hẹn với khách. Hệ quả là nhiều Lead tiềm năng bị bỏ sót, khách chuyển sang đối thủ, doanh nghiệp mất doanh thu và không có số liệu để đo lường hiệu quả bán hàng. Một trong những vấn đề rõ nhất là thời gian nhập liệu một Lead hiện mất khoảng 20–25 phút; mục tiêu của hệ thống là rút xuống dưới 3 phút.

2.2. Kiến trúc theo kênh sử dụng

Hệ thống phục vụ ba kênh. Ứng dụng Sales (PWA) phục vụ nhân viên Sales với các chức năng quản lý và chăm sóc Lead, tra cứu xe, đặt lịch lái thử, tạo hợp đồng và làm việc offline (FR01, FR02, FR03, FR06, FR10, FR11). Cổng quản trị phục vụ quản lý với các chức năng gán và gộp Lead, quản lý người dùng, dashboard KPI, quản lý nội dung website (FR04, FR05, FR08). Website công khai phục vụ khách hàng với danh mục xe và biểu mẫu tiếp nhận yêu cầu (FR07, FR09).

3. ACTORS (USER ROLES)

Actor | Loại | Vai trò trong hệ thống
Sales | Nội bộ | Tạo và chăm sóc Lead, chốt Won/Lost, tra cứu xe, đặt lịch lái thử, tạo hợp đồng và ghi nhận thanh toán/cọc, làm việc offline; xem dashboard KPI của bản thân.
Manager | Nội bộ | Quản lý một nhóm Sales; xem dashboard KPI của các Sales thuộc quyền quản lý.
Admin | Nội bộ | Quản lý người dùng và phân quyền, gán và gộp Lead, xem dashboard KPI toàn hệ thống, quản lý nội dung website, cấu hình khung giờ lái thử.
Khách hàng | Bên ngoài | Xem danh mục xe, so sánh xe, gửi yêu cầu lái thử/tư vấn/CSKH qua website.
Hệ thống | Tự động | Gửi thông báo đẩy, tự đồng bộ dữ liệu, tự gán Lead phát sinh từ website.

Mô hình vai trò áp dụng cho bản phát hành đầu gồm Admin, Manager và Sales. Các cơ chế nâng cao như đăng nhập một lần (SSO), xác thực hai lớp (2FA), phân quyền theo thuộc tính, kiểm soát theo địa chỉ IP hoặc theo khung giờ sẽ được cân nhắc ở giai đoạn sau.

4. SƠ ĐỒ PHÂN RÃ CHỨC NĂNG

Sơ đồ phân rã chức năng của hệ thống được thể hiện trong tệp TNT CAR.drawio (trang "CAR FINAL").

5. BUSINESS PROCESS

Quy trình hiện tại (AS-IS) được thể hiện trong tệp TNT CAR.drawio, trang "AS-IS Flow".

Quy trình sau khi triển khai (TO-BE) được thể hiện trong tệp TNT_CAR_TO_BE.drawio, tóm tắt như sau: khách hàng liên hệ qua Hotline, Facebook, website hoặc trực tiếp tại showroom; Lead được đưa vào hệ thống bằng cách Sales tạo trực tiếp (dưới 3 phút, làm được cả khi offline) hoặc do website tự tạo và gán ngẫu nhiên cho một Sales kèm thông báo đẩy; Sales chăm sóc Lead qua nhật ký hoạt động và lịch hẹn có nhắc việc tự động; Sales tra cứu kho xe và sắp xếp lịch lái thử; khi có kết quả, Lead được chốt Thành công (kèm tạo hợp đồng và ghi nhận thanh toán/cọc) hoặc chốt Thất bại kèm lý do; dữ liệu tạo offline tự đồng bộ khi có mạng; cuối cùng quản lý theo dõi số liệu trên dashboard KPI và khóa số liệu theo kỳ.

6. BUSINESS RULES TABLE

Mã BR | Rules | FR liên quan
BR-01 | Trùng số điện thoại chỉ được coi là lỗi khi xảy ra trong phạm vi Lead của cùng một Sales; trùng số điện thoại giữa các Sales khác nhau là hợp lệ. Khi phát hiện trùng trong phạm vi cùng một Sales, hệ thống cảnh báo và cho phép gộp các Lead trùng, giữ lại lịch sử chăm sóc của tất cả các Lead được gộp. | FR-01
BR-02 | Khi chốt Lost bắt buộc phải chọn lý do; nếu chọn lý do "Khác" thì bắt buộc nhập lý do cụ thể dạng văn bản. | FR-01
BR-03 | Sales được tự sửa lại kết quả Won/Lost đã chốt bất kỳ lúc nào, không cần Admin duyệt, nhưng mỗi lần sửa bắt buộc nhập lý do thay đổi. Hệ thống lưu đầy đủ lịch sử thay đổi gồm trạng thái cũ, trạng thái mới, lý do, người sửa và thời điểm. | FR-01
BR-04 | Xóa Lead được thực hiện theo cơ chế xóa mềm, tức chuyển Lead sang trạng thái Lưu trữ, không xóa vĩnh viễn dữ liệu. | FR-01
BR-05 | Ghi chú và hoạt động chăm sóc sau khi đã lưu thì không được sửa hoặc xóa, nhằm bảo đảm tính toàn vẹn của nhật ký chăm sóc. | FR-02
BR-06 | Ghi chú chăm sóc không bắt buộc phải có nội dung; Sales có thể lưu hoạt động mà không nhập ghi chú, nhưng bắt buộc chọn Loại hoạt động. | FR-02
BR-07 | Thời gian nhắc việc hoặc lịch hẹn phải là thời điểm trong tương lai; hệ thống không chấp nhận thời gian trong quá khứ. | FR-02
BR-08 | Thông báo đẩy chỉ hoạt động khi Sales đã hoàn tất onboarding, gồm cài đặt ứng dụng PWA và cấp quyền thông báo. | FR-02, FR-10
BR-09 | Tài khoản Sales bị tạm khóa thì không đăng nhập được, nhưng toàn bộ dữ liệu Lead và lịch sử cũ vẫn được giữ nguyên. | FR-04
BR-10 | Email và số điện thoại dùng để tạo tài khoản Sales phải duy nhất trong hệ thống. | FR-04
BR-11 | Mọi thao tác tạo và sửa dữ liệu Lead, ghi chú chăm sóc phải thực hiện được ở chế độ offline. | FR-01, FR-02, FR-06
BR-12 | Dữ liệu tạo khi offline phải tự động đồng bộ lên hệ thống trung tâm ngay khi có mạng, không cần thao tác thủ công. | FR-06
BR-13 | Xung đột dữ liệu khi đồng bộ được giải quyết theo nguyên tắc bản ghi có thời điểm cập nhật mới nhất được giữ lại (Last-Write-Wins). | FR-06
BR-14 | Khi đồng bộ thất bại, hệ thống tự động thử lại và không được làm mất dữ liệu đang ở trạng thái chờ đồng bộ. | FR-06
BR-15 | Hệ thống không xây dựng chức năng quản trị danh mục xe; danh mục xe chỉ hiển thị ở chế độ đọc, dữ liệu lấy từ hệ thống kho xe hiện có của TNT CAR. | FR-07
BR-16 | Dữ liệu xe được lấy từ hệ thống kho xe qua API; hệ thống gọi API định kỳ 5 phút một lần để cập nhật tồn kho và giá. | FR-07
BR-17 | Biểu mẫu đăng ký lái thử hoặc tư vấn trên website bắt buộc có trường số điện thoại; thiếu số điện thoại thì không tạo Lead. | FR-09
BR-18 | Lead phát sinh từ website được tự động gán cho một Sales theo cơ chế ngẫu nhiên. | FR-09
BR-19 | Sales phải hoàn tất cài đặt PWA và cấp quyền thông báo ngay từ lần đăng nhập đầu tiên trước khi sử dụng đầy đủ các tính năng liên quan đến nhắc việc. | FR-10
BR-20 | Chỉ được tạo hợp đồng bán xe từ Lead ở trạng thái Thành công; mỗi Lead Thành công có tối đa một hợp đồng còn hiệu lực. | FR-11
BR-21 | Hợp đồng phải ghi nhận giá trị hợp đồng và phương thức thanh toán (trả thẳng, trả góp, đặt cọc); với phương thức trả góp hoặc đặt cọc thì bắt buộc nhập số tiền cọc. | FR-11
BR-22 | Khi hủy cọc bắt buộc chọn lý do; hệ thống lưu lịch sử hủy gồm người hủy, thời điểm, lý do và tính vào số liệu tỷ lệ hủy cọc. | FR-11, FR-05
BR-23 | Doanh thu trên dashboard chỉ tính từ các hợp đồng còn hiệu lực, không tính các hợp đồng đã hủy cọc. | FR-11, FR-05
BR-24 | Dashboard và KPI được phân quyền theo vai trò: Admin xem toàn hệ thống, Manager xem các Sales thuộc quyền quản lý, Sales chỉ xem số liệu của bản thân. | FR-05
BR-25 | Số liệu KPI được khóa theo kỳ tháng, quý và năm; sau khi khóa, các thay đổi Won/Lost hoặc hủy cọc phát sinh sau đó không làm thay đổi số liệu của kỳ đã khóa. | FR-05

Quy tắc riêng của chức năng tra cứu kho xe và lái thử (FR03):

Mã BR | Rules
BR-INV-01 | Chỉ hiển thị cho người dùng những xe có trạng thái Available hoặc In-transit.
BR-INV-02 | Tồn kho hiển thị theo thời gian gần thực, cập nhật không quá 5 phút.
BR-TD-01 | Một khách hàng chỉ được có tối đa 3 lịch lái thử ở trạng thái Chờ xác nhận hoặc Đã xác nhận cùng lúc.
BR-TD-02 | Khung giờ lái thử phải cách thời điểm đặt tối thiểu 2 giờ.
BR-TD-03 | Mỗi khung giờ của một xe tại một showroom chỉ phục vụ một khách.
BR-TD-04 | Khách phải cung cấp số điện thoại hợp lệ khi đặt lịch lái thử.
BR-TD-05 | Khách hoặc Sales được phép hủy hay đổi lịch trước giờ hẹn tối thiểu 4 giờ.

7. USER STORY

STT | ID | FR liên quan | User Story (tóm tắt) | Actor | Priority
1 | US-01.1 | FR-01 | Tạo Lead nhanh | Sales | Cao
2 | US-01.2 | FR-01 | Xem và lọc danh sách Lead | Sales | Cao
3 | US-01.3 | FR-01 | Xem chi tiết và cập nhật trạng thái xử lý Lead | Sales | Cao
4 | US-01.4 | FR-01 | Xóa và lưu trữ Lead | Sales | Trung bình
5 | US-01.5 | FR-01 | Admin gán và chuyển Lead | Admin | Cao
6 | US-01.6 | FR-01 | Chốt và sửa kết quả giao dịch (Won/Lost) | Sales | Cao
7 | US-01.7 | FR-01 | Gộp Lead trùng số điện thoại | Sales, Admin | Trung bình
8 | US-02.1 | FR-02 | Ghi hoạt động chăm sóc | Sales | Cao
9 | US-02.2 | FR-02 | Tạo lịch hẹn và nhận thông báo nhắc việc | Sales | Cao
10 | US-02.3 | FR-02 | Nhận Lead mới từ website và phân bổ tự động | Sales | Cao
11 | US-02.4 | FR-02 | Admin xem lịch sử chăm sóc | Admin | Trung bình
12 | US-03.1 | FR-03 | Tìm kiếm và lọc xe | Sales | Cao
13 | US-03.2 | FR-03 | Xem chi tiết xe và tồn kho theo showroom | Sales, Admin | Cao
14 | US-03.3 | FR-03 | So sánh xe | Sales | Thấp
15 | US-03.4 | FR-03 | Đặt lịch lái thử | Sales | Cao
16 | US-03.5 | FR-03 | Xác nhận hoặc từ chối lịch lái thử | Sales, Admin | Cao
17 | US-03.6 | FR-03 | Hủy hoặc đổi lịch lái thử | Sales | Cao
18 | US-03.7 | FR-03 | Nhắc lịch và ghi nhận kết quả lái thử | Sales, Hệ thống | Trung bình
19 | US-03.8 | FR-03 | Cấu hình khung giờ lái thử | Admin | Trung bình
20 | US-04.1 | FR-04 | Tạo tài khoản Sales | Admin | Cao
21 | US-04.2 | FR-04 | Tạm khóa tài khoản | Admin | Trung bình
22 | US-04.3 | FR-04 | Gán showroom, quản lý và phân quyền | Admin | Cao
23 | US-05.1 | FR-05 | Xem KPI và bảng xếp hạng | Admin, Manager, Sales | Trung bình
24 | US-05.2 | FR-05 | Xuất báo cáo | Admin, Manager | Trung bình
25 | US-05.3 | FR-05 | Khóa số liệu KPI theo kỳ | Admin | Trung bình
26 | US-06.1 | FR-06 | Thao tác khi offline | Sales | Cao
27 | US-06.2 | FR-06 | Tự động đồng bộ dữ liệu | Sales | Cao
28 | US-07.1 | FR-07 | Xem danh sách xe trên website | Khách | Cao
29 | US-07.2 | FR-07 | Xem chi tiết xe trên website | Khách | Cao
30 | US-07.3 | FR-07 | So sánh xe trên website | Khách | Trung bình
31 | US-08.1 | FR-08 | Quản lý nội dung website | Admin | Trung bình
32 | US-08.2 | FR-08 | Khách xem trang chủ | Khách | Trung bình
33 | US-09.1 | FR-09 | Khách gửi yêu cầu qua website và Sales nhận thông báo | Khách, Sales | Cao
34 | US-10.1 | FR-10 | Onboarding PWA và cấp quyền thông báo | Sales | Cao
35 | US-11.1 | FR-11 | Tạo hợp đồng bán xe | Sales | Cao
36 | US-11.2 | FR-11 | Ghi nhận thanh toán và đặt cọc | Sales | Cao
37 | US-11.3 | FR-11 | Hủy cọc | Sales, Admin | Trung bình

FR-01: Quản lý Lead

US-01.1 — Tạo Lead nhanh
Là Sales, tôi muốn tạo nhanh một Lead mới với thông tin tối thiểu, để tôi không bỏ lỡ khách hàng khi đang tư vấn trực tiếp.
Actor: Sales | Priority: Cao | Liên quan: FR-01
Acceptance Criteria:
- Given tôi ở màn hình chính, When tôi nhập Họ tên, Số điện thoại, Dòng xe và chọn Nguồn Lead (bắt buộc, từ danh sách 12 giá trị cố định: Sale tự nhập, Facebook Ads, Website, CSKH nhập, TikTok Ads, Zalo, Google Ads, Hotline, Giới thiệu, Showroom/Sự kiện, Import hệ thống cũ, Khác) rồi nhấn Lưu, Then Lead được tạo với trạng thái mặc định "Đang tìm hiểu".
- Given tôi bỏ trống Số điện thoại hoặc chưa chọn Nguồn Lead, When tôi nhấn Lưu, Then hệ thống báo lỗi tương ứng và không cho lưu.
- Given số điện thoại tôi nhập đã tồn tại trong Lead do chính tôi phụ trách, When tôi nhấn Lưu, Then hệ thống cảnh báo trùng và gợi ý gộp Lead; tôi có thể chọn gộp hoặc vẫn tạo mới, hệ thống gắn cờ nghi trùng để Admin rà soát.
- Given số điện thoại trùng với Lead của Sales khác, When tôi lưu, Then hệ thống không cảnh báo và tạo Lead bình thường.
- Given thiết bị đang offline, When tôi lưu Lead mới, Then Lead được lưu cục bộ với trạng thái đồng bộ chờ xử lý và sẽ đồng bộ khi có mạng.

US-01.2 — Xem và lọc danh sách Lead
Là Sales, tôi muốn xem, lọc và tìm kiếm danh sách Lead của mình, để tôi ưu tiên chăm sóc đúng khách hàng quan trọng trước.
Actor: Sales | Priority: Cao | Liên quan: FR-01
Acceptance Criteria:
- Given danh sách Lead, When tôi lọc theo Trạng thái, Nguồn Lead hoặc trạng thái đồng bộ, Then danh sách cập nhật đúng theo điều kiện.
- Given tôi tìm kiếm, When gõ xong từ khóa, Then kết quả trả về trong dưới một giây.
- Given tôi là Sales, When tôi mở danh sách, Then hệ thống chỉ hiển thị Lead do tôi tạo hoặc được gán, không thấy Lead của Sales khác.

US-01.3 — Xem chi tiết và cập nhật trạng thái xử lý Lead
Là Sales, tôi muốn xem chi tiết Lead và cập nhật trạng thái xử lý, để phản ánh đúng tiến độ chăm sóc.
Actor: Sales | Priority: Cao | Liên quan: FR-01
Acceptance Criteria:
- Given tôi mở chi tiết một Lead, Then hệ thống hiển thị đầy đủ thông tin kèm lịch sử chăm sóc.
- Given tôi cập nhật trạng thái, When tôi chọn một trong năm trạng thái xử lý (Không liên lạc được, Tương tác chưa thành công, Đang tìm hiểu, Có nhu cầu ngay, Không có nhu cầu), Then hệ thống lưu thay đổi kèm lịch sử thay đổi gồm người đổi, thời điểm, trạng thái trước và sau.
- Given Lead đang ở trạng thái Thành công hoặc Lead thất bại, When tôi xem tại màn hình này, Then hai trạng thái này hiển thị trong danh sách nhưng chỉ được sửa qua chức năng chốt và sửa kết quả (US-01.6), không đổi trực tiếp tại đây.

US-01.4 — Xóa và lưu trữ Lead
Là Sales, tôi muốn xóa hoặc lưu trữ một Lead tạo nhầm hoặc trùng, để danh sách không bị nhiễu bởi dữ liệu rác.
Actor: Sales | Priority: Trung bình | Liên quan: FR-01
Acceptance Criteria:
- Given tôi chọn một Lead, When tôi nhấn Xóa, Then hệ thống hiển thị hộp thoại xác nhận trước khi thực hiện.
- Given tôi xác nhận xóa, When thao tác hoàn tất, Then Lead chuyển sang trạng thái Lưu trữ và biến mất khỏi danh sách chính, không xóa vĩnh viễn.
- Given tôi hủy hộp thoại xác nhận, When tôi bấm Hủy, Then Lead không thay đổi trạng thái.

US-01.5 — Admin gán và chuyển Lead
Là Admin, tôi muốn xem toàn bộ Lead và gán hoặc chuyển Lead giữa các Sales, để không Lead nào bị bỏ trống người phụ trách.
Actor: Admin | Priority: Cao | Liên quan: FR-01
Acceptance Criteria:
- Given có Lead chưa được gán Sales, When Admin chọn một Sales và xác nhận gán, Then Lead xuất hiện trong danh sách của Sales đó và Sales nhận thông báo.
- Given Admin chuyển một Lead từ Sales A sang Sales B, When Admin xác nhận, Then Lead rời danh sách của Sales A, xuất hiện ở danh sách Sales B và lịch sử chăm sóc cũ được giữ nguyên.

US-01.6 — Chốt và sửa kết quả giao dịch (Won/Lost)
Là Sales, tôi muốn chọn kết quả Won hoặc Lost trực tiếp trên Lead, để ghi nhận giao dịch thành công hay không thành công.
Actor: Sales | Priority: Cao | Liên quan: FR-01
Acceptance Criteria:
- Given Lead đang ở một trong năm trạng thái xử lý, When tôi chọn Won, Then hệ thống cập nhật trạng thái Lead thành Thành công và đồng bộ khi có mạng.
- Given tôi chọn Lost, When tôi xác nhận, Then hệ thống bắt buộc chọn lý do; nếu chọn lý do Khác mà để trống ô văn bản thì báo lỗi yêu cầu nhập cụ thể.
- Given Lead đã ở trạng thái Won hoặc Lost, When tôi sửa lại kết quả, Then hệ thống cho phép sửa tự do, không cần Admin duyệt, nhưng bắt buộc nhập lý do thay đổi trước khi lưu.
- Given tôi vừa sửa lại kết quả, Then hệ thống lưu lịch sử thay đổi đầy đủ gồm trạng thái cũ, trạng thái mới, lý do, người sửa và thời điểm.

US-01.7 — Gộp Lead trùng số điện thoại
Là Sales, tôi muốn gộp các Lead trùng số điện thoại của cùng một khách, để hồ sơ khách hàng không bị phân mảnh.
Actor: Sales, Admin | Priority: Trung bình | Liên quan: FR-01
Acceptance Criteria:
- Given phát hiện từ hai Lead trở lên trùng số điện thoại trong phạm vi cùng một Sales, When tôi chọn Gộp Lead, Then hệ thống hiển thị các Lead trùng để tôi chọn Lead giữ lại.
- Given tôi xác nhận gộp, When thao tác hoàn tất, Then hệ thống hợp nhất lịch sử chăm sóc và lịch hẹn vào Lead được giữ lại, các Lead còn lại chuyển sang Lưu trữ, và ghi lại lịch sử thao tác gộp.
- Given có cờ nghi trùng số điện thoại, When Admin mở màn hình rà soát, Then Admin cũng thực hiện được thao tác gộp.

FR-02: Chăm sóc và theo dõi Lead

US-02.1 — Ghi hoạt động chăm sóc
Là Sales, tôi muốn ghi lại nội dung mỗi lần gọi điện hoặc gặp khách, để tôi và người tiếp quản sau này nắm được lịch sử trao đổi.
Actor: Sales | Priority: Cao | Liên quan: FR-02
Acceptance Criteria:
- Given tôi ghi hoạt động, When tôi chọn Loại hoạt động (Gọi điện, Nhắn tin/Zalo, Gặp trực tiếp, Lịch hẹn, Khác), phần ghi chú không bắt buộc, Then bản ghi được lưu vào timeline, hoạt động mới nhất hiển thị trước.
- Given bản ghi hoạt động đã lưu, Then hệ thống không cho phép sửa hoặc xóa bản ghi đó.
- Given tôi đang ghi hoạt động, When tôi tùy chọn đổi trạng thái Lead cùng lúc, Then hệ thống lưu trạng thái trước và sau vào cùng bản ghi; việc đổi trạng thái là không bắt buộc.
- Given Admin xem lịch sử của một Sales bất kỳ, Then chỉ ở chế độ chỉ xem.

US-02.2 — Tạo lịch hẹn và nhận thông báo nhắc việc
Là Sales, tôi muốn tạo lịch hẹn ngay khi ghi hoạt động, để không phải chuyển màn hình và không bỏ lỡ cuộc hẹn.
Actor: Sales | Priority: Cao | Liên quan: FR-02
Acceptance Criteria:
- Given tôi đang ghi hoạt động, When tôi chọn Tạo lịch hẹn và nhập Ngày giờ, Mục đích và Địa điểm, Then hệ thống lưu lịch hẹn gắn với Lead.
- Given tôi chọn thời gian nhắc trong quá khứ, When tôi Lưu, Then hệ thống báo lỗi thời gian nhắc việc phải ở tương lai.
- Given lịch hẹn đã tạo, Then hệ thống tự đặt nhắc trước giờ hẹn, mặc định 30 phút và có thể cấu hình.
- Given tôi chưa hoàn tất onboarding cài đặt PWA và cấp quyền thông báo, When tôi cố tạo lịch hẹn, Then hệ thống yêu cầu hoàn tất cài đặt và cấp quyền trước khi tiếp tục.
- Given tôi đã cài PWA và cấp quyền thông báo, When đến giờ đã đặt dù không mở ứng dụng, Then thiết bị vẫn nhận được thông báo đẩy.

US-02.3 — Nhận Lead mới từ website và phân bổ tự động
Là Sales, tôi muốn được tự động gán và nhận thông báo khi có Lead mới từ website, để phản hồi kịp thời.
Actor: Sales | Priority: Cao | Liên quan: FR-02
Acceptance Criteria:
- Given một Lead mới có nguồn là Website, When hệ thống phát hiện, Then tự động gán cho một Sales theo cơ chế ngẫu nhiên.
- Given Lead được gán, Then Sales đó nhận thông báo đẩy ngay lập tức.

US-02.4 — Admin xem lịch sử chăm sóc
Là Admin, tôi muốn xem lịch sử chăm sóc của các Lead theo từng Sales, để giám sát chất lượng tư vấn của đội ngũ.
Actor: Admin | Priority: Trung bình | Liên quan: FR-02
Acceptance Criteria:
- Given Admin mở báo cáo chăm sóc theo Sales, When chọn một Sales cụ thể, Then hệ thống hiển thị toàn bộ lịch sử tương tác của Sales đó ở chế độ chỉ xem.

FR-03: Tra cứu kho xe và đặt lịch lái thử

US-03.1 — Tìm kiếm và lọc xe
Là Sales, tôi muốn tìm và lọc xe theo nhiều tiêu chí, để nhanh chóng tìm xe phù hợp khi tư vấn.
Actor: Sales | Priority: Cao | Liên quan: FR-03
Acceptance Criteria:
- Given tôi nhập từ khóa từ hai ký tự trở lên, Then hệ thống gợi ý tự động.
- Given tôi lọc theo hãng, giá, nhiên liệu hoặc showroom, Then danh sách cập nhật kèm các thẻ bộ lọc đang áp dụng.
- Given không có kết quả, Then hệ thống gợi ý nới lỏng tiêu chí.
- Given danh sách hiển thị, Then chỉ hiển thị xe ở trạng thái Available hoặc In-transit.

US-03.2 — Xem chi tiết xe và tồn kho theo showroom
Là Sales, tôi muốn xem chi tiết xe và tồn kho từng showroom, để biết xe có sẵn ở đâu.
Actor: Sales, Admin | Priority: Cao | Liên quan: FR-03
Acceptance Criteria:
- Given tôi chọn một xe, Then hệ thống hiển thị hình ảnh, thông số, giá, khuyến mãi và tồn kho theo showroom, cập nhật không quá 5 phút.
- Given xe hết hàng tại mọi showroom, Then hệ thống ẩn nút lái thử và hiển thị tùy chọn đăng ký nhận thông báo khi có hàng.

US-03.3 — So sánh xe
Là Sales, tôi muốn so sánh tối đa ba xe cạnh nhau theo thông số, để dễ tư vấn cho khách.
Actor: Sales | Priority: Thấp | Liên quan: FR-03
Acceptance Criteria:
- Given tôi đang xem danh sách hoặc chi tiết xe, When tôi thêm một xe vào so sánh, Then xe được thêm vào danh sách so sánh, tối đa ba xe.
- Given tôi đã chọn hai đến ba xe, When tôi mở màn hình so sánh, Then hệ thống hiển thị bảng thông số kỹ thuật đặt cạnh nhau.
- Given tôi đã có ba xe trong danh sách, When tôi thêm xe thứ tư, Then hệ thống chặn hoặc yêu cầu bỏ bớt một xe.

US-03.4 — Đặt lịch lái thử
Là Sales, tôi muốn đặt lịch lái thử cho khách, để khách trải nghiệm xe trước khi mua.
Actor: Sales | Priority: Cao | Liên quan: FR-03
Acceptance Criteria:
- Given xe khả dụng tại ít nhất một showroom, When tôi chọn showroom, ngày và khung giờ còn trống, nhập Họ tên và Số điện thoại, Then hệ thống tạo lịch ở trạng thái Chờ xác nhận, khóa khung giờ, sinh mã đặt lịch và tự tạo Lead cho Sales.
- Given khách đã có ba lịch lái thử đang hoạt động, When tôi đặt thêm, Then hệ thống chặn.
- Given khung giờ cách hiện tại dưới hai giờ, When tôi chọn, Then khung giờ đó không hiển thị.
- Given khung giờ vừa bị người khác giữ, When tôi xác nhận, Then hệ thống báo lỗi và yêu cầu chọn lại.

US-03.5 — Xác nhận hoặc từ chối lịch lái thử
Là Sales, tôi muốn xác nhận hoặc từ chối lịch lái thử, để chủ động điều phối buổi hẹn.
Actor: Sales, Admin | Priority: Cao | Liên quan: FR-03
Acceptance Criteria:
- Given danh sách lịch Chờ xác nhận, When tôi Xác nhận, Then trạng thái chuyển sang Đã xác nhận và khách nhận thông báo.
- Given tôi Từ chối kèm lý do, Then hệ thống giải phóng khung giờ và thông báo cho khách.

US-03.6 — Hủy hoặc đổi lịch lái thử
Là Sales, tôi muốn hủy hoặc đổi lịch lái thử, để linh hoạt khi có thay đổi.
Actor: Sales | Priority: Cao | Liên quan: FR-03
Acceptance Criteria:
- Given còn từ bốn giờ trở lên trước hẹn, When tôi hủy hoặc đổi, Then hệ thống cho phép và cập nhật khung giờ.
- Given còn dưới bốn giờ trước hẹn, When tôi cố hủy hoặc đổi trực tuyến, Then hệ thống chặn và hướng dẫn liên hệ showroom.

US-03.7 — Nhắc lịch và ghi nhận kết quả lái thử
Là Sales, tôi muốn được nhắc lịch và ghi nhận kết quả sau buổi lái thử, để có dữ liệu theo dõi.
Actor: Sales, Hệ thống | Priority: Trung bình | Liên quan: FR-03
Acceptance Criteria:
- Given trước giờ hẹn 24 giờ và 2 giờ, Then hệ thống tự động gửi nhắc.
- Given buổi hẹn đã diễn ra, When Sales cập nhật Hoàn thành hoặc Vắng mặt kèm ghi chú, Then hệ thống lưu kết quả.

US-03.8 — Cấu hình khung giờ lái thử
Là Admin, tôi muốn cấu hình khung giờ, số xe phục vụ lái thử và ngày nghỉ theo showroom, để khách chỉ đặt được khung giờ hợp lệ.
Actor: Admin | Priority: Trung bình | Liên quan: FR-03
Acceptance Criteria:
- Given tôi mở màn hình cấu hình khung giờ của một showroom, When tôi thiết lập khung giờ hoạt động, số xe phục vụ lái thử và ngày nghỉ, Then hệ thống lưu cấu hình cho showroom đó.
- Given cấu hình đã được thiết lập, When khách hoặc Sales đặt lịch, Then chỉ các khung giờ hợp lệ được hiển thị.
- Given một xe đã đủ số lượng khách đặt trong một khung giờ, Then hệ thống ràng buộc mỗi khung giờ một xe một khách, không cho đặt trùng.

FR-04: Quản lý người dùng và phân quyền

US-04.1 — Tạo tài khoản Sales
Là Admin, tôi muốn tạo tài khoản mới cho nhân viên Sales, để họ đăng nhập và sử dụng hệ thống.
Actor: Admin | Priority: Cao | Liên quan: FR-04
Acceptance Criteria:
- Given Admin nhập đầy đủ thông tin nhân viên mới, When Admin nhấn Tạo tài khoản, Then tài khoản được tạo và thông tin đăng nhập được gửi tới nhân viên.
- Given Admin nhập email hoặc số điện thoại đã tồn tại, When Admin nhấn Tạo, Then hệ thống báo lỗi trùng tài khoản.

US-04.2 — Tạm khóa tài khoản
Là Admin, tôi muốn tạm khóa tài khoản Sales đã nghỉ việc, để ngăn truy cập trái phép vào dữ liệu khách hàng.
Actor: Admin | Priority: Trung bình | Liên quan: FR-04
Acceptance Criteria:
- Given một Sales đã nghỉ việc, When Admin chọn Tạm khóa tài khoản đó, Then tài khoản không đăng nhập được nhưng dữ liệu Lead cũ vẫn giữ nguyên.
- Given tài khoản đang bị tạm khóa, When Admin chọn Kích hoạt lại, Then tài khoản đăng nhập bình thường trở lại.

US-04.3 — Gán showroom, quản lý và phân quyền
Là Admin, tôi muốn gán Sales vào đúng showroom, gán người quản lý và phân quyền phù hợp, để mỗi người chỉ thấy đúng phạm vi dữ liệu được phép.
Actor: Admin | Priority: Cao | Liên quan: FR-04
Acceptance Criteria:
- Given Admin chọn một Sales, When Admin gán vào một showroom, gán một Manager quản lý và chọn vai trò, Then Sales chỉ nhìn thấy dữ liệu thuộc phạm vi được gán, và Manager nhìn thấy được các Sales mình quản lý.

FR-05: Dashboard KPI và báo cáo

US-05.1 — Xem KPI và bảng xếp hạng
Là người dùng nội bộ, tôi muốn xem KPI và bảng xếp hạng hiệu suất, để đánh giá hiệu quả kinh doanh trong phạm vi được phép.
Actor: Admin, Manager, Sales | Priority: Trung bình | Liên quan: FR-05
Acceptance Criteria:
- Given tôi mở dashboard, When trang tải xong, Then phạm vi dữ liệu hiển thị theo vai trò: Admin xem toàn hệ thống, Manager xem các Sales mình quản lý, Sales chỉ xem của mình.
- Given tôi chọn khoảng thời gian theo tuần, tháng, quý hoặc năm, Then các chỉ số Lead mới, tỷ lệ chốt Won/Lost, doanh thu và tỷ lệ hủy cọc hiển thị đúng theo kỳ.
- Given Admin hoặc Manager xem bảng xếp hạng, Then Sales và showroom hiển thị đúng thứ tự theo số Won hoặc doanh thu trong kỳ.

US-05.2 — Xuất báo cáo
Là Admin hoặc Manager, tôi muốn xuất báo cáo ra file, để trình bày trong các cuộc họp.
Actor: Admin, Manager | Priority: Trung bình | Liên quan: FR-05
Acceptance Criteria:
- Given tôi chọn Xuất báo cáo, When tôi chọn định dạng Excel hoặc PDF và xác nhận, Then hệ thống tạo file chứa đúng dữ liệu đang hiển thị trong phạm vi quyền của tôi.

US-05.3 — Khóa số liệu KPI theo kỳ
Là Admin, tôi muốn khóa số liệu KPI theo kỳ, để số liệu báo cáo không bị sai lệch khi Sales sửa kết quả về sau.
Actor: Admin | Priority: Trung bình | Liên quan: FR-05
Acceptance Criteria:
- Given kết thúc một kỳ tháng, quý hoặc năm, When Admin thực hiện Khóa kỳ, Then hệ thống lưu ảnh chụp số liệu KPI của kỳ đó.
- Given một kỳ đã khóa, When có thay đổi Won/Lost hoặc hủy cọc phát sinh sau đó, Then số liệu của kỳ đã khóa không thay đổi, phần chênh lệch được phản ánh ở kỳ hiện tại.

FR-06: Cơ chế offline và đồng bộ hóa

US-06.1 — Thao tác khi offline
Là Sales, tôi muốn thao tác bình thường khi không có mạng, để công việc không bị gián đoạn.
Actor: Sales | Priority: Cao | Liên quan: FR-06
Acceptance Criteria:
- Given thiết bị đang offline, When tôi tạo hoặc sửa Lead, ghi chú chăm sóc, chốt kết quả, Then dữ liệu được lưu cục bộ, gắn nhãn chờ đồng bộ và không xảy ra lỗi mất kết nối.

US-06.2 — Tự động đồng bộ dữ liệu
Là Sales, tôi muốn dữ liệu tự động đồng bộ khi có mạng, để không phải bấm đồng bộ thủ công.
Actor: Sales | Priority: Cao | Liên quan: FR-06
Acceptance Criteria:
- Given thiết bị vừa có mạng trở lại, When hệ thống phát hiện kết nối, Then toàn bộ bản ghi đang chờ được tự động đẩy lên hệ thống trung tâm.
- Given đồng bộ thất bại, When lỗi xảy ra, Then hệ thống tự động thử lại và không làm mất dữ liệu.
- Given cùng một bản ghi bị sửa cả trên thiết bị offline và trên hệ thống trung tâm, When đồng bộ diễn ra, Then bản ghi có thời điểm cập nhật mới nhất được giữ lại.

FR-07: Website danh mục xe (chỉ đọc)

US-07.1 — Xem danh sách xe trên website
Là khách truy cập website, tôi muốn xem danh sách xe kèm giá, ảnh, trạng thái và tìm kiếm, lọc, để tìm được xe phù hợp trước khi liên hệ showroom.
Actor: Khách | Priority: Cao | Liên quan: FR-07
Acceptance Criteria:
- Given tôi mở trang danh mục xe, When tôi áp dụng bộ lọc theo hãng, phân khúc, giá, Then danh sách hiển thị đúng theo điều kiện.
- Given tôi tìm kiếm theo từ khóa, When không có xe khớp, Then hệ thống hiển thị thông báo không tìm thấy xe phù hợp.
- Given danh sách hiển thị, Then chỉ hiển thị xe ở trạng thái Available hoặc In-transit.

US-07.2 — Xem chi tiết xe trên website
Là khách truy cập website, tôi muốn xem chi tiết xe kèm ước tính trả góp, để cân nhắc trước khi liên hệ.
Actor: Khách | Priority: Cao | Liên quan: FR-07
Acceptance Criteria:
- Given tôi chọn một xe, Then hệ thống hiển thị hình ảnh, thông số, giá, khuyến mãi và ước tính trả góp.

US-07.3 — So sánh xe trên website
Là khách truy cập website, tôi muốn so sánh tối đa ba xe kèm ước tính trả góp, để tự cân nhắc.
Actor: Khách | Priority: Trung bình | Liên quan: FR-07
Acceptance Criteria:
- Given tôi thêm xe vào so sánh, tối đa ba xe, When tôi mở bảng so sánh, Then hệ thống hiển thị thông số song song kèm ước tính trả góp cho từng xe.

FR-08: Quản lý nội dung website

US-08.1 — Quản lý nội dung website
Là Admin, tôi muốn quản lý banner, thông tin liên hệ và thông tin thương hiệu trên website, để nội dung luôn cập nhật.
Actor: Admin | Priority: Trung bình | Liên quan: FR-08
Acceptance Criteria:
- Given Admin tải lên banner mới, When Admin nhấn Xuất bản, Then banner hiển thị ngay trên trang chủ.
- Given Admin chỉnh sửa thông tin liên hệ hoặc thương hiệu, When Admin Lưu, Then thông tin mới hiển thị ngay trên website.

US-08.2 — Khách xem trang chủ
Là khách truy cập website, tôi muốn xem trang chủ với xe nổi bật và thông tin thương hiệu, để có ấn tượng ban đầu tốt về TNT CAR.
Actor: Khách | Priority: Trung bình | Liên quan: FR-08
Acceptance Criteria:
- Given khách truy cập website, When trang chủ tải xong, Then hiển thị đúng banner, xe nổi bật và thông tin thương hiệu mới nhất.

FR-09: Tiếp nhận yêu cầu từ website

US-09.1 — Khách gửi yêu cầu qua website và Sales nhận thông báo
Là khách truy cập website, tôi muốn gửi yêu cầu đăng ký lái thử, tư vấn hoặc CSKH, để được TNT CAR liên hệ lại.
Actor: Khách, Sales | Priority: Cao | Liên quan: FR-09
Acceptance Criteria:
- Given khách điền form đầy đủ thông tin bắt buộc, trong đó có số điện thoại, When khách nhấn Gửi, Then hệ thống tạo Lead mới với nguồn Website, gán Sales theo cơ chế ngẫu nhiên và gửi email xác nhận cho khách.
- Given khách để trống thông tin bắt buộc, When khách nhấn Gửi, Then hệ thống báo lỗi và không tạo Lead.
- Given một Lead mới loại lái thử hoặc tư vấn được tạo, Then Sales phụ trách nhận được email và thông báo đẩy.

FR-10: Onboarding PWA và thông báo đẩy

US-10.1 — Onboarding PWA và cấp quyền thông báo
Là Sales, tôi muốn được hướng dẫn cài đặt PWA và cấp quyền thông báo ngay lần đầu, để nhận được nhắc việc đầy đủ.
Actor: Sales | Priority: Cao | Liên quan: FR-10
Acceptance Criteria:
- Given Sales đăng nhập lần đầu, When vào hệ thống, Then hệ thống yêu cầu cài đặt Thêm vào màn hình chính và cấp quyền thông báo trước khi dùng đầy đủ tính năng nhắc việc.
- Given Sales từ chối cấp quyền thông báo, When Sales cố dùng nhắc việc, Then hệ thống cảnh báo rằng sẽ không nhận được thông báo nhắc việc nếu không cấp quyền, và cho phép vào Cài đặt để cấp quyền sau.

FR-11: Hợp đồng bán xe và thanh toán

US-11.1 — Tạo hợp đồng bán xe
Là Sales, tôi muốn tạo hợp đồng bán xe từ Lead đã chốt Won, để ghi nhận giao dịch thành công.
Actor: Sales | Priority: Cao | Liên quan: FR-11
Acceptance Criteria:
- Given một Lead ở trạng thái Thành công, When tôi chọn Tạo hợp đồng và nhập giá trị hợp đồng, dòng xe, ngày chốt và ghi chú, Then hệ thống tạo hợp đồng gắn với Lead.
- Given Lead chưa ở trạng thái Thành công, When tôi cố tạo hợp đồng, Then hệ thống chặn và thông báo phải chốt Won trước.
- Given Lead đã có một hợp đồng còn hiệu lực, When tôi tạo thêm, Then hệ thống chặn.

US-11.2 — Ghi nhận thanh toán và đặt cọc
Là Sales, tôi muốn ghi nhận thanh toán hoặc đặt cọc của khách, để theo dõi tình trạng thanh toán của hợp đồng.
Actor: Sales | Priority: Cao | Liên quan: FR-11
Acceptance Criteria:
- Given hợp đồng đã tạo, When tôi chọn phương thức thanh toán (trả thẳng, trả góp, đặt cọc) và nhập số tiền, Then hệ thống lưu bản ghi thanh toán.
- Given phương thức là đặt cọc hoặc trả góp, When tôi bỏ trống số tiền cọc, Then hệ thống báo lỗi.

US-11.3 — Hủy cọc
Là Sales, tôi muốn ghi nhận việc khách hủy cọc kèm lý do, để phản ánh đúng vào số liệu kinh doanh.
Actor: Sales, Admin | Priority: Trung bình | Liên quan: FR-11
Acceptance Criteria:
- Given hợp đồng có đặt cọc, When tôi chọn Hủy cọc và nhập lý do, Then hệ thống ghi nhận việc hủy cọc kèm người hủy, thời điểm, lý do và cập nhật số liệu tỷ lệ hủy cọc.
- Given hợp đồng đã hủy cọc, Then doanh thu của hợp đồng đó không tính vào số liệu doanh thu.

8. FUNCTIONAL REQUIREMENTS

8.1. Đặc tả FR01: Quản lý Lead

8.1.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR01: Quản lý Lead | Cung cấp các chức năng để Sales tạo mới hồ sơ, xem danh sách, lọc và xem chi tiết thông tin khách hàng trên ứng dụng di động, đồng thời gộp các Lead trùng và cho phép Admin gán, chuyển Lead. | Đây là nền tảng cốt lõi để thu thập và quản lý dữ liệu đầu vào cho toàn bộ quy trình bán hàng, giải quyết trực tiếp vấn đề rút thời gian nhập liệu từ 20–25 phút xuống dưới 3 phút. | Cao

8.1.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Sales nhập thông tin Lead (Họ tên, Số điện thoại, Dòng xe, Nguồn Lead) và nhấn Lưu | Hệ thống kiểm tra dữ liệu, kiểm tra trùng số điện thoại trong phạm vi cùng Sales; nếu hợp lệ, lưu vào IndexedDB với trạng thái chờ đồng bộ và hiển thị thông báo đã lưu cục bộ, sẽ đồng bộ khi có Internet.
2 | Sales mở màn hình Danh sách Lead | Hệ thống truy vấn Lead thuộc quyền của Sales đó, hiển thị kèm nhãn Trạng thái, Nguồn Lead và biểu tượng trạng thái đồng bộ.
3 | Sales áp bộ lọc hoặc nhập từ khóa tìm kiếm | Hệ thống trả kết quả trong dưới một giây; nếu không có kết quả thì hiển thị trạng thái rỗng.
4 | Sales chọn một Lead để xem chi tiết | Hệ thống hiển thị đầy đủ thông tin Lead kèm lịch sử chăm sóc.
5 | Sales cập nhật trạng thái Lead trong năm trạng thái xử lý | Hệ thống lưu thay đổi kèm thời điểm và ghi lịch sử thay đổi; hai trạng thái kết quả Thành công và Lead thất bại được cập nhật qua chức năng chốt kết quả (FR11 và US-01.6), không sửa trực tiếp tại đây.
6 | Phát hiện nhiều Lead trùng số điện thoại của cùng một Sales | Hệ thống cảnh báo trùng và cho phép gộp các Lead, giữ lại lịch sử chăm sóc của các Lead được gộp.
7 | Dịch vụ nền phát hiện thiết bị có Internet | Nếu có Lead ở trạng thái chờ đồng bộ, hệ thống gửi dữ liệu lên máy chủ theo cơ chế đồng bộ ở FR06 và cập nhật trạng thái đã đồng bộ.

8.1.3. Yêu cầu chức năng

FR01.1 - Tạo Lead
- Hệ thống phải cho phép tạo Lead mới cả khi thiết bị không có kết nối Internet, lưu tạm vào bộ nhớ cục bộ ở trạng thái chờ đồng bộ.
- Hệ thống phải yêu cầu bắt buộc trường Nguồn Lead khi tạo mới, chọn từ danh sách cố định gồm 12 giá trị.
- Hệ thống phải kiểm tra và cảnh báo trùng số điện thoại trong phạm vi cùng một Sales trước khi lưu, cho phép Sales gộp Lead hoặc xác nhận tạo mới, và gắn cờ nghi trùng để Admin rà soát.
- Hệ thống phải tự động gán trạng thái "Đang tìm hiểu" khi Lead được tạo mới.

FR01.2 - Xem danh sách và lọc Lead
- Hệ thống phải hiển thị danh sách Lead có khả năng lọc kết hợp theo Trạng thái, Nguồn Lead và trạng thái đồng bộ.
- Hệ thống phải trả kết quả lọc và tìm kiếm trong dưới một giây.
- Hệ thống phải giới hạn phạm vi hiển thị: Sales chỉ xem được Lead do mình tạo hoặc được gán.

FR01.3 - Xem chi tiết và cập nhật trạng thái Lead
- Hệ thống phải cho phép Sales cập nhật một trong năm trạng thái xử lý.
- Hệ thống phải lưu lịch sử mọi lần thay đổi trạng thái gồm người thay đổi, thời điểm, trạng thái trước và sau.
- Hệ thống phải khóa hai trạng thái kết quả Thành công và Lead thất bại tại màn hình cập nhật trạng thái, chỉ cho sửa qua chức năng chốt và sửa kết quả.

FR01.4 - Xóa, lưu trữ và gộp Lead
- Hệ thống phải thực hiện xóa Lead theo cơ chế xóa mềm, chuyển sang trạng thái Lưu trữ.
- Hệ thống phải cho phép gộp các Lead trùng số điện thoại của cùng một Sales, hợp nhất lịch sử chăm sóc và lịch hẹn, chuyển các Lead bị gộp sang Lưu trữ và ghi lại lịch sử thao tác.
- Hệ thống phải cho phép Admin xem toàn bộ Lead, gán và chuyển Lead giữa các Sales, giữ nguyên lịch sử chăm sóc.

8.2. Đặc tả FR02: Chăm sóc và theo dõi

8.2.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR02: Chăm sóc và theo dõi Lead | Cung cấp chức năng để Sales ghi nhận hoạt động chăm sóc, xem lại lịch sử chăm sóc, tạo lịch hẹn kèm nhắc nhở và nhận thông báo khi có Lead mới. | Chức năng quyết định chất lượng nuôi dưỡng Lead sau khi được tạo ở FR01, ảnh hưởng trực tiếp tỷ lệ chuyển đổi. Thiếu nhật ký chăm sóc đầy đủ sẽ khiến quản lý không giám sát được chất lượng đội Sales. | Cao

8.2.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Sales mở chi tiết Lead, bấm Ghi hoạt động, chọn Loại hoạt động và nhập ghi chú (không bắt buộc) | Hệ thống lưu bản ghi hoạt động gồm thời điểm, loại, ghi chú vào bộ nhớ cục bộ và cập nhật timeline lịch sử ngay trên màn hình.
2 | Sales xem lại lịch sử chăm sóc | Hệ thống hiển thị toàn bộ hoạt động theo thứ tự thời gian, mới nhất trước, kèm loại hoạt động và trạng thái Lead tại thời điểm đó.
3 | Sales chọn Tạo lịch hẹn, nhập ngày giờ, mục đích và địa điểm | Hệ thống lưu lịch hẹn liên kết với Lead và đặt nhắc nhở tự động trên thiết bị, mặc định trước giờ hẹn 30 phút.
4 | Sales tùy chọn đổi trạng thái Lead ngay trong lúc ghi hoạt động | Hệ thống ghi nhận trạng thái trước và sau vào cùng bản ghi hoạt động.
5 | Đến giờ hẹn đã đặt | Hệ thống đẩy thông báo nhắc lịch hẹn trên thiết bị của Sales phụ trách.
6 | Có Lead mới phát sinh từ website | Hệ thống tự động gán Lead cho một Sales theo cơ chế ngẫu nhiên và gửi thông báo đẩy cho Sales được gán.
7 | Admin xem lịch sử chăm sóc của một Sales bất kỳ | Hệ thống hiển thị toàn bộ hoạt động của Sales đó ở chế độ chỉ xem.

8.2.3. Yêu cầu chức năng

FR02.1 - Ghi nhận và xem lịch sử hoạt động chăm sóc
- Hệ thống phải cho phép Sales ghi nhận hoạt động chăm sóc gồm Loại hoạt động chọn từ danh sách cố định và Ghi chú dạng văn bản tự do; phần ghi chú không bắt buộc.
- Hệ thống phải hiển thị lịch sử chăm sóc theo dạng timeline, sắp xếp mới nhất trước, kèm thời gian, loại hoạt động, ghi chú và trạng thái Lead trước, sau nếu có thay đổi.
- Hệ thống không cho phép sửa hoặc xóa bản ghi hoạt động sau khi đã lưu.
- Hệ thống phải giới hạn: Sales chỉ ghi và xem hoạt động của Lead do mình phụ trách; Admin xem toàn bộ nhưng chỉ ở chế độ đọc.

FR02.2 - Tạo lịch hẹn và nhắc nhở
- Hệ thống phải cho phép Sales tạo lịch hẹn gồm Ngày giờ, Mục đích và Địa điểm.
- Hệ thống phải tự động đặt nhắc nhở trên thiết bị trước giờ hẹn theo khoảng thời gian cấu hình được, mặc định 30 phút, và chỉ chấp nhận thời gian trong tương lai.
- Hệ thống phải cho phép Sales xem danh sách lịch hẹn sắp tới của mình.

FR02.3 - Nhận thông báo Lead mới từ website
- Hệ thống phải tự động phát hiện Lead mới có nguồn là Website và gán cho một Sales theo cơ chế ngẫu nhiên.
- Hệ thống phải gửi thông báo đẩy cho Sales được gán ngay khi Lead từ website được tạo.

8.3. Đặc tả FR03: Tra cứu kho xe và đặt lịch lái thử

8.3.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR03: Tra cứu kho xe và đặt lịch lái thử | Cho phép Sales tìm kiếm, lọc, xem chi tiết và tồn kho xe, so sánh xe, đồng thời đặt và quản lý lịch lái thử tại showroom. | Hỗ trợ trực tiếp quá trình tư vấn và trải nghiệm sản phẩm, góp phần tăng tỷ lệ chuyển đổi từ Lead sang giao dịch. | Cao

8.3.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Sales nhập từ khóa hoặc chọn bộ lọc xe | Hệ thống gợi ý tự động từ hai ký tự và trả về danh sách xe khớp, chỉ gồm xe ở trạng thái Available hoặc In-transit.
2 | Sales chọn một xe để xem chi tiết | Hệ thống hiển thị hình ảnh, thông số, giá, khuyến mãi và tồn kho theo showroom.
3 | Sales chọn showroom, ngày và khung giờ, nhập thông tin khách rồi xác nhận đặt lái thử | Hệ thống kiểm tra ràng buộc khung giờ, tạo lịch ở trạng thái Chờ xác nhận, khóa khung giờ, sinh mã đặt lịch và tự tạo Lead.
4 | Sales xác nhận hoặc từ chối lịch lái thử | Hệ thống cập nhật trạng thái, thông báo cho khách; nếu từ chối thì giải phóng khung giờ.
5 | Sales hủy hoặc đổi lịch lái thử | Hệ thống kiểm tra mốc bốn giờ trước hẹn, giải phóng khung giờ cũ và cập nhật khung giờ mới nếu đổi.
6 | Đến trước giờ hẹn 24 giờ và 2 giờ | Hệ thống tự động gửi nhắc lịch cho các bên liên quan.
7 | Admin cấu hình khung giờ, số xe phục vụ và ngày nghỉ theo showroom | Hệ thống lưu cấu hình và chỉ hiển thị các khung giờ hợp lệ khi đặt lịch.

8.3.3. Yêu cầu chức năng

FR03.1 - Tra cứu kho xe
- Hệ thống phải cho phép tìm kiếm xe theo từ khóa với gợi ý tự động và lọc theo hãng, dòng xe, năm sản xuất, giá, nhiên liệu, hộp số, màu, kiểu dáng và showroom.
- Hệ thống phải chỉ hiển thị xe ở trạng thái Available hoặc In-transit.
- Hệ thống phải hiển thị chi tiết xe và tồn kho theo từng showroom, cập nhật không quá 5 phút.
- Hệ thống phải cho phép so sánh tối đa ba xe theo thông số.

FR03.2 - Đặt lịch lái thử
- Hệ thống phải cho phép đặt lịch lái thử khi xe khả dụng, thu thập họ tên và số điện thoại của khách, khóa khung giờ và sinh mã đặt lịch.
- Hệ thống phải giới hạn mỗi khách tối đa ba lịch đang hoạt động, khung giờ cách hiện tại tối thiểu hai giờ và mỗi khung giờ của một xe tại một showroom chỉ phục vụ một khách.
- Hệ thống phải cho phép xác nhận, từ chối, hủy và đổi lịch, tuân thủ mốc bốn giờ trước hẹn.
- Hệ thống phải tự động nhắc lịch trước 24 giờ và 2 giờ, và cho phép Sales ghi nhận kết quả sau buổi lái thử.
- Hệ thống phải cho phép Admin cấu hình khung giờ, số xe phục vụ và ngày nghỉ theo showroom.

8.4. Đặc tả FR04: Quản lý người dùng và phân quyền

8.4.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR04: Quản lý người dùng và phân quyền | Cho phép Admin tạo, chỉnh sửa, tạm khóa tài khoản người dùng, gán showroom, gán người quản lý và phân quyền theo vai trò Admin, Manager, Sales. Hệ thống ghi lại lịch sử các thao tác quản lý người dùng. | Bảo đảm mỗi người dùng chỉ truy cập đúng phạm vi dữ liệu được phép và phục vụ truy vết an toàn. | Cao

8.4.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Admin tạo tài khoản người dùng mới | Hệ thống kiểm tra email và số điện thoại duy nhất, tạo tài khoản và gửi email kèm liên kết đặt lại mật khẩu; ghi lại lịch sử tạo tài khoản.
2 | Admin gán vai trò, showroom và người quản lý cho một Sales | Hệ thống cập nhật phạm vi dữ liệu của người dùng theo vai trò và quan hệ quản lý.
3 | Người dùng đăng nhập | Hệ thống kiểm tra thông tin đăng nhập và trạng thái tài khoản, tạo phiên làm việc và ghi lại lịch sử đăng nhập.
4 | Admin tạm khóa hoặc kích hoạt lại tài khoản | Hệ thống cập nhật trạng thái tài khoản; tài khoản bị tạm khóa không đăng nhập được nhưng dữ liệu cũ vẫn giữ nguyên.

8.4.3. Yêu cầu chức năng

FR04.1 - Quản lý tài khoản người dùng
- Hệ thống phải cho phép Admin tạo, chỉnh sửa, tạm khóa và kích hoạt lại tài khoản người dùng.
- Hệ thống phải kiểm tra email và số điện thoại duy nhất khi tạo tài khoản.
- Hệ thống phải gửi email kèm liên kết đặt lại mật khẩu khi tạo tài khoản mới.
- Hệ thống phải giữ nguyên dữ liệu Lead và lịch sử cũ khi tài khoản bị tạm khóa.

FR04.2 - Vai trò và phân quyền
- Hệ thống phải hỗ trợ ba vai trò gồm Admin, Manager và Sales.
- Hệ thống phải cho phép gán Sales vào một showroom và gán một Manager quản lý.
- Hệ thống phải giới hạn phạm vi dữ liệu theo vai trò và quan hệ quản lý.

FR04.3 - Xác thực và ghi nhật ký
- Hệ thống phải hỗ trợ đăng nhập bằng email và mật khẩu, tạo phiên làm việc và cho phép đăng xuất.
- Hệ thống phải áp dụng chính sách mật khẩu cơ bản gồm độ dài tối thiểu và lưu trữ mật khẩu ở dạng đã mã hóa.
- Hệ thống phải ghi lại lịch sử các thao tác quản lý người dùng phục vụ truy vết.

Các cơ chế nâng cao như đăng nhập một lần, xác thực hai lớp, phân quyền theo thuộc tính, kiểm soát theo địa chỉ IP hoặc theo khung giờ, sơ đồ tổ chức nhiều tầng, nhập hàng loạt từ file và chính sách xoay mật khẩu định kỳ nằm ngoài phạm vi bản phát hành đầu và sẽ được cân nhắc ở giai đoạn sau.

8.5. Đặc tả FR05: Dashboard KPI và báo cáo

8.5.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR05: Dashboard KPI và báo cáo | Cung cấp dashboard tổng hợp các chỉ số về Lead và giao dịch, gồm số Lead mới, tỷ lệ chốt Won/Lost, doanh thu, tỷ lệ hủy cọc và bảng xếp hạng Sales, showroom. Dashboard phân quyền theo vai trò, hỗ trợ khóa số liệu theo kỳ và xuất báo cáo. | Cung cấp cho quản lý số liệu để đánh giá hiệu quả kinh doanh và điều chỉnh kịp thời. | Cao

8.5.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Người dùng mở dashboard | Hệ thống tải và tính toán các chỉ số theo phạm vi quyền của người dùng: Admin xem toàn hệ thống, Manager xem các Sales mình quản lý, Sales xem của bản thân.
2 | Người dùng chọn khoảng thời gian và bộ lọc | Hệ thống truy vấn và cập nhật các chỉ số, biểu đồ và bảng xếp hạng theo điều kiện.
3 | Người dùng xuất báo cáo | Hệ thống tạo file Excel hoặc PDF chứa đúng dữ liệu đang hiển thị trong phạm vi quyền.
4 | Admin khóa số liệu một kỳ | Hệ thống lưu ảnh chụp số liệu KPI của kỳ; các thay đổi phát sinh sau đó không làm đổi số liệu kỳ đã khóa.

8.5.3. Yêu cầu chức năng

FR05.1 - Chỉ số và bảng xếp hạng
- Hệ thống phải hiển thị số Lead mới theo kỳ và theo nguồn, tỷ lệ Won/Lost, các lý do Lost phổ biến và tỷ lệ chuyển đổi từ Lead sang Won.
- Hệ thống phải hiển thị doanh thu từ hợp đồng còn hiệu lực, số hợp đồng, tỷ lệ hủy cọc và giá trị hợp đồng trung bình, lấy dữ liệu từ FR11.
- Hệ thống phải hiển thị bảng xếp hạng Sales và showroom theo số Won hoặc doanh thu trong kỳ.

FR05.2 - Phân quyền, khóa kỳ và báo cáo
- Hệ thống phải phân quyền dashboard theo vai trò Admin, Manager, Sales.
- Hệ thống phải cho phép so sánh theo kỳ tuần, tháng, quý, năm và lọc theo ngày, Sales, showroom, nguồn Lead.
- Hệ thống phải cho phép Admin khóa và lưu ảnh chụp số liệu KPI theo kỳ tháng, quý và năm.
- Hệ thống phải cho phép xuất báo cáo ra Excel và PDF.

8.6. Đặc tả FR06: Cơ chế offline và đồng bộ hóa

8.6.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR06: Cơ chế offline và đồng bộ hóa | Cho phép Sales làm việc offline; dữ liệu tạo offline được lưu cục bộ trong IndexedDB và tự đồng bộ lên máy chủ khi có Internet. Hệ thống xử lý trùng lặp, giải quyết xung đột và ghi nhật ký đồng bộ. | Đây là nền tảng dùng chung bảo đảm Sales không bị gián đoạn công việc khi mất mạng và dữ liệu không bị mất. | Cao

8.6.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Sales tạo hoặc sửa dữ liệu khi thiết bị offline | Hệ thống lưu dữ liệu vào IndexedDB ở trạng thái chờ đồng bộ và hiển thị thông báo đã lưu cục bộ.
2 | Thiết bị có Internet trở lại | Dịch vụ nền quét các bản ghi chờ đồng bộ và gửi lên máy chủ.
3 | Máy chủ nhận yêu cầu đồng bộ | Máy chủ kiểm tra dữ liệu, xử lý trùng lặp theo mã định danh và thời điểm, rồi ghi vào cơ sở dữ liệu.
4 | Máy chủ trả kết quả | Hệ thống cập nhật trạng thái đã đồng bộ cho các bản ghi và ghi nhật ký đồng bộ.
5 | Đồng bộ thất bại | Hệ thống tự động thử lại và giữ nguyên dữ liệu ở trạng thái chờ đồng bộ.

8.6.3. Yêu cầu chức năng

FR06.1 - Lưu trữ offline
- Hệ thống phải lưu các bản ghi tạo offline vào IndexedDB gồm mã định danh, nội dung, thời điểm tạo, trạng thái đồng bộ và số lần thử.
- Hệ thống phải bảo đảm dữ liệu cục bộ không bị mất khi đóng và mở lại ứng dụng.

FR06.2 - Đồng bộ tự động và xử lý xung đột
- Hệ thống phải tự động quét và gửi các bản ghi chờ đồng bộ lên máy chủ khi có Internet.
- Hệ thống phải xử lý trùng lặp theo mã định danh và thời điểm, giữ lại bản ghi có thời điểm cập nhật mới nhất.
- Hệ thống phải tự động thử lại tối đa 5 lần, cách nhau 30 phút, trước khi đánh dấu thất bại, và không làm mất dữ liệu chờ đồng bộ.
- Hệ thống phải ghi nhật ký đồng bộ và cho phép người dùng xem trạng thái đồng bộ cũng như đồng bộ thủ công khi cần.

8.7. Đặc tả FR07: Website danh mục xe

8.7.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR07: Website danh mục xe | Hiển thị công khai danh mục xe trên website cho người truy cập không cần đăng nhập, gồm tìm kiếm, lọc, xem chi tiết và so sánh xe kèm ước tính trả góp. Dữ liệu xe chỉ đọc, lấy từ hệ thống kho xe qua API. | Giúp khách hàng tìm hiểu sản phẩm trước khi liên hệ, hỗ trợ thu hút Lead qua website. | Cao

8.7.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Khách mở trang danh mục xe và áp bộ lọc | Hệ thống hiển thị danh sách xe khớp điều kiện, chỉ gồm xe Available hoặc In-transit.
2 | Khách xem chi tiết một xe | Hệ thống hiển thị thông số, giá, khuyến mãi và ước tính trả góp.
3 | Khách thêm xe vào so sánh | Hệ thống hiển thị bảng so sánh tối đa ba xe kèm ước tính trả góp cho từng xe.
4 | Hệ thống gọi API kho xe định kỳ | Hệ thống cập nhật dữ liệu xe, giá và tồn kho mỗi 5 phút.

8.7.3. Yêu cầu chức năng

FR07.1 - Hiển thị và tra cứu xe công khai
- Hệ thống phải hiển thị danh sách xe công khai kèm ảnh, giá và trạng thái, cho phép tìm kiếm và lọc theo hãng, phân khúc, giá.
- Hệ thống phải hiển thị trang chi tiết xe với thông số, giá, khuyến mãi và ước tính trả góp.
- Hệ thống phải cho phép so sánh tối đa ba xe.
- Hệ thống phải lấy dữ liệu xe ở chế độ chỉ đọc từ hệ thống kho xe qua API, cập nhật định kỳ mỗi 5 phút.

FR07.2 - Ước tính trả góp
- Hệ thống phải cung cấp công cụ ước tính khoản trả góp dựa trên giá xe, tỷ lệ trả trước, kỳ hạn vay và lãi suất, và nêu rõ đây là số liệu tham khảo, không phải cam kết của ngân hàng.
- Hệ thống phải cho phép Admin cấu hình bảng lãi suất theo từng ngân hàng thay vì cố định trong mã nguồn.
- Công thức ước tính khoản trả hàng tháng theo phương pháp dư nợ giảm dần: số tiền vay bằng giá xe nhân với phần còn lại sau khi trừ tỷ lệ trả trước; khoản trả hàng tháng được tính từ số tiền vay, lãi suất tháng và số kỳ. Hệ thống cần cho chọn cách tính theo dư nợ giảm dần hoặc theo dư nợ gốc ban đầu và ghi rõ cách áp dụng.
- Bảng lãi suất vay mua ô tô sử dụng số tham khảo thị trường của các ngân hàng Techcombank, Agribank, HDBank, Sacombank và Vietcombank, phổ biến trong khoảng 7,5% đến 9,5% một năm cho giai đoạn ưu đãi và thả nổi khoảng 10% đến 11% một năm sau ưu đãi. Doanh nghiệp cần cung cấp biểu lãi suất chính thức của từng ngân hàng trước khi triển khai chính thức.

8.8. Đặc tả FR08: Quản lý nội dung website

8.8.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR08: Quản lý nội dung website | Cho phép Admin quản lý nội dung công khai trên website gồm banner, xe nổi bật, thông tin liên hệ, giới thiệu thương hiệu và nội dung trang chủ. Website hiển thị nội dung đã được Admin cập nhật. | Giúp doanh nghiệp chủ động quản lý hình ảnh thương hiệu và thông tin cung cấp cho khách hàng. | Trung bình

8.8.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Admin truy cập chức năng Quản lý nội dung website | Hệ thống hiển thị danh sách các nội dung đang sử dụng trên website.
2 | Admin tạo mới, chỉnh sửa hoặc xóa nội dung | Hệ thống kiểm tra dữ liệu, yêu cầu xác nhận khi xóa và lưu thay đổi.
3 | Nội dung được cập nhật thành công | Website tự động đọc và hiển thị nội dung mới cho khách hàng.

8.8.3. Yêu cầu chức năng

- Hệ thống phải cho phép Admin tạo, xem, chỉnh sửa và xóa banner cùng các nội dung được quản lý trên website.
- Hệ thống phải cho phép Admin cập nhật thông tin liên hệ, nội dung giới thiệu và thông tin thương hiệu.
- Hệ thống phải kiểm tra các trường bắt buộc và tính hợp lệ trước khi lưu, và yêu cầu xác nhận trước khi xóa.
- Website phải chỉ hiển thị nội dung công khai ở chế độ đọc; chỉ Admin được thực hiện tạo, chỉnh sửa và xóa nội dung.

8.9. Đặc tả FR09: Tiếp nhận yêu cầu từ website

8.9.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR09: Tiếp nhận yêu cầu từ website | Cho phép khách gửi yêu cầu đăng ký lái thử, tư vấn hoặc CSKH qua biểu mẫu trên website. Hệ thống tự tạo Lead và chuyển vào FR01, gửi email thông báo cho Sales và email xác nhận cho khách. | Giúp biến yêu cầu từ website thành Lead, giảm nhập liệu thủ công và hạn chế bỏ sót khách hàng tiềm năng. | Cao

8.9.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Khách chọn loại yêu cầu và điền biểu mẫu | Hệ thống hiển thị biểu mẫu tương ứng và kiểm tra tính hợp lệ của dữ liệu, trong đó số điện thoại là bắt buộc.
2 | Khách gửi yêu cầu hợp lệ | Hệ thống tạo Lead mới với nguồn Website, gán Sales theo cơ chế ngẫu nhiên và lưu loại nhu cầu.
3 | Lead được tạo thành công | Hệ thống gửi email thông báo cho Sales và email xác nhận cho khách.
4 | Tạo Lead thất bại | Hệ thống ghi nhận lỗi và không xác nhận thành công với khách để tránh mất yêu cầu.

8.9.3. Yêu cầu chức năng

- Hệ thống phải cung cấp biểu mẫu cho ít nhất ba loại yêu cầu gồm đăng ký lái thử, tư vấn và CSKH, cho phép khách ẩn danh gửi mà không cần tài khoản.
- Hệ thống phải kiểm tra tính hợp lệ của dữ liệu, bắt buộc số điện thoại, và không tạo Lead nếu thiếu trường bắt buộc.
- Hệ thống phải tự tạo Lead với nguồn Website, ghi nhận loại nhu cầu và chuyển vào FR01.
- Hệ thống phải gửi email thông báo cho Sales và email xác nhận cho khách; nếu tạo Lead thất bại thì ghi nhận lỗi và không xác nhận với khách.

8.10. Đặc tả FR10: Onboarding PWA và thông báo đẩy

8.10.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR10: Onboarding PWA và thông báo đẩy | Hướng dẫn Sales cài đặt ứng dụng PWA và cấp quyền thông báo ngay từ lần đăng nhập đầu, và gửi thông báo đẩy cho các sự kiện nhắc lịch hẹn, Lead mới từ website, xác nhận lái thử. | Bảo đảm Sales nhận được nhắc việc kịp thời, là điều kiện để các tính năng nhắc việc hoạt động đúng. | Cao

8.10.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Sales đăng nhập lần đầu | Hệ thống yêu cầu cài đặt Thêm vào màn hình chính và cấp quyền thông báo trước khi dùng đầy đủ tính năng nhắc việc.
2 | Sales từ chối cấp quyền thông báo | Hệ thống cảnh báo về việc không nhận được nhắc việc và cho phép cấp quyền lại trong Cài đặt.
3 | Phát sinh sự kiện cần nhắc | Hệ thống gửi thông báo đẩy tới thiết bị của Sales.

8.10.3. Yêu cầu chức năng

- Hệ thống phải đăng ký dịch vụ nền và thông báo đẩy trong quá trình onboarding.
- Hệ thống phải kiểm tra và nhắc cấp quyền thông báo, và chặn sử dụng tính năng nhắc việc nếu chưa cấp quyền.
- Hệ thống phải gửi thông báo đẩy cho các sự kiện nhắc lịch hẹn, Lead mới từ website và xác nhận lái thử.

8.11. Đặc tả FR11: Hợp đồng bán xe và thanh toán

8.11.1. Mô tả và đánh giá độ ưu tiên

Chức năng | Mô tả | Đánh giá | Độ ưu tiên
FR11: Hợp đồng bán xe và thanh toán | Cho phép Sales tạo hợp đồng bán xe từ Lead đã chốt Won, ghi nhận thanh toán và đặt cọc, và ghi nhận hủy cọc. Đây là nguồn dữ liệu cho các chỉ số doanh thu và tỷ lệ hủy cọc trên dashboard. Chức năng không bao gồm bàn giao xe và không ký số hợp đồng. | Bổ sung dữ liệu giao dịch để đo lường doanh thu và tỷ lệ hủy cọc, phục vụ đánh giá kinh doanh. | Cao

8.11.2. Tương tác và phản hồi hệ thống

STT | Tương tác | Phản hồi hệ thống
1 | Sales chọn Tạo hợp đồng từ một Lead ở trạng thái Thành công | Hệ thống kiểm tra điều kiện và tạo hợp đồng gắn với Lead, sinh mã hợp đồng.
2 | Sales ghi nhận thanh toán hoặc đặt cọc | Hệ thống lưu bản ghi thanh toán gồm phương thức, số tiền và thời điểm; với trả góp hoặc đặt cọc thì yêu cầu số tiền cọc.
3 | Sales ghi nhận hủy cọc kèm lý do | Hệ thống lưu lịch sử hủy cọc và cập nhật số liệu tỷ lệ hủy cọc.

8.11.3. Yêu cầu chức năng

- Hệ thống phải chỉ cho phép tạo hợp đồng từ Lead ở trạng thái Thành công, mỗi Lead tối đa một hợp đồng còn hiệu lực.
- Hệ thống phải ghi nhận giá trị hợp đồng, dòng xe, ngày chốt và ghi chú.
- Hệ thống phải ghi nhận phương thức thanh toán gồm trả thẳng, trả góp, đặt cọc; với trả góp hoặc đặt cọc thì bắt buộc nhập số tiền cọc.
- Hệ thống phải cho phép hủy cọc kèm lý do và lưu lịch sử hủy.
- Hệ thống phải cung cấp dữ liệu doanh thu và tỷ lệ hủy cọc cho FR05, chỉ tính doanh thu từ hợp đồng còn hiệu lực.
- Hệ thống không bao gồm bàn giao xe và không ký số hợp đồng.

9. TRẠNG THÁI LEAD

Lead có ba nhóm trạng thái. Nhóm trạng thái xử lý gồm năm giá trị do Sales thiết lập: Đang tìm hiểu (mặc định khi tạo mới), Không liên lạc được, Tương tác chưa thành công, Có nhu cầu ngay và Không có nhu cầu. Nhóm trạng thái kết quả gồm Thành công và Lead thất bại, được thiết lập qua chức năng chốt kết quả. Ngoài ra Lead có thể chuyển sang trạng thái Lưu trữ khi bị xóa mềm hoặc bị gộp.

Quy tắc chuyển trạng thái: khi tạo mới, Lead ở trạng thái Đang tìm hiểu; giữa năm trạng thái xử lý, Sales chuyển tự do; từ trạng thái xử lý có thể chuyển sang Thành công hoặc Lead thất bại qua chức năng chốt kết quả; giữa Thành công và Lead thất bại, hoặc quay lại một trong năm trạng thái xử lý, hệ thống cho phép sửa nhưng bắt buộc nhập lý do thay đổi và ghi lịch sử; từ bất kỳ trạng thái nào, Lead có thể chuyển sang Lưu trữ. Trạng thái đồng bộ (chờ đồng bộ, đã đồng bộ, thất bại) là một trục độc lập với trạng thái nghiệp vụ nêu trên.

10. NON-FUNCTIONAL REQUIREMENTS

NFR | Loại | Nội dung
NFR-01 | Nền tảng | Ứng dụng bắt buộc là PWA có dịch vụ nền và thông báo đẩy; Sales phải cài đặt Thêm vào màn hình chính và cấp quyền thông báo ngay từ onboarding.
NFR-02 | Tương thích thiết bị | Tối thiểu iOS 16.4 trở lên trên Safari hoặc Android Chrome/Edge bản mới để hỗ trợ thông báo đẩy trên nền web.
NFR-03 | Hiệu năng | Tìm kiếm và lọc Lead cũng như tra cứu xe phải trả kết quả trong dưới một giây; gợi ý tự động cho xe kích hoạt từ hai ký tự trở lên.
NFR-04 | Độ tin cậy khi offline | Toàn bộ thao tác tạo và sửa Lead, chốt và sửa kết quả, ghi chú, lịch hẹn phải hoạt động khi mất mạng, lưu cục bộ trong IndexedDB và không mất dữ liệu khi đóng, mở lại ứng dụng.
NFR-05 | Độ tin cậy khi đồng bộ | Đồng bộ tự động thử lại tối đa 5 lần, cách nhau 30 phút, trước khi đánh dấu thất bại; không được mất dữ liệu ở trạng thái chờ đồng bộ dù thất bại nhiều lần.
NFR-06 | Bảo mật | Giao tiếp giữa máy khách và máy chủ bắt buộc qua HTTPS; dữ liệu khách hàng lưu cục bộ cần được bảo vệ ở mức cơ bản và không lưu lâu dài các thông tin nhạy cảm ở dạng văn bản thuần.
NFR-07 | Phân quyền và truy vết | Sales chỉ truy cập được Lead do mình tạo hoặc được gán; mọi lần sửa kết quả Won/Lost bắt buộc ghi lý do và lưu đầy đủ lịch sử thay đổi phục vụ truy vết.
NFR-08 | Khả dụng | Dịch vụ máy chủ, đặc biệt là dịch vụ đồng bộ, đạt mức khả dụng tối thiểu 99,5%.
NFR-09 | Khả năng mở rộng | Cơ chế hàng đợi đồng bộ phải hỗ trợ bổ sung loại dữ liệu offline mới trong tương lai mà không phải thay đổi cấu trúc.
NFR-10 | Giám sát và nhật ký | Mọi lượt đồng bộ và mọi lần sửa kết quả Won/Lost phải được ghi nhật ký để phục vụ giám sát.
NFR-11 | Khả năng sử dụng | Giao diện tối giản, dùng tiếng Việt, tối ưu cho thao tác một tay trên thiết bị di động, phù hợp bối cảnh Sales tư vấn tại showroom.
NFR-12 | Dung lượng | Giới hạn dung lượng cài đặt và bộ nhớ đệm trên thiết bị không quá 200 MB, phù hợp với lượng khách hàng và dữ liệu phát sinh trong ngày.
NFR-13 | Toàn vẹn báo cáo | Do Sales có thể sửa kết quả Won/Lost và hủy cọc, hệ thống khóa và lưu ảnh chụp số liệu KPI theo kỳ tháng, quý và năm; số liệu của kỳ đã khóa không thay đổi về sau.

11. DATA DICTIONARY

11.1. Bảng leads
Lưu thông tin khách hàng tiềm năng, là thực thể trung tâm của hệ thống.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính, sinh phía client khi tạo offline | Định danh Lead, không đổi kể cả sau khi đồng bộ
server_id | BIGINT | Không | Duy nhất khi có giá trị | Định danh do máy chủ cấp sau khi đồng bộ
full_name | VARCHAR(100) | Có | Tối đa 100 ký tự | Họ tên khách hàng
phone | VARCHAR(11) | Có | 9 đến 11 chữ số, không duy nhất toàn cục | Số điện thoại; trùng chỉ tính trong phạm vi cùng một Sales
car_model_id | UUID | Không | Khóa ngoại tới car_models | Dòng xe khách quan tâm
source | ENUM | Có | 12 giá trị nguồn cố định | Nguồn Lead
status_detail | ENUM | Có | Năm trạng thái xử lý, Thành công, Lead thất bại, Lưu trữ | Trạng thái Lead
lost_reason_id | UUID | Không | Khóa ngoại tới lost_reasons, bắt buộc khi Lead thất bại | Lý do Lost
lost_reason_note | TEXT | Không | Bắt buộc khi lý do là Khác | Lý do cụ thể
flag_duplicate_phone | BOOLEAN | Có | Mặc định false | Cờ nghi trùng số điện thoại để Admin rà soát
is_archived | BOOLEAN | Có | Mặc định false | Đánh dấu Lead đã lưu trữ
assigned_sales_id | UUID | Không | Khóa ngoại tới users | Sales phụ trách; rỗng nếu Lead từ website chưa được gán
created_by | UUID | Có | Khóa ngoại tới users | Người tạo Lead
sync_status | ENUM | Có | Chờ đồng bộ, đã đồng bộ, thất bại | Trạng thái đồng bộ
sync_attempts | INT | Có | Mặc định 0 | Số lần thử đồng bộ
created_at | TIMESTAMP | Có | | Thời điểm tạo
updated_at | TIMESTAMP | Có | | Thời điểm sửa gần nhất, dùng để giải xung đột đồng bộ

11.2. Bảng interactions
Nhật ký hoạt động chăm sóc, mỗi lần Sales gọi điện hoặc gặp khách. Bản ghi không được sửa hoặc xóa sau khi lưu.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh bản ghi
lead_id | UUID | Có | Khóa ngoại tới leads | Lead được chăm sóc
type | ENUM | Có | Gọi điện, Nhắn tin/Zalo, Gặp trực tiếp, Lịch hẹn, Khác | Loại hoạt động
note | TEXT | Không | Cho phép để trống | Nội dung ghi chú
status_before | ENUM | Không | Một trong năm trạng thái xử lý | Trạng thái Lead trước
status_after | ENUM | Không | Rỗng nếu không đổi | Trạng thái Lead sau
created_by | UUID | Có | Khóa ngoại tới users | Sales ghi nhận
sync_status | ENUM | Có | Chờ đồng bộ, đã đồng bộ, thất bại | Trạng thái đồng bộ
created_at | TIMESTAMP | Có | | Thời điểm ghi nhận

11.3. Bảng reminders
Lịch hẹn và nhắc việc gắn với Lead.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh lịch hẹn
lead_id | UUID | Có | Khóa ngoại tới leads | Lead liên quan
remind_at | TIMESTAMP | Có | Phải lớn hơn thời điểm hiện tại | Thời điểm hẹn
purpose | ENUM | Có | Lái thử, Tư vấn lại, Khác | Mục đích
location | VARCHAR(255) | Không | | Địa điểm
notify_before_minutes | INT | Có | Mặc định 30 | Số phút nhắc trước giờ hẹn
notified | BOOLEAN | Có | Mặc định false | Đã gửi thông báo hay chưa
created_by | UUID | Có | Khóa ngoại tới users | Sales tạo lịch hẹn
sync_status | ENUM | Có | Chờ đồng bộ, đã đồng bộ, thất bại | Trạng thái đồng bộ
created_at | TIMESTAMP | Có | | Thời điểm tạo

11.4. Bảng lead_status_history
Lịch sử thay đổi trạng thái Lead, phục vụ truy vết.

Trường | Kiểu | Bắt buộc | Mô tả
id | UUID | Có | Khóa chính
lead_id | UUID | Có | Khóa ngoại tới leads
status_before | ENUM | Có | Trạng thái trước
status_after | ENUM | Có | Trạng thái sau
reason | TEXT | Không | Bắt buộc khi sửa kết quả Won/Lost
changed_by | UUID | Có | Người thay đổi
changed_at | TIMESTAMP | Có | Thời điểm thay đổi

11.5. Bảng users
Người dùng nội bộ của hệ thống.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh người dùng
full_name | VARCHAR(100) | Có | | Họ tên
email | VARCHAR(150) | Có | Duy nhất | Email đăng nhập
phone | VARCHAR(11) | Có | Duy nhất | Số điện thoại
role | ENUM | Có | Admin, Manager, Sales | Vai trò
showroom_id | UUID | Không | Khóa ngoại tới showrooms | Showroom được gán
manager_id | UUID | Không | Khóa ngoại tới users | Manager quản lý Sales này
status | ENUM | Có | Hoạt động, Tạm khóa | Trạng thái tài khoản
created_at | TIMESTAMP | Có | | Thời điểm tạo

11.6. Bảng showrooms
Danh sách showroom.

Trường | Kiểu | Bắt buộc | Mô tả
id | UUID | Có | Khóa chính
name | VARCHAR(150) | Có | Tên showroom
address | VARCHAR(255) | Không | Địa chỉ

11.7. Bảng test_drive_bookings
Lịch lái thử.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh lịch
booking_code | VARCHAR(20) | Có | Duy nhất | Mã đặt lịch
car_model_id | UUID | Có | Khóa ngoại tới car_models | Xe lái thử
showroom_id | UUID | Có | Khóa ngoại tới showrooms | Showroom
slot_id | UUID | Có | Khóa ngoại tới slots | Khung giờ đã đặt
customer_name | VARCHAR(100) | Có | | Họ tên khách
customer_phone | VARCHAR(11) | Có | | Số điện thoại khách
lead_id | UUID | Không | Khóa ngoại tới leads | Lead tự sinh từ đặt lịch
status | ENUM | Có | Chờ xác nhận, Đã xác nhận, Từ chối, Hoàn thành, Vắng mặt, Hủy | Trạng thái lịch
result_note | TEXT | Không | | Ghi chú kết quả
created_at | TIMESTAMP | Có | | Thời điểm tạo

11.8. Bảng slots
Cấu hình khung giờ lái thử theo showroom.

Trường | Kiểu | Bắt buộc | Mô tả
id | UUID | Có | Khóa chính
showroom_id | UUID | Có | Khóa ngoại tới showrooms
start_time | TIMESTAMP | Có | Thời điểm bắt đầu khung giờ
end_time | TIMESTAMP | Có | Thời điểm kết thúc khung giờ
car_model_id | UUID | Không | Xe phục vụ lái thử
is_available | BOOLEAN | Có | Còn trống hay đã khóa
is_holiday | BOOLEAN | Có | Ngày nghỉ

11.9. Bảng contracts
Hợp đồng bán xe.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh hợp đồng
contract_code | VARCHAR(20) | Có | Duy nhất | Mã hợp đồng
lead_id | UUID | Có | Khóa ngoại tới leads ở trạng thái Thành công | Lead nguồn
car_model_id | UUID | Có | Khóa ngoại tới car_models | Dòng xe bán
value | DECIMAL(14,2) | Có | Lớn hơn 0 | Giá trị hợp đồng
signed_date | DATE | Có | | Ngày chốt hợp đồng
status | ENUM | Có | Hiệu lực, Đã hủy cọc | Trạng thái hợp đồng
note | TEXT | Không | | Ghi chú, sản phẩm và dịch vụ kèm theo
created_by | UUID | Có | Khóa ngoại tới users | Sales tạo hợp đồng
created_at | TIMESTAMP | Có | | Thời điểm tạo

11.10. Bảng payments
Bản ghi thanh toán và đặt cọc.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh bản ghi
contract_id | UUID | Có | Khóa ngoại tới contracts | Hợp đồng liên quan
method | ENUM | Có | Trả thẳng, Trả góp, Đặt cọc | Phương thức thanh toán
amount | DECIMAL(14,2) | Có | Lớn hơn 0 | Số tiền
deposit_amount | DECIMAL(14,2) | Không | Bắt buộc khi trả góp hoặc đặt cọc | Số tiền cọc
paid_at | TIMESTAMP | Có | | Thời điểm thanh toán
is_cancelled | BOOLEAN | Có | Mặc định false | Đã hủy cọc hay chưa
cancel_reason | TEXT | Không | Bắt buộc khi hủy cọc | Lý do hủy cọc
cancelled_by | UUID | Không | Khóa ngoại tới users | Người hủy cọc
cancelled_at | TIMESTAMP | Không | | Thời điểm hủy cọc

11.11. Bảng kpi_snapshots
Ảnh chụp số liệu KPI theo kỳ đã khóa.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh ảnh chụp
period_type | ENUM | Có | Tháng, Quý, Năm | Loại kỳ
period_label | VARCHAR(20) | Có | | Nhãn kỳ, ví dụ 2026-09, 2026-Q3, 2026
scope | ENUM | Có | Toàn hệ thống, Manager, Sales | Phạm vi số liệu
scope_ref_id | UUID | Không | Khóa ngoại tới users | Định danh Manager hoặc Sales tương ứng
data_json | TEXT | Có | | Toàn bộ số liệu KPI đã chốt của kỳ
locked_by | UUID | Có | Khóa ngoại tới users | Admin thực hiện khóa
locked_at | TIMESTAMP | Có | | Thời điểm khóa

11.12. Bảng car_models
Danh mục xe ở chế độ chỉ đọc, là bản đồng bộ từ hệ thống kho xe. Không có thao tác tạo, sửa, xóa từ hệ thống này.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính, khớp định danh từ hệ thống kho xe | Định danh dòng xe
name | VARCHAR(150) | Có | | Tên dòng xe
brand | VARCHAR(50) | Có | | Hãng xe
price | DECIMAL(14,2) | Có | | Giá niêm yết
fuel_type | VARCHAR(20) | Không | Xăng, Dầu, Điện, Hybrid | Loại nhiên liệu
status | ENUM | Có | Available, In-transit, OutOfStock | Chỉ hiển thị Available và In-transit cho người dùng
last_synced_at | TIMESTAMP | Có | Cập nhật không quá 5 phút | Lần đồng bộ gần nhất từ hệ thống kho xe

Các thuộc tính chi tiết như năm sản xuất, hộp số, màu, kiểu dáng, hình ảnh, khuyến mãi và tồn kho theo showroom được lấy từ hệ thống kho xe qua API và không lưu chủ tại hệ thống này.

11.13. Bảng lost_reasons
Danh mục lý do Lost do Admin cấu hình.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh lý do
label | VARCHAR(100) | Có | Ví dụ Giá cao, Chọn đối thủ, Vướng ngân hàng, Khác | Tên hiển thị
requires_note | BOOLEAN | Có | Đúng với lý do Khác | Bắt buộc nhập lý do cụ thể khi đúng
active | BOOLEAN | Có | Mặc định true | Ẩn lý do không còn dùng mà không xóa lịch sử

11.14. Bảng sync_queue
Hàng đợi đồng bộ phía client, theo dõi các bản ghi đang chờ, đã hoặc chưa đồng bộ được.

Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả
id | UUID | Có | Khóa chính | Định danh bản ghi hàng đợi
entity_type | ENUM | Có | lead, interaction, reminder | Loại bản ghi cần đồng bộ
entity_id | UUID | Có | Tham chiếu logic, không khóa ngoại cứng | Định danh bản ghi gốc
payload | TEXT | Có | | Nội dung bản ghi để gửi lên máy chủ
status | ENUM | Có | Chờ đồng bộ, đã đồng bộ, thất bại | Trạng thái xử lý
sync_attempts | INT | Có | Mặc định 0, đánh dấu thất bại khi đạt 5 | Số lần đã thử
server_id | VARCHAR(64) | Không | | Định danh phía máy chủ sau khi đồng bộ
last_attempt_at | TIMESTAMP | Không | | Lần thử gần nhất
created_at | TIMESTAMP | Có | | Thời điểm đưa vào hàng đợi

12. MA TRẬN TRUY VẾT

BR | FR | US chính | Bảng dữ liệu liên quan
BR-01 | FR-01 | US-01.1, US-01.7 | leads
BR-02 | FR-01 | US-01.6 | leads, lost_reasons
BR-03 | FR-01 | US-01.6 | lead_status_history
BR-04 | FR-01 | US-01.4 | leads
BR-05, BR-06 | FR-02 | US-02.1 | interactions
BR-07 | FR-02 | US-02.2 | reminders
BR-08, BR-19 | FR-10 | US-10.1 | users
BR-09, BR-10 | FR-04 | US-04.1, US-04.2 | users
BR-11 | FR-01, FR-02, FR-06 | US-06.1 | leads, interactions, sync_queue
BR-12, BR-13, BR-14 | FR-06 | US-06.2 | sync_queue
BR-15, BR-16 | FR-07 | US-07.1 | car_models
BR-17, BR-18 | FR-09 | US-09.1 | leads
BR-INV-01, BR-INV-02 | FR-03, FR-07 | US-03.1, US-07.1 | car_models
BR-TD-01 đến BR-TD-05 | FR-03 | US-03.4 đến US-03.6 | test_drive_bookings, slots
BR-20, BR-21 | FR-11 | US-11.1, US-11.2 | contracts, payments
BR-22, BR-23 | FR-11, FR-05 | US-11.3 | payments, contracts
BR-24 | FR-05 | US-05.1 | users, kpi_snapshots
BR-25 | FR-05 | US-05.3 | kpi_snapshots

13. MOCKUP VÀ PROTOTYPE

Bản thiết kế giao diện sẽ được bổ sung sau khi hoàn thiện tài liệu yêu cầu, gồm các màn hình chính: danh sách Lead, chi tiết Lead, ghi hoạt động chăm sóc, lịch hẹn, tra cứu xe, đặt lịch lái thử, tạo hợp đồng và dashboard.
