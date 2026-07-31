import React, { useState, useEffect } from "react";
import { Page, Header, Box, Text, Button, Modal, Input, List, Icon } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { AgencyEvent, Feedback } from "../types/event";
import { UserProfile } from "../types/document";
import { currentUserState, allowedEventManagersState } from "../state";
import { useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { FeedbackInbox } from "../components/FeedbackInbox";
import { checkNextSalaryRaise, checkNextExtraIncomeRaise } from "../utils/date";

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<AgencyEvent[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const currentUser = useRecoilValue(currentUserState);
  const allowedEventManagers = useRecoilValue(allowedEventManagersState);
  
  const [isEventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<AgencyEvent>>({});
  
  const [isBirthdayExpanded, setIsBirthdayExpanded] = useState(true);
  const [isSalaryExpanded, setIsSalaryExpanded] = useState(true);
  const location = useLocation();

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

    return () => {
      unsubEvents();
      unsubProfiles();
    };
  }, []);

  const canCreateEvent = currentUser?.role === 'admin' || allowedEventManagers.includes(currentUser?.id || '');

  useEffect(() => {
    if (location.search.includes('action=create') && canCreateEvent) {
      openCreateEvent();
    }
  }, [location.search, canCreateEvent]);

  // Calculate upcoming birthdays
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

  const upcomingSalaryRaises = getUpcomingSalaryRaises();


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
      <Header title="Thông báo & Bảng tin" showBackIcon={false} />
      
      <Box className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {/* Events */}
        <Box>
          <Box className="flex justify-between items-center mb-3">
            <Text className="font-bold text-gray-800 text-lg">Thông báo chung</Text>
            {canCreateEvent && (
              <Button size="small" onClick={openCreateEvent}>+ Tạo thông báo</Button>
            )}
          </Box>
          {events.length === 0 ? (
             <Text className="text-gray-500 italic text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
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
               <Text className="text-gray-500 italic text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
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
          <Box className="mt-8">
            <Box 
              className="flex justify-between items-center mb-3 cursor-pointer"
              onClick={() => setIsSalaryExpanded(!isSalaryExpanded)}
            >
              <Text className="font-bold text-gray-800 text-lg">Thông tin Lương & Thu nhập</Text>
              <Icon icon={isSalaryExpanded ? 'zi-chevron-up' : 'zi-chevron-down'} className="text-gray-500" />
            </Box>
            {isSalaryExpanded && (
              upcomingSalaryRaises.length === 0 ? (
                 <Text className="text-gray-500 italic text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                   Không có lịch lên lương/TNTT nào trong tháng này.
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

        {/* Góp ý */}
        <FeedbackInbox />

      </Box>

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

export default EventsPage;
