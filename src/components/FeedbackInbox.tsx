import React from "react";
import { Box, Text, Modal, Input } from "zmp-ui";
import { collection, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Feedback } from "../types/event";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../state";

export const FeedbackInbox: React.FC = () => {
  const currentUser = useRecoilValue(currentUserState);
  
  const [inboxTab, setInboxTab] = React.useState<'in' | 'out'>('out');
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([]);
  const [selectedInboxMsg, setSelectedInboxMsg] = React.useState<Feedback | null>(null);
  const [isInboxModalVisible, setInboxModalVisible] = React.useState(false);
  const [replyContent, setReplyContent] = React.useState("");
  
  const [isFeedbackModalVisible, setFeedbackModalVisible] = React.useState(false);
  const [feedbackContent, setFeedbackContent] = React.useState("");
  const [isAnonymous, setIsAnonymous] = React.useState(false);

  React.useEffect(() => {
    let unsub = () => {};
    if (currentUser) {
      unsub = onSnapshot(collection(db, "feedbacks"), (snapshot) => {
        const data: Feedback[] = [];
        snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Feedback));
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFeedbacks(data);
      });
    }
    return () => unsub();
  }, [currentUser]);

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) {
      alert("Vui lòng nhập nội dung góp ý!");
      return;
    }
    
    try {
      const id = Date.now().toString();
      const feedback: Feedback = {
        id,
        type: 'feedback',
        content: feedbackContent,
        status: 'new',
        createdAt: new Date().toISOString(),
        creatorId: isAnonymous ? undefined : currentUser?.id,
        creatorName: isAnonymous ? undefined : currentUser?.name
      };
      
      await setDoc(doc(db, "feedbacks", id), feedback);
      alert("Cảm ơn bạn đã gửi thư!");
      setFeedbackModalVisible(false);
      setFeedbackContent("");
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const openInboxMsg = (f: Feedback) => {
    setSelectedInboxMsg(f);
    setInboxModalVisible(true);
    setReplyContent("");
    
    if (f.status === 'new' && (f.recipientId === currentUser?.id || (currentUser?.role === 'admin' && !f.recipientId))) {
      updateDoc(doc(db, "feedbacks", f.id), { status: 'read' });
    }
  };

  const handleReply = async (parentMsg: Feedback) => {
    if (!replyContent.trim()) {
      alert("Vui lòng nhập nội dung trả lời");
      return;
    }
    try {
      const id = `reply-${Date.now()}`;
      const replyFeedback: Feedback = {
        id,
        type: 'reply',
        recipientId: parentMsg.creatorId,
        parentId: parentMsg.id,
        title: `Phản hồi: ${parentMsg.title ? parentMsg.title : (parentMsg.content.length > 20 ? parentMsg.content.substring(0, 20) + '...' : parentMsg.content)}`,
        content: replyContent,
        creatorId: currentUser?.id,
        creatorName: currentUser?.name,
        status: 'new',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "feedbacks", id), replyFeedback);
      
      if (parentMsg.status !== 'resolved') {
        await updateDoc(doc(db, "feedbacks", parentMsg.id), { status: 'resolved' });
      }
      
      alert("Đã gửi trả lời thành công!");
      setReplyContent("");
      setInboxModalVisible(false);
    } catch(e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  if (!currentUser) return null;

  const isAdmin = currentUser?.role === 'admin';
  const outboxFeedbacks = feedbacks.filter(f => f.creatorId === currentUser?.id);
  const inboxFeedbacks = feedbacks.filter(f => 
    f.recipientId === currentUser?.id || 
    (isAdmin && (!f.recipientId))
  );

  return (
    <>
      <Box className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden mt-6">
        <Box className="flex border-b border-gray-100">
          <Box 
            className={`flex-1 p-3 text-center cursor-pointer font-medium text-sm ${inboxTab === 'in' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setInboxTab('in')}
          >
            Thư đến {inboxFeedbacks.filter(f => f.status === 'new').length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">{inboxFeedbacks.filter(f => f.status === 'new').length}</span>}
          </Box>
          <Box 
            className={`flex-1 p-3 text-center cursor-pointer font-medium text-sm ${inboxTab === 'out' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setInboxTab('out')}
          >
            Thư đi
          </Box>
        </Box>
        
        <Box className="p-4 bg-gray-50">
          {inboxTab === 'out' ? (
            <Box>
              <Box className="text-center mb-4">
                <button 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:bg-blue-700 transition-colors inline-block"
                  onClick={() => setFeedbackModalVisible(true)}
                >
                  + Tạo Thư mới / Góp ý
                </button>
              </Box>
              <Box className="space-y-2 max-h-64 overflow-y-auto">
                {outboxFeedbacks.length === 0 ? (
                  <Text className="text-center text-sm text-gray-500 italic py-4">Chưa gửi thư nào</Text>
                ) : (
                  outboxFeedbacks.map(f => (
                    <Box key={f.id} className="p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm" onClick={() => openInboxMsg(f)}>
                      <Text className="font-medium text-sm text-gray-800 line-clamp-1">{f.title || f.content}</Text>
                      <Box className="flex justify-between items-center mt-1">
                        <Text className="text-[10px] text-gray-500">{new Date(f.createdAt).toLocaleString()}</Text>
                        <Text className={`text-[10px] px-2 py-0.5 rounded-full ${f.status === 'resolved' ? 'bg-green-100 text-green-700' : f.status === 'read' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                          {f.status === 'resolved' ? 'Đã xử lý' : f.status === 'read' ? 'Đã xem' : 'Đã gửi'}
                        </Text>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          ) : (
            <Box className="space-y-2 max-h-64 overflow-y-auto">
              {inboxFeedbacks.length === 0 ? (
                <Text className="text-center text-sm text-gray-500 italic py-4">Chưa có thư đến</Text>
              ) : (
                inboxFeedbacks.map(f => (
                  <Box 
                    key={f.id} 
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors shadow-sm ${f.status === 'new' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                    onClick={() => openInboxMsg(f)}
                  >
                    <Box className="flex justify-between items-start mb-1">
                      <Text className={`text-sm ${f.status === 'new' ? 'font-bold text-blue-800' : 'font-medium text-gray-800'}`}>
                        {f.creatorName || 'Ẩn danh'}
                      </Text>
                      {f.status === 'new' && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1"></span>}
                    </Box>
                    <Text className={`text-xs ${f.status === 'new' ? 'text-gray-800 font-medium' : 'text-gray-600'} line-clamp-1`}>{f.title || f.content}</Text>
                    <Text className="text-[10px] text-gray-400 mt-1">{new Date(f.createdAt).toLocaleString()}</Text>
                  </Box>
                ))
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Inbox Message Detail Modal */}
      <Modal
        visible={isInboxModalVisible}
        title="Chi tiết Thư"
        onClose={() => setInboxModalVisible(false)}
        actions={[
          { text: "Đóng", close: true }
        ]}
      >
        {selectedInboxMsg && (
          <Box className="p-4 space-y-4 max-h-[70vh] overflow-y-auto bg-gray-50 rounded-lg text-left">
            <Box className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <Text className="text-xs text-gray-500 mb-1">Từ: {selectedInboxMsg.creatorName || "Ẩn danh"}</Text>
              <Text className="text-xs text-gray-500 mb-3">Lúc: {new Date(selectedInboxMsg.createdAt).toLocaleString()}</Text>
              
              {selectedInboxMsg.title && <Text className="font-bold text-sm text-blue-800 mb-2">{selectedInboxMsg.title}</Text>}
              
              <Text className="text-sm whitespace-pre-wrap text-gray-800">{selectedInboxMsg.content}</Text>
              
              {selectedInboxMsg.adminNote && (
                 <Box className="mt-4 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                    <Text className="font-bold mb-1">Ghi chú / Phản hồi cũ:</Text>
                    <Text>{selectedInboxMsg.adminNote}</Text>
                 </Box>
              )}
            </Box>
            
            {/* Chức năng Trả lời dành cho Admin và Giám đốc */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'giam_doc' || currentUser?.role === 'pho_giam_doc') && selectedInboxMsg.creatorId && inboxTab === 'in' && (
              <Box className="mt-4 pt-4 border-t border-gray-200">
                <Text className="text-xs font-bold text-gray-600 mb-2">Trả lời lại:</Text>
                <Input.TextArea 
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Nhập nội dung trả lời..."
                  rows={3}
                />
                <button 
                  className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium shadow-sm active:bg-blue-700 transition-colors"
                  onClick={() => handleReply(selectedInboxMsg)}
                >
                  Gửi Trả lời
                </button>
              </Box>
            )}
          </Box>
        )}
      </Modal>

      {/* Feedback Creation Modal */}
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
    </>
  );
};
