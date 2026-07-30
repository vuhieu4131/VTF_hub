import React, { useState } from "react";
import { Box, Text, Button, Modal, Icon, Input, Select } from "zmp-ui";
import { ScheduleEvent, ScheduleSession, ScheduleType } from "../types/schedule";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useRecoilValue } from "recoil";
import { userListState } from "../state";

const { Option } = Select;

interface Props {
  visible: boolean;
  onClose: () => void;
  pendingEvents: ScheduleEvent[];
}

export const ScheduleApprovalModal: React.FC<Props> = ({ visible, onClose, pendingEvents }) => {
  const users = useRecoilValue(userListState);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  const handleApprove = async () => {
    if (!editingEvent) return;
    try {
      await setDoc(doc(db, "schedules", editingEvent.id), {
        ...editingEvent,
        status: 'approved'
      });
      setEditingEvent(null);
    } catch (e: any) {
      alert("Lỗi duyệt: " + e.message);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm("Từ chối đề nghị này? (Sẽ bị xóa khỏi hệ thống)")) {
      try {
        await deleteDoc(doc(db, "schedules", id));
        if (editingEvent?.id === id) setEditingEvent(null);
      } catch (e: any) {
        alert("Lỗi xóa: " + e.message);
      }
    }
  };

  if (editingEvent) {
    return (
      <Modal
        visible={visible}
        title="Duyệt & Sửa Đề nghị"
        onClose={() => setEditingEvent(null)}
        actions={[
          { text: "Quay lại", close: true },
          { text: "Duyệt & Lưu", highLight: true, onClick: handleApprove }
        ]}
      >
        <Box className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <Box>
            <Text className="text-sm font-medium mb-1">Ngày (YYYY-MM-DD)</Text>
            <Input type={"date" as any} value={editingEvent.date} onChange={(e) => setEditingEvent({...editingEvent, date: e.target.value})} />
          </Box>
          <Box className="flex space-x-2">
            <Box className="flex-1">
              <Text className="text-sm font-medium mb-1">Buổi</Text>
              <Select value={editingEvent.session} onChange={(val) => setEditingEvent({...editingEvent, session: val as ScheduleSession})}>
                <Option value="Sáng" title="Sáng" />
                <Option value="Chiều" title="Chiều" />
                <Option value="Tối" title="Tối" />
              </Select>
            </Box>
            <Box className="flex-1">
              <Text className="text-sm font-medium mb-1">Giờ (VD: 08.00)</Text>
              <Input value={editingEvent.time} onChange={(e) => setEditingEvent({...editingEvent, time: e.target.value})} />
            </Box>
          </Box>
          <Box>
            <Text className="text-sm font-medium mb-1">Nội dung / Chủ trì</Text>
            <Input.TextArea rows={3} value={editingEvent.content} onChange={(e) => setEditingEvent({...editingEvent, content: e.target.value})} />
          </Box>
          <Box>
            <Text className="text-sm font-medium mb-1">Thành phần tham dự</Text>
            <Input.TextArea rows={2} value={editingEvent.participants} onChange={(e) => setEditingEvent({...editingEvent, participants: e.target.value})} />
          </Box>
          <Box>
            <Text className="text-sm font-medium mb-1">Địa điểm</Text>
            <Input value={editingEvent.location} onChange={(e) => setEditingEvent({...editingEvent, location: e.target.value})} />
          </Box>
          <Box>
            <Text className="text-sm font-medium mb-1">Ghi chú (xe đưa đón...)</Text>
            <Input value={editingEvent.notes || ""} onChange={(e) => setEditingEvent({...editingEvent, notes: e.target.value})} />
          </Box>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      title="Danh sách Đề nghị Lịch"
      onClose={onClose}
      actions={[{ text: "Đóng", close: true }]}
    >
      <Box className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
        {pendingEvents.length === 0 ? (
          <Text className="text-center text-gray-500 italic">Không có đề nghị nào đang chờ duyệt.</Text>
        ) : (
          pendingEvents.map(ev => (
            <Box key={ev.id} className="bg-orange-50 p-3 rounded-lg border border-orange-100">
              <Text className="font-bold text-orange-800">{ev.date} - {ev.time} ({ev.session})</Text>
              <Text className="text-sm text-gray-700 mt-1 line-clamp-2">{ev.content}</Text>
              <Text className="text-xs text-gray-500 mt-1 mb-2">Đề xuất bởi: {users.find(u => u.id === ev.creatorId)?.name || ev.creatorId}</Text>
              <Box className="flex space-x-2">
                <Button size="small" variant="secondary" className="!text-blue-600 flex-1" onClick={() => setEditingEvent(ev)}>Xem & Sửa</Button>
                <Button size="small" variant="secondary" className="!text-red-500 flex-1" onClick={() => handleReject(ev.id)}>Từ chối</Button>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Modal>
  );
};
