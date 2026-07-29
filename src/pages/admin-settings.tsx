import React, { useState } from "react";
import { Page, Header, Box, Text, Button, Select, Icon, Tabs } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { userListState, statisticsPermissionsState, currentUserState, UserStatisticsPermission } from "../state";
import { departments } from "../constants/departments";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserApproval } from "../components/admin/UserApproval";
import { FeedbackManager } from "../components/admin/FeedbackManager";
import { DirectoryList } from "../components/admin/DirectoryList";
import { PermissionsManager } from "../components/admin/PermissionsManager";

const { Option } = Select;

const AdminSettings: React.FC = () => {
  const users = useRecoilValue(userListState);
  const permissions = useRecoilValue(statisticsPermissionsState);
  const currentUser = useRecoilValue(currentUserState);

  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // Current editing state
  const [viewType, setViewType] = useState<UserStatisticsPermission['viewType']>('all');
  const [allowedDeptIds, setAllowedDeptIds] = useState<string[]>([]);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [expandedDeptIds, setExpandedDeptIds] = useState<string[]>([]);

  // When a user is selected, populate their current permissions
  const handleSelectUser = (uid: string) => {
    setSelectedUserId(uid);
    const perm = permissions[uid];
    if (perm) {
      setViewType(perm.viewType);
      setAllowedDeptIds(perm.allowedDepartmentIds || []);
      setAllowedUserIds(perm.allowedUserIds || []);
    } else {
      setViewType('all');
      setAllowedDeptIds([]);
      setAllowedUserIds([]);
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    try {
      const newPerms = { ...permissions };
      newPerms[selectedUserId] = {
        viewType,
        allowedDepartmentIds: viewType === 'departments' ? allowedDeptIds : [],
        allowedUserIds: viewType === 'users' ? allowedUserIds : []
      };
      await setDoc(doc(db, "settings", "statisticsPermissions"), newPerms);
      alert("Đã lưu cấu hình phân quyền thành công!");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi lưu!");
    }
  };


  if (currentUser?.role !== 'admin') {
    return (
      <Page className="bg-gray-50 flex flex-col h-full relative">
        <Header title="Lỗi truy cập" />
        <Box className="p-4"><Text>Bạn không có quyền truy cập trang này!</Text></Box>
      </Page>
    );
  }

  return (
    <Page className="bg-gray-50 flex flex-col h-full relative">
      <Header title="Quản trị hệ thống" />
      <Box className="flex-1 overflow-y-auto">
        <Tabs id="admin-tabs" scrollable>
          <Tabs.Tab key="directory" label="Danh sách">
            <DirectoryList />
          </Tabs.Tab>
          <Tabs.Tab key="users" label="Duyệt TK">
            <UserApproval />
          </Tabs.Tab>

          {/* Nhóm Phân quyền ứng dụng */}
          <Tabs.Tab key="permissions" label="Phân quyền">
            <PermissionsManager />
          </Tabs.Tab>

          {/* Nhóm Tiện ích chung */}
          <Tabs.Tab key="feedback" label="Góp ý">
            <FeedbackManager />
          </Tabs.Tab>
        </Tabs>
      </Box>
    </Page>
  );
};

export default AdminSettings;
