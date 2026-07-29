import React from "react";
import { Page, Box, Text, Input, Tabs } from "zmp-ui";
import { useRecoilState, useRecoilValue } from "recoil";
import { keywordState, filterStatusState, filteredDocumentListState, documentListState, FilterStatus, currentUserState, showRejectedOnlyState } from "../state";
import { DocumentCard } from "../components/document-card";

const HomePage: React.FC = () => {
  const [keyword, setKeyword] = useRecoilState(keywordState);
  const [filter, setFilter] = useRecoilState(filterStatusState);
  const [showRejectedOnly, setShowRejectedOnly] = useRecoilState(showRejectedOnlyState);
  const documents = useRecoilValue(filteredDocumentListState);
  const currentUser = useRecoilValue(currentUserState);
  
  if (!currentUser) return null;
  
  const currentRole = currentUser.role;

  const allDocuments = useRecoilValue(documentListState);

  const rejectedCount = allDocuments.filter(doc => 
    doc.trangThai !== 'deleted' &&
    doc.history && 
    doc.history.length > 0 && 
    doc.history[0].action === 'reject' && 
    doc.assigneeRole === currentRole
  ).length;

  return (
    <Page className="bg-gray-50 flex flex-col relative h-full">
      <Box className="bg-blue-600 pt-10 pb-4 px-4 sticky top-0 z-10">
        <Box className="flex justify-between items-center mb-4">
          <Text className="text-white text-2xl font-bold">Văn bản VTCI</Text>
          <Box className="bg-blue-700 px-3 py-1 rounded-full border border-blue-500">
            <Text className="text-white text-xs font-medium">
              {currentUser.name}
            </Text>
          </Box>
        </Box>
        <Input.Search 
          placeholder="Tìm kiếm số ký hiệu, trích yếu..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="bg-white rounded-lg border-none outline-none"
        />
      </Box>
      
      <Box className="bg-white sticky z-10 shadow-sm" style={{ top: "116px" }}>
        <Tabs 
          scrollable 
          activeKey={showRejectedOnly ? "rejected" : filter} 
          onChange={(key) => {
            if (key === 'rejected') {
              setShowRejectedOnly(true);
            } else {
              setFilter(key as FilterStatus);
              setShowRejectedOnly(false);
            }
          }}
        >
          <Tabs.Tab key="all" label="Tất cả" />
          <Tabs.Tab key="pending" label="Chờ xử lý" />
          <Tabs.Tab key="processed" label="Đã xử lý" />
          {showRejectedOnly && <Tabs.Tab key="rejected" label="Bị trả lại" />}
          <Tabs.Tab key="warning" label="Vướng mắc / Đến hạn" />
          <Tabs.Tab key="overdue" label="Quá hạn" />
          <Tabs.Tab key="completed" label="Hoàn thành" />
        </Tabs>
      </Box>

      {rejectedCount > 0 && !showRejectedOnly && (
        <Box 
          className="bg-red-600 text-white p-3 flex items-center justify-center animate-pulse shadow-md mx-4 mt-4 rounded-lg cursor-pointer"
          onClick={() => {
            setFilter('all');
            setShowRejectedOnly(true);
          }}
        >
          <Text className="font-bold text-center text-sm">
            🚨 SOS: BẠN CÓ {rejectedCount} VĂN BẢN BỊ TRẢ LẠI (Chạm để xem) 🚨
          </Text>
        </Box>
      )}

      <Box className="p-4 flex-1 overflow-y-auto pb-20">
        <Text className="text-gray-500 mb-3 text-sm font-medium">
          Hiển thị {documents.length} văn bản
        </Text>
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} currentTab={filter} />
        ))}
        {documents.length === 0 && (
          <Box className="flex items-center justify-center py-10">
            <Text className="text-gray-400">Không tìm thấy văn bản nào phù hợp</Text>
          </Box>
        )}
      </Box>
    </Page>
  );
};

export default HomePage;
