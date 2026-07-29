import React, { useState, useEffect } from "react";
import { Box, Text, Button, Select, Icon, Input, Modal } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { userListState, customPermissionsState } from "../../state";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { departments } from "../../constants/departments";
import { CustomPermission } from "../../types/document";
import { UserSelectModal } from "./UserSelectModal";

export const PermissionsManager: React.FC = () => {
  const users = useRecoilValue(userListState);
  const globalPermissions = useRecoilValue(customPermissionsState);
  const [localPermissions, setLocalPermissions] = useState<CustomPermission[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newPermName, setNewPermName] = useState("");
  const [selectingPermId, setSelectingPermId] = useState<string | null>(null);

  useEffect(() => {
    // Sync local state when global state changes, only if local state is empty to avoid overwriting ongoing edits
    // Better yet, just initialize it once or update if lengths differ heavily.
    setLocalPermissions(globalPermissions);
  }, [globalPermissions]);

  const saveToFirebase = async (newPermissions: CustomPermission[]) => {
    try {
      await setDoc(doc(db, "settings", "customPermissions"), { permissions: newPermissions });
    } catch (error) {
      console.error("Error saving permissions:", error);
    }
  };

  const handleUpdatePermissionUsers = (permId: string, userIds: string[]) => {
    const updated = localPermissions.map(p => p.id === permId ? { ...p, allowedUserIds: userIds } : p);
    setLocalPermissions(updated);
    saveToFirebase(updated);
  };

  const handleDeletePermission = (permId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa quyền này không?")) {
      const updated = localPermissions.filter(p => p.id !== permId);
      setLocalPermissions(updated);
      saveToFirebase(updated);
    }
  };

  const handleAddPermission = () => {
    if (!newPermName.trim()) {
      alert("Vui lòng nhập tên quyền");
      return;
    }
    const newPerm: CustomPermission = {
      id: 'custom_' + Date.now(),
      name: newPermName.trim(),
      allowedUserIds: [],
    };
    const updated = [...localPermissions, newPerm];
    setLocalPermissions(updated);
    saveToFirebase(updated);
    setNewPermName("");
    setIsAddModalVisible(false);
  };

  return (
    <Box className="p-4 space-y-6">
      <Box className="flex items-center justify-between mb-2">
        <Text className="font-bold text-gray-700">Quản lý Phân quyền Động</Text>
        <Button size="small" variant="secondary" className="!text-blue-600 bg-blue-50" onClick={() => setIsAddModalVisible(true)}>
          + Thêm quyền
        </Button>
      </Box>

      {localPermissions.map((perm) => (
        <Box key={perm.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
          <Box className="flex justify-between items-start mb-2">
            <Text className="font-bold text-blue-800">{perm.name}</Text>
            {!perm.isSystem && (
              <Icon icon="zi-delete" className="text-red-500 cursor-pointer" onClick={() => handleDeletePermission(perm.id)} />
            )}
          </Box>
          <Text className="text-xs text-gray-500 mb-3">
            {perm.isSystem ? "Quyền hệ thống (không thể xóa)" : "Quyền tùy chỉnh"}
          </Text>
          
          <Box 
            className="border border-gray-300 rounded-lg p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
            onClick={() => setSelectingPermId(perm.id)}
          >
            <Text className={`text-sm ${perm.allowedUserIds.length > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
              {perm.allowedUserIds.length > 0 
                ? `Đã chọn ${perm.allowedUserIds.length} nhân sự` 
                : "Chọn nhân sự được cấp quyền..."}
            </Text>
            <Icon icon="zi-chevron-down" className="text-gray-500" />
          </Box>
          
          {perm.allowedUserIds.length > 0 && (
            <Box className="mt-3 flex flex-wrap gap-2">
              {perm.allowedUserIds.map(uid => {
                const user = users.find(u => u.id === uid);
                return user ? (
                  <Box key={uid} className="bg-blue-50 border border-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md">
                    {user.name}
                  </Box>
                ) : null;
              })}
            </Box>
          )}
        </Box>
      ))}

      {/* Render UserSelectModal for the currently selected permission */}
      {selectingPermId && (
        <UserSelectModal
          visible={!!selectingPermId}
          value={localPermissions.find(p => p.id === selectingPermId)?.allowedUserIds || []}
          onChange={(val) => handleUpdatePermissionUsers(selectingPermId, val)}
          onClose={() => setSelectingPermId(null)}
          title={`Cấp quyền: ${localPermissions.find(p => p.id === selectingPermId)?.name}`}
        />
      )}

      {/* spacer for bottom */}
    
      <Modal
        visible={isAddModalVisible}
        title="Thêm quyền mới"
        onClose={() => setIsAddModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Thêm", highLight: true, onClick: handleAddPermission }
        ]}
      >
        <Box className="p-4">
          <Text className="text-sm text-gray-600 mb-2">Tên nhóm quyền</Text>
          <Input
            type="text"
            placeholder="Ví dụ: Quyền duyệt tài liệu"
            value={newPermName}
            onChange={(e) => setNewPermName(e.target.value)}
          />
        </Box>
      </Modal>
    </Box>
  );
};
