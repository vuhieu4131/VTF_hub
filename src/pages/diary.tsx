import React, { useState, useEffect } from "react";
import { Page, Header, Box, Text, Button, Modal, Input, Icon, Tabs, DatePicker } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useRecoilValue } from "recoil";
import { currentUserState, userListState } from "../state";
import { DailyLog } from "../types/diary";
import { User } from "../types/document";

const countTasks = (text: string) => {
  if (!text) return 0;
  return text.split('\n').map(t => t.trim()).filter(t => t).length;
};

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

const displayDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const departmentNames: Record<string, string> = {
  ban_giam_doc: "Ban Giám đốc",
  van_thu: "Văn thư",
  tchc: "Tổ chức Hành chính",
  khtc: "Kế hoạch Tài chính",
  ptht: "Phát triển Hạ tầng",
  htdv: "Hỗ trợ Dịch vụ",
  ksnb: "Kiểm soát Nội bộ"
};

const AdminDiaryStats: React.FC<{ currentUser: User, userList: User[] }> = ({ currentUser, userList }) => {
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [collapsedUsers, setCollapsedUsers] = useState<Record<string, boolean>>({});

  const toggleDept = (deptId: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const toggleUser = (userId: string) => {
    setCollapsedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  useEffect(() => {
    const q = query(
      collection(db, "diaries"), 
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: DailyLog[] = [];
      snapshot.forEach(d => data.push(d.data() as DailyLog));
      setAllLogs(data);
    });
    return () => unsub();
  }, [startDate, endDate]);

  const isTruongBan = currentUser.role === 'truong_ban';
  const allowedUsers = isTruongBan 
    ? userList.filter(u => u.departmentId === currentUser.departmentId)
    : userList;

  const deptsToDisplay = isTruongBan ? [currentUser.departmentId] : Object.keys(departmentNames);

  const deptStats = deptsToDisplay.map(deptId => {
     const usersInDept = allowedUsers.filter(u => u.departmentId === deptId);
     let doneCount = 0;
     let plannedCount = 0;
     const userLogs: { user: User, logs: DailyLog[], sumDone: number, sumPlanned: number }[] = [];

     for (const user of usersInDept) {
        const logs = allLogs.filter(l => l.userId === user.id);
        if (logs.length > 0) {
           const sumDone = logs.reduce((sum, l) => sum + l.doneTasksCount, 0);
           const sumPlanned = logs.reduce((sum, l) => sum + l.plannedTasksCount, 0);
           
           doneCount += sumDone;
           plannedCount += sumPlanned;
           userLogs.push({ user, logs, sumDone, sumPlanned });
        }
     }
     
     return {
       deptId,
       deptName: departmentNames[deptId] || deptId,
       doneCount,
       plannedCount,
       userLogs
     };
  });

  return (
    <Box className="p-4 space-y-4 pb-24 bg-white">
      <Box className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <Text className="font-bold text-gray-700 mb-2">Chọn khoảng thời gian thống kê</Text>
        <Box className="flex space-x-4">
          <Box className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Từ ngày</Text>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
          </Box>
          <Box className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Đến ngày</Text>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
          </Box>
        </Box>
      </Box>

      {/* Tóm tắt toàn cơ quan / Toàn ban */}
      <Box className="bg-blue-600 rounded-xl shadow-sm p-4 mb-4 text-white flex justify-between items-center">
        <Box>
          <Text className="font-bold text-lg mb-1">
            {isTruongBan ? 'Tổng quan Ban' : 'Toàn cơ quan'}
          </Text>
          <Text className="text-blue-100 text-sm">
            <span className="font-bold text-white text-base">{deptStats.reduce((sum, stat) => sum + stat.doneCount, 0)}</span> hoàn thành / <span className="font-bold text-white text-base">{deptStats.reduce((sum, stat) => sum + stat.plannedCount, 0)}</span> kế hoạch
          </Text>
        </Box>
        <Icon icon="zi-poll" size={32} className="text-blue-300 opacity-50" />
      </Box>

      {deptStats.map(stat => {
        const total = stat.doneCount + stat.plannedCount;
        const donePercent = total > 0 ? (stat.doneCount / total) * 100 : 0;
        const plannedPercent = total > 0 ? (stat.plannedCount / total) * 100 : 0;
        const isCollapsed = !!collapsedDepts[stat.deptId];

        // Hide empty departments to keep UI clean, UNLESS it's the only one (for truong_ban)
        if (stat.userLogs.length === 0 && !isTruongBan) {
            return null;
        }

        return (
          <Box key={stat.deptId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
            <Box 
              className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer active:bg-gray-100"
              onClick={() => toggleDept(stat.deptId)}
            >
              <Box className="flex justify-between items-start">
                <Box className="flex-1">
                  <Text className="font-bold text-gray-800 text-lg mb-1">{stat.deptName}</Text>
                  <Text className="text-gray-600 text-sm mb-2">
                    <span className="text-green-600 font-medium">{stat.doneCount} hoàn thành</span> / <span className="text-orange-600 font-medium">{stat.plannedCount} kế hoạch</span>
                  </Text>
                </Box>
                <Box className="ml-3 pt-1">
                  <Icon icon={isCollapsed ? "zi-chevron-down" : "zi-chevron-up"} className="text-gray-500" />
                </Box>
              </Box>
            </Box>

            {!isCollapsed && (
              <Box className="p-4 space-y-4">
                {stat.userLogs.length === 0 ? (
                  <Text className="text-center text-gray-400 italic text-sm py-4">Chưa có ai ghi nhật ký trong ngày này.</Text>
                ) : (
                  stat.userLogs.map(({ user, logs, sumDone, sumPlanned }) => {
                    const isUserCollapsed = !!collapsedUsers[user.id];
                    return (
                    <Box key={user.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <Box 
                        className="flex items-center justify-between mb-2 cursor-pointer active:bg-gray-50 p-1 -mx-1 rounded"
                        onClick={() => toggleUser(user.id)}
                      >
                        <Box className="flex items-center space-x-2">
                          <Box className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Text className="font-bold text-blue-600 text-sm">{user.name.charAt(0)}</Text>
                          </Box>
                          <Box>
                            <Text className="font-bold text-gray-800">{user.name}</Text>
                            <Text className="text-xs text-gray-500">
                              <span className="text-green-600">{sumDone} hoàn thành</span> / <span className="text-orange-600">{sumPlanned} kế hoạch</span>
                            </Text>
                          </Box>
                        </Box>
                        <Icon icon={isUserCollapsed ? "zi-chevron-down" : "zi-chevron-up"} className="text-gray-400" />
                      </Box>
                      
                      {!isUserCollapsed && (
                        <Box className="pl-10 space-y-4 mt-2">
                          {logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                            <Box key={log.id} className="border-l-2 border-gray-200 pl-3">
                              <Text className="font-bold text-gray-600 text-xs mb-2">Ngày {displayDate(log.date)}</Text>
                              {log.doneTasksText && (
                                <Box className="mb-2">
                                  <Text className="text-sm font-bold text-green-700 mb-1 flex items-center">
                                    <Icon icon="zi-check-circle-solid" className="mr-1" /> 
                                    <span>Đã hoàn thành ({log.doneTasksCount})</span>
                                  </Text>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {log.doneTasksText.split('\n').filter(t => t.trim()).map((t, i) => (
                                      <li key={i} className="text-sm text-gray-700">{t}</li>
                                    ))}
                                  </ul>
                                </Box>
                              )}
                              {log.plannedTasksText && (
                                <Box>
                                  <Text className="text-sm font-bold text-orange-700 mb-1 flex items-center mt-2">
                                    <Icon icon="zi-clock-2-solid" className="mr-1" /> 
                                    <span>Kế hoạch ({log.plannedTasksCount})</span>
                                  </Text>
                                  <ul className="list-disc pl-5 space-y-1">
                                    {log.plannedTasksText.split('\n').filter(t => t.trim()).map((t, i) => (
                                      <li key={i} className="text-sm text-gray-700">{t}</li>
                                    ))}
                                  </ul>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    );
                  })
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const DiaryPage: React.FC = () => {
  const currentUser = useRecoilValue(currentUserState);
  const userList = useRecoilValue(userListState);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [collapsedLogs, setCollapsedLogs] = useState<Record<string, boolean>>({});
  const [isDoneExpanded, setIsDoneExpanded] = useState(true);
  const [isPlannedExpanded, setIsPlannedExpanded] = useState(true);
  
  const toggleCollapse = (id: string) => {
    setCollapsedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const [editingDate, setEditingDate] = useState(formatDate(new Date()));
  const [doneText, setDoneText] = useState("");
  const [plannedText, setPlannedText] = useState("");
  
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "diaries"), where("userId", "==", currentUser.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: DailyLog[] = [];
      snapshot.forEach(d => {
        data.push(d.data() as DailyLog);
      });
      data.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setLogs(data);
    });
    return () => unsub();
  }, [currentUser]);

  const handleOpenEdit = (log?: DailyLog) => {
    if (log) {
      setEditingDate(log.date || formatDate(new Date()));
      setDoneText(log.doneTasksText || "");
      setPlannedText(log.plannedTasksText || "");
    } else {
      setEditingDate(formatDate(new Date()));
      setDoneText("");
      
      const lastPlannedLog = logs.find(l => l.plannedTasksText && l.plannedTasksText.trim() !== "");
      setPlannedText(lastPlannedLog ? lastPlannedLog.plannedTasksText : "");
    }
    setIsDoneExpanded(true);
    setIsPlannedExpanded(true);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!doneText.trim() && !plannedText.trim()) {
      alert("Vui lòng nhập ít nhất một công việc.");
      return;
    }

    try {
      const id = `${currentUser.id}_${editingDate}`;
      const log: DailyLog = {
        id,
        userId: currentUser.id,
        date: editingDate,
        doneTasksText: doneText,
        doneTasksCount: countTasks(doneText),
        plannedTasksText: plannedText,
        plannedTasksCount: countTasks(plannedText),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, "diaries", id), log);
      setModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const todayStr = formatDate(new Date());
  const hasTodayLog = logs.some(l => l.date === todayStr);

  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'giam_doc' || currentUser?.role === 'pho_giam_doc' || currentUser?.role === 'truong_ban';

  const personalView = (
    <Box className="p-4 pb-24 space-y-4 bg-gray-50">
      <Box 
        className="bg-blue-600 rounded-xl p-5 text-white shadow-md flex justify-between items-center relative overflow-hidden cursor-pointer active:opacity-80"
        onClick={() => {
          const todayLog = logs.find(l => l.date === todayStr);
          handleOpenEdit(todayLog);
        }}
      >
        <Box className="relative z-10">
          <Text className="text-blue-100 text-sm font-medium mb-1">Hôm nay, {displayDate(todayStr)}</Text>
          {hasTodayLog ? (
            <Text className="text-lg font-bold">Bạn đã ghi nhật ký!</Text>
          ) : (
            <Text className="text-lg font-bold">Ghi nhận công việc ngay?</Text>
          )}
        </Box>
        <Box className="relative z-10 flex-shrink-0 ml-2">
          <Box className="bg-white text-blue-600 font-bold px-3 py-2 rounded-lg shadow-sm text-sm">
            {hasTodayLog ? "Cập nhật" : "Viết nhật ký"}
          </Box>
        </Box>
      </Box>

      <Box className="space-y-4 mt-6">
        <Text className="font-bold text-gray-800 text-lg mb-2">Lịch sử nhật ký</Text>
        {logs.length === 0 ? (
          <Text className="text-center text-gray-500 italic py-8">Chưa có bản ghi nhật ký nào.</Text>
        ) : (
          logs.map(log => {
            const isCollapsed = !!collapsedLogs[log.id];
            
            return (
            <Box key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <Box className="flex justify-between items-start mb-3 pb-2 border-b border-gray-50">
                <Box 
                  className="flex items-start space-x-2 cursor-pointer flex-1"
                  onClick={() => toggleCollapse(log.id)}
                >
                  <Icon icon="zi-calendar" className="mt-0.5" />
                  <Box>
                    <Text className="font-bold text-gray-800 text-base">
                      Ngày {log.date ? displayDate(log.date) : ''}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      ({log.doneTasksCount} Đã hoàn thành / {log.plannedTasksCount} Kế hoạch)
                    </Text>
                  </Box>
                </Box>
                <Box className="flex items-center space-x-3 ml-2 pt-0.5">
                  <Text 
                    className="text-blue-600 text-sm font-medium cursor-pointer"
                    onClick={() => handleOpenEdit(log)}
                  >
                    Chỉnh sửa
                  </Text>
                  <span onClick={() => toggleCollapse(log.id)}>
                    <Icon 
                      icon={isCollapsed ? "zi-chevron-down" : "zi-chevron-up"} 
                      className="text-gray-400 cursor-pointer"
                    />
                  </span>
                </Box>
              </Box>
              
              {!isCollapsed && (
                <Box className="space-y-3">
                {log.doneTasksText && (
                  <Box>
                    <Text className="text-sm font-bold text-green-700 flex items-center space-x-1 mb-1">
                      <Icon icon="zi-check-circle-solid" />
                      <span>Đã hoàn thành ({log.doneTasksCount})</span>
                    </Text>
                    <ul className="list-disc pl-5 space-y-1">
                      {log.doneTasksText.split('\n').filter(t => t.trim()).map((task, idx) => (
                        <li key={idx} className="text-sm text-gray-700">{task}</li>
                      ))}
                    </ul>
                  </Box>
                )}
                
                {log.plannedTasksText && (
                  <Box>
                    <Text className="text-sm font-bold text-orange-700 flex items-center space-x-1 mb-1 mt-2">
                      <Icon icon="zi-clock-2-solid" />
                      <span>Kế hoạch ({log.plannedTasksCount})</span>
                    </Text>
                    <ul className="list-disc pl-5 space-y-1">
                      {log.plannedTasksText.split('\n').filter(t => t.trim()).map((task, idx) => (
                        <li key={idx} className="text-sm text-gray-700">{task}</li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Box>
              )}
            </Box>
            );
          })
        )}
      </Box>
    </Box>
  );

  return (
    <Page className="bg-gray-50">
      <Header title="Nhật ký công việc" showBackIcon={false} />
      
      {isManager ? (
        <Tabs id="diary-tabs" className="bg-white">
          <Tabs.Tab key="personal" label="Cá nhân">
            {personalView}
          </Tabs.Tab>
          <Tabs.Tab key="stats" label={currentUser?.role === 'truong_ban' ? "Thống kê Ban" : "Toàn cơ quan"}>
            <AdminDiaryStats currentUser={currentUser as User} userList={userList} />
          </Tabs.Tab>
        </Tabs>
      ) : (
        personalView
      )}

      <Modal
        visible={isModalVisible}
        title={`Nhật ký ngày ${displayDate(editingDate)}`}
        onClose={() => setModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Lưu lại", highLight: true, onClick: handleSave }
        ]}
      >
        <Box className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <Box>
            <Text className="text-sm font-bold text-gray-700 mb-1 flex items-center space-x-1">
              Ngày ghi nhận
            </Text>
            <DatePicker
              mask
              maskClosable
              dateFormat="dd/mm/yyyy"
              title="Ngày ghi nhận"
              value={new Date(editingDate)}
              onChange={(value, valueStr) => {
                if (value instanceof Date) {
                  const y = value.getFullYear();
                  const m = String(value.getMonth() + 1).padStart(2, '0');
                  const d = String(value.getDate()).padStart(2, '0');
                  setEditingDate(`${y}-${m}-${d}`);
                }
              }}
            />
          </Box>
          <Box>
            <Box 
              className="flex justify-between items-center mb-1 cursor-pointer"
              onClick={() => setIsDoneExpanded(!isDoneExpanded)}
            >
              <Text className="text-sm font-bold text-green-700 flex items-center space-x-1">
                <Icon icon="zi-check-circle-solid" />
                <span>Công việc ĐÃ LÀM (mỗi dòng 1 việc)</span>
              </Text>
              <Icon icon={isDoneExpanded ? "zi-chevron-up" : "zi-chevron-down"} className="text-gray-500" />
            </Box>
            {isDoneExpanded && (
              <Input.TextArea 
                rows={4}
                placeholder="Ghi các công việc đã hoàn thành"
                value={doneText}
                onChange={(e) => setDoneText(e.target.value)}
                className="border-green-200 focus:border-green-500"
              />
            )}
          </Box>
          <Box>
            <Box 
              className="flex justify-between items-center mb-1 cursor-pointer"
              onClick={() => setIsPlannedExpanded(!isPlannedExpanded)}
            >
              <Text className="text-sm font-bold text-orange-700 flex items-center space-x-1">
                <Icon icon="zi-clock-2-solid" />
                <span>Công việc ĐANG LÀM (mỗi dòng 1 việc)</span>
              </Text>
              <Icon icon={isPlannedExpanded ? "zi-chevron-up" : "zi-chevron-down"} className="text-gray-500" />
            </Box>
            {isPlannedExpanded && (
              <Input.TextArea 
                rows={4}
                placeholder="Ghi các công việc đang làm"
                value={plannedText}
                onChange={(e) => setPlannedText(e.target.value)}
                className="border-orange-200 focus:border-orange-500"
              />
            )}
          </Box>
        </Box>
      </Modal>

    </Page>
  );
};

export default DiaryPage;
