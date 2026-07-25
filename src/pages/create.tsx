import React, { useState, useMemo } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { Page, Box, Text, Header, Input, Button, useNavigate, Switch, Select, Modal } from "zmp-ui";
import { useRecoilState, useRecoilValue } from "recoil";
import { documentListState, currentUserState, userListState } from "../state";
import { Document, DocumentType } from "../types/document";

const CreateDocument: React.FC = () => {
  const [docs, setDocs] = useRecoilState(documentListState);
  const currentUser = useRecoilValue(currentUserState);
  const userList = useRecoilValue(userListState);
  const navigate = useNavigate();

  if (!currentUser) return null;

  const [form, setForm] = useState({
    soKyHieu: "",
    trichYeu: "",
    donViBanHanh: "",
    ngayTrenVanBan: "",
    hanXuLy: "",
  });

  const [submitLeaderModalVisible, setSubmitLeaderModalVisible] = useState(false);
  const [submitLeaderNote, setSubmitLeaderNote] = useState<string>('');
  const [selectedMainProcessorId, setSelectedMainProcessorId] = useState<string>('');
  const [selectedReporterIds, setSelectedReporterIds] = useState<string[]>([]);
  
  const currentDeptLeaders = useMemo(() => {
    return userList.filter(u => u.departmentId === currentUser.departmentId && u.role === 'truong_ban');
  }, [userList, currentUser.departmentId]);

  const [docType, setDocType] = useState<DocumentType>(currentUser.role === 'chuyen_vien' ? 'internal_cross' : 'external_in');

  const isInternal = docType === 'internal_cross' || docType === 'internal_submit';

  const nextSoThuTu = useMemo(() => {
    if (isInternal) {
      const myInternalDocsCount = docs.filter(d => 
        (d.documentType === 'internal_cross' || d.documentType === 'internal_submit') && 
        d.creatorId === currentUser.id
      ).length;
      return (myInternalDocsCount + 1).toString().padStart(3, '0');
    }
    return (docs.length + 1).toString().padStart(3, '0');
  }, [docs, isInternal, currentUser.id]);
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [hasDeadline, setHasDeadline] = useState(false);

  const isLate = useMemo(() => {
    if (hasDeadline && form.hanXuLy) {
      return new Date(form.hanXuLy) < new Date(todayDate);
    }
    return false;
  }, [hasDeadline, form.hanXuLy, todayDate]);

  const handleCreateAndSubmit = async () => {
    if (!selectedMainProcessorId) {
      alert("Vui lòng chọn 1 Lãnh đạo xử lý chính!");
      return;
    }
    
    const processor = userList.find(u => u.id === selectedMainProcessorId);
    const reporterNames = selectedReporterIds.map(id => userList.find(u => u.id === id)?.name).join(', ');
    const reporterPart = reporterNames ? `; Để biết: ${reporterNames}` : '';
    const finalNote = `Xử lý chính: "${processor?.name}"${reporterPart} và Nội dung: ${submitLeaderNote || 'Không có'}`;

    const newDocId = `doc-${Date.now()}`;
    
    let internalStatus = undefined;
    if (docType === 'internal_cross') {
      internalStatus = 'ld_a_reviewing' as any;
    } else if (docType === 'internal_submit') {
      internalStatus = 'ld_submit_reviewing' as any;
    }

    const newDoc: Document = {
      id: newDocId,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      documentType: docType,
      senderDepartmentId: currentUser.departmentId,
      internalStatus: internalStatus,
      
      soCongVanDen: nextSoThuTu,
      ngayCVD: todayDate,
      soKyHieu: form.soKyHieu,
      trichYeu: form.trichYeu,
      donViBanHanh: currentUser.departmentId,
      ngayTrenVanBan: todayDate,
      hanXuLy: hasDeadline ? form.hanXuLy : undefined,
      trangThai: 'pending',
      assigneeRole: 'truong_ban',
      assigneeId: selectedMainProcessorId,
      reporterIds: selectedReporterIds,
      noiDungDeXuat: submitLeaderNote,
      history: [
        {
          id: Date.now().toString(),
          action: 'submit',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          targetRole: 'truong_ban',
          targetUserIds: [selectedMainProcessorId],
          reporterIds: selectedReporterIds,
          timestamp: new Date().toISOString(),
          note: finalNote,
          noiDungDeXuat: submitLeaderNote,
          senderDepartmentId: currentUser.departmentId,
          hanXuLy: hasDeadline ? form.hanXuLy : undefined,
          previousState: {
             trangThai: 'pending',
             assigneeRole: 'chuyen_vien',
             assigneeId: currentUser.id,
             internalStatus: docType === 'internal_cross' ? 'cv_a_created' : 'cv_submit_created'
          }
        },
        {
          id: (Date.now() - 100).toString(),
          action: 'create',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, "documents", newDocId), newDoc);
    } catch (e) {
      console.error("Error creating document:", e);
    }
    
    setSubmitLeaderModalVisible(false);
    navigate('/', { replace: true });
  };

  const handleSubmit = async () => {
    const newDocId = `doc-${Date.now()}`;
    const isInternal = docType === 'internal_cross' || docType === 'internal_submit';
    
    let internalStatus = undefined;
    let assigneeRole = 'giam_doc';
    let trangThai: any = 'pending';

    if (docType === 'internal_cross') {
      internalStatus = 'cv_a_created' as any;
      assigneeRole = 'chuyen_vien';
    } else if (docType === 'internal_submit') {
      internalStatus = 'cv_submit_created' as any;
      assigneeRole = 'chuyen_vien';
    } else {
      assigneeRole = 'giam_doc'; // For external_in, default goes to Giám đốc
    }

    const newDoc: Document = {
      id: newDocId,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      documentType: docType,
      senderDepartmentId: isInternal ? currentUser.departmentId : undefined,
      internalStatus: internalStatus,
      
      soCongVanDen: nextSoThuTu,
      ngayCVD: todayDate,
      soKyHieu: form.soKyHieu,
      trichYeu: form.trichYeu,
      donViBanHanh: isInternal ? currentUser.departmentId : form.donViBanHanh,
      ngayTrenVanBan: isInternal ? todayDate : form.ngayTrenVanBan,
      hanXuLy: hasDeadline ? form.hanXuLy : undefined,
      trangThai: trangThai,
      assigneeRole: assigneeRole as any,
      history: [
        {
          id: Date.now().toString(),
          action: 'create',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString() // add for sorting
    };
    
    try {
      await setDoc(doc(db, "documents", newDocId), newDoc);
    } catch (e) {
      console.error("Error creating document:", e);
    }
    
    navigate('/', { replace: true });
  };

  if (currentUser.role !== 'van_thu' && currentUser.role !== 'chuyen_vien') {
    return (
      <Page className="bg-gray-50 flex flex-col h-full">
        <Header title="Tạo mới văn bản" showBackIcon={false} />
        <Box className="p-4 flex justify-center items-center h-full">
          <Text className="text-gray-500">Chỉ Văn thư hoặc Chuyên viên mới có quyền tạo mới văn bản.</Text>
        </Box>
      </Page>
    );
  }


  return (
    <Page className="bg-gray-50 flex flex-col h-full relative">
      <Header title="Tạo mới văn bản" showBackIcon={false} />
      
      <Box className="flex-1 p-4 overflow-y-auto pb-24">
        <Box className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          
          {currentUser.role === 'chuyen_vien' && (
            <Box>
              <Text className="mb-2 font-medium">Loại luồng công việc</Text>
              <Select
                value={docType}
                onChange={(v) => setDocType(v as DocumentType)}
                closeOnSelect
              >
                <Select.Option value="internal_cross" title="Luồng 1: Xử lý ngang cấp (Gửi Ban khác)" />
                <Select.Option value="internal_submit" title="Luồng 2: Trình Giám đốc ký phát hành" />
              </Select>
            </Box>
          )}

          <Box className="flex space-x-3 mb-2">
            <Box className="flex-1 bg-gray-100 p-3 rounded-lg border border-gray-200">
              <Text className="text-gray-500 text-xs mb-1">STT</Text>
              <Text className="font-bold text-gray-800">{nextSoThuTu}</Text>
            </Box>
            <Box className="flex-1 bg-gray-100 p-3 rounded-lg border border-gray-200">
              <Text className="text-gray-500 text-xs mb-1">Ngày nhập</Text>
              <Text className="font-bold text-gray-800">{new Date(todayDate).toLocaleDateString('vi-VN')}</Text>
            </Box>
          </Box>

          <Box>
            <Text className="mb-2 font-medium">Số / Ký hiệu {isInternal && "(Dự thảo)"}</Text>
            <Input 
              placeholder="VD: 123/QD-BKHCN"
              value={form.soKyHieu}
              onChange={(e) => setForm({...form, soKyHieu: e.target.value})}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Trích yếu nội dung</Text>
            <Input.TextArea 
              placeholder="Nhập nội dung trích yếu"
              value={form.trichYeu}
              onChange={(e) => setForm({...form, trichYeu: e.target.value})}
            />
          </Box>
          
          {!isInternal && (
            <Box>
              <Text className="mb-2 font-medium">Đơn vị ban hành</Text>
              <Input 
                placeholder="VD: Bộ KHCN"
                value={form.donViBanHanh}
                onChange={(e) => setForm({...form, donViBanHanh: e.target.value})}
              />
            </Box>
          )}
          
          {!isInternal && (
            <Box>
              <Text className="mb-2 font-medium">Ngày trên văn bản</Text>
              <Input 
                type={"date" as any}
                value={form.ngayTrenVanBan}
                onChange={(e) => setForm({...form, ngayTrenVanBan: e.target.value})}
              />
            </Box>
          )}

          <Box className="border-t border-gray-100 pt-4">
            <Box className="flex items-center justify-between mb-3">
              <Text className="font-medium">Có hạn xử lý không?</Text>
              <Switch checked={hasDeadline} onChange={(e) => setHasDeadline(e.target.checked)} />
            </Box>
            
            {hasDeadline && (
              <Box className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Text className="mb-2 font-medium">Hạn xử lý</Text>
                <Input 
                  type={"date" as any}
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
          onClick={() => {
            if (isInternal) {
              setSubmitLeaderModalVisible(true);
            } else {
              handleSubmit();
            }
          }}
        >
          {isInternal ? "Trình LĐ Ban duyệt" : "Lưu văn bản đến"}
        </Button>
      </Box>

      {/* Select Leader Modal */}
      <Modal visible={submitLeaderModalVisible} title="Trình Lãnh đạo Ban" onClose={() => setSubmitLeaderModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Xác nhận trình", highLight: true, onClick: handleCreateAndSubmit }]}>
        <Box className="p-4 space-y-4">
          <Text className="font-medium text-gray-700">Chọn Lãnh đạo xử lý chính và báo cáo:</Text>
          <Box className="space-y-3 mt-2">
            {currentDeptLeaders.length === 0 ? (
              <Box className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <Text className="text-red-500 text-sm">
                  Không tìm thấy Trưởng/Phó ban nào trong đơn vị của bạn. Xin vui lòng đăng ký tài khoản Lãnh đạo cho ban này trước! (Debug: userList={userList.length})
                </Text>
              </Box>
            ) : (
              currentDeptLeaders.map(leader => (
                <Box key={leader.id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg bg-gray-50">
                  <Text className="font-medium flex-1">{leader.name}</Text>
                  <Box className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1 text-sm text-blue-600">
                      <input 
                        type="radio" 
                        name="main_processor" 
                        checked={selectedMainProcessorId === leader.id}
                        onChange={() => setSelectedMainProcessorId(leader.id)}
                        className="w-4 h-4"
                      />
                      <span>Xử lý</span>
                    </label>
                    <label className="flex items-center space-x-1 text-sm text-gray-600">
                      <input 
                        type="checkbox"
                        checked={selectedReporterIds.includes(leader.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedReporterIds([...selectedReporterIds, leader.id]);
                          else setSelectedReporterIds(selectedReporterIds.filter(id => id !== leader.id));
                        }}
                        disabled={selectedMainProcessorId === leader.id}
                        className="w-4 h-4"
                      />
                      <span>Để biết</span>
                    </label>
                  </Box>
                </Box>
              ))
            )}
          </Box>
          <Box className="mt-4">
            <Text className="font-medium text-gray-700 mb-2">Nội dung trình:</Text>
            <Input.TextArea 
              placeholder="Nhập nội dung trình Lãnh đạo..." 
              value={submitLeaderNote} 
              onChange={(e) => setSubmitLeaderNote(e.target.value)} 
            />
          </Box>
        </Box>
      </Modal>

    </Page>
  );
};

export default CreateDocument;
