import React, { useState } from "react";
import { Page, Header, Box, Text, Button, Select, Icon, Tabs } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { userListState, statisticsPermissionsState, currentUserState, UserStatisticsPermission, allowedScheduleManagersState } from "../state";
import { departments } from "../constants/departments";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserApproval } from "../components/admin/UserApproval";
import { EventManager } from "../components/admin/EventManager";
import { FeedbackManager } from "../components/admin/FeedbackManager";
import { DirectoryList } from "../components/admin/DirectoryList";

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
  
  // Schedule Permissions state
  const allowedScheduleManagers = useRecoilValue(allowedScheduleManagersState);
  const [scheduleManagers, setScheduleManagers] = useState<string[]>([]);

  // Update local state when global state changes
  React.useEffect(() => {
    setScheduleManagers(allowedScheduleManagers || []);
  }, [allowedScheduleManagers]);

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

  const handleSaveScheduleManagers = async () => {
    try {
      await setDoc(doc(db, "settings", "schedulePermissions"), { allowedManagers: scheduleManagers });
      alert("Đã lưu phân quyền thêm lịch thành công!");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi lưu phân quyền lịch!");
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
          <Tabs.Tab key="schedulePermissions" label="Quyền thêm Lịch">
            <Box className="p-4 space-y-4">
               <Text className="font-bold text-gray-700">Người được phép tạo/thêm lịch làm việc:</Text>
               <Text className="text-sm text-gray-500 mb-4">
                  Lưu ý: Quản trị hệ thống, Giám đốc, Phó Giám đốc mặc định có quyền này. 
                  Bạn có thể cấp quyền bổ sung cho các cá nhân khác (VD: Chuyên viên, Văn thư...) dưới đây.
               </Text>
               <Select
                 multiple
                 placeholder="Chọn nhân sự..."
                 value={scheduleManagers}
                 onChange={(val) => setScheduleManagers(val as string[])}
               >
                 {users.map(u => (
                   <Option key={u.id} value={u.id} title={`${u.name} - ${departments.find(d=>d.id===u.departmentId)?.name}`} />
                 ))}
               </Select>

               <Box className="mt-8 flex justify-center pb-8">
                 <Button className="!bg-blue-600 text-white w-full max-w-xs" onClick={handleSaveScheduleManagers}>
                   Lưu Quyền Thêm Lịch
                 </Button>
               </Box>
            </Box>
          </Tabs.Tab>

          {/* Nhóm Tiện ích chung */}
          <Tabs.Tab key="events" label="Sự kiện">
            <EventManager />
          </Tabs.Tab>
          <Tabs.Tab key="feedback" label="Góp ý">
            <FeedbackManager />
          </Tabs.Tab>
        </Tabs>
      </Box>
    </Page>
  );
};

export default AdminSettings;
