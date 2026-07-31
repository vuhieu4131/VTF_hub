import React, { useState, useEffect } from "react";
import { Box, Text, Button, List, Modal, Input, Select } from "zmp-ui";
import { Feedback } from "../../types/event";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useRecoilValue } from "recoil";
import { userListState, currentUserState } from "../../state";

export const FeedbackManager: React.FC = () => {
  const users = useRecoilValue(userListState);
  const currentUser = useRecoilValue(currentUserState);
  
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNote, setAdminNote] = useState("");
  
  const [isSummaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryType, setSummaryType] = useState<'week' | 'month'>('week');
  const [selectedDirectorIds, setSelectedDirectorIds] = useState<string[]>([]);

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

  const generateSummary = (type: 'week' | 'month') => {
    const now = new Date();
    const threshold = new Date();
    if (type === 'week') {
      threshold.setDate(now.getDate() - 7);
    } else {
      threshold.setMonth(now.getMonth() - 1);
    }
    
    const recentFeedbacks = feedbacks.filter(f => new Date(f.createdAt) >= threshold);
    
    let summaryText = `BÁO CÁO TỔNG HỢP GÓP Ý TRONG ${type === 'week' ? 'TUẦN' : 'THÁNG'} QUA\n\n`;
    summaryText += `Tổng số góp ý nhận được: ${recentFeedbacks.length}\n`;
    summaryText += `Số góp ý đã xử lý: ${recentFeedbacks.filter(f => f.status === 'resolved').length}\n`;
    summaryText += `Số góp ý mới/đang xem: ${recentFeedbacks.filter(f => f.status !== 'resolved').length}\n\n`;
    
    summaryText += `--- CHI TIẾT ---\n`;
    recentFeedbacks.forEach((f, i) => {
      summaryText += `${i + 1}. [${f.status === 'resolved' ? 'Đã xử lý' : 'Mới'}] ${f.content}\n`;
      if (f.adminNote) {
        summaryText += `   -> Phản hồi: ${f.adminNote}\n`;
      }
    });
    
    return summaryText;
  };

  const handleSendSummaryToDirector = async () => {
    if (selectedDirectorIds.length === 0) {
      alert("Vui lòng chọn thành viên Ban Giám đốc để gửi!");
      return;
    }
    if (!currentUser) return;
    
    const summaryText = generateSummary(summaryType);
    
    try {
      const promises = selectedDirectorIds.map(directorId => {
        const newFeedbackId = `report-${directorId}-${Date.now()}`;
        const newFeedback: Feedback = {
          id: newFeedbackId,
          type: 'report',
          recipientId: directorId,
          title: `Báo cáo tổng hợp Góp ý theo ${summaryType === 'week' ? 'Tuần' : 'Tháng'}`,
          content: summaryText,
          creatorId: currentUser.id,
          creatorName: currentUser.name,
          status: 'new',
          createdAt: new Date().toISOString()
        };
        return setDoc(doc(db, "feedbacks", newFeedbackId), newFeedback);
      });
      
      await Promise.all(promises);
      alert("Đã gửi báo cáo tổng hợp vào Hòm thư của các Lãnh đạo thành công!");
      setSummaryModalVisible(false);
      setSelectedDirectorIds([]);
    } catch (e: any) {
      alert("Lỗi khi gửi: " + e.message);
    }
  };

  const directors = users.filter(u => u.role === 'giam_doc' || u.role === 'pho_giam_doc');

  return (
    <Box className="flex flex-col h-full bg-gray-50">
      <Box className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm">
        <Text className="font-bold text-gray-800">Quản lý Góp ý</Text>
        <button 
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm active:bg-blue-700 transition-colors"
          onClick={() => setSummaryModalVisible(true)}
        >
          Tổng hợp báo cáo
        </button>
      </Box>

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

      <Modal
        visible={isSummaryModalVisible}
        title="Tổng hợp Góp ý"
        onClose={() => setSummaryModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Gửi Lãnh đạo", highLight: true, onClick: handleSendSummaryToDirector }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Box>
            <Text className="text-sm font-medium mb-2">Chọn thời gian tổng hợp</Text>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  checked={summaryType === 'week'} 
                  onChange={() => setSummaryType('week')} 
                  className="text-blue-600"
                />
                <Text>Theo Tuần</Text>
              </label>
              <label className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  checked={summaryType === 'month'} 
                  onChange={() => setSummaryType('month')} 
                  className="text-blue-600"
                />
                <Text>Theo Tháng</Text>
              </label>
            </div>
          </Box>
          
          <Box className="pt-2 border-t border-gray-100">
            <Text className="text-sm font-medium mb-2">Gửi báo cáo cho</Text>
            <div className="border rounded-lg px-2 bg-white">
              <Select 
                multiple
                placeholder="Chọn thành viên Ban Giám đốc..."
                value={selectedDirectorIds}
                onChange={(val) => setSelectedDirectorIds(val as string[])}
              >
                {directors.map(d => (
                  <Select.Option key={d.id} value={d.id} title={`${d.name} (${d.role === 'giam_doc' ? 'Giám đốc' : 'Phó Giám đốc'})`} />
                ))}
              </Select>
            </div>
          </Box>
          
          <Box className="mt-4 p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto text-xs whitespace-pre-wrap font-mono">
            {generateSummary(summaryType)}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
