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
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(data);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!editingEvent.title || !editingEvent.date) {
      alert("Vui lòng nhập tiêu đề và ngày diễn ra");
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
    if (confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      await deleteDoc(doc(db, "events", id));
    }
  };

  const openEdit = (e: AgencyEvent) => {
    setEditingEvent(e);
    setModalVisible(true);
  };

  const openCreate = () => {
    setEditingEvent({
      id: '', title: '', description: '', date: '', type: 'announcement'
    });
    setModalVisible(true);
  };

  return (
    <Box className="flex flex-col h-full bg-gray-50">
      <Box className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
        <Text className="font-medium">Tổng số: {events.length} sự kiện</Text>
        <Button size="small" onClick={openCreate} prefixIcon={<Icon icon="zi-plus" />}>Tạo mới</Button>
      </Box>

      <Box className="flex-1 overflow-y-auto">
        <List>
          {events.map(e => (
            <Box key={e.id} className="p-4 bg-white border-b border-gray-100">
              <Box className="flex justify-between items-start mb-2">
                <Box>
                  <Text className="font-bold text-gray-800">{e.title}</Text>
                  <Text className="text-sm text-gray-500">Ngày: {e.date} | Loại: {e.type === 'anniversary' ? 'Kỷ niệm' : 'Thông báo'}</Text>
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
        title={editingEvent.id ? "Sửa Sự kiện" : "Tạo Sự kiện mới"}
        onClose={() => setModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Lưu", highLight: true, onClick: handleSave }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Input label="Tiêu đề" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} />
          
          <Box>
            <Text className="text-sm mb-1 text-gray-600">Loại sự kiện</Text>
            <Select 
              value={editingEvent.type} 
              onChange={v => setEditingEvent({...editingEvent, type: v as any})}
              closeOnSelect
            >
              <Select.Option value="announcement" title="Thông báo chung" />
              <Select.Option value="anniversary" title="Ngày Kỷ niệm" />
              <Select.Option value="other" title="Khác" />
            </Select>
          </Box>

          <Input label="Ngày diễn ra (YYYY-MM-DD)" value={editingEvent.date} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} />
          
          <Box>
            <Text className="text-sm mb-1 text-gray-600">Nội dung chi tiết</Text>
            <Input.TextArea value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} />
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
