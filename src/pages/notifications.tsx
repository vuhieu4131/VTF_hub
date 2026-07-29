import React from "react";
import { Page, Header, Box, Text, Icon } from "zmp-ui";

const NotificationsPage: React.FC = () => {
  return (
    <Page className="bg-gray-50 flex flex-col h-full">
      <Header title="Thông báo" showBackIcon={false} />
      <Box className="p-6 flex-1 flex flex-col items-center justify-center">
        <Box className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-500">
          <Icon icon="zi-notif" size={32} />
        </Box>
        <Text className="text-gray-500 text-center">Bạn không có thông báo nào mới.</Text>
      </Box>
    </Page>
  );
};

export default NotificationsPage;
