import React, { useState, useEffect } from "react";
import { Box, Text, Button, List, Avatar, Select } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { userListState } from "../../state";
import { User, UserProfile } from "../../types/document";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";

export const UserApproval: React.FC = () => {
  const users = useRecoilValue(userListState);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const pendingUsers = users.filter(u => u.status === 'pending_approval' || (!u.profileId && u.role !== 'admin'));
  const [selectedProfileId, setSelectedProfileId] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "profiles"), (snapshot) => {
      const data: UserProfile[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as UserProfile);
      });
      setProfiles(data);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (user: User) => {
    const profileId = selectedProfileId[user.id];
    if (!profileId) {
      alert("Vui lòng chọn một hồ sơ nhân sự để ghép nối!");
      return;
    }
    
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    if (!confirm(`Xác nhận: Ghép tài khoản Zalo "${user.name}" với Hồ sơ "${profile.fullName}"?\n\nThao tác này sẽ cấp quyền truy cập hệ thống cho tài khoản này.`)) {
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.id), {
        status: 'active',
        role: profile.jobTitle === 'Giám đốc' ? 'giam_doc' : 
              profile.jobTitle === 'Phó Giám đốc' ? 'pho_giam_doc' :
              profile.jobTitle === 'Trưởng ban' || profile.jobTitle === 'Phó trưởng ban' ? 'truong_ban' :
              profile.jobTitle === 'Văn thư' ? 'van_thu' : 'chuyen_vien',
        departmentId: profile.departmentId,
        profileId: profile.id,
      });
      alert(`Đã duyệt tài khoản ${user.name} thành công!`);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (confirm(`Bạn có chắc chắn muốn XÓA tài khoản Zalo "${user.name}" (Email: ${user.email}) khỏi hệ thống?\n\nThao tác này dùng để dọn dẹp các tài khoản rác/spam và không thể hoàn tác.`)) {
      try {
        await deleteDoc(doc(db, "users", user.id));
      } catch (e: any) {
        alert("Lỗi khi xóa: " + e.message);
      }
    }
  };

  if (pendingUsers.length === 0) {
    return (
      <Box className="p-4 flex flex-col items-center justify-center text-center mt-10">
        <Text className="text-gray-500 mb-2">Không có tài khoản nào chờ duyệt</Text>
      </Box>
    );
  }

  return (
    <List>
      {pendingUsers.map(user => (
        <Box key={user.id} className="p-4 bg-white mb-2 rounded-lg shadow-sm border border-gray-100">
          <Box flex alignItems="center" className="mb-3">
            <Avatar src={user.avatar} size={40} className="mr-3" />
            <Box>
              <Text className="font-medium text-base">{user.name}</Text>
              <Text className="text-sm text-gray-500">{user.email}</Text>
            </Box>
          </Box>
          
          <Box className="mb-3">
            <Text className="text-xs text-gray-500 mb-1">Ghép với Hồ sơ gốc:</Text>
            <Select 
              value={selectedProfileId[user.id] || ""} 
              onChange={(v) => setSelectedProfileId({...selectedProfileId, [user.id]: v as string})}
              placeholder="Chọn hồ sơ nhân sự..."
              closeOnSelect
            >
              {profiles.map(p => (
                <Select.Option key={p.id} value={p.id} title={`${p.fullName} (${p.employeeCode})`} />
              ))}
            </Select>
          </Box>

          <Box className="flex flex-row space-x-2 mt-4">
            <button 
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium active:bg-blue-700 transition-colors shadow-sm"
              onClick={() => handleApprove(user)}
            >
              Duyệt & Ghép nối
            </button>
            <button 
              className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-medium active:bg-red-100 transition-colors"
              onClick={() => handleDeleteUser(user)}
            >
              Xóa bỏ
            </button>
          </Box>
        </Box>
      ))}
    </List>
  );
};
