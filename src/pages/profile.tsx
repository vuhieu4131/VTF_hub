import React, { FC } from "react";
import { Box, Header, Icon, Page, Text, Avatar, Button, Modal, Input } from "zmp-ui";
import { useRecoilValueLoadable, useRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import { userState, currentUserState } from "../state";
import { UserRole } from "../types/document";
import { departments } from "../constants/departments";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db, storage } from "../firebase";
import { collection, getDocs, deleteDoc, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { UserProfile } from "../types/document";
import { FeedbackInbox } from "../components/FeedbackInbox";
import { checkNextSalaryRaise, checkNextExtraIncomeRaise } from "../utils/date";

const roleLabels: Record<UserRole, string> = {
  guest: "Khách",
  van_thu: "Văn thư",
  giam_doc: "Giám đốc",
  pho_giam_doc: "Phó Giám đốc",
  truong_ban: "Trưởng/Phó Ban",
  chuyen_vien: "Chuyên viên",
  admin: "Quản trị hệ thống",
};

const ProfilePage: FC = () => {
  const userLoadable = useRecoilValueLoadable(userState);
  const [currentUser, setCurrentUser] = useRecoilState(currentUserState);
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [accountInfoVisible, setAccountInfoVisible] = React.useState(false);
  
  const [changePasswordVisible, setChangePasswordVisible] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [isFeedbackModalVisible, setFeedbackModalVisible] = React.useState(false);
  const [feedbackContent, setFeedbackContent] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);

  const [isEditingZalo, setIsEditingZalo] = React.useState(false);
  const [zaloEditForm, setZaloEditForm] = React.useState({ name: '', email: '', avatar: '' });
  const [hrExpanded, setHrExpanded] = React.useState(true);
  const [salaryExpanded, setSalaryExpanded] = React.useState(true);

  React.useEffect(() => {
    if (currentUser?.profileId) {
      getDoc(doc(db, "profiles", currentUser.profileId)).then(d => {
        if (d.exists()) {
          setProfile(d.data() as UserProfile);
        }
      });
    }
    
    // Nếu user chưa có avatar, hoặc đang dùng avatar của Zalo (không phải Firebase / Base64), gán ngẫu nhiên 1 ảnh từ thư mục avata
    const isZaloOrEmptyAvatar = !currentUser?.avatar || (!currentUser.avatar.startsWith('data:') && !currentUser.avatar.startsWith('https://firebasestorage.googleapis.com'));
    if (currentUser && currentUser.id && isZaloOrEmptyAvatar) {
      const assignRandomAvatar = async () => {
        try {
          const listRef = ref(storage, 'avata');
          const res = await listAll(listRef);
          if (res.items.length > 0) {
            const randomIndex = Math.floor(Math.random() * res.items.length);
            const randomAvatar = await getDownloadURL(res.items[randomIndex]);
            
            await updateDoc(doc(db, "users", currentUser.id), { avatar: randomAvatar });
            setCurrentUser(prev => prev ? { ...prev, avatar: randomAvatar } : null);
          }
        } catch (e) {
          console.error("Lỗi gán avatar ngẫu nhiên:", e);
        }
      };
      assignRandomAvatar();
    }
  }, [currentUser?.id, currentUser?.profileId, currentUser?.avatar]);

  const handleLogout = async () => {
    try {
      navigate("/login", { replace: true });
      await signOut(auth);
    } catch (error) {
      console.error("Lỗi đăng xuất", error);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword) {
      alert("Vui lòng nhập mật khẩu hiện tại!");
      return;
    }
    if (newPassword.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    try {
      if (auth.currentUser && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, oldPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        await updatePassword(auth.currentUser, newPassword);
        alert("Đổi mật khẩu thành công!");
        setChangePasswordVisible(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        alert("Mật khẩu hiện tại không đúng!");
      } else if (e.code === 'auth/requires-recent-login') {
        alert("Vì lý do bảo mật, bạn cần đăng nhập lại trước khi đổi mật khẩu!");
      } else {
        alert("Đổi mật khẩu thất bại: " + e.message);
      }
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ VĂN BẢN TRONG CƠ SỞ DỮ LIỆU? (Hành động này không thể hoàn tác)")) {
      try {
        const querySnapshot = await getDocs(collection(db, "documents"));
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        alert("Đã xóa toàn bộ văn bản thành công!");
      } catch (e: any) {
        console.error("Lỗi xóa DB:", e);
        alert("Lỗi xóa DB: " + e.message);
      }
    }
  };


  const openZaloEdit = () => {
    if (!currentUser) return;
    setZaloEditForm({
      name: currentUser.name || '',
      email: currentUser.email || '',
      avatar: currentUser.avatar || ''
    });
    setIsEditingZalo(true);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 150;
          let w = img.width;
          let h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } 
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          setZaloEditForm({ ...zaloEditForm, avatar: canvas.toDataURL('image/jpeg', 0.8) });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveZalo = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        name: zaloEditForm.name,
        email: zaloEditForm.email,
        avatar: zaloEditForm.avatar
      });
      setCurrentUser({
        ...currentUser,
        name: zaloEditForm.name,
        email: zaloEditForm.email,
        avatar: zaloEditForm.avatar
      });
      setIsEditingZalo(false);
    } catch(e: any) {
      alert("Lỗi cập nhật: " + e.message);
    }
  };

  if (!currentUser) return null;

  return (
    <Page className="bg-gray-50 flex flex-col h-full relative">
      <Header showBackIcon={false} title="Cá nhân" />
      
      <Box className="flex-1 overflow-y-auto p-4 pb-24">
        {/* User Info Card */}
        <Box className="bg-white rounded-xl p-5 mb-4 shadow-sm flex items-center space-x-4 border border-gray-100">
          <Avatar 
            src={currentUser.avatar} 
            size={48} 
            className="border-2 border-blue-100"
          />
          <Box className="flex-1">
            <Text className="font-bold text-lg text-gray-800">
              {profile?.fullName || currentUser.name}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              Ban: {departments.find(d => d.id === currentUser.departmentId)?.name}
            </Text>
            <Text className="text-gray-500 text-sm">
              {profile?.jobTitle || roleLabels[currentUser.role]} {profile?.employeeCode ? `(${profile.employeeCode})` : ''}
            </Text>
          </Box>
        </Box>


        {/* Menu Items */}
        <Box className="bg-white rounded-xl shadow-sm mb-6 border border-gray-100">
          <Box 
            className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
            onClick={() => setAccountInfoVisible(true)}
          >
            <Box className="flex items-center space-x-3">
              <Box className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Icon icon="zi-user" className="text-blue-500" size={18} />
              </Box>
              <Text className="text-gray-700 font-medium">Thông tin tài khoản</Text>
            </Box>
            <Icon icon="zi-chevron-right" className="text-gray-400" />
          </Box>
          <Box 
            className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
            onClick={() => setChangePasswordVisible(true)}
          >
            <Box className="flex items-center space-x-3">
              <Box className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                <Icon icon="zi-lock" className="text-orange-500" size={18} />
              </Box>
              <Text className="text-gray-700 font-medium">Đổi mật khẩu</Text>
            </Box>
            <Icon icon="zi-chevron-right" className="text-gray-400" />
          </Box>
        </Box>
        
        {/* Hòm thư Góp ý / Nhắn tin */}
        <FeedbackInbox />

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

      {/* Account Info Modal */}
      <Modal
        visible={accountInfoVisible}
        title="Thông tin tài khoản"
        onClose={() => setAccountInfoVisible(false)}
        actions={[{ text: "Đóng", close: true }]}
      >
        <Box className="p-4 space-y-4 max-h-[70vh] overflow-y-auto bg-gray-50 rounded-lg">
          {/* Zalo Info */}
          <Box className="bg-white p-3 rounded-lg border border-gray-200 relative">
            <Box className="flex justify-between items-center mb-2">
              <Text className="text-xs font-bold text-gray-500 uppercase">Tài khoản Zalo liên kết</Text>
              {!isEditingZalo && (
                <Text className="text-blue-600 text-xs font-medium cursor-pointer" onClick={openZaloEdit}>
                  Sửa
                </Text>
              )}
            </Box>

            {isEditingZalo ? (
              <Box className="space-y-3">
                <Box className="flex justify-center">
                  <Box className="relative">
                    <Avatar src={zaloEditForm.avatar || currentUser?.avatar} size={64} />
                    <Box className="absolute bottom-0 right-0 bg-blue-600 text-white w-6 h-6 flex justify-center items-center rounded-full border-2 border-white cursor-pointer overflow-hidden">
                      <Icon icon="zi-camera" size={12} />
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} />
                    </Box>
                  </Box>
                </Box>
                <Input label="Tên hiển thị" value={zaloEditForm.name} onChange={e => setZaloEditForm({...zaloEditForm, name: e.target.value})} />
                <Input label="Email" value={zaloEditForm.email} onChange={e => setZaloEditForm({...zaloEditForm, email: e.target.value})} />
                
                <Box className="flex flex-row space-x-2 pt-2">
                  <button 
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium active:bg-gray-200 transition-colors"
                    onClick={() => setIsEditingZalo(false)}
                  >
                    Hủy
                  </button>
                  <button 
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium active:bg-blue-700 transition-colors shadow-sm"
                    onClick={handleSaveZalo}
                  >
                    Lưu
                  </button>
                </Box>
              </Box>
            ) : (
              <>
                <Box className="flex items-center space-x-3">
                  <Avatar src={currentUser?.avatar} size={40} />
                  <Box>
                    <Text className="font-bold text-gray-800">{currentUser?.name}</Text>
                    <Text className="text-sm text-gray-500">{currentUser?.email || 'Chưa cập nhật'}</Text>
                  </Box>
                </Box>
                <Box className="mt-3 text-sm">
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Chức danh</Text>
                    <Text className="font-medium text-blue-600">{roleLabels[currentUser?.role || 'guest']}</Text>
                  </Box>
                </Box>
              </>
            )}
          </Box>

          {/* HR Profile Info */}
          {profile ? (
            <>
              <Box className="bg-white p-3 rounded-lg border border-gray-200 space-y-2 text-sm">
              <Box className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setHrExpanded(!hrExpanded)}>
                <Text className="text-xs font-bold text-gray-500 uppercase">Hồ sơ Nhân sự</Text>
                <Icon icon={hrExpanded ? "zi-chevron-up" : "zi-chevron-down"} size={16} className="text-gray-400" />
              </Box>
              
              {hrExpanded && (
                <Box className="space-y-1 mt-2 border-t border-gray-100 pt-2">
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Mã NV</Text>
                    <Text className="font-medium">{profile.employeeCode || '---'}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Họ và tên</Text>
                    <Text className="font-medium">{profile.fullName || '---'}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Ngày sinh</Text>
                    <Text className="font-medium">{profile.dob || '---'}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Số điện thoại</Text>
                    <Text className="font-medium">{profile.phone || '---'}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Email công vụ</Text>
                    <Text className="font-medium">{profile.email || '---'}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Chức vụ</Text>
                    <Text className="font-medium">{profile.jobTitle || '---'}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Chức danh NN</Text>
                    <Text className="font-medium">{profile.professionalTitle || '---'}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Phòng ban</Text>
                    <Text className="font-medium">{departments.find(d => d.id === profile.departmentId)?.name || '---'}</Text>
                  </Box>
                </Box>
              )}
            </Box>
            
            <Box className="bg-white p-3 rounded-lg border border-gray-200 space-y-2 text-sm mt-4">
              <Box className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setSalaryExpanded(!salaryExpanded)}>
                <Text className="text-xs font-bold text-gray-500 uppercase text-blue-800">Thông tin Lương & Thu nhập</Text>
                <Icon icon={salaryExpanded ? "zi-chevron-up" : "zi-chevron-down"} size={16} className="text-gray-400" />
              </Box>
              
              {salaryExpanded && (
                <Box className="space-y-1 mt-2 border-t border-gray-100 pt-2">
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Hệ số lương (HSL)</Text>
                    <Text className="font-bold">{profile.salaryCoefficient}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Ngày lên lương (Gần nhất)</Text>
                    <Box className="text-right">
                      <Text className="font-bold">{profile.nextSalaryRaiseDate}</Text>
                    </Box>
                  </Box>
                  {(() => {
                     if (profile.nextSalaryRaiseDate) {
                        const salaryCheck = checkNextSalaryRaise(profile.nextSalaryRaiseDate, profile.professionalTitle, 0, 0); // targetMonth, targetYear không quan trọng để lấy date string
                        if (salaryCheck.nextDateStr) {
                           return (
                             <Box className="flex justify-between py-1 border-b border-gray-100">
                               <Text className="text-gray-500">Ngày lên lương tiếp theo</Text>
                               <Box className="text-right">
                                 <Text className="font-bold text-orange-600">{salaryCheck.nextDateStr}</Text>
                               </Box>
                             </Box>
                           )
                        }
                     }
                     return null;
                  })()}
                  {profile.extraIncomeCode && (
                     <Box className="flex justify-between py-1 border-b border-gray-100">
                       <Text className="text-gray-500">Mã TNTT</Text>
                       <Text className="font-bold">{profile.extraIncomeCode}</Text>
                     </Box>
                  )}
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Hệ số Thu nhập TT</Text>
                    <Text className="font-bold">{profile.extraIncomeCoefficient}</Text>
                  </Box>
                  <Box className="flex justify-between py-1 border-b border-gray-100">
                    <Text className="text-gray-500">Ngày lên bậc TNTT (Gần nhất)</Text>
                    <Box className="text-right">
                      <Text className="font-bold">{profile.nextExtraIncomeRaiseDate || '---'}</Text>
                    </Box>
                  </Box>
                  {(() => {
                     if (profile.nextExtraIncomeRaiseDate) {
                        const extraCheck = checkNextExtraIncomeRaise(profile.nextExtraIncomeRaiseDate, profile.extraIncomeCode, 0, 0);
                        if (extraCheck.nextDateStr) {
                           return (
                             <Box className="flex justify-between py-1">
                               <Text className="text-gray-500">Ngày lên bậc TNTT tiếp theo</Text>
                               <Box className="text-right">
                                 <Text className="font-bold text-green-600">{extraCheck.nextDateStr}</Text>
                               </Box>
                             </Box>
                           )
                        }
                     }
                     return null;
                  })()}
                </Box>
              )}
              </Box>
            </>
          ) : (
            <Box className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <Text className="text-gray-500 text-sm">Chưa có dữ liệu hồ sơ nhân sự liên kết.</Text>
            </Box>
          )}
        </Box>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordVisible}
        title="Đổi mật khẩu"
        onClose={() => setChangePasswordVisible(false)}
        actions={[
          { text: "Đóng", close: true },
          { text: "Xác nhận", highLight: true, onClick: handleChangePassword }
        ]}
      >
        <Box className="space-y-4 py-2 text-left">
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Mật khẩu hiện tại</Text>
            <Input.Password
              placeholder="Nhập mật khẩu đang dùng"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </Box>
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Mật khẩu mới</Text>
            <Input.Password
              placeholder="Ít nhất 6 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Box>
          <Box>
            <Text className="text-sm text-gray-600 mb-1">Xác nhận mật khẩu</Text>
            <Input.Password
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Box>
        </Box>
      </Modal>

    </Page>
  );
};

export default ProfilePage;
