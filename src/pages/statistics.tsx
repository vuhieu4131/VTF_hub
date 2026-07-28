import React, { useState, useMemo } from "react";
import { Page, Box, Text, Header, Tabs, Modal } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { documentListState, userListState, currentUserState, statisticsPermissionsState } from "../state";
import { departments as allDepartments } from "../constants/departments";
import { getBranchStatus } from "../utils/workflow";
import { DocumentCard } from "../components/document-card";

const Statistics: React.FC = () => {
  const allDocs = useRecoilValue(documentListState);
  const allUsers = useRecoilValue(userListState);
  const currentUser = useRecoilValue(currentUserState);
  const permissions = useRecoilValue(statisticsPermissionsState);

  // Apply Permissions
  const userPerm = currentUser ? permissions[currentUser.id] : null;
  const viewType = userPerm?.viewType || 'personal'; // Default to personal

  // Filter departments and users based on permission
  const departments = useMemo(() => {
     if (viewType === 'all') return allDepartments;
     if (viewType === 'departments') return allDepartments.filter(d => userPerm?.allowedDepartmentIds?.includes(d.id));
     return [];
  }, [viewType, userPerm]);

  const users = useMemo(() => {
     if (viewType === 'all') return allUsers;
     if (viewType === 'departments') return allUsers.filter(u => userPerm?.allowedDepartmentIds?.includes(u.departmentId));
     if (viewType === 'users') return allUsers.filter(u => userPerm?.allowedUserIds?.includes(u.id));
     // personal
     return currentUser ? allUsers.filter(u => u.id === currentUser.id) : [];
  }, [viewType, userPerm, allUsers, currentUser]);

  // Date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Filter docs by date
  const docs = useMemo(() => {
    return allDocs.filter(d => {
      if (!d.createdAt) return true;
      const docDate = d.createdAt.split('T')[0];
      if (fromDate && docDate < fromDate) return false;
      if (toDate && docDate > toDate) return false;
      return true;
    });
  }, [allDocs, fromDate, toDate]);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDocs, setModalDocs] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');

  const handleBoxClick = (title: string, docsList: any[]) => {
     if (docsList.length === 0) return;
     setModalTitle(title);
     setModalDocs(docsList);
     setModalVisible(true);
  };

  // 1. Overview Stats
  const total = docs.length;
  const pendingDocs = docs.filter(d => d.trangThai === 'pending');
  const warningDocs = docs.filter(d => d.trangThai === 'warning');
  const overdueDocs = docs.filter(d => d.trangThai === 'overdue');
  const completedDocs = docs.filter(d => d.trangThai === 'completed' || d.trangThai === 'info');

  const pending = pendingDocs.length;
  const warning = warningDocs.length;
  const overdue = overdueDocs.length;
  const completed = completedDocs.length;

  // 2. Department Stats
  const deptStats = useMemo(() => {
    return departments.map(dept => {
      const involvedDocs = docs.filter(d => {
         if (d.senderDepartmentId === dept.id) return true;
         if (d.targetDepartmentIds?.includes(dept.id)) return true;
         const usersInDept = users.filter(u => u.departmentId === dept.id).map(u => u.id);
         if (d.assigneeId && usersInDept.includes(d.assigneeId)) return true;
         if (d.targetUserIds?.some(uid => usersInDept.includes(uid))) return true;
         if (d.reporterIds?.some(uid => usersInDept.includes(uid))) return true;
         return false;
      });

      let deptPendingDocs: any[] = [];
      let deptWarningDocs: any[] = [];
      let deptOverdueDocs: any[] = [];
      let deptCompletedDocs: any[] = [];
      
      involvedDocs.forEach(d => {
        const usersInDept = users.filter(u => u.departmentId === dept.id);
        let allUsersCompleted = true;
        let anyUserInvolved = false;
        usersInDept.forEach(u => {
           const status = getBranchStatus(d, u.id, u.departmentId, u.role);
           if (status === 'processing' || status === 'waiting_reply') {
              allUsersCompleted = false;
              anyUserInvolved = true;
           }
        });
        
        if (!allUsersCompleted && anyUserInvolved) {
           if (d.trangThai === 'overdue') deptOverdueDocs.push(d);
           else if (d.trangThai === 'warning') deptWarningDocs.push(d);
           else deptPendingDocs.push(d);
        } else {
           deptCompletedDocs.push(d);
        }
      });

      return {
        ...dept,
        total: involvedDocs.length,
        pending: deptPendingDocs.length,
        warning: deptWarningDocs.length,
        overdue: deptOverdueDocs.length,
        completed: deptCompletedDocs.length,
        pendingDocs: deptPendingDocs,
        warningDocs: deptWarningDocs,
        overdueDocs: deptOverdueDocs,
        completedDocs: deptCompletedDocs
      };
    }).sort((a, b) => b.pending + b.warning + b.overdue - (a.pending + a.warning + a.overdue));
  }, [docs, departments, users]);

  // 3. User Stats grouped by Dept
  const userStats = useMemo(() => {
    return departments.map(dept => {
       const deptUsers = users.filter(u => u.departmentId === dept.id);
        const userMetrics = deptUsers.map(user => {
          let uPendingDocs: any[] = [];
          let uWarningDocs: any[] = [];
          let uOverdueDocs: any[] = [];
          let uCompletedDocs: any[] = [];
          docs.forEach(d => {
             const status = getBranchStatus(d, user.id, user.departmentId, user.role);
             const isCreator = d.creatorId === user.id;
             let isInvolved = isCreator || d.assigneeId === user.id || d.targetUserIds?.includes(user.id) || d.reporterIds?.includes(user.id);
             
             if (!isInvolved && d.history) {
                isInvolved = d.history.some(h => h.actorId === user.id || h.targetUserIds?.includes(user.id) || h.reporterIds?.includes(user.id));
             }

             if (isInvolved) {
                 if (status === 'processing' || status === 'waiting_reply') {
                    if (d.trangThai === 'overdue') uOverdueDocs.push(d);
                    else if (d.trangThai === 'warning') uWarningDocs.push(d);
                    else uPendingDocs.push(d);
                 } else {
                    uCompletedDocs.push(d);
                 }
             }
          });
          const pending = uPendingDocs.length;
          const warning = uWarningDocs.length;
          const overdue = uOverdueDocs.length;
          const completed = uCompletedDocs.length;
          return { 
             ...user, 
             pending, warning, overdue, completed, 
             total: pending + warning + overdue + completed,
             pendingDocs: uPendingDocs, warningDocs: uWarningDocs, overdueDocs: uOverdueDocs, completedDocs: uCompletedDocs
          };
       });
       return {
         ...dept,
         users: userMetrics.filter(u => u.total > 0).sort((a, b) => b.pending + b.warning + b.overdue - (a.pending + a.warning + a.overdue))
       };
    }).filter(d => d.users.length > 0);
  }, [docs, departments, users]);

  return (
    <Page className="bg-gray-50 flex flex-col h-full relative">
      <Header title="Thống kê & Báo cáo" showBackIcon={false} />
      
      <Box className="bg-white p-4 border-b border-gray-200">
        <Text className="font-medium text-gray-700 mb-2">Bộ lọc thời gian (Ngày tạo)</Text>
        <Box className="flex space-x-2 items-center">
          <Box className="flex-1">
             <Text className="text-xs text-gray-500 mb-1">Từ ngày</Text>
             <input type="date" className="w-full border border-gray-300 rounded p-2 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Box>
          <Box className="flex-1">
             <Text className="text-xs text-gray-500 mb-1">Đến ngày</Text>
             <input type="date" className="w-full border border-gray-300 rounded p-2 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Box>
        </Box>
      </Box>

      <Box className="flex-1 overflow-y-auto pb-24">
        {viewType === 'personal' ? (
           <Box className="p-4 border-b border-gray-100 bg-white shadow-sm mb-4">
              <Text className="text-lg font-bold text-gray-800 text-center">Tiến độ của tôi</Text>
           </Box>
        ) : (
          <Tabs id="statistics-tabs" activeKey={activeTab} onChange={(key) => setActiveTab(key as string)} className="bg-white sticky top-0 z-10 shadow-sm">
            <Tabs.Tab key="overview" label="Tổng quan" />
            {viewType !== 'users' && <Tabs.Tab key="departments" label="Ban/Phòng" />}
            <Tabs.Tab key="users" label="Cá nhân" />
          </Tabs>
        )}

        <Box className="p-4 space-y-6">
          {/* OVERVIEW TAB or PERSONAL VIEW */}
          {(activeTab === 'overview' || viewType === 'personal') && (
            <Box className="space-y-6">
              <Box className="grid grid-cols-2 gap-4 mb-6">
              <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 cursor-pointer active:opacity-70" onClick={() => handleBoxClick('Đang xử lý - Tổng quan', pendingDocs)}>
                <Text className="text-gray-500 text-sm mb-1">Đang xử lý</Text>
                <Text className="text-3xl font-bold text-blue-600">{pending}</Text>
              </Box>
              <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500 cursor-pointer active:opacity-70" onClick={() => handleBoxClick('Sắp đến hạn - Tổng quan', warningDocs)}>
                <Text className="text-gray-500 text-sm mb-1">Sắp đến hạn</Text>
                <Text className="text-3xl font-bold text-yellow-600">{warning}</Text>
              </Box>
              <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 cursor-pointer active:opacity-70" onClick={() => handleBoxClick('Trễ hạn - Tổng quan', overdueDocs)}>
                <Text className="text-gray-500 text-sm mb-1">Trễ hạn</Text>
                <Text className="text-3xl font-bold text-red-600">{overdue}</Text>
              </Box>
              <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 cursor-pointer active:opacity-70" onClick={() => handleBoxClick('Hoàn thành - Tổng quan', completedDocs)}>
                <Text className="text-gray-500 text-sm mb-1">Hoàn thành</Text>
                <Text className="text-3xl font-bold text-green-600">{completed}</Text>
              </Box>
            </Box>
            
            <Box className="bg-white p-4 rounded-xl shadow-sm">
              <Text className="font-bold text-base mb-4 text-gray-800">Tỷ lệ hoàn thành ({total} VB)</Text>
              {total > 0 ? (
                <>
                  <Box className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden flex">
                    <Box style={{ width: `${(completed/total)*100}%` }} className="bg-green-500 h-full"></Box>
                    <Box style={{ width: `${(pending/total)*100}%` }} className="bg-blue-500 h-full"></Box>
                    <Box style={{ width: `${(warning/total)*100}%` }} className="bg-yellow-500 h-full"></Box>
                    <Box style={{ width: `${(overdue/total)*100}%` }} className="bg-red-500 h-full"></Box>
                  </Box>
                  <Box className="flex justify-between text-xs text-gray-500">
                    <Text>{Math.round((completed/total)*100)}% hoàn thành</Text>
                    <Text>{Math.round(((total-completed)/total)*100)}% tồn đọng</Text>
                  </Box>
                </>
              ) : (
                <Text className="text-gray-500 italic">Không có dữ liệu trong khoảng thời gian này.</Text>
              )}
            </Box>
          </Box>
        )}

        {activeTab === 'departments' && (
          <Box>
            {deptStats.map(dept => (
              <Box key={dept.id} className="bg-white p-4 rounded-xl shadow-sm mb-4">
                <Box className="flex justify-between items-center mb-3">
                  <Text className="font-bold text-gray-800 text-base">{dept.name}</Text>
                  <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Tổng: {dept.total}</Text>
                </Box>
                <Box className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <Box className="text-center flex-1 cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Đang xử lý - ${dept.name}`, dept.pendingDocs)}>
                      <Text className="text-blue-600 font-bold text-xl">{dept.pending}</Text>
                      <Text className="text-gray-500 text-xs">Đang xử lý</Text>
                    </Box>
                    <Box className="text-center flex-1 border-l border-gray-200 cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Đến hạn - ${dept.name}`, dept.warningDocs)}>
                      <Text className="text-yellow-600 font-bold text-xl">{dept.warning}</Text>
                      <Text className="text-gray-500 text-xs">Đến hạn</Text>
                    </Box>
                    <Box className="text-center flex-1 border-l border-gray-200 cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Trễ hạn - ${dept.name}`, dept.overdueDocs)}>
                      <Text className="text-red-600 font-bold text-xl">{dept.overdue}</Text>
                      <Text className="text-gray-500 text-xs">Trễ hạn</Text>
                    </Box>
                    <Box className="text-center flex-1 border-l border-gray-200 cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Hoàn thành - ${dept.name}`, dept.completedDocs)}>
                      <Text className="text-green-600 font-bold text-xl">{dept.completed}</Text>
                      <Text className="text-gray-500 text-xs">Hoàn thành</Text>
                    </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {activeTab === 'users' && (
          <Box>
            {userStats.length === 0 ? (
                <Text className="text-center text-gray-500 mt-10">Không có dữ liệu cá nhân nào trong thời gian này.</Text>
            ) : (
                userStats.map(dept => (
                  <Box key={dept.id} className="mb-6">
                    <Text className="font-bold text-gray-700 text-sm mb-2 uppercase border-b border-gray-200 pb-2">{dept.name}</Text>
                    <Box className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {dept.users.map((u, i) => (
                          <Box key={u.id} className={`p-4 flex items-center justify-between ${i !== dept.users.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <Box className="flex-1">
                                <Text className="font-semibold text-gray-800">{u.name}</Text>
                                <Text className="text-xs text-gray-500 capitalize">{u.role.replace('_', ' ')}</Text>
                            </Box>
                            <Box className="flex space-x-3 text-center">
                                <Box className="cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Đang xử lý - ${u.name}`, u.pendingDocs)}>
                                  <Text className="text-blue-600 font-bold text-lg">{u.pending}</Text>
                                  <Text className="text-[10px] text-gray-400">Đang XL</Text>
                                </Box>
                                <Box className="cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Đến hạn - ${u.name}`, u.warningDocs)}>
                                  <Text className="text-yellow-600 font-bold text-lg">{u.warning}</Text>
                                  <Text className="text-[10px] text-gray-400">Đến hạn</Text>
                                </Box>
                                <Box className="cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Trễ hạn - ${u.name}`, u.overdueDocs)}>
                                  <Text className="text-red-600 font-bold text-lg">{u.overdue}</Text>
                                  <Text className="text-[10px] text-gray-400">Trễ hạn</Text>
                                </Box>
                                <Box className="cursor-pointer active:opacity-70" onClick={() => handleBoxClick(`Hoàn thành - ${u.name}`, u.completedDocs)}>
                                  <Text className="text-green-600 font-bold text-lg">{u.completed}</Text>
                                  <Text className="text-[10px] text-gray-400">Xong</Text>
                                </Box>
                            </Box>
                          </Box>
                        ))}
                    </Box>
                  </Box>
                ))
            )}
          </Box>
        )}
        </Box>
      </Box>

      {/* Documents List Modal */}
      <Modal visible={modalVisible} title={modalTitle} onClose={() => setModalVisible(false)} actions={[{ text: "Đóng", close: true }]}>
        <Box className="p-4 max-h-[70vh] overflow-y-auto bg-gray-50">
          {modalDocs.length === 0 ? (
            <Text className="text-center text-gray-500 py-4">Không có văn bản nào</Text>
          ) : (
            <Box className="space-y-4">
              {modalDocs.map(doc => (
                <DocumentCard key={doc.id} document={doc} currentTab="overview" />
              ))}
            </Box>
          )}
        </Box>
      </Modal>
    </Page>
  );
};

export default Statistics;
