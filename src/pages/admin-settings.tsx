import React, { useState } from "react";
import { Page, Header, Box, Text, Button, Select, Icon } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { userListState, statisticsPermissionsState, currentUserState, UserStatisticsPermission } from "../state";
import { departments } from "../constants/departments";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

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
      <Header title="Cài đặt Phân quyền Thống kê" />
      <Box className="p-4 space-y-4">
        <Text className="font-bold text-gray-700">1. Chọn Ban / Phòng:</Text>
        <Select
          closeOnSelect
          placeholder="Chọn Ban..."
          value={selectedDeptId}
          onChange={(val) => {
             setSelectedDeptId(val as string);
             setSelectedUserId('');
          }}
        >
          {departments.map(d => (
            <Option key={d.id} value={d.id} title={d.name} />
          ))}
        </Select>

        {selectedDeptId && (
          <Box className="space-y-4 mt-4">
            <Text className="font-bold text-gray-700">2. Chọn Nhân sự:</Text>
            <Select
              closeOnSelect
              placeholder="Chọn nhân sự..."
              value={selectedUserId}
              onChange={(val) => handleSelectUser(val as string)}
            >
              {users.filter(u => u.departmentId === selectedDeptId).map(u => (
                <Option key={u.id} value={u.id} title={`${u.name} - ${u.jobTitle || u.role}`} />
              ))}
            </Select>
          </Box>
        )}

        {selectedUserId && (
          <Box className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4 mt-4">
            <Text className="font-bold text-gray-700">3. Mức độ truy cập báo cáo:</Text>
            <Select
              closeOnSelect
              value={viewType}
              onChange={(val) => setViewType(val as UserStatisticsPermission['viewType'])}
            >
              <Option value="all" title="Tất cả (Toàn quyền)" />
              <Option value="departments" title="Theo Ban (Chọn các Ban)" />
              <Option value="users" title="Theo Cá nhân (Chọn các người dùng)" />
            </Select>

            {viewType === 'departments' && (
               <Box className="space-y-2 mt-2">
                 <Text className="text-gray-600 text-sm">Chọn các Ban được phép xem:</Text>
                 <Select
                   multiple
                   placeholder="Chọn ban..."
                   value={allowedDeptIds}
                   onChange={(val) => setAllowedDeptIds(val as string[])}
                 >
                    {departments.map(d => (
                       <Option key={d.id} value={d.id} title={d.name} />
                    ))}
                 </Select>
               </Box>
            )}

            {viewType === 'users' && (
               <Box className="space-y-2 mt-2">
                 <Text className="text-gray-600 text-sm">Chọn các Cá nhân được phép xem:</Text>
                 <Select
                   multiple
                   placeholder="Chọn nhân sự..."
                   value={allowedUserIds}
                   onChange={(val) => setAllowedUserIds(val as string[])}
                 >
                    {users.map(u => (
                       <Option key={u.id} value={u.id} title={`${u.name} - ${departments.find(d=>d.id===u.departmentId)?.name}`} />
                    ))}
                 </Select>
               </Box>
            )}

            <Button fullWidth onClick={handleSave} className="mt-4">
              Lưu Cấu Hình
            </Button>
          </Box>
        )}

        <Box className="mt-8 border-t border-gray-200 pt-6">
          <Text className="font-bold text-gray-800 text-lg mb-4">Danh sách phân quyền hiện tại</Text>
          {departments.map(dept => {
            const deptUsers = users.filter(u => u.departmentId === dept.id);
            return (
              <Box key={dept.id} className="mb-4">
                <Box 
                  className={`flex justify-between items-center bg-gray-100 p-3 cursor-pointer ${expandedDeptIds.includes(dept.id) ? 'rounded-t-lg' : 'rounded-lg'}`}
                  onClick={() => {
                     setExpandedDeptIds(prev => 
                        prev.includes(dept.id) ? prev.filter(id => id !== dept.id) : [...prev, dept.id]
                     );
                  }}
                >
                  <Text className="font-semibold text-gray-700">{dept.name}</Text>
                  <Icon icon={expandedDeptIds.includes(dept.id) ? 'zi-chevron-up' : 'zi-chevron-down'} />
                </Box>
                {expandedDeptIds.includes(dept.id) && (
                  <Box className="bg-white border border-t-0 border-gray-100 rounded-b-lg p-2 flex flex-col">
                    {deptUsers.length === 0 ? (
                       <Text className="text-sm text-gray-400 italic text-center py-2">Chưa có nhân sự nào trong Ban này</Text>
                    ) : (
                      deptUsers.map(u => {
                        const p = permissions[u.id];
                        let permLabel = "Tiến độ cá nhân (Mặc định)";
                        if (p) {
                           if (p.viewType === 'all') permLabel = "Tất cả (Toàn quyền)";
                           else if (p.viewType === 'departments') permLabel = `Theo Ban (${p.allowedDepartmentIds?.length || 0} Ban)`;
                           else if (p.viewType === 'users') permLabel = `Theo Cá nhân (${p.allowedUserIds?.length || 0} người)`;
                        }
                        return (
                          <Box 
                            key={u.id} 
                            className="flex justify-between items-center p-2 hover:bg-blue-50 rounded cursor-pointer border-b border-gray-50 last:border-0"
                            onClick={() => {
                               setSelectedDeptId(dept.id);
                               handleSelectUser(u.id);
                               // Scroll to top to see the form
                               document.querySelector('.zaui-page-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <Text className="text-sm font-medium">{u.name}</Text>
                            <Text className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{permLabel}</Text>
                          </Box>
                        )
                      })
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Page>
  );
};

export default AdminSettings;
