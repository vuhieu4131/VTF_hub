import React, { useState, useEffect } from "react";
import { Page, Box, Text, Input, Header, Modal } from "zmp-ui";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { getUserInfo } from "zmp-sdk";
import logo from "../static/logo.png";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(true);
  const [resetEmail, setResetEmail] = useState("");
  const [zaloName, setZaloName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchZaloName = async () => {
      try {
        const { userInfo } = await getUserInfo({ autoRequestPermission: true });
        if (userInfo && userInfo.name) {
          setZaloName(userInfo.name);
        }
      } catch (error) {
        console.error("Failed to get Zalo user info", error);
      }
    };
    fetchZaloName();
  }, []);

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
          
          <Box className="mt-4 text-center">
            <Text className="text-sm text-blue-600 cursor-pointer" onClick={() => setResetModalVisible(true)}>
              Quên mật khẩu?
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
        title={zaloName ? `Chào mừng bạn ${zaloName} đến với VTF - Hub` : "Chào mừng đến với VTF - Hub"}
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
    </Page>
  );
};

export default Login;
