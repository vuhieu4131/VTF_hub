import React, { useState } from "react";
import { Page, Header, Box, Text, Input, Button, Modal } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
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
