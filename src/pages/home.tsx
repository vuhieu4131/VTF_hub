import React, { useState, useEffect } from "react";
import { Page, Header, Box, Text, Button, Icon, Modal, Input, Select } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ScheduleEvent, ScheduleSession } from "../types/schedule";
import { useRecoilValue } from "recoil";
import { currentUserState, allowedScheduleManagersState, allowedLeaveManagersState, allowedEventManagersState, userListState } from "../state";
import { ScheduleApprovalModal } from "../components/ScheduleApprovalModal";
import { UserSelectModal } from "../components/admin/UserSelectModal";
import { useNavigate } from "react-router-dom";

const DAYS_OF_WEEK = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const HomePage: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const currentUser = useRecoilValue(currentUserState);
  const allowedScheduleManagers = useRecoilValue(allowedScheduleManagersState);
  const allowedLeaveManagers = useRecoilValue(allowedLeaveManagersState);
  const allowedEventManagers = useRecoilValue(allowedEventManagersState);
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLeaveModalVisible, setLeaveModalVisible] = useState(false);
  const [isApprovalModalVisible, setApprovalModalVisible] = useState(false);
  const users = useRecoilValue(userListState);
  const [isLeaveUserSelectVisible, setLeaveUserSelectVisible] = useState(false);
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

  const approvedEvents = events.filter(e => !e.status || e.status === 'approved');
  const pendingEvents = events.filter(e => e.status === 'pending');

  const getEventsForSlot = (dateStr: string, session: ScheduleSession) => {
    return approvedEvents.filter(e => {
      const matchesDate = e.endDate ? (dateStr >= e.date && dateStr <= e.endDate) : (e.date === dateStr);
      return matchesDate && (e.session === session || e.session === 'Cả ngày') && e.type !== 'leave';
    }).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getLeaveEventsForDate = (dateStr: string) => {
    return approvedEvents.filter(e => {
      const matchesDate = e.endDate ? (dateStr >= e.date && dateStr <= e.endDate) : (e.date === dateStr);
      return matchesDate && e.type === 'leave';
    });
  };

  const canEditSchedule = currentUser?.role === 'admin' || currentUser?.role === 'giam_doc' || currentUser?.role === 'pho_giam_doc' || allowedScheduleManagers.includes(currentUser?.id || '');
  const canEditLeave = currentUser?.role === 'admin' || allowedLeaveManagers.includes(currentUser?.id || '');
  const canEditEvent = currentUser?.role === 'admin' || currentUser?.role === 'giam_doc' || currentUser?.role === 'pho_giam_doc' || allowedEventManagers.includes(currentUser?.id || '');

  const handleFabClick = () => {
    const permissionsCount = [canEditSchedule, canEditLeave, canEditEvent].filter(Boolean).length;
    
    if (permissionsCount > 1) {
      setActionSheetVisible(true);
    } else if (canEditLeave && permissionsCount === 1) {
      openCreateLeave();
    } else if (canEditEvent && permissionsCount === 1) {
      navigate('/events?action=create');
    } else {
      openCreateSchedule();
    }
  };

  const openCreateSchedule = () => {
    setActionSheetVisible(false);
    const d = new Date();
    const localDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    setEditingEvent({
      id: '', date: localDateStr, session: 'Sáng',
      time: '08:00', title: '', content: '', location: '', participants: '',
      type: 'agency'
    });
    setModalVisible(true);
  };

  const openCreateLeave = () => {
    setActionSheetVisible(false);
    const d = new Date();
    const localDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    setEditingEvent({
      id: '', date: localDateStr, endDate: localDateStr, session: 'Cả ngày',
      time: '', title: 'Nghỉ phép', content: '', location: '', participants: '',
      participantUserIds: [],
      type: 'leave'
    });
    setLeaveModalVisible(true);
  };

  const getLeaveNames = (ids?: string[]) => {
    if (!ids || ids.length === 0) return '';
    return ids.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
  };

  const handleSaveSchedule = async () => {
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
        status: canEditSchedule ? 'approved' : 'pending',
        createdAt: editingEvent.createdAt || new Date().toISOString()
      });
      setModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa lịch này?")) {
      try {
        await deleteDoc(doc(db, "schedules", id));
      } catch (e: any) {
        alert("Lỗi: " + e.message);
      }
    }
  };

  const handleSaveLeave = async () => {
    if (!editingEvent.date || !editingEvent.participantUserIds?.length) {
      alert("Vui lòng điền ngày và chọn người nghỉ");
      return;
    }
    try {
      const id = editingEvent.id || Date.now().toString();
      const content = `${getLeaveNames(editingEvent.participantUserIds)}`;
      await setDoc(doc(db, "schedules", id), {
        ...editingEvent,
        content,
        endDate: editingEvent.endDate || editingEvent.date,
        id,
        creatorId: currentUser?.id,
        status: 'approved', // Leave managers can directly approve
        createdAt: editingEvent.createdAt || new Date().toISOString()
      });
      setLeaveModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  return (
    <Page className="bg-gray-100 flex flex-col h-full relative">
      <Header title="Lịch làm việc" showBackIcon={false} />
      
      {canEditSchedule && pendingEvents.length > 0 && (
        <Box 
          className="bg-orange-50 px-4 py-2 flex justify-between items-center border-b border-orange-100 cursor-pointer"
          onClick={() => setApprovalModalVisible(true)}
        >
          <Text className="text-sm font-medium text-orange-800">Có {pendingEvents.length} đề nghị bổ sung lịch chờ duyệt</Text>
          <Button size="small" variant="secondary" className="!text-orange-600 bg-white shadow-sm border border-orange-200">Duyệt ngay</Button>
        </Box>
      )}
      
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

      {/* Floating Action Button for Adding Event / Proposing Event */}
      <Box 
        className={`absolute bottom-24 right-4 w-14 h-14 ${canEditSchedule ? 'bg-blue-600' : 'bg-orange-500'} rounded-full shadow-lg flex items-center justify-center z-20 cursor-pointer active:scale-95 transition-transform`}
        onClick={handleFabClick}
      >
        <Icon icon={canEditSchedule ? "zi-plus" : "zi-chat"} className="text-white text-2xl" />
      </Box>

      {/* Agenda Layout */}
      <Box className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {currentWeekDays.slice(0, 5).map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const morningEvents = getEventsForSlot(dateStr, 'Sáng');
          const afternoonEvents = getEventsForSlot(dateStr, 'Chiều');
          const leaveEvents = getLeaveEventsForDate(dateStr);
          const isToday = dateStr === todayStr;
          
          const hasEvents = morningEvents.length > 0 || afternoonEvents.length > 0 || leaveEvents.length > 0;

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
                            <EventCard 
                              key={e.id} 
                              event={e} 
                              onEdit={() => { setEditingEvent(e); setModalVisible(true); }} 
                              onDelete={() => handleDeleteSchedule(e.id)}
                              currentUser={currentUser} 
                              canEdit={canEditSchedule}
                            />
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
                            <EventCard 
                              key={e.id} 
                              event={e} 
                              onEdit={() => { setEditingEvent(e); setModalVisible(true); }} 
                              onDelete={() => handleDeleteSchedule(e.id)}
                              currentUser={currentUser} 
                              canEdit={canEditSchedule}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Leave Events */}
                    {leaveEvents.length > 0 && (
                      <Box className={`pt-2 mt-2 ${morningEvents.length > 0 || afternoonEvents.length > 0 ? 'border-t border-gray-100' : ''}`}>
                        <Box className="px-2">
                          <Text className="text-sm leading-relaxed text-gray-700">
                            <span className="font-bold text-red-500 text-sm mr-2">
                              • Nghỉ phép / Công tác:
                            </span>
                            {leaveEvents.map((e, index) => (
                              <span 
                                key={e.id}
                                className="cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => {
                                  setEditingEvent(e);
                                  setLeaveModalVisible(true);
                                }}
                              >
                                {e.content} {e.session === 'Sáng' ? '(Sáng)' : e.session === 'Chiều' ? '(Chiều)' : ''}
                                {index < leaveEvents.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </Text>
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
        title={editingEvent.id ? "Sửa Lịch" : (canEditSchedule ? "Tạo Lịch làm việc mới" : "Đề nghị bổ sung lịch")}
        onClose={() => setModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: canEditSchedule ? "Lưu" : "Gửi Đề nghị", highLight: true, onClick: handleSaveSchedule }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Input 
            label="Ngày" 
            type={"date" as any}
            value={editingEvent.date} 
            onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} 
            disabled={!canEditSchedule && !!editingEvent.id}
          />
          
          <Box className="flex space-x-2">
            <Box className="flex-1">
              <Text className="text-sm mb-1 text-gray-600">Buổi</Text>
              <Select 
                value={editingEvent.session} 
                onChange={v => setEditingEvent({...editingEvent, session: v as ScheduleSession})} 
                closeOnSelect
                disabled={!canEditSchedule && !!editingEvent.id}
              >
                <Select.Option value="Sáng" title="Sáng" />
                <Select.Option value="Chiều" title="Chiều" />
                <Select.Option value="Tối" title="Tối" />
              </Select>
            </Box>
            <Box className="flex-1">
              <Input 
                label="Giờ" 
                type={"time" as any}
                value={editingEvent.time} 
                onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} 
                disabled={!canEditSchedule && !!editingEvent.id}
              />
            </Box>
          </Box>
          
          <Input.TextArea 
            label="Nội dung họp/công tác" 
            value={editingEvent.content} 
            onChange={e => setEditingEvent({...editingEvent, content: e.target.value})} 
            disabled={!canEditSchedule && !!editingEvent.id}
          />
          <Input 
            label="Thành phần tham dự" 
            value={editingEvent.participants} 
            onChange={e => setEditingEvent({...editingEvent, participants: e.target.value})} 
            disabled={!canEditSchedule && !!editingEvent.id}
          />
          <Input 
            label="Địa điểm" 
            value={editingEvent.location} 
            onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} 
            disabled={!canEditSchedule && !!editingEvent.id}
          />
          <Input 
            label="Ghi chú (Xe đưa đón...)" 
            value={editingEvent.notes} 
            onChange={e => setEditingEvent({...editingEvent, notes: e.target.value})} 
            disabled={!canEditSchedule && !!editingEvent.id}
          />
        </Box>
      </Modal>
      {/* Modal Chọn loại lịch (Action Sheet) */}
      <Modal
        visible={isActionSheetVisible}
        title="Bạn muốn thêm loại lịch nào?"
        onClose={() => setActionSheetVisible(false)}
      >
        <Box className="p-4 flex flex-col space-y-3">
          <div 
            onClick={openCreateSchedule} 
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl text-center active:bg-blue-700 cursor-pointer shadow-sm"
          >
            📆 Lịch công tác / Làm việc
          </div>
          {canEditLeave && (
            <div 
              onClick={openCreateLeave} 
              className="w-full bg-orange-50 text-orange-600 font-semibold py-3 px-4 rounded-xl text-center active:bg-orange-100 cursor-pointer border border-orange-200"
            >
              🏖️ Báo nghỉ phép / Công tác
            </div>
          )}
          {canEditEvent && (
            <div 
              onClick={() => { setActionSheetVisible(false); navigate('/events?action=create'); }} 
              className="w-full bg-purple-50 text-purple-600 font-semibold py-3 px-4 rounded-xl text-center active:bg-purple-100 cursor-pointer border border-purple-200"
            >
              📢 Tạo sự kiện / Bảng tin
            </div>
          )}
        </Box>
      </Modal>

      {/* Modal Nghỉ phép */}
      <Modal
        visible={isLeaveModalVisible}
        title={editingEvent.id ? "Sửa Báo nghỉ phép" : "Báo nghỉ phép / Công tác"}
        onClose={() => setLeaveModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Lưu", highLight: true, onClick: handleSaveLeave }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Box className="flex space-x-2">
            <Box className="flex-1">
              <Input 
                label="Từ ngày" 
                type={"date" as any}
                value={editingEvent.date} 
                onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} 
              />
            </Box>
            <Box className="flex-1">
              <Input 
                label="Đến ngày" 
                type={"date" as any}
                value={editingEvent.endDate || editingEvent.date} 
                onChange={e => setEditingEvent({...editingEvent, endDate: e.target.value})} 
              />
            </Box>
          </Box>
          <Box>
            <Text className="text-sm mb-1 text-gray-600">Thời gian nghỉ</Text>
            <Select 
              value={editingEvent.session} 
              onChange={v => setEditingEvent({...editingEvent, session: v as ScheduleSession})} 
              closeOnSelect
            >
              <Select.Option value="Sáng" title="Sáng" />
              <Select.Option value="Chiều" title="Chiều" />
              <Select.Option value="Cả ngày" title="Cả ngày" />
            </Select>
          </Box>
          <Box>
            <Text className="text-sm mb-1 text-gray-600">Tên cán bộ nghỉ</Text>
            <Box 
              className="border border-gray-300 rounded-lg p-2.5 bg-gray-50 flex justify-between items-center cursor-pointer"
              onClick={() => setLeaveUserSelectVisible(true)}
            >
              <Text className={`text-sm line-clamp-1 ${editingEvent.participantUserIds?.length ? 'text-gray-800' : 'text-gray-400'}`}>
                {editingEvent.participantUserIds?.length 
                  ? getLeaveNames(editingEvent.participantUserIds)
                  : "Chạm để chọn cán bộ..."}
              </Text>
            </Box>
          </Box>
          <Input.TextArea 
            label="Lý do / Ghi chú" 
            value={editingEvent.notes || ''} 
            onChange={e => setEditingEvent({...editingEvent, notes: e.target.value})} 
            placeholder="VD: Nghỉ phép năm, Đi công tác Hà Nội..."
          />
        </Box>
      </Modal>

      <UserSelectModal 
        visible={isLeaveUserSelectVisible}
        value={editingEvent.participantUserIds || []}
        onChange={val => setEditingEvent({...editingEvent, participantUserIds: val})}
        onClose={() => setLeaveUserSelectVisible(false)}
        title="Chọn cán bộ nghỉ"
      />

      <ScheduleApprovalModal 
        visible={isApprovalModalVisible}
        onClose={() => setApprovalModalVisible(false)}
        pendingEvents={pendingEvents}
      />
    </Page>
  );
};

const EventCard = ({ event, onEdit, onDelete, currentUser, canEdit }: { event: ScheduleEvent, onEdit: () => void, onDelete: () => void, currentUser: any, canEdit: boolean }) => {
  const isMine = event.participants?.toLowerCase().includes(currentUser?.name?.toLowerCase() || 'xxxxx');
  const isLeave = event.type === 'leave';
  
  return (
    <Box 
      className={`p-3 rounded-xl transition-colors border relative ${
        isLeave ? 'bg-slate-100 border-slate-200' :
        isMine ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'
      }`}
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
          <Text className={`font-semibold text-[15px] leading-snug mb-1 ${
            isLeave ? 'text-slate-600 line-through decoration-slate-400' :
            isMine ? 'text-yellow-900' : 'text-gray-800'
          }`}>
            {isLeave ? `🏖️ [Nghỉ phép] ${event.content}` : event.content}
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
        
        {canEdit && (
          <Box className="flex flex-col space-y-2 ml-2">
            <Box onClick={(e) => { e.stopPropagation(); onEdit(); }} className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors cursor-pointer shadow-sm">
              <Icon icon="zi-edit-text" size={16} />
            </Box>
            <Box onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors cursor-pointer shadow-sm">
              <Icon icon="zi-delete" size={16} />
            </Box>
          </Box>
        )}
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
