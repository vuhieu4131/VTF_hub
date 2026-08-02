import React, { useState } from "react";
import { Page, Box, Text, Input, Header, Modal } from "zmp-ui";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import logo from "../static/logo.png";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(true);
  const [resetEmail, setResetEmail] = useState("");
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      setError("Đăng nhập thất bại: " + err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      alert("Vui lòng nhập email của bạn.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      alert("Đường link đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!");
      setResetModalVisible(false);
      setResetEmail("");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  return (
    <Page className="bg-gray-50 flex flex-col h-full">
      <Header title="Đăng nhập hệ thống" showBackIcon={false} />
      <Box className="p-6 flex-1 flex flex-col justify-center">
        <Box className="bg-white p-6 rounded-2xl shadow-sm">
          <Box className="flex justify-center mb-4">
            <img src={logo} alt="Logo" className="w-24 h-24 object-contain mx-auto" />
          </Box>
          <Text className="text-xl font-bold text-center text-blue-800 mb-6">Đăng nhập</Text>
          
          {error && <Text className="text-red-500 text-sm mb-4 text-center">{error}</Text>}
          
          <Box className="space-y-4">
            <Box>
              <Text className="text-sm text-gray-600 mb-1">Email</Text>
              <Input
                type="text"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Box>
            <Box>
              <Text className="text-sm text-gray-600 mb-1">Mật khẩu</Text>
              <Input.Password
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Box>
            
            <button 
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium active:bg-blue-700 transition-colors shadow-sm mt-4" 
              onClick={handleLogin}
            >
              Đăng nhập
            </button>
          </Box>
          
          <Box className="mt-4 flex flex-col items-center space-y-2">
            <Text className="text-sm text-blue-600 cursor-pointer" onClick={() => setResetModalVisible(true)}>
              Quên mật khẩu?
            </Text>
            <Text className="text-sm text-gray-500 cursor-pointer underline hover:text-blue-600 transition-colors" onClick={() => setTermsModalVisible(true)}>
              Điều khoản hoạt động
            </Text>
          </Box>
          
          <Box className="mt-6 text-center pt-4 border-t border-gray-100">
            <Text className="text-sm text-gray-500">Chưa có tài khoản?</Text>
            <Text className="text-sm text-blue-600 font-medium mt-1" onClick={() => navigate("/register")}>
              Đăng ký ngay
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Welcome Modal */}
      <Modal 
        visible={welcomeModalVisible} 
        title="Welcome to VTF_Hub"
        onClose={() => setWelcomeModalVisible(false)}
        actions={[
          { text: "Bắt đầu khám phá", highLight: true, onClick: () => setWelcomeModalVisible(false) }
        ]}
      >
        <Box className="p-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <Text className="text-[15px] text-gray-700 leading-relaxed text-center">
            Ứng dụng <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">VTF Hub - Trạm tiện ích VTCI</span> là ứng dụng nội bộ của viên chức, nhân viên VTF trong việc ứng dụng <span className="font-medium text-blue-700">Chuyển đổi số</span> và <span className="font-medium text-blue-700">Đổi mới sáng tạo</span> trong công việc hàng ngày.
          </Text>
        </Box>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal 
        visible={resetModalVisible} 
        title="Quên mật khẩu" 
        onClose={() => setResetModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Gửi link", highLight: true, onClick: handleResetPassword }
        ]}
      >
        <Box className="p-4">
          <Text className="text-sm text-gray-600 mb-3">
            Vui lòng nhập email tài khoản của bạn. Hệ thống sẽ gửi một đường link để bạn tạo mật khẩu mới.
          </Text>
          <Input
            type="text"
            placeholder="Nhập email của bạn"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
        </Box>
      </Modal>
    {/* Terms of Use Modal */}
      <Modal
        visible={termsModalVisible}
        title="Điều khoản sử dụng"
        onClose={() => setTermsModalVisible(false)}
        actions={[
          { text: "Đóng", highLight: true, onClick: () => setTermsModalVisible(false) }
        ]}
      >
        <Box className="p-4 h-[60vh] overflow-y-auto thin-scrollbar">
          <Text className="text-[15px] font-bold text-blue-800 mb-3 text-center">
            Điều khoản sử dụng ứng dụng "VTF Hub - Trạm tiện ích VTCI"
          </Text>
          <Text className="text-sm text-gray-700 mb-3 text-justify">
            Chào mừng bạn đến với ứng dụng VTF Hub - Trạm tiện ích VTCI (sau đây gọi tắt là "Ứng dụng"). Ứng dụng được thiết kế dưới dạng Zalo Mini App nhằm cung cấp không gian làm việc số và quản lý thông tin nội bộ cho Viên chức, nhân viên.
          </Text>
          <Text className="text-sm text-gray-700 mb-4 text-justify">
            Bằng việc truy cập và sử dụng Ứng dụng, bạn đồng ý tuân thủ các Điều khoản sử dụng dưới đây. Vui lòng đọc kỹ các quy định này trước khi bắt đầu sử dụng.
          </Text>

          <Text className="text-sm font-bold text-gray-800 mb-2 mt-4">1. Mục đích của Ứng dụng</Text>
          <Text className="text-sm text-gray-700 mb-2">VTF Hub - Trạm tiện ích VTCI cung cấp các công cụ hỗ trợ công việc nội bộ, bao gồm nhưng không giới hạn ở:</Text>
          <ul className="list-disc pl-5 text-sm text-gray-700 mb-3 space-y-1">
            <li><span className="font-medium">Quản lý Lịch làm việc và Công tác:</span> Đăng ký, theo dõi, và phê duyệt lịch làm việc, lịch họp, cũng như báo nghỉ phép/đi công tác.</li>
            <li><span className="font-medium">Quản lý Nhật ký công việc:</span> Ghi nhận và theo dõi các công việc đã hoàn thành và kế hoạch công việc hàng ngày.</li>
            <li><span className="font-medium">Thông tin và Sự kiện:</span> Cập nhật các thông báo nội bộ, sự kiện cơ quan và hòm thư góp ý/phản hồi.</li>
            <li><span className="font-medium">Quản lý Hồ sơ nhân sự:</span> Quản lý thông tin cá nhân, chức danh, hệ số lương và lịch nâng lương/nâng bậc.</li>
          </ul>

          <Text className="text-sm font-bold text-gray-800 mb-2 mt-4">2. Tài khoản và Bảo mật</Text>
          <ul className="list-disc pl-5 text-sm text-gray-700 mb-3 space-y-1">
            <li><span className="font-medium">Cấp phát tài khoản:</span> Tài khoản sử dụng Ứng dụng chỉ được cấp cho Viên chức, nhân viên và những cá nhân được ủy quyền hợp lệ trong tổ chức.</li>
            <li><span className="font-medium">Bảo mật thông tin:</span> Bạn có trách nhiệm bảo mật tuyệt đối tài khoản cá nhân. Không chia sẻ tài khoản cho bất kỳ bên thứ ba nào. Mọi thao tác được thực hiện dưới tài khoản của bạn sẽ được coi là do chính bạn thực hiện.</li>
            <li><span className="font-medium">Xử lý sự cố:</span> Trong trường hợp phát hiện tài khoản bị truy cập trái phép, bạn cần thông báo ngay lập tức cho Ban Quản trị (Admin) để được hỗ trợ kịp thời.</li>
          </ul>

          <Text className="text-sm font-bold text-gray-800 mb-2 mt-4">3. Trách nhiệm của Người sử dụng</Text>
          <Text className="text-sm text-gray-700 mb-2">Khi sử dụng Ứng dụng, bạn cam kết thực hiện các quy định sau:</Text>
          <ul className="list-disc pl-5 text-sm text-gray-700 mb-3 space-y-1">
            <li><span className="font-medium">Sử dụng đúng mục đích:</span> Chỉ sử dụng Ứng dụng để phục vụ cho các công việc nội bộ và các nhiệm vụ được giao.</li>
            <li><span className="font-medium">Tính chính xác của thông tin:</span> Đảm bảo tính trung thực, chính xác khi khai báo nhật ký công việc, thông tin nhân sự và khi tạo các đề nghị lịch trình, xin nghỉ phép.</li>
            <li><span className="font-medium">Bảo mật dữ liệu nội bộ:</span> Tuyệt đối không sao chép, phát tán, hoặc chia sẻ trái phép các thông tin mang tính bảo mật như: thông tin hồ sơ nhân sự, hệ số lương/thu nhập của cá nhân khác, kế hoạch và lịch trình làm việc nội bộ ra bên ngoài tổ chức.</li>
            <li><span className="font-medium">Văn hóa giao tiếp:</span> Sử dụng ngôn từ chuẩn mực, chuyên nghiệp trong quá trình trao đổi, cũng như khi sử dụng tính năng "Góp ý/Phản hồi".</li>
          </ul>

          <Text className="text-sm font-bold text-gray-800 mb-2 mt-4">4. Trách nhiệm và Quyền hạn của Ban Quản trị (Admin)</Text>
          <ul className="list-disc pl-5 text-sm text-gray-700 mb-3 space-y-1">
            <li><span className="font-medium">Quản lý hệ thống:</span> Ban Quản trị có quyền cấp phát, điều chỉnh phân quyền, khóa hoặc xóa tài khoản của người dùng khi có sự thay đổi về mặt nhân sự hoặc khi phát hiện vi phạm.</li>
            <li><span className="font-medium">Giám sát dữ liệu:</span> Nhằm đảm bảo an toàn thông tin và chất lượng công việc, Ban Quản trị có quyền giám sát các thông tin công việc, lịch trình, nhật ký trên hệ thống.</li>
            <li><span className="font-medium">Bảo trì hệ thống:</span> Ban Quản trị có thể tạm ngưng cung cấp dịch vụ để tiến hành bảo trì, nâng cấp hệ thống và sẽ có thông báo trước (trừ các trường hợp sự cố khẩn cấp).</li>
          </ul>

          <Text className="text-sm font-bold text-gray-800 mb-2 mt-4">5. Xử lý vi phạm</Text>
          <Text className="text-sm text-gray-700 mb-2">Mọi hành vi vi phạm các Điều khoản sử dụng này, tùy thuộc vào mức độ, sẽ bị xử lý theo quy định của tổ chức. Các biện pháp xử lý có thể bao gồm:</Text>
          <ul className="list-disc pl-5 text-sm text-gray-700 mb-3 space-y-1">
            <li>Nhắc nhở, cảnh cáo.</li>
            <li>Tạm khóa hoặc thu hồi vĩnh viễn quyền truy cập Ứng dụng.</li>
            <li>Chịu trách nhiệm kỷ luật theo quy định của cơ quan hoặc pháp luật hiện hành nếu hành vi vi phạm gây thất thoát dữ liệu, lộ lọt bí mật hoặc ảnh hưởng nghiêm trọng đến tổ chức.</li>
          </ul>

          <Text className="text-sm font-bold text-gray-800 mb-2 mt-4">6. Sửa đổi Điều khoản</Text>
          <Text className="text-sm text-gray-700 mb-2 text-justify">
            Ban Quản trị có quyền điều chỉnh, bổ sung Điều khoản sử dụng này vào bất kỳ thời điểm nào nhằm phù hợp với quy trình hoạt động của tổ chức. Các thay đổi sẽ được thông báo rộng rãi tới người dùng thông qua tính năng "Sự kiện / Thông báo" trên Ứng dụng. Việc bạn tiếp tục sử dụng Ứng dụng sau khi Điều khoản được cập nhật đồng nghĩa với việc bạn chấp thuận các nội dung mới.
          </Text>
        </Box>
      </Modal>
    </Page>
  );
};

export default Login;
