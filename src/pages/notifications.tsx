import React, { useState, useEffect } from "react";
import { Page, Header, Box, Text, Icon, Button, Modal, Input, List } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useRecoilValue } from "recoil";
import { currentUserState, allowedScheduleManagersState, allowedEventManagersState } from "../state";
import { ScheduleEvent } from "../types/schedule";
import { ScheduleApprovalModal } from "../components/ScheduleApprovalModal";
import { AgencyEvent } from "../types/event";
import { UserProfile } from "../types/document";
import { useLocation } from "react-router-dom";

const NotificationsPage: React.FC = () => {
  const [pendingEvents, setPendingEvents] = useState<ScheduleEvent[]>([]);
  const [isApprovalModalVisible, setApprovalModalVisible] = useState(false);
  
  const [events, setEvents] = useState<AgencyEvent[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const allowedEventManagers = useRecoilValue(allowedEventManagersState);
  
  const [isEventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<AgencyEvent>>({});
  const location = useLocation();

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

    return () => {
      unsubEvents();
      unsubProfiles();
    };
  }, []);

  useEffect(() => {
    if (location.search.includes('action=create') && canCreateEvent) {
      openCreateEvent();
    }
  }, [location.search, canCreateEvent]);

  const getUpcomingBirthdays = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return profiles.map(p => {
      if (!p.dob) return null;
      const parts = p.dob.split('/');
      if (parts.length !== 3) return null;
      
      const bDay = parseInt(parts[0]);
      const bMonth = parseInt(parts[1]) - 1;
      
      let nextBday = new Date(today.getFullYear(), bMonth, bDay);
      if (nextBday < today) {
        nextBday = new Date(today.getFullYear() + 1, bMonth, bDay);
      }
      
      const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return { ...p, nextBday, diffDays };
    }).filter(p => p !== null && p.diffDays <= 30)
      .sort((a, b) => a!.diffDays - b!.diffDays) as any[];
  };

  const upcomingBirthdays = getUpcomingBirthdays();

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

  return (
    <Page className="bg-gray-50 flex flex-col h-full">
      <Header title="Thông báo" showBackIcon={false} />
      
      <Box className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          
          {hasNotifications && (
            <Box 
              className="bg-orange-50 p-4 flex justify-between items-center border border-orange-100 cursor-pointer rounded-xl shadow-sm"
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


          {/* Birthdays */}
          <Box>
            <Text className="font-bold text-gray-800 text-lg mb-3">Chúc mừng sinh nhật</Text>
            {upcomingBirthdays.length === 0 ? (
               <Text className="text-gray-500 italic text-sm text-center py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                 Không có sinh nhật nào sắp tới.
               </Text>
            ) : (
              <List>
                {upcomingBirthdays.map(p => (
                  <Box key={p.id} className="bg-white p-3 mb-2 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <Box>
                      <Text className="font-bold text-gray-800">🎉 {p.fullName}</Text>
                      <Text className="text-xs text-gray-500">{p.dob} - {p.jobTitle}</Text>
                    </Box>
                    <Box className="text-right">
                      {p.diffDays === 0 ? (
                        <Text className="text-red-500 font-bold text-sm">Hôm nay!</Text>
                      ) : (
                        <Text className="text-orange-500 font-bold text-sm">Còn {p.diffDays} ngày</Text>
                      )}
                    </Box>
                  </Box>
                ))}
              </List>
            )}
          </Box>

          {/* Notifications */}
          <Box>
            <Box className="flex justify-between items-center mb-3">
              <Text className="font-bold text-gray-800 text-lg">Thông báo</Text>
                {canCreateEvent && (
                  <Button size="small" onClick={openCreateEvent}>+ Tạo thông báo</Button>
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
                            <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-1">{e.date}</Text>
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
