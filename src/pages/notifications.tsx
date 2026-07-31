import React, { useState, useEffect } from "react";
import { Page, Header, Box, Text, Icon, Button, Modal, Input, List } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useRecoilValue } from "recoil";
import { currentUserState, allowedScheduleManagersState, allowedEventManagersState } from "../state";
import { checkNextSalaryRaise, checkNextExtraIncomeRaise } from "../utils/date";
import { ScheduleEvent } from "../types/schedule";
import { ScheduleApprovalModal } from "../components/ScheduleApprovalModal";
import { AgencyEvent, Feedback } from "../types/event";
import { UserProfile } from "../types/document";
import { useLocation, useNavigate } from "react-router-dom";

const NotificationsPage: React.FC = () => {
  const [pendingEvents, setPendingEvents] = useState<ScheduleEvent[]>([]);
  const [isApprovalModalVisible, setApprovalModalVisible] = useState(false);
  
  const [events, setEvents] = useState<AgencyEvent[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const allowedEventManagers = useRecoilValue(allowedEventManagersState);
  
  const [isEventModalVisible, setEventModalVisible] = useState(false);
  const [isBirthdayExpanded, setIsBirthdayExpanded] = useState(true);
  const [isSalaryExpanded, setIsSalaryExpanded] = useState(true);
  const [isExtraIncomeExpanded, setIsExtraIncomeExpanded] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Partial<AgencyEvent>>({});
  const location = useLocation();
  const navigate = useNavigate();
  
  const [unreadFeedbacks, setUnreadFeedbacks] = useState<Feedback[]>([]);

  const currentUser = useRecoilValue(currentUserState);
  const allowedScheduleManagers = useRecoilValue(allowedScheduleManagersState);
  const canEditSchedule = currentUser?.role === 'admin' || allowedScheduleManagers.includes(currentUser?.id || '');
  const canCreateEvent = currentUser?.role === 'admin' || allowedEventManagers.includes(currentUser?.id || '');

  useEffect(() => {
    if (!canEditSchedule) return;
    const unsub = onSnapshot(collection(db, "schedules"), (snapshot) => {
      const data: ScheduleEvent[] = [];
      snapshot.forEach(d => {
        const ev = { id: d.id, ...d.data() } as ScheduleEvent;
        if (ev.status === 'pending') {
          data.push(ev);
        }
      });
      setPendingEvents(data);
    });
    return () => unsub();
  }, [canEditSchedule]);

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, "events"), (snapshot) => {
      const data: AgencyEvent[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as AgencyEvent));
      data.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setEvents(data);
    });

    const unsubProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
      const data: UserProfile[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as UserProfile));
      setProfiles(data);
    });

    let unsubFeedbacks = () => {};
    if (currentUser) {
      unsubFeedbacks = onSnapshot(collection(db, "feedbacks"), (snapshot) => {
        const data: Feedback[] = [];
        snapshot.forEach(d => {
          const f = { id: d.id, ...d.data() } as Feedback;
          const isRecipient = f.recipientId === currentUser.id || (currentUser.role === 'admin' && !f.recipientId);
          if (isRecipient && f.status === 'new') {
            data.push(f);
          }
        });
        setUnreadFeedbacks(data);
      });
    }

    return () => {
      unsubEvents();
      unsubProfiles();
      unsubFeedbacks();
    };
  }, [currentUser]);

  useEffect(() => {
    if (location.search.includes('action=create') && canCreateEvent) {
      openCreateEvent();
    }
  }, [location.search, canCreateEvent]);

  const getUpcomingBirthdays = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentMonth = today.getMonth();
    
    return profiles.map(p => {
      if (!p.dob) return null;
      let bDay, bMonth;
      if (p.dob.includes('/')) {
        const parts = p.dob.split('/');
        if (parts.length !== 3) return null;
        bDay = parseInt(parts[0]);
        bMonth = parseInt(parts[1]) - 1;
      } else if (p.dob.includes('-')) {
        const parts = p.dob.split('-');
        if (parts.length !== 3) return null;
        bDay = parseInt(parts[2]);
        bMonth = parseInt(parts[1]) - 1;
      } else {
        return null;
      }
      
      if (bMonth !== currentMonth) return null;
      
      const bDayDate = new Date(today.getFullYear(), bMonth, bDay);
      const diffDays = Math.ceil((bDayDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      return { ...p, bDay, diffDays };
    }).filter(p => p !== null)
      .sort((a, b) => a!.bDay - b!.bDay) as any[];
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  const getUpcomingSalaryRaises = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const results: any[] = [];
    profiles.forEach(p => {
      if (currentUser?.role !== 'admin' && currentUser?.profileId !== p.id) {
         return;
      }

      if (p.nextSalaryRaiseDate) {
        const salaryCheck = checkNextSalaryRaise(p.nextSalaryRaiseDate, p.professionalTitle, currentMonth, currentYear);
        if (salaryCheck.isMatch) {
           results.push({ id: p.id + '_salary', fullName: p.fullName, type: 'Lên lương', date: salaryCheck.nextDateStr, day: salaryCheck.bDay });
        }
      }

      if (p.nextExtraIncomeRaiseDate) {
        const extraIncomeCheck = checkNextExtraIncomeRaise(p.nextExtraIncomeRaiseDate, p.extraIncomeCode, currentMonth, currentYear);
        if (extraIncomeCheck.isMatch) {
           results.push({ id: p.id + '_extra_income', fullName: p.fullName, type: 'Lên bậc TNTT', date: extraIncomeCheck.nextDateStr, day: extraIncomeCheck.bDay });
        }
      }
    });

    return results.sort((a, b) => a.day - b.day);
  };

  const allRaises = getUpcomingSalaryRaises();
  const upcomingSalaryRaises = allRaises.filter(r => r.type === 'Lên lương');
  const upcomingExtraIncomeRaises = allRaises.filter(r => r.type === 'Lên bậc TNTT');

  const handleSaveEvent = async () => {
    if (!editingEvent.title || !editingEvent.description) {
      alert("Vui lòng nhập Tên thông báo và Nội dung");
      return;
    }
    try {
      const id = editingEvent.id || Date.now().toString();
      await setDoc(doc(db, "events", id), {
        ...editingEvent,
        id,
        creatorId: currentUser?.id || 'admin',
        createdAt: editingEvent.createdAt || new Date().toISOString()
      });
      setEventModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thông báo này?")) {
      await deleteDoc(doc(db, "events", id));
    }
  };

  const openEditEvent = (e: AgencyEvent) => {
    setEditingEvent(e);
    setEventModalVisible(true);
  };

  const openCreateEvent = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingEvent({
      id: '', title: '', description: '', date: today, type: 'announcement'
    });
    setEventModalVisible(true);
  };

  const hasNotifications = canEditSchedule && pendingEvents.length > 0;
  const hasEventsOrBirthdays = events.length > 0 || upcomingBirthdays.length > 0 || canCreateEvent;
  const noContent = !hasNotifications && !hasEventsOrBirthdays;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };

  return (
    <Page className="bg-gray-50 flex flex-col h-full">
      <Header title="Thông báo" showBackIcon={false} />
      
      {canCreateEvent && (
        <Box className="bg-white border-b border-gray-200 p-3 flex justify-between items-center shadow-sm z-10 relative">
          <Text className="text-gray-800 font-bold text-sm">Quản lý Thông báo</Text>
          <button 
            onClick={openCreateEvent} 
            className="bg-blue-600 text-white rounded-full shadow-md px-4 py-1.5 flex items-center text-sm font-medium"
          >
            <Icon icon="zi-plus" className="mr-1" size={16} /> Tạo mới
          </button>
        </Box>
      )}

      <Box className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          
          {hasNotifications && (
            <Box 
              className="bg-orange-50 p-4 flex justify-between items-center border border-orange-100 cursor-pointer rounded-xl shadow-sm mb-4"
              onClick={() => setApprovalModalVisible(true)}
            >
              <Box className="flex items-center space-x-3">
                <Box className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Icon icon="zi-calendar" />
                </Box>
                <Text className="text-sm font-medium text-orange-800 flex-1">
                  Có {pendingEvents.length} đề nghị bổ sung lịch chờ duyệt
                </Text>
              </Box>
              <Button size="small" variant="secondary" className="!text-orange-600 bg-white shadow-sm border border-orange-200 ml-2">Duyệt ngay</Button>
            </Box>
          )}

          {(() => {
            const personalFeedbacks = unreadFeedbacks.filter(f => f.recipientId === currentUser?.id);
            const systemFeedbacks = unreadFeedbacks.filter(f => !f.recipientId && currentUser?.role === 'admin');
            
            return (
              <>
                {systemFeedbacks.length > 0 && (
                  <Box 
                    className="bg-purple-50 p-4 flex justify-between items-center border border-purple-200 cursor-pointer rounded-xl shadow-sm mb-4"
                    onClick={() => navigate('/admin?tab=feedback')}
                  >
                    <Box className="flex items-center space-x-3">
                      <Box className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Icon icon="zi-inbox" />
                      </Box>
                      <Text className="text-sm font-medium text-purple-800 flex-1">
                        Có {systemFeedbacks.length} Góp ý mới từ người dùng chờ Admin xử lý
                      </Text>
                    </Box>
                    <Button size="small" variant="secondary" className="!text-purple-600 bg-white shadow-sm border border-purple-200 ml-2">Xử lý ngay</Button>
                  </Box>
                )}

                {personalFeedbacks.length > 0 && (
                  <Box 
                    className="bg-blue-50 p-4 flex justify-between items-center border border-blue-200 cursor-pointer rounded-xl shadow-sm mb-4"
                    onClick={() => navigate('/profile')}
                  >
                    <Box className="flex items-center space-x-3">
                      <Box className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Icon icon="zi-chat" />
                      </Box>
                      <Text className="text-sm font-medium text-blue-800 flex-1">
                        Bạn có {personalFeedbacks.length} thư cá nhân mới chưa đọc
                      </Text>
                    </Box>
                    <Button size="small" variant="secondary" className="!text-blue-600 bg-white shadow-sm border border-blue-200 ml-2">Đọc ngay</Button>
                  </Box>
                )}
              </>
            );
          })()}


          {/* Birthdays */}
          <Box>
            <Box 
              className="flex justify-between items-center mb-3 cursor-pointer"
              onClick={() => setIsBirthdayExpanded(!isBirthdayExpanded)}
            >
              <Text className="font-bold text-gray-800 text-lg">Chúc mừng sinh nhật</Text>
              <Icon icon={isBirthdayExpanded ? 'zi-chevron-up' : 'zi-chevron-down'} className="text-gray-500" />
            </Box>
            {isBirthdayExpanded && (
              upcomingBirthdays.length === 0 ? (
                 <Text className="text-gray-500 italic text-sm text-center py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                   Không có sinh nhật nào trong tháng này.
                 </Text>
              ) : (
                <List>
                  {upcomingBirthdays.map(p => (
                    <Box key={p.id} className="bg-white p-3 mb-2 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <Box>
                        <Text className="font-bold text-gray-800">🎉 {p.fullName}</Text>
                        <Text className="text-xs text-gray-500">{formatDate(p.dob)} - {p.jobTitle}</Text>
                      </Box>
                      <Box className="text-right">
                        {p.diffDays === 0 ? (
                          <Text className="text-red-500 font-bold text-sm">Hôm nay!</Text>
                        ) : p.diffDays > 0 ? (
                          <Text className="text-orange-500 font-bold text-sm">Còn {p.diffDays} ngày</Text>
                        ) : (
                          <Text className="text-gray-400 font-medium text-sm">Đã qua</Text>
                        )}
                      </Box>
                    </Box>
                  ))}
                </List>
              )
            )}
          </Box>

          {/* Salary Raises */}
          {(currentUser?.role === 'admin' || upcomingSalaryRaises.length > 0) && (
            <Box>
              <Box 
                className="flex justify-between items-center mb-3 cursor-pointer"
                onClick={() => setIsSalaryExpanded(!isSalaryExpanded)}
              >
                <Text className="font-bold text-gray-800 text-lg">Thông tin nâng bậc lương</Text>
                <Icon icon={isSalaryExpanded ? 'zi-chevron-up' : 'zi-chevron-down'} className="text-gray-500" />
              </Box>
              {isSalaryExpanded && (
                upcomingSalaryRaises.length === 0 ? (
                   <Text className="text-gray-500 italic text-sm text-center py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                     Không có thông tin nâng bậc lương nào trong tháng này.
                   </Text>
                ) : (
                  <List>
                    {upcomingSalaryRaises.map(r => (
                      <Box key={r.id} className="bg-white p-3 mb-2 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center border-l-4 border-green-500">
                        <Box>
                          <Text className="font-bold text-gray-800">{r.fullName}</Text>
                          <Text className="text-xs text-gray-500 mt-1">{r.type} - {formatDate(r.date)}</Text>
                        </Box>
                        <Box className="text-right">
                          <Text className="text-green-600 font-bold text-sm">Tháng này</Text>
                        </Box>
                      </Box>
                    ))}
                  </List>
                )
              )}
            </Box>
          )}

          {/* Extra Income Raises */}
          {(currentUser?.role === 'admin' || upcomingExtraIncomeRaises.length > 0) && (
            <Box>
              <Box 
                className="flex justify-between items-center mb-3 cursor-pointer"
                onClick={() => setIsExtraIncomeExpanded(!isExtraIncomeExpanded)}
              >
                <Text className="font-bold text-gray-800 text-lg">Thông tin nâng hệ số TNTT</Text>
                <Icon icon={isExtraIncomeExpanded ? 'zi-chevron-up' : 'zi-chevron-down'} className="text-gray-500" />
              </Box>
              {isExtraIncomeExpanded && (
                upcomingExtraIncomeRaises.length === 0 ? (
                   <Text className="text-gray-500 italic text-sm text-center py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                     Không có thông tin nâng hệ số TNTT nào trong tháng này.
                   </Text>
                ) : (
                  <List>
                    {upcomingExtraIncomeRaises.map(r => (
                      <Box key={r.id} className="bg-white p-3 mb-2 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center border-l-4 border-green-500">
                        <Box>
                          <Text className="font-bold text-gray-800">{r.fullName}</Text>
                          <Text className="text-xs text-gray-500 mt-1">{r.type} - {formatDate(r.date)}</Text>
                        </Box>
                        <Box className="text-right">
                          <Text className="text-green-600 font-bold text-sm">Tháng này</Text>
                        </Box>
                      </Box>
                    ))}
                  </List>
                )
              )}
            </Box>
          )}

          {/* Notifications */}
          <Box>
            <Box className="flex justify-between items-center mb-3">
              <Text className="font-bold text-gray-800 text-lg">Thông báo</Text>
                {canCreateEvent && (
                  <button 
                    onClick={openCreateEvent}
                    className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-200"
                  >
                    + Tạo thông báo
                  </button>
                )}
              </Box>
              {events.length === 0 ? (
                 <Text className="text-gray-500 italic text-sm text-center py-2">
                   Không có thông báo nào.
                 </Text>
              ) : (
                 <Box className="space-y-3">
                   {events.map(e => (
                     <Box key={e.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <Box className="flex justify-between items-start mb-1">
                          <Box>
                            <Text className="font-bold text-blue-800">{e.title}</Text>
                            <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-1">{formatDate(e.date)}</Text>
                          </Box>
                          {canCreateEvent && (
                            <Box className="flex space-x-2">
                               <Text className="text-blue-500 text-xs cursor-pointer" onClick={() => openEditEvent(e)}>Sửa</Text>
                               <Text className="text-red-500 text-xs cursor-pointer" onClick={() => handleDeleteEvent(e.id)}>Xóa</Text>
                            </Box>
                          )}
                        </Box>
                        <Text className="text-sm text-gray-600 mt-2">{e.description}</Text>
                     </Box>
                   ))}
                 </Box>
              )}
          </Box>
        </Box>

      {canEditSchedule && (
        <ScheduleApprovalModal 
          visible={isApprovalModalVisible}
          onClose={() => setApprovalModalVisible(false)}
          pendingEvents={pendingEvents}
        />
      )}

      {/* Modal Thông báo */}
      <Modal
        visible={isEventModalVisible}
        title={editingEvent.id ? "Sửa Thông báo" : "Tạo Thông báo mới"}
        onClose={() => setEventModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Lưu", highLight: true, onClick: handleSaveEvent }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Box>
            <Text className="text-sm font-medium mb-1">Tên thông báo *</Text>
            <Input 
              value={editingEvent.title} 
              onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})} 
            />
          </Box>
          <Box>
            <Text className="text-sm font-medium mb-1">Nội dung *</Text>
            <Input.TextArea 
              rows={6}
              value={editingEvent.description} 
              onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})} 
            />
          </Box>
        </Box>
      </Modal>

    </Page>
  );
};

export default NotificationsPage;
