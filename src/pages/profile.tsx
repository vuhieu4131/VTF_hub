import React, { FC } from "react";
import { Box, Header, Icon, Page, Text, Avatar, Select } from "zmp-ui";
import { useRecoilValueLoadable, useRecoilState } from "recoil";
import { userState, currentUserRoleState, currentUserNameState } from "../state";
import { UserRole } from "../types/document";

const ProfilePage: FC = () => {
  const userLoadable = useRecoilValueLoadable(userState);
  const [role, setRole] = useRecoilState(currentUserRoleState);
  const [name, setName] = useRecoilState(currentUserNameState);

  const roleOptions: { value: UserRole; label: string; defaultName: string }[] = [
    { value: "van_thu", label: "Văn thư", defaultName: "Nguyễn Văn Thư" },
    { value: "giam_doc", label: "Giám đốc / Phó Giám đốc", defaultName: "Trần Giám Đốc" },
    { value: "truong_ban", label: "Trưởng ban / Phó ban", defaultName: "Lê Trưởng Ban" },
    { value: "chuyen_vien", label: "Chuyên viên", defaultName: "Phạm Chuyên Viên" },
  ];

  const handleRoleChange = (newRole: any) => {
    setRole(newRole as UserRole);
    const selected = roleOptions.find(r => r.value === newRole);
    if (selected) {
      setName(selected.defaultName);
    }
  };

  return (
    <Page className="bg-gray-50 flex flex-col h-full relative">
      <Header showBackIcon={false} title="Cá nhân" />
      
      <Box className="flex-1 overflow-y-auto p-4 pb-24">
        {/* User Info Card */}
        <Box className="bg-white rounded-xl p-5 mb-6 shadow-sm flex items-center space-x-4 border border-gray-100">
          <Avatar 
            src={userLoadable.state === 'hasValue' ? userLoadable.contents.avatar : undefined} 
            size={64}
            className="border-2 border-blue-100"
          />
          <Box className="flex-1">
            <Text className="font-bold text-lg text-gray-800">
              {name}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">Vai trò: {roleOptions.find(r => r.value === role)?.label}</Text>
          </Box>
        </Box>

        <Box className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
          <Text className="font-bold text-blue-800 mb-2">Giả lập Phân quyền (Dev Only)</Text>
          <Text className="text-sm text-blue-600 mb-3">Chuyển đổi vai trò để kiểm thử luồng nghiệp vụ luân chuyển văn bản.</Text>
          <Select
            value={role}
            onChange={handleRoleChange}
            closeOnSelect
            className="bg-white"
          >
            {roleOptions.map(opt => (
              <Select.Option key={opt.value} value={opt.value} title={opt.label} />
            ))}
          </Select>
        </Box>

        {/* Menu Items */}
        <Box className="bg-white rounded-xl shadow-sm mb-6 border border-gray-100">
          <Box className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50">
            <Box className="flex items-center space-x-3">
              <Box className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Icon icon="zi-user" className="text-blue-500" size={18} />
              </Box>
              <Text className="text-gray-700 font-medium">Thông tin tài khoản</Text>
            </Box>
            <Icon icon="zi-chevron-right" className="text-gray-400" />
          </Box>
          <Box className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50">
            <Box className="flex items-center space-x-3">
              <Box className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Icon icon="zi-notif" className="text-blue-500" size={18} />
              </Box>
              <Text className="text-gray-700 font-medium">Cài đặt thông báo</Text>
            </Box>
            <Icon icon="zi-chevron-right" className="text-gray-400" />
          </Box>
          <Box className="flex items-center justify-between p-4 active:bg-gray-50">
            <Box className="flex items-center space-x-3">
              <Box className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Icon icon="zi-shield" className="text-blue-500" size={18} />
              </Box>
              <Text className="text-gray-700 font-medium">Quyền riêng tư</Text>
            </Box>
            <Icon icon="zi-chevron-right" className="text-gray-400" />
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default ProfilePage;
