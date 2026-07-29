import React, { useState } from "react";
import { Page, Header, Box, Text, Input, Button, Select } from "zmp-ui";
import { useRecoilValueLoadable } from "recoil";
import { userState } from "../state";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const userLoadable = useRecoilValueLoadable(userState);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setError("");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save initial pending profile info to Firestore
      const zaloAvatar = userLoadable.state === 'hasValue' ? userLoadable.contents.avatar : '';
      
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name,
        email,
        avatar: zaloAvatar,
        role: 'guest',
        status: 'pending_approval'
      });

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
