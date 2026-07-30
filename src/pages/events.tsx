import React, { useState, useEffect } from "react";
import { Page, Header, Box, Text, Button, Modal, Input, List } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { AgencyEvent, Feedback } from "../types/event";
import { UserProfile } from "../types/document";
import { currentUserState, allowedEventManagersState } from "../state";
import { useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<AgencyEvent[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const currentUser = useRecoilValue(currentUserState);
  const allowedEventManagers = useRecoilValue(allowedEventManagersState);
  
  const [isEventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<AgencyEvent>>({});
  
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
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

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) {
      alert("Vui lòng nhập nội dung góp ý!");
      return;
    }
    
    try {
      const id = Date.now().toString();
      const feedback: Feedback = {
        id,
        content: feedbackContent,
        status: 'new',
        createdAt: new Date().toISOString(),
        creatorId: isAnonymous ? undefined : currentUser?.id,
        creatorName: isAnonymous ? undefined : currentUser?.name
      };
      
      await setDoc(doc(db, "feedbacks", id), feedback);
      alert("Cảm ơn bạn đã gửi góp ý!");
      setFeedbackModalVisible(false);
      setFeedbackContent("");
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

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

        {/* Birthdays */}
        <Box>
          <Text className="font-bold text-gray-800 text-lg mb-3">Sinh nhật sắp tới (30 ngày tới)</Text>
          {upcomingBirthdays.length === 0 ? (
             <Text className="text-gray-500 italic text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
               Không có sinh nhật nào trong tháng tới.
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

        {/* Góp ý */}
        <Box className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
          <Text className="font-bold text-blue-800 mb-2">Hòm thư Góp ý</Text>
          <Text className="text-sm text-gray-600 mb-4">
            Bạn có đóng góp hoặc đề xuất gì cho cơ quan? Hãy gửi ý kiến (có thể ẩn danh) cho Admin.
          </Text>
          <Button onClick={() => setFeedbackModalVisible(true)} size="small">Gửi Góp ý</Button>
        </Box>

      </Box>

      <Modal
        visible={isFeedbackModalVisible}
        title="Gửi Góp ý"
        onClose={() => setFeedbackModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Gửi", highLight: true, onClick: handleSubmitFeedback }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Input.TextArea 
            placeholder="Nội dung góp ý của bạn..."
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            rows={4}
          />
          <Box 
            className="flex items-center space-x-2 mt-2" 
            onClick={() => setIsAnonymous(!isAnonymous)}
          >
            <input type="checkbox" checked={isAnonymous} readOnly className="w-4 h-4" />
            <Text className="text-sm text-gray-700">Gửi ẩn danh</Text>
          </Box>
        </Box>
      </Modal>

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
