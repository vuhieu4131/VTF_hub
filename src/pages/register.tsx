import React, { useState } from "react";
import { Page, Header, Box, Text, Input, Button, Select } from "zmp-ui";
import { useRecoilValueLoadable } from "recoil";
import { userState } from "../state";
import logo from "../static/logo.jpg";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import { ref, listAll, getDownloadURL } from "firebase/storage";

const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const userLoadable = useRecoilValueLoadable(userState);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setError("");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Lấy danh sách ảnh từ thư mục 'avata' trên Firebase Storage
      let randomAvatar = '';
      try {
        const listRef = ref(storage, 'avata');
        const res = await listAll(listRef);
        if (res.items.length > 0) {
          const randomIndex = Math.floor(Math.random() * res.items.length);
          randomAvatar = await getDownloadURL(res.items[randomIndex]);
        }
      } catch (e) {
        console.error("Lỗi lấy ảnh mặc định:", e);
      }

      const finalAvatar = randomAvatar;
      
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name,
        email,
        avatar: finalAvatar,
        role: 'guest',
        status: 'pending_approval'
      });

      alert("Đăng ký thành công! Vui lòng chờ đợi admin phê duyệt tài khoản của bạn.");
      navigate("/");
    } catch (err: any) {
      setError("Đăng ký thất bại: " + err.message);
    }
  };

  return (
    <Page className="bg-gray-50 flex flex-col h-full">
      <Header title="Đăng ký tài khoản" showBackIcon={false} />
      <Box className="p-6 flex-1 flex flex-col justify-center overflow-y-auto">
        <Box className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <Box className="flex justify-center mb-2">
            <img src={logo} alt="Logo" className="w-24 h-24 object-contain mx-auto" />
          </Box>
          <Text className="text-xl font-bold text-center text-blue-800 mb-2">Đăng ký</Text>
          
          {error && <Text className="text-red-500 text-sm text-center">{error}</Text>}
          
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Họ và tên</Text>
            <Input
              type="text"
              placeholder="Nhập họ và tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Box>
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Email</Text>
            <Input
              type="text"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Box>
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Mật khẩu</Text>
            <Input.Password
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Box>
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Xác nhận mật khẩu</Text>
            <Input.Password
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Box>
          
          
          <button 
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium active:bg-blue-700 transition-colors shadow-sm mt-6" 
            onClick={handleRegister}
          >
            Đăng ký
          </button>
          
          <Box className="mt-4 text-center">
            <Text className="text-sm text-gray-500">Đã có tài khoản?</Text>
            <Text className="text-sm text-blue-600 font-medium mt-1" onClick={() => navigate("/login")}>
              Quay lại Đăng nhập
            </Text>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default Register;
