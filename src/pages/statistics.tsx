import React from "react";
import { Page, Box, Text, Header } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { documentListState } from "../state";

const Statistics: React.FC = () => {
  const docs = useRecoilValue(documentListState);

  const total = docs.length;
  const pending = docs.filter(d => d.trangThai === 'pending').length;
  const warning = docs.filter(d => d.trangThai === 'warning').length;
  const overdue = docs.filter(d => d.trangThai === 'overdue').length;
  const completed = docs.filter(d => d.trangThai === 'completed').length;

  return (
    <Page className="bg-gray-50 flex flex-col h-full">
      <Header title="Thống kê tiến độ" showBackIcon={false} />
      
      <Box className="flex-1 p-4 overflow-y-auto">
        <Text className="font-bold text-lg mb-4 text-gray-800">Tổng quan</Text>
        
        <Box className="grid grid-cols-2 gap-4 mb-6">
          <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <Text className="text-gray-500 text-sm mb-1">Đang xử lý</Text>
            <Text className="text-3xl font-bold text-blue-600">{pending}</Text>
          </Box>
          <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <Text className="text-gray-500 text-sm mb-1">Sắp đến hạn</Text>
            <Text className="text-3xl font-bold text-yellow-600">{warning}</Text>
          </Box>
          <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
            <Text className="text-gray-500 text-sm mb-1">Trễ hạn</Text>
            <Text className="text-3xl font-bold text-red-600">{overdue}</Text>
          </Box>
          <Box className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <Text className="text-gray-500 text-sm mb-1">Hoàn thành</Text>
            <Text className="text-3xl font-bold text-green-600">{completed}</Text>
          </Box>
        </Box>
        
        <Box className="bg-white p-4 rounded-xl shadow-sm">
          <Text className="font-bold text-base mb-4 text-gray-800">Tỷ lệ hoàn thành</Text>
          <Box className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden flex">
            <Box style={{ width: `${(completed/total)*100}%` }} className="bg-green-500 h-full"></Box>
            <Box style={{ width: `${(pending/total)*100}%` }} className="bg-blue-500 h-full"></Box>
            <Box style={{ width: `${(warning/total)*100}%` }} className="bg-yellow-500 h-full"></Box>
            <Box style={{ width: `${(overdue/total)*100}%` }} className="bg-red-500 h-full"></Box>
          </Box>
          <Box className="flex justify-between text-xs text-gray-500">
            <Text>{Math.round((completed/total)*100)}% hoàn thành</Text>
            <Text>{Math.round(((total-completed)/total)*100)}% tồn đọng</Text>
          </Box>
        </Box>

        <Box className="bg-white p-4 rounded-xl shadow-sm mt-6">
          <Text className="font-bold text-base mb-4 text-gray-800">Đơn vị tồn đọng nhiều nhất</Text>
          {/* Simple mock list */}
          <Box className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
            <Text className="text-gray-700">Phòng Tổng hợp</Text>
            <Text className="font-bold text-red-500">2 văn bản</Text>
          </Box>
          <Box className="flex justify-between items-center">
            <Text className="text-gray-700">Văn phòng Quỹ</Text>
            <Text className="font-bold text-yellow-500">1 văn bản</Text>
          </Box>
        </Box>
      </Box>
    </Page>
  );
};

export default Statistics;
