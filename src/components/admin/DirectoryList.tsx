import React, { useState, useEffect } from "react";
import { Box, Text, List, Icon, Button, Modal, Input, Select } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { UserProfile, DepartmentId } from "../../types/document";
import { departments } from "../../constants/departments";

export const DirectoryList: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [expandedDeptIds, setExpandedDeptIds] = useState<string[]>(departments.map(d => d.id));
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<UserProfile>>({});

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

  const toggleDept = (deptId: string) => {
    setExpandedDeptIds(prev => 
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSave = async () => {
    if (!editingProfile.employeeCode || !editingProfile.fullName) {
      alert("Vui lòng nhập mã và họ tên");
      return;
    }
    if (editingProfile.email && !editingProfile.email.endsWith('@mst.gov.vn')) {
      alert("Email phải có định dạng @mst.gov.vn");
      return;
    }

    try {
      const id = editingProfile.id || Date.now().toString();
      await setDoc(doc(db, "profiles", id), {
        ...editingProfile,
        id
      });
      setModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa hồ sơ nhân sự này? Thao tác này không thể hoàn tác.")) {
      await deleteDoc(doc(db, "profiles", id));
    }
  };

  const openEdit = (e: React.MouseEvent, p: UserProfile) => {
    e.stopPropagation();
    setEditingProfile(p);
    setModalVisible(true);
  };

  const openCreate = () => {
    setEditingProfile({
      id: '', employeeCode: '', fullName: '', dob: '', phone: '', email: '', 
      jobTitle: '', professionalTitle: '', departmentId: 'ban_giam_doc',
      salaryCoefficient: 0, nextSalaryRaiseDate: '', salaryRaiseDecision: '',
      extraIncomeCoefficient: 0, nextExtraIncomeRaiseDate: ''
    });
    setModalVisible(true);
  };

  return (
    <Box className="flex flex-col h-full bg-gray-50 relative">
      <Box className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {departments.map(dept => {
          const deptProfiles = profiles.filter(p => p.departmentId === dept.id);
          const isExpanded = expandedDeptIds.includes(dept.id);
          
          if (deptProfiles.length === 0) return null;

          return (
            <Box key={dept.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Box 
                className={`flex justify-between items-center p-3 bg-blue-50 cursor-pointer ${isExpanded ? 'border-b border-blue-100' : ''}`}
                onClick={() => toggleDept(dept.id)}
              >
                <Text className="font-bold text-blue-800">{dept.name}</Text>
                <Box className="flex items-center space-x-2">
                  <Text className="text-sm font-medium text-blue-600 bg-white px-2 py-0.5 rounded-full">
                    {deptProfiles.length}
                  </Text>
                  <Icon icon={isExpanded ? 'zi-chevron-up' : 'zi-chevron-down'} className="text-blue-500" />
                </Box>
              </Box>
              
              {isExpanded && (
                <List className="!m-0">
                  {deptProfiles.map((p, index) => (
                    <Box key={p.id} className={`p-3 flex justify-between items-center ${index < deptProfiles.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <Box className="flex-1 pr-2">
                        <Text className="font-bold text-gray-800">{p.fullName}</Text>
                        <Text className="text-sm text-gray-500">{p.jobTitle || 'Chưa cập nhật'} - {p.employeeCode}</Text>
                        {p.phone && (
                           <Text className="text-xs text-gray-400 mt-1">SĐT: {p.phone}</Text>
                        )}
                      </Box>
                      <Box className="flex flex-col space-y-2">
                        <Button size="small" variant="tertiary" onClick={(e) => openEdit(e, p)}>Sửa</Button>
                        <Button size="small" variant="secondary" className="!text-red-500" onClick={(e) => handleDelete(e, p.id)}>Xóa</Button>
                      </Box>
                    </Box>
                  ))}
                </List>
              )}
            </Box>
          );
        })}
        
        {profiles.length === 0 && (
          <Box className="text-center p-8">
            <Text className="text-gray-500 italic">Chưa có hồ sơ nhân sự nào.</Text>
          </Box>
        )}
      </Box>

      {/* Floating Action Button */}
      <Box 
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center z-50 cursor-pointer active:scale-95 transition-transform"
        onClick={openCreate}
      >
        <Icon icon="zi-plus" className="text-white text-2xl" />
      </Box>

      <Modal
        visible={isModalVisible}
        title={editingProfile.id ? "Sửa Hồ sơ" : "Tạo Hồ sơ mới"}
        onClose={() => setModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Lưu", highLight: true, onClick: handleSave }
        ]}
      >
        <Box className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <Input label="Mã viên chức" value={editingProfile.employeeCode} onChange={e => setEditingProfile({...editingProfile, employeeCode: e.target.value})} />
          <Input label="Họ tên" value={editingProfile.fullName} onChange={e => setEditingProfile({...editingProfile, fullName: e.target.value})} />
          <Input label="Ngày sinh" type={"date" as any} value={editingProfile.dob} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} />
          <Input 
            label="Số điện thoại" 
            value={editingProfile.phone} 
            onChange={e => {
              let val = e.target.value.replace(/\D/g, '');
              if (val.length > 0 && val[0] !== '0') val = '0' + val;
              if (val.length > 4) val = val.substring(0, 4) + ' ' + val.substring(4);
              if (val.length > 8) val = val.substring(0, 8) + ' ' + val.substring(8);
              setEditingProfile({...editingProfile, phone: val.trim()});
            }} 
            placeholder="VD: 0943 128 999"
          />
          <Input label="Email (@mst.gov.vn)" value={editingProfile.email} onChange={e => setEditingProfile({...editingProfile, email: e.target.value})} placeholder="VD: nguyenvan@mst.gov.vn" />
          
          <Box>
            <Text className="text-sm mb-1 text-gray-600">Ban / Phòng</Text>
            <Select 
              value={editingProfile.departmentId} 
              onChange={v => setEditingProfile({...editingProfile, departmentId: v as DepartmentId})}
              closeOnSelect
            >
              {departments.map(d => <Select.Option key={d.id} value={d.id} title={d.name} />)}
            </Select>
          </Box>
          
          <Input label="Chức vụ" value={editingProfile.jobTitle} onChange={e => setEditingProfile({...editingProfile, jobTitle: e.target.value})} />
          <Input label="Chức danh (CVCC/CVC)" value={editingProfile.professionalTitle} onChange={e => setEditingProfile({...editingProfile, professionalTitle: e.target.value})} />
          
          <Text className="font-bold text-blue-600 mt-4 border-t pt-4">Lương & Thu nhập tăng thêm</Text>
          <Input type="number" label="Hệ số lương (HSL)" value={editingProfile.salaryCoefficient?.toString()} onChange={e => setEditingProfile({...editingProfile, salaryCoefficient: parseFloat(e.target.value) || 0})} />
          <Input label="Ngày lên lương" type={"date" as any} value={editingProfile.nextSalaryRaiseDate} onChange={e => setEditingProfile({...editingProfile, nextSalaryRaiseDate: e.target.value})} />
          <Input label="Quyết định số" value={editingProfile.salaryRaiseDecision} onChange={e => setEditingProfile({...editingProfile, salaryRaiseDecision: e.target.value})} />
          
          <Input type="number" label="Hệ số Thu nhập tăng thêm (HSTNTT)" value={editingProfile.extraIncomeCoefficient?.toString()} onChange={e => setEditingProfile({...editingProfile, extraIncomeCoefficient: parseFloat(e.target.value) || 0})} />
          <Input label="Ngày lên bậc TNTT" type={"date" as any} value={editingProfile.nextExtraIncomeRaiseDate} onChange={e => setEditingProfile({...editingProfile, nextExtraIncomeRaiseDate: e.target.value})} />
        </Box>
      </Modal>
    </Box>
  );
};
