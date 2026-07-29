import React, { useState, useEffect } from "react";
import { Box, Text, Button, List, Modal, Input } from "zmp-ui";
import { Feedback } from "../../types/event";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export const FeedbackManager: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "feedbacks"), (snapshot) => {
      const data: Feedback[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as Feedback);
      });
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFeedbacks(data);
    });
    return () => unsub();
  }, []);

  const handleOpen = (f: Feedback) => {
    setSelectedFeedback(f);
    setAdminNote(f.adminNote || "");
    setModalVisible(true);
    
    // Auto mark as read if it's new
    if (f.status === 'new') {
      updateDoc(doc(db, "feedbacks", f.id), { status: 'read' });
    }
  };

  const handleResolve = async () => {
    if (!selectedFeedback) return;
    try {
      await updateDoc(doc(db, "feedbacks", selectedFeedback.id), {
        status: 'resolved',
        adminNote
      });
      setModalVisible(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  return (
    <Box className="flex flex-col h-full bg-gray-50">
      <Box className="flex-1 overflow-y-auto p-4">
        {feedbacks.length === 0 && (
          <Text className="text-center text-gray-500 mt-10">Chưa có góp ý nào</Text>
        )}
        <List>
          {feedbacks.map(f => (
            <Box 
              key={f.id} 
              className={`p-4 bg-white mb-2 rounded-lg shadow-sm border-l-4 cursor-pointer ${
                f.status === 'new' ? 'border-blue-500' : 
                f.status === 'resolved' ? 'border-green-500' : 'border-gray-300'
              }`}
              onClick={() => handleOpen(f)}
            >
              <Box className="flex justify-between items-start mb-2">
                <Text className="font-bold text-gray-800">
                  {f.creatorName || "Người dùng ẩn danh"}
                </Text>
                <Text className={`text-xs px-2 py-1 rounded-full ${
                  f.status === 'new' ? 'bg-blue-100 text-blue-700' : 
                  f.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {f.status === 'new' ? 'Mới' : f.status === 'resolved' ? 'Đã xử lý' : 'Đang xem'}
                </Text>
              </Box>
              <Text className="text-sm text-gray-700 line-clamp-2">{f.content}</Text>
              <Text className="text-xs text-gray-400 mt-2">{new Date(f.createdAt).toLocaleString()}</Text>
            </Box>
          ))}
        </List>
      </Box>

      <Modal
        visible={isModalVisible}
        title="Chi tiết Góp ý"
        onClose={() => setModalVisible(false)}
        actions={[
          { text: "Đóng", close: true },
          { text: "Đánh dấu Đã xử lý", highLight: true, onClick: handleResolve }
        ]}
      >
        {selectedFeedback && (
          <Box className="p-4 space-y-4">
            <Box>
              <Text className="text-xs text-gray-500 mb-1">Người gửi</Text>
              <Text className="font-medium">{selectedFeedback.creatorName || "Ẩn danh"}</Text>
            </Box>
            <Box>
              <Text className="text-xs text-gray-500 mb-1">Nội dung</Text>
              <Box className="p-3 bg-gray-50 rounded-lg">
                <Text>{selectedFeedback.content}</Text>
              </Box>
            </Box>
            <Box>
              <Text className="text-xs text-gray-500 mb-1">Ghi chú của Admin (Phản hồi)</Text>
              <Input.TextArea 
                value={adminNote} 
                onChange={e => setAdminNote(e.target.value)} 
                placeholder="Nhập ghi chú hoặc phản hồi lại..."
              />
            </Box>
          </Box>
        )}
      </Modal>
    </Box>
  );
};
