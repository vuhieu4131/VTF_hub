import React, { FC } from "react";
import { Box, Header, Icon, Page, Text, Avatar, Button } from "zmp-ui";
import { useRecoilValueLoadable, useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";
import { userState, currentUserState } from "../state";
import { UserRole } from "../types/document";
import { departments } from "../constants/departments";
import { signOut, updatePassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, deleteDoc } from "firebase/firestore";

const roleLabels: Record<UserRole | 'admin', string> = {
  van_thu: "Văn thư",
  giam_doc: "Giám đốc",
  truong_ban: "Trưởng/Phó Ban",
  chuyen_vien: "Chuyên viên",
  admin: "Quản trị hệ thống",
};

const ProfilePage: FC = () => {
  const userLoadable = useRecoilValueLoadable(userState);
  const currentUser = useRecoilValue(currentUserState);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      navigate("/login", { replace: true });
      await signOut(auth);
    } catch (error) {
      console.error("Lỗi đăng xuất", error);
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ VĂN BẢN TRONG CƠ SỞ DỮ LIỆU? (Hành động này không thể hoàn tác)")) {
      try {
        const querySnapshot = await getDocs(collection(db, "documents"));
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        alert("Đã xóa toàn bộ văn bản thành công!");
      } catch (error) {
        console.error("Lỗi xóa dữ liệu:", error);
        alert("Xóa dữ liệu thất bại!");
      }
    }
  };

  if (!currentUser) return null;

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
              Ban: {departments.find(d => d.id === currentUser.departmentId)?.name}
            </Text>
            <Text className="text-gray-500 text-sm">
              Chức vụ: {currentUser.jobTitle || roleLabels[currentUser.role]}
            </Text>
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
          <Box 
            className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50"
            onClick={async () => {
                const newPass = window.prompt("Nhập mật khẩu mới (ít nhất 6 ký tự):");
                if (newPass) {
                   if (newPass.length < 6) {
                      alert("Mật khẩu phải có ít nhất 6 ký tự!");
                      return;
                   }
                   try {
                     if (auth.currentUser) {
                        await updatePassword(auth.currentUser, newPass);
                        alert("Đổi mật khẩu thành công!");
                     }
                   } catch (e: any) {
                     console.error(e);
                     if (e.code === 'auth/requires-recent-login') {
                        alert("Vì lý do bảo mật, bạn cần đăng nhập lại trước khi đổi mật khẩu!");
                     } else {
                        alert("Đổi mật khẩu thất bại: " + e.message);
                     }
                   }
                }
            }}
          >
            <Box className="flex items-center space-x-3">
              <Box className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                <Icon icon="zi-lock" className="text-orange-500" size={18} />
              </Box>
              <Text className="text-gray-700 font-medium">Đổi mật khẩu</Text>
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
          
          {currentUser.role === 'admin' && (
             <Box 
               className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50"
               onClick={() => navigate("/admin-settings")}
             >
               <Box className="flex items-center space-x-3">
                 <Box className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                   <Icon icon="zi-setting" className="text-purple-500" size={18} />
                 </Box>
                 <Text className="text-purple-700 font-bold">Quản trị Phân quyền</Text>
               </Box>
               <Icon icon="zi-chevron-right" className="text-purple-400" />
             </Box>
          )}
        </Box>
        
        <Button fullWidth variant="secondary" className="!bg-red-50 !text-red-600 border border-red-200" onClick={handleLogout}>
          Đăng xuất
        </Button>
        
        <Box className="mt-8 border-t border-red-200 pt-6">
          <Text className="text-red-600 font-bold mb-2 text-center">Dành cho Nhà phát triển (Dev Only)</Text>
          <Button fullWidth variant="primary" className="!bg-red-600 text-white" onClick={handleClearDatabase}>
            Xóa toàn bộ Văn bản (Reset DB)
          </Button>
        </Box>
      </Box>
    </Page>
  );
};

export default ProfilePage;
