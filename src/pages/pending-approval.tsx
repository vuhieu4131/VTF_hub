import React from "react";
import { Page, Box, Text, Button, Icon } from "zmp-ui";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const PendingApprovalPage: React.FC = () => {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <Page className="bg-gray-50 flex flex-col h-full justify-center items-center">
      <Box className="p-6 text-center max-w-sm">
        <Box className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon icon="zi-clock-1" className="text-blue-600 text-4xl" />
        </Box>
        <Text className="text-xl font-bold text-gray-800 mb-2">Chờ phê duyệt</Text>
        <Text className="text-gray-600 mb-8">
          Tài khoản của bạn đang chờ Admin phê duyệt để ghép nối hồ sơ. Vui lòng liên hệ bộ phận Hành chính.
        </Text>
        <Button fullWidth variant="secondary" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </Box>
    </Page>
  );
};

export default PendingApprovalPage;
