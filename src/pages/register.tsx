import React, { useState } from "react";
import { Page, Header, Box, Text, Input, Button, Select } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { departments } from "../constants/departments";
import { UserRole, DepartmentId } from "../types/document";

const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState<DepartmentId | "">("");
  const [jobTitle, setJobTitle] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const getRoleOptions = (deptId: DepartmentId | "") => {
    if (deptId === 'ban_giam_doc') {
      return [
        { value: 'Giám đốc', role: 'giam_doc', label: 'Giám đốc' },
        { value: 'Phó Giám đốc', role: 'pho_giam_doc', label: 'Phó Giám đốc' },
      ];
    }
    if (deptId === 'van_thu') {
      return [
        { value: 'Văn thư', role: 'van_thu', label: 'Văn thư' },
        { value: 'Trợ lý', role: 'van_thu', label: 'Trợ lý' },
      ];
    }
    if (deptId) {
      return [
        { value: 'Trưởng ban', role: 'truong_ban', label: 'Trưởng ban' },
        { value: 'Phó trưởng ban', role: 'truong_ban', label: 'Phó trưởng ban' },
        { value: 'Chuyên viên', role: 'chuyen_vien', label: 'Chuyên viên' },
      ];
    }
    return [];
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !departmentId || !jobTitle) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    const roleOptions = getRoleOptions(departmentId);
    const selectedOption = roleOptions.find(o => o.value === jobTitle);
    if (!selectedOption) {
      setError("Chức vụ không hợp lệ");
      return;
    }
    
    const role = selectedOption.role;

    try {
      setError("");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save additional profile info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name,
        email,
        role,
        jobTitle,
        departmentId
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
            <Input
              type="password"
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Box>
          
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Ban</Text>
            <Select 
              value={departmentId} 
              onChange={(v) => {
                setDepartmentId(v as DepartmentId);
                setJobTitle(""); // reset jobTitle when department changes
              }}
              placeholder="Chọn Ban"
              closeOnSelect
            >
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id} title={dept.name} />
              ))}
            </Select>
          </Box>

          <Box>
            <Text className="text-sm text-gray-600 mb-1">Chức vụ</Text>
            <Select 
              value={jobTitle} 
              onChange={(v) => setJobTitle(v as string)}
              placeholder="Chọn Chức vụ"
              closeOnSelect
              disabled={!departmentId}
            >
              {getRoleOptions(departmentId).map(opt => (
                <Select.Option key={opt.value} value={opt.value} title={opt.label} />
              ))}
            </Select>
          </Box>
          
          <Button fullWidth className="!bg-blue-600 text-white mt-6" onClick={handleRegister}>
            Đăng ký
          </Button>
          
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
