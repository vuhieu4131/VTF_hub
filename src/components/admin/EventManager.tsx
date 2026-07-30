import React, { useState, useEffect } from "react";
import { Box, Text, Button, List, Input, Select, Modal, Icon } from "zmp-ui";
import { AgencyEvent } from "../../types/event";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../../state";

export const EventManager: React.FC = () => {
  const [events, setEvents] = useState<AgencyEvent[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<AgencyEvent>>({});
  const currentUser = useRecoilValue(currentUserState);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
      const data: AgencyEvent[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as AgencyEvent);
      });
      // sort by date desc
      data.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setEvents(data);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
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
      setModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thông báo này?")) {
      await deleteDoc(doc(db, "events", id));
    }
  };

  const openEdit = (e: AgencyEvent) => {
    setEditingEvent(e);
    setModalVisible(true);
  };

  const openCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingEvent({
      id: '', title: '', description: '', date: today, type: 'announcement'
    });
    setModalVisible(true);
  };

  return (
    <Box className="flex flex-col h-full bg-gray-50">
      <Box className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
        <Text className="font-medium">Tổng số: {events.length} thông báo</Text>
        <Button size="small" onClick={openCreate} prefixIcon={<Icon icon="zi-plus" />}>Tạo mới</Button>
      </Box>

      <Box className="flex-1 overflow-y-auto">
        <List>
          {events.map(e => (
            <Box key={e.id} className="p-4 bg-white border-b border-gray-100">
              <Box className="flex justify-between items-start mb-2">
                <Box>
                  <Text className="font-bold text-gray-800">{e.title}</Text>
                  <Text className="text-sm text-gray-500">Loại: Thông báo chung</Text>
                </Box>
                <Box flex>
                  <Button size="small" variant="tertiary" onClick={() => openEdit(e)}>Sửa</Button>
                  <Button size="small" variant="secondary" className="!text-red-500 ml-2" onClick={() => handleDelete(e.id)}>Xóa</Button>
                </Box>
              </Box>
              <Text className="text-sm text-gray-700 line-clamp-2">{e.description}</Text>
            </Box>
          ))}
        </List>
      </Box>

      <Modal
        visible={isModalVisible}
        title={editingEvent.id ? "Sửa Thông báo" : "Tạo Thông báo mới"}
        onClose={() => setModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Lưu", highLight: true, onClick: handleSave }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Input label="Tên thông báo *" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} />
          <Box>
            <Text className="text-sm mb-1 text-gray-600">Nội dung *</Text>
            <Input.TextArea rows={6} value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} />
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
