import React, { useState, useMemo } from "react";
import { Page, Box, Text, Header, Input, Button, useNavigate, Switch } from "zmp-ui";
import { useRecoilState, useRecoilValue } from "recoil";
import { documentListState, currentUserRoleState } from "../state";
import { Document } from "../types/document";

const CreateDocument: React.FC = () => {
  const [docs, setDocs] = useRecoilState(documentListState);
  const currentRole = useRecoilValue(currentUserRoleState);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    soKyHieu: "",
    trichYeu: "",
    donViBanHanh: "",
    ngayTrenVanBan: "",
    hanXuLy: "",
  });

  const nextSoThuTu = useMemo(() => (docs.length + 1).toString().padStart(3, '0'), [docs.length]);
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [hasDeadline, setHasDeadline] = useState(false);

  const isLate = useMemo(() => {
    if (hasDeadline && form.hanXuLy) {
      return new Date(form.hanXuLy) < new Date(todayDate);
    }
    return false;
  }, [hasDeadline, form.hanXuLy, todayDate]);

  const handleSubmit = () => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      soCongVanDen: nextSoThuTu,
      ngayCVD: todayDate,
      soKyHieu: form.soKyHieu,
      trichYeu: form.trichYeu,
      donViBanHanh: form.donViBanHanh,
      ngayTrenVanBan: form.ngayTrenVanBan,
      hanXuLy: hasDeadline ? form.hanXuLy : undefined,
      trangThai: "pending",
      assigneeRole: "giam_doc",
      history: [
        {
          id: Date.now().toString(),
          action: 'create',
          actorName: 'Văn thư', // Should get from currentUserNameState in real app
          actorRole: 'van_thu',
          timestamp: new Date().toISOString()
        }
      ]
    };
    setDocs([newDoc, ...docs]);
    navigate(-1);
  };

  if (currentRole !== 'van_thu') {
    return (
      <Page className="bg-gray-50 flex flex-col h-full">
        <Header title="Tạo mới văn bản" showBackIcon={false} />
        <Box className="p-4 flex justify-center items-center h-full">
          <Text className="text-gray-500">Chỉ Văn thư mới có quyền tạo mới văn bản.</Text>
        </Box>
      </Page>
    );
  }

  return (
    <Page className="bg-gray-50 flex flex-col h-full relative">
      <Header title="Tạo mới văn bản" showBackIcon={false} />
      
      <Box className="flex-1 p-4 overflow-y-auto pb-24">
        <Box className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          
          <Box className="flex space-x-3 mb-2">
            <Box className="flex-1 bg-gray-100 p-3 rounded-lg border border-gray-200">
              <Text className="text-gray-500 text-xs mb-1">Số thứ tự</Text>
              <Text className="font-bold text-gray-800">{nextSoThuTu}</Text>
            </Box>
            <Box className="flex-1 bg-gray-100 p-3 rounded-lg border border-gray-200">
              <Text className="text-gray-500 text-xs mb-1">Ngày nhập</Text>
              <Text className="font-bold text-gray-800">{new Date(todayDate).toLocaleDateString('vi-VN')}</Text>
            </Box>
          </Box>

          <Box>
            <Text className="mb-2 font-medium">Số ký hiệu</Text>
            <Input 
              placeholder="VD: 123/QD-BKHCN"
              value={form.soKyHieu}
              onChange={(e) => setForm({...form, soKyHieu: e.target.value})}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Trích yếu</Text>
            <Input.TextArea 
              placeholder="Nhập nội dung trích yếu"
              value={form.trichYeu}
              onChange={(e) => setForm({...form, trichYeu: e.target.value})}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Đơn vị ban hành</Text>
            <Input 
              placeholder="VD: Bộ KHCN"
              value={form.donViBanHanh}
              onChange={(e) => setForm({...form, donViBanHanh: e.target.value})}
            />
          </Box>
          
          <Box>
            <Text className="mb-2 font-medium">Ngày trên văn bản</Text>
            <Input 
              type="date"
              value={form.ngayTrenVanBan}
              onChange={(e) => setForm({...form, ngayTrenVanBan: e.target.value})}
            />
          </Box>

          <Box className="border-t border-gray-100 pt-4">
            <Box className="flex items-center justify-between mb-3">
              <Text className="font-medium">Có hạn xử lý không?</Text>
              <Switch checked={hasDeadline} onChange={(e) => setHasDeadline(e.target.checked)} />
            </Box>
            
            {hasDeadline && (
              <Box className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Text className="mb-2 font-medium">Hạn xử lý</Text>
                <Input 
                  type="date"
                  value={form.hanXuLy}
                  onChange={(e) => setForm({...form, hanXuLy: e.target.value})}
                />
                {isLate && (
                  <Text className="text-red-500 text-sm mt-2 font-medium">
                    (Văn bản đến chậm)
                  </Text>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box className="absolute bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <Button 
          fullWidth
          className="!bg-blue-600 text-white" 
          onClick={handleSubmit}
        >
          Lưu văn bản
        </Button>
      </Box>
    </Page>
  );
};

export default CreateDocument;
