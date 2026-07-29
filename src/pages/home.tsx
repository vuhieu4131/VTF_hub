import React, { useState, useEffect } from "react";
import { Page, Header, Box, Text, Button, Icon, Modal, Input, Select } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ScheduleEvent, ScheduleSession } from "../types/schedule";
import { useRecoilValue } from "recoil";
import { currentUserState, allowedScheduleManagersState } from "../state";

const DAYS_OF_WEEK = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const HomePage: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const currentUser = useRecoilValue(currentUserState);
  const allowedScheduleManagers = useRecoilValue(allowedScheduleManagersState);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "schedules"), (snapshot) => {
      const data: ScheduleEvent[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as ScheduleEvent);
      });
      setEvents(data);
    });
    return () => unsub();
  }, []);

  function getStartOfWeek(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const currentWeekDays = Array.from({length: 7}).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getEventsForSlot = (dateStr: string, session: ScheduleSession) => {
    return events.filter(e => e.date === dateStr && e.session === session)
                 .sort((a, b) => a.time.localeCompare(b.time));
  };

  const openCreate = () => {
    // Get local date YYYY-MM-DD
    const d = new Date();
    const localDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    setEditingEvent({
      id: '', date: localDateStr, session: 'Sáng',
      time: '08:00', title: '', content: '', location: '', participants: '',
      type: 'agency'
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editingEvent.date || !editingEvent.content) {
      alert("Vui lòng điền đủ thông tin");
      return;
    }
    try {
      const id = editingEvent.id || Date.now().toString();
      await setDoc(doc(db, "schedules", id), {
        ...editingEvent,
        id,
        creatorId: currentUser?.id,
        createdAt: editingEvent.createdAt || new Date().toISOString()
      });
      setModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'giam_doc' || currentUser?.role === 'pho_giam_doc' || allowedScheduleManagers.includes(currentUser?.id || '');

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  return (
    <Page className="bg-gray-100 flex flex-col h-full relative">
      <Header title="Lịch làm việc" showBackIcon={false} />
      
      {/* Sleek Week Selector */}
      <Box className="bg-white px-4 py-3 shadow-sm flex justify-between items-center z-10">
        <Box 
          className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100"
          onClick={handlePrevWeek}
        >
          <Icon icon="zi-chevron-left" className="text-gray-600" />
        </Box>
        <Box className="text-center flex-1">
          <Text className="font-bold text-lg text-gray-800">Tuần {getWeekNumber(currentWeekStart)}</Text>
          <Text className="text-sm text-gray-500 font-medium">
            {formatDate(currentWeekDays[0])} <span className="mx-1">-</span> {formatDate(currentWeekDays[6])}
          </Text>
        </Box>
        <Box 
          className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100"
          onClick={handleNextWeek}
        >
          <Icon icon="zi-chevron-right" className="text-gray-600" />
        </Box>
      </Box>

      {/* Floating Action Button for Adding Event */}
      {canEdit && (
        <Box 
          className="absolute bottom-24 right-4 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center z-20 cursor-pointer active:scale-95 transition-transform"
          onClick={openCreate}
        >
          <Icon icon="zi-plus" className="text-white text-2xl" />
        </Box>
      )}

      {/* Agenda Layout */}
      <Box className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {currentWeekDays.slice(0, 5).map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const morningEvents = getEventsForSlot(dateStr, 'Sáng');
          const afternoonEvents = getEventsForSlot(dateStr, 'Chiều');
          const isToday = dateStr === todayStr;
          
          const hasEvents = morningEvents.length > 0 || afternoonEvents.length > 0;

          return (
            <Box 
              key={dateStr} 
              className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${isToday ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}
            >
              {/* Day Header */}
              <Box className={`px-4 py-3 flex justify-between items-center ${isToday ? 'bg-blue-50' : 'bg-gray-50 border-b border-gray-100'}`}>
                <Box className="flex items-center space-x-2">
                  <Text className={`font-bold text-lg ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                    {DAYS_OF_WEEK[date.getDay()]}
                  </Text>
                  {isToday && (
                    <Text className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Hôm nay
                    </Text>
                  )}
                </Box>
                <Text className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                  {formatDate(date)}
                </Text>
              </Box>

              <Box className="p-2">
                {!hasEvents ? (
                  <Box className="py-4 text-center">
                    <Text className="text-gray-400 italic text-sm">Không có lịch trình</Text>
                  </Box>
                ) : (
                  <Box className="space-y-3">
                    {/* Morning Events */}
                    {morningEvents.length > 0 && (
                      <Box>
                        <Box className="flex items-center space-x-2 px-2 py-1 mb-1">
                          <Box className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sáng</Text>
                        </Box>
                        <Box className="space-y-2">
                          {morningEvents.map(e => (
                            <EventCard key={e.id} event={e} onEdit={() => { setEditingEvent(e); setModalVisible(true); }} currentUser={currentUser} />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Afternoon Events */}
                    {afternoonEvents.length > 0 && (
                      <Box>
                        <Box className="flex items-center space-x-2 px-2 py-1 mb-1 mt-2">
                          <Box className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chiều</Text>
                        </Box>
                        <Box className="space-y-2">
                          {afternoonEvents.map(e => (
                            <EventCard key={e.id} event={e} onEdit={() => { setEditingEvent(e); setModalVisible(true); }} currentUser={currentUser} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Event Modal */}
      <Modal
        visible={isModalVisible}
        title={editingEvent.id ? "Chi tiết Lịch" : "Thêm Lịch Mới"}
        onClose={() => setModalVisible(false)}
        actions={[
          { text: "Đóng", close: true },
          ...(canEdit ? [{ text: "Lưu", highLight: true, onClick: handleSave }] : [])
        ]}
      >
        <Box className="p-4 space-y-4">
          <Input 
            label="Ngày" 
            type={"date" as any}
            value={editingEvent.date} 
            onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} 
            disabled={!canEdit}
          />
          
          <Box className="flex space-x-2">
            <Box className="flex-1">
              <Text className="text-sm mb-1 text-gray-600">Buổi</Text>
              <Select 
                value={editingEvent.session} 
                onChange={v => setEditingEvent({...editingEvent, session: v as ScheduleSession})} 
                closeOnSelect
                disabled={!canEdit}
              >
                <Select.Option value="Sáng" title="Sáng" />
                <Select.Option value="Chiều" title="Chiều" />
                <Select.Option value="Tối" title="Tối" />
              </Select>
            </Box>
            <Box className="flex-1">
              <Input 
                label="Giờ (VD: 08:00)" 
                value={editingEvent.time} 
                onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} 
                disabled={!canEdit}
              />
            </Box>
          </Box>
          
          <Input.TextArea 
            label="Nội dung họp/công tác" 
            value={editingEvent.content} 
            onChange={e => setEditingEvent({...editingEvent, content: e.target.value})} 
            disabled={!canEdit}
          />
          <Input 
            label="Thành phần tham dự" 
            value={editingEvent.participants} 
            onChange={e => setEditingEvent({...editingEvent, participants: e.target.value})} 
            disabled={!canEdit}
          />
          <Input 
            label="Địa điểm" 
            value={editingEvent.location} 
            onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} 
            disabled={!canEdit}
          />
          <Input 
            label="Ghi chú (Xe đưa đón...)" 
            value={editingEvent.notes} 
            onChange={e => setEditingEvent({...editingEvent, notes: e.target.value})} 
            disabled={!canEdit}
          />
        </Box>
      </Modal>
    </Page>
  );
};

const EventCard = ({ event, onEdit, currentUser }: { event: ScheduleEvent, onEdit: () => void, currentUser: any }) => {
  const isMine = event.participants?.toLowerCase().includes(currentUser?.name?.toLowerCase() || 'xxxxx');
  
  return (
    <Box 
      className={`p-3 rounded-xl cursor-pointer transition-colors border ${
        isMine ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'
      }`}
      onClick={onEdit}
    >
      <Box className="flex items-start">
        {event.time && (
          <Box className="mr-3 mt-0.5">
            <Text className="font-bold text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg">
              {event.time}
            </Text>
          </Box>
        )}
        <Box className="flex-1">
          <Text className={`font-semibold text-[15px] leading-snug mb-1 ${isMine ? 'text-yellow-900' : 'text-gray-800'}`}>
            {event.content}
          </Text>
          
          {event.participants && (
            <Box className="flex items-start space-x-1 mt-1.5">
              <Icon icon="zi-members" className="text-gray-400 mt-0.5" size={14} />
              <Text className="text-sm text-gray-600 leading-tight flex-1">
                <span className="font-medium">Thành phần:</span> {event.participants}
              </Text>
            </Box>
          )}

          {event.location && (
            <Box className="flex items-start space-x-1 mt-1.5">
              <Icon icon="zi-location" className="text-gray-400 mt-0.5" size={14} />
              <Text className="text-sm text-gray-600 leading-tight flex-1">
                <span className="font-medium">Địa điểm:</span> {event.location}
              </Text>
            </Box>
          )}

          {event.notes && (
            <Box className="mt-2 p-2 bg-white/60 rounded border border-gray-100/50">
              <Text className="italic text-xs text-gray-500 leading-tight">
                Ghi chú: {event.notes}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function formatDate(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
}

function getWeekNumber(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export default HomePage;
