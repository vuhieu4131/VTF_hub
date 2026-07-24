import React, { FC, useMemo, useState } from "react";
import { Box, Header, Icon, Page, Text, Avatar, Select, Button } from "zmp-ui";
import { useRecoilValueLoadable, useRecoilState } from "recoil";
import { userState, currentUserState } from "../state";
import { User, DepartmentId, UserRole } from "../types/document";

import { mockUsers, departments } from "../mock/users";

const roleLabels: Record<UserRole, string> = {
  van_thu: "Văn thư",
  giam_doc: "Lãnh đạo Cơ quan",
  truong_ban: "Lãnh đạo Ban",
  chuyen_vien: "Chuyên viên",
};

const ProfilePage: FC = () => {
  const userLoadable = useRecoilValueLoadable(userState);
  const [currentUser, setCurrentUser] = useRecoilState(currentUserState);

  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>(currentUser.departmentId);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((u) => u.departmentId === selectedDeptId);
  }, [selectedDeptId]);

  const handleLogin = () => {
    const user = mockUsers.find(u => u.id === selectedUserId);
    if (user) {
      setCurrentUser(user);
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
              {currentUser.name}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              Phòng/Ban: {departments.find(d => d.id === currentUser.departmentId)?.name}
            </Text>
            <Text className="text-gray-500 text-sm">
              Vai trò: {roleLabels[currentUser.role]}
            </Text>
          </Box>
        </Box>

        <Box className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
          <Text className="font-bold text-blue-800 mb-2">Giả lập Đăng nhập (Dev Only)</Text>
          <Text className="text-sm text-blue-600 mb-3">Chọn Phòng/Ban và nhân sự để kiểm thử luồng nội bộ.</Text>
          
          <Box className="space-y-3">
            <Box>
              <Text className="text-sm font-medium mb-1">Phòng / Ban:</Text>
              <Select
                value={selectedDeptId}
                onChange={(v) => {
                  setSelectedDeptId(v as DepartmentId);
                  const firstUserInDept = mockUsers.find(u => u.departmentId === v);
                  if (firstUserInDept) setSelectedUserId(firstUserInDept.id);
                }}
                closeOnSelect
                className="bg-white"
              >
                {departments.map(opt => (
                  <Select.Option key={opt.id} value={opt.id} title={opt.name} />
                ))}
              </Select>
            </Box>
            
            <Box>
              <Text className="text-sm font-medium mb-1">Nhân sự:</Text>
              <Select
                value={selectedUserId}
                onChange={(v) => setSelectedUserId(v as string)}
                closeOnSelect
                className="bg-white"
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(opt => (
                    <Select.Option key={opt.id} value={opt.id} title={`${opt.name} (${roleLabels[opt.role]})`} />
                  ))
                ) : (
                  <Select.Option value="" title="Không có nhân sự" disabled />
                )}
              </Select>
            </Box>

            <Button onClick={handleLogin} fullWidth className="mt-2 !bg-blue-600 text-white">
              Đăng nhập giả lập
            </Button>
          </Box>
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
        </Box>
      </Box>
    </Page>
  );
};

export default ProfilePage;
