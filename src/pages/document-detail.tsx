import React, { useMemo, useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Page, Box, Text, Header, Button, useNavigate, Modal, Select, Input, Checkbox } from "zmp-ui";
import { useRecoilState, useRecoilValue } from "recoil";
import { documentListState, currentUserState } from "../state";
import { useSearchParams } from "react-router-dom";
import { DocumentStatus, UserRole, DepartmentId, DocumentHistory } from "../types/document";
import { mockUsers, departments } from "../mock/users";



const DocumentDetail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [docs, setDocs] = useRecoilState(documentListState);
  const currentUser = useRecoilValue(currentUserState);
  const currentRole = currentUser.role;
  const navigate = useNavigate();

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignTargetRole, setAssignTargetRole] = useState<UserRole>('truong_ban');
  const [assignNote, setAssignNote] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ 
    soKyHieu: '', donViBanHanh: '', ngayTrenVanBan: '', trichYeu: '', hanXuLy: '' 
  });

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [submitResultModalVisible, setSubmitResultModalVisible] = useState(false);
  const [submitResultText, setSubmitResultText] = useState('');
  const [submitTargetRole, setSubmitTargetRole] = useState<UserRole>('truong_ban');

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approveText, setApproveText] = useState('');

  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishDocNumber, setPublishDocNumber] = useState('');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Custom modals for new internal flows
  const [selectDeptModalVisible, setSelectDeptModalVisible] = useState(false);
  const [selectedDeptIds, setSelectedDeptIds] = useState<DepartmentId[]>([]);
  const [selectDeptNote, setSelectDeptNote] = useState('');

  const [publishInfoModalVisible, setPublishInfoModalVisible] = useState(false);
  const [selectedMultiDepts, setSelectedMultiDepts] = useState<DepartmentId[]>([]);

  // New Modal for Trình Lãnh đạo Ban
  const [submitLeaderModalVisible, setSubmitLeaderModalVisible] = useState(false);
  const [submitLeaderStatus, setSubmitLeaderStatus] = useState<string>('');
  const [submitLeaderNote, setSubmitLeaderNote] = useState<string>('');
  const [selectedMainProcessorId, setSelectedMainProcessorId] = useState<string>('');
  const [selectedReporterIds, setSelectedReporterIds] = useState<string[]>([]);
  
  const currentDeptLeaders = useMemo(() => {
    return mockUsers.filter(u => u.departmentId === currentUser.departmentId && u.role === 'truong_ban');
  }, [currentUser.departmentId]);

  const document = useMemo(() => docs.find((d) => d.id === id), [docs, id]);

  React.useEffect(() => {
    if (document) {
      setEditForm({ 
        soKyHieu: document.soKyHieu,
        donViBanHanh: document.donViBanHanh,
        ngayTrenVanBan: document.ngayTrenVanBan,
        trichYeu: document.trichYeu, 
        hanXuLy: document.hanXuLy || '' 
      });
    }
  }, [document]);

  if (!document) {
    return (
      <Page>
        <Header title="Chi tiết văn bản" />
        <Box className="p-4"><Text>Không tìm thấy văn bản!</Text></Box>
      </Page>
    );
  }

  const isInternal = document.documentType === 'internal_cross' || document.documentType === 'internal_submit';

  const addHistory = (doc: any, action: DocumentHistory['action'], note?: string, targetRole?: UserRole, targetDept?: string) => {
    const history = doc.history || [];
    return [
      {
        id: Date.now().toString(),
        action,
        actorName: currentUser.name,
        actorRole: currentRole,
        targetRole,
        targetDepartmentId: targetDept,
        timestamp: new Date().toISOString(),
        note
      },
      ...history
    ];
  };

  const handleAction = async (
    action: DocumentHistory['action'], 
    nextRole?: UserRole, 
    newStatus?: DocumentStatus, 
    extraUpdates?: any, 
    note?: string,
    targetDept?: string
  ) => {
    if (!id || !document) return;
    
    const updatedData = {
      trangThai: newStatus || document.trangThai,
      assigneeRole: nextRole || document.assigneeRole,
      ...extraUpdates,
      history: addHistory(document, action, note, nextRole, targetDept)
    };

    try {
      await updateDoc(doc(db, "documents", id), updatedData);
    } catch (error) {
      console.error("Error updating document:", error);
    }

    setAssignModalVisible(false);
    setEditModalVisible(false);
    setRejectModalVisible(false);
    setSubmitResultModalVisible(false);
    setApproveModalVisible(false);
    setPublishModalVisible(false);
    setSelectDeptModalVisible(false);
    setPublishInfoModalVisible(false);
    setSubmitLeaderModalVisible(false);
    
    setAssignNote('');
    setAssignDeadline('');
    setRejectReason('');
    setSubmitResultText('');
    setApproveText('');
    setPublishDocNumber('');
    setPublishDate('');
  };

  // ---- External Flow Buttons ----
  const renderExternalButtons = () => {
    const isAssignee = document.assigneeRole === currentRole;
    if (!isAssignee) return null;

    switch (currentRole) {
      case 'van_thu':
        if (document.trangThai === 'warning') {
          return (
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setEditModalVisible(true)}>
                Chỉnh sửa
              </Button>
              <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('submit', 'giam_doc', 'pending')}>
                Trình lại
              </Button>
            </>
          );
        }
        return (
          <Button className="flex-1 !bg-green-600 text-white" onClick={() => setPublishModalVisible(true)}>
            Phát hành & Đóng hồ sơ
          </Button>
        );
      case 'giam_doc':
        const mostRecentOtherActorGiamDoc = document.history?.find((h: any) => h.actorRole !== 'giam_doc')?.actorRole;
        const isFromBelow = mostRecentOtherActorGiamDoc === 'truong_ban' || mostRecentOtherActorGiamDoc === 'chuyen_vien';
        
        if (isFromBelow) {
          return (
            <>
              <Button variant="secondary" className="flex-1 text-red-600 border border-red-200" onClick={() => setRejectModalVisible(true)}>
                Trả lại
              </Button>
              <Button className="flex-1 !bg-blue-600 text-white" onClick={() => setApproveModalVisible(true)}>
                Ký duyệt
              </Button>
            </>
          );
        }

        return (
          <>
            <Button variant="secondary" className="flex-1 text-red-600 border border-red-200" onClick={() => setRejectModalVisible(true)}>
              Trả lại
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => { setAssignTargetRole('truong_ban'); setAssignModalVisible(true); }}>
              Giao Ban
            </Button>
          </>
        );
      case 'truong_ban':
        const mostRecentOtherActor = document.history?.find((h: any) => h.actorRole !== 'truong_ban')?.actorRole;
        const isFromChuyenVien = mostRecentOtherActor === 'chuyen_vien';
        if (isFromChuyenVien) {
          return (
            <>
              <Button variant="secondary" className="flex-1 text-red-600 border border-red-200" onClick={() => setRejectModalVisible(true)}>
                Trả lại
              </Button>
              <Button className="flex-1 !bg-blue-600 text-white" onClick={() => { setSubmitTargetRole('giam_doc'); setSubmitResultModalVisible(true); }}>
                Trình Lãnh đạo
              </Button>
            </>
          );
        }
        return (
          <>
            <Button variant="secondary" className="flex-1 text-red-600 border border-red-200" onClick={() => setRejectModalVisible(true)}>
              Trả lại
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => { setAssignTargetRole('chuyen_vien'); setAssignModalVisible(true); }}>
              Phân công CV
            </Button>
          </>
        );
      case 'chuyen_vien':
        return (
          <Button className="flex-1 !bg-blue-600 text-white" onClick={() => { setSubmitTargetRole('truong_ban'); setSubmitResultModalVisible(true); }}>
            Trình kết quả
          </Button>
        );
      default:
        return null;
    }
  };

  // ---- Internal Cross Flow Buttons ----
  const renderInternalCrossButtons = () => {
    const status = document.internalStatus;
    const isSenderDept = currentUser.departmentId === document.senderDepartmentId;
    const targetDept = document.targetDepartmentIds?.[0];
    const isTargetDept = currentUser.departmentId === targetDept;

    if (status === 'cv_a_created' && currentRole === 'chuyen_vien' && isSenderDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => {
          setSubmitLeaderStatus('ld_a_reviewing');
          setSubmitLeaderNote('Trình LĐ Ban duyệt để gửi');
          setSubmitLeaderModalVisible(true);
        }}>
          Trình LĐ Ban duyệt
        </Button>
      );
    }
    if (status === 'ld_a_reviewing' && currentRole === 'truong_ban' && isSenderDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => setSelectDeptModalVisible(true)}>
          Chọn & Gửi Ban khác
        </Button>
      );
    }
    if (status === 'ld_b_reviewing' && currentRole === 'truong_ban' && isTargetDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('assign', 'chuyen_vien', 'pending', { internalStatus: 'cv_b_processing' }, 'Phân công CV xử lý ngang cấp')}>
          Phân công CV xử lý
        </Button>
      );
    }
    if (status === 'cv_b_processing' && currentRole === 'chuyen_vien' && isTargetDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('submit', 'truong_ban', 'pending', { internalStatus: 'ld_b_returning' }, 'Đã xử lý xong, trình LĐ Ban trả kết quả')}>
          Trình LĐ Ban (Đã xử lý xong)
        </Button>
      );
    }
    if (status === 'ld_b_returning' && currentRole === 'truong_ban' && isTargetDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('approve', 'truong_ban', 'pending', { internalStatus: 'ld_a_receiving' }, 'Ký gửi trả lại kết quả cho Ban yêu cầu')}>
          Ký gửi trả Ban A
        </Button>
      );
    }
    if (status === 'ld_a_receiving' && currentRole === 'truong_ban' && isSenderDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('assign', 'chuyen_vien', 'pending', { internalStatus: 'cv_a_summarizing' }, 'Giao CV tổng hợp kết quả')}>
          Giao CV tổng hợp
        </Button>
      );
    }
    if (status === 'cv_a_summarizing' && currentRole === 'chuyen_vien' && isSenderDept) {
      return (
        <Button className="flex-1 !bg-green-600 text-white" onClick={() => handleAction('complete', 'chuyen_vien', 'completed', { internalStatus: 'completed' }, 'Đã tổng hợp và hoàn thành hồ sơ')}>
          Hoàn thành tổng hợp
        </Button>
      );
    }
    return null;
  };

  // ---- Internal Submit Flow Buttons ----
  const renderInternalSubmitButtons = () => {
    const status = document.internalStatus;
    const isSenderDept = currentUser.departmentId === document.senderDepartmentId;

    if (status === 'cv_submit_created' && currentRole === 'chuyen_vien' && isSenderDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => {
          setSubmitLeaderStatus('ld_submit_reviewing');
          setSubmitLeaderNote('Trình LĐ Ban ký duyệt');
          setSubmitLeaderModalVisible(true);
        }}>
          Trình LĐ Ban
        </Button>
      );
    }
    if (status === 'ld_submit_reviewing' && currentRole === 'truong_ban' && isSenderDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('submit', 'giam_doc', 'pending', { internalStatus: 'gd_submit_reviewing' }, 'Trình Giám đốc ký phát hành')}>
          Trình Giám đốc
        </Button>
      );
    }
    if (status === 'gd_submit_reviewing' && currentRole === 'giam_doc') {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('approve', 'van_thu', 'pending', { internalStatus: 'vt_submit_publishing' }, 'Ký duyệt, giao Văn thư phát hành')}>
          Ký duyệt & Chuyển Văn thư
        </Button>
      );
    }
    if (status === 'vt_submit_publishing' && currentRole === 'van_thu') {
      return (
        <Button className="flex-1 !bg-green-600 text-white" onClick={() => setPublishInfoModalVisible(true)}>
          Lấy số & Gửi để biết
        </Button>
      );
    }
    return null;
  };

  const statusColors: any = {
    pending: "text-orange-600 bg-orange-100",
    warning: "text-yellow-600 bg-yellow-100",
    waiting: "text-purple-600 bg-purple-100",
    overdue: "text-red-600 bg-red-100",
    completed: "text-green-600 bg-green-100",
    deleted: "text-gray-600 bg-gray-200",
    info: "text-blue-600 bg-blue-100",
  };
  const statusLabels: any = {
    pending: "Chờ xử lý",
    warning: "Vướng mắc / Trả lại",
    waiting: "Chờ ý kiến",
    overdue: "Trễ hạn",
    completed: "Hoàn thành",
    deleted: "Đã hủy bỏ",
    info: "Thông tin (Để biết)",
  };

  const getActionLabel = (h: any) => {
    const map: any = {
      create: "Tạo mới văn bản",
      assign: "Phân công xử lý",
      submit: "Trình lên trên",
      reject: "Chuyển trả lại",
      approve: "Đã duyệt",
      complete: "Đóng hồ sơ / Hoàn thành",
      edit: "Đã cập nhật (Sửa) thông tin",
      forward_info: "Gửi thông tin (để biết)"
    };
    return map[h.action] || h.action;
  };

  const handleSelectDeptSubmit = () => {
    if (selectedDeptIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 Ban nhận!");
      return;
    }
    const deptNames = selectedDeptIds.map(id => departments.find(d => d.id === id)?.name).join(', ');
    handleAction('submit', 'truong_ban', 'pending', { 
      internalStatus: 'ld_b_reviewing', 
      targetDepartmentIds: selectedDeptIds 
    }, selectDeptNote || `Gửi văn bản sang ${deptNames} xử lý`, selectedDeptIds[0]);
  };

  const handlePublishInfoSubmit = () => {
    handleAction('forward_info', undefined, 'info', { 
      internalStatus: 'completed', 
      soVanBanPhatHanh: publishDocNumber, 
      ngayPhatHanh: publishDate,
      targetDepartmentIds: selectedMultiDepts 
    }, `Phát hành VB số ${publishDocNumber} và Gửi cho các Ban: ${selectedMultiDepts.length > 0 ? selectedMultiDepts.join(', ') : 'Tất cả'}`);
  };

  const handleSubmitLeaderSubmit = async () => {
    if (!selectedMainProcessorId) {
      alert("Vui lòng chọn 1 Lãnh đạo xử lý chính!");
      return;
    }
    const processor = mockUsers.find(u => u.id === selectedMainProcessorId);
    const reporterNames = selectedReporterIds.map(id => mockUsers.find(u => u.id === id)?.name).join(', ');
    const reporterPart = reporterNames ? `; Để biết: ${reporterNames}` : '';
    const finalNote = `Xử lý chính: "${processor?.name}"${reporterPart} và Nội dung: ${submitLeaderNote || 'Không có'}`;

    await handleAction('submit', 'truong_ban', 'pending', { 
      internalStatus: submitLeaderStatus,
      assigneeId: selectedMainProcessorId,
      reporterIds: selectedReporterIds,
      noiDungDeXuat: submitLeaderNote
    }, finalNote);
    
    navigate('/', { replace: true });
  };

  return (
    <Page className="bg-gray-50 flex flex-col h-full relative">
      <Header title="Chi tiết văn bản" showBackIcon={true} />
      
      <Box className="flex-1 overflow-y-auto p-4 pb-24">
        <Box className="bg-white p-4 rounded-xl shadow-sm mb-4">
          <Box className="flex justify-between items-center mb-3">
            <Text className="text-gray-500 text-sm">Số ký hiệu:</Text>
            <Text className="font-bold text-lg">{document.soKyHieu}</Text>
          </Box>
          <Box className="mb-3">
            <Text className="text-gray-500 text-sm mb-1">Trích yếu:</Text>
            <Text className="text-gray-800 text-base leading-relaxed">{document.trichYeu}</Text>
          </Box>
          <Box className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <Text className="text-gray-500 text-sm">Trạng thái:</Text>
            <Box className={`px-3 py-1 rounded-full ${statusColors[document.trangThai] || 'bg-gray-100 text-gray-800'}`}>
              <Text size="small" className="font-semibold">
                {statusLabels[document.trangThai] || document.trangThai}
              </Text>
            </Box>
          </Box>
        </Box>

        <Box className="bg-white p-4 rounded-xl shadow-sm mb-4">
          <Text className="font-bold text-base mb-3 border-b border-gray-100 pb-2">Thông tin xử lý</Text>
          
          {document.noiDungDeXuat && (
            <Box className="flex justify-between items-start mb-3">
              <Text className="text-gray-500 mt-1">Nội dung đề xuất:</Text>
              <Text className="text-gray-800 font-medium text-right max-w-[60%] italic">
                "{document.noiDungDeXuat}"
              </Text>
            </Box>
          )}

          <Box className="flex justify-between items-start mb-3">
            <Text className="text-gray-500 mt-1">Loại văn bản:</Text>
            <Text className="text-gray-800 font-medium">
              {document.documentType === 'internal_cross' ? 'Nội bộ (Ngang cấp)' :
               document.documentType === 'internal_submit' ? 'Nội bộ (Trình ký)' : 'Văn bản đến'}
            </Text>
          </Box>
          <Box className="flex justify-between items-start mb-3">
            <Text className="text-gray-500 mt-1">Đơn vị ban hành (Gửi):</Text>
            <Text className="text-gray-800 font-medium text-right max-w-[50%]">
              {document.senderDepartmentId ? departments.find(d => d.id === document.senderDepartmentId)?.name : document.donViBanHanh}
            </Text>
          </Box>
          {document.targetDepartmentIds && document.targetDepartmentIds.length > 0 && (
            <Box className="flex justify-between items-start mb-3">
              <Text className="text-gray-500 mt-1">Ban nhận:</Text>
              <Text className="text-gray-800 font-medium text-right max-w-[50%]">
                {document.targetDepartmentIds.map(id => departments.find(d => d.id === id)?.name || id).join(', ')}
              </Text>
            </Box>
          )}

          {document.hanXuLy && (
            <Box className="flex justify-between items-start mb-3">
              <Text className="text-gray-500">Hạn xử lý:</Text>
              <Text className="text-red-600 font-bold">{document.hanXuLy}</Text>
            </Box>
          )}
          
          {document.soVanBanPhatHanh && (
            <>
              <Box className="flex justify-between items-start mb-3 border-t border-gray-100 pt-3">
                <Text className="text-gray-500 font-medium">Số VB phát hành:</Text>
                <Text className="text-green-700 font-bold">{document.soVanBanPhatHanh}</Text>
              </Box>
              <Box className="flex justify-between items-start mb-3">
                <Text className="text-gray-500 font-medium">Ngày phát hành:</Text>
                <Text className="text-gray-800 font-medium">{document.ngayPhatHanh ? new Date(document.ngayPhatHanh).toLocaleDateString('vi-VN') : '...'}</Text>
              </Box>
            </>
          )}
        </Box>

        {/* Timeline */}
        <Box className="bg-white p-4 rounded-xl shadow-sm">
          <Text className="font-bold text-base mb-4 text-gray-800">Lịch sử luân chuyển</Text>
          <Box className="space-y-4">
            {document.history && document.history.length > 0 ? (
              document.history.map((h, idx) => (
                <Box key={h.id} className="relative pl-6 border-l-2 border-blue-200">
                  <Box className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></Box>
                  <Text className="text-sm font-semibold text-gray-800">{getActionLabel(h)}</Text>
                  <Text className="text-xs text-gray-500 mt-1">{h.actorName} - {new Date(h.timestamp).toLocaleString()}</Text>
                  {h.note && (
                    <Box className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-700 italic border-l-4 border-blue-400">
                      "{h.note}"
                    </Box>
                  )}
                </Box>
              ))
            ) : (
              <Text className="text-gray-400 text-sm">Chưa có lịch sử</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Action Buttons */}
      {(document.trangThai !== 'completed' && document.trangThai !== 'deleted' && document.trangThai !== 'info') && (
        <Box className="absolute bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex space-x-2 z-50">
          {!isInternal && renderExternalButtons()}
          {document.documentType === 'internal_cross' && renderInternalCrossButtons()}
          {document.documentType === 'internal_submit' && renderInternalSubmitButtons()}
        </Box>
      )}

      {/* Modals from before */}
      <Modal visible={rejectModalVisible} title="Trả lại văn bản" onClose={() => setRejectModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Xác nhận", highLight: true, onClick: () => {
         const previousRole = document.history?.find(h => h.actorRole !== currentRole)?.actorRole || 'van_thu';
         handleAction('reject', previousRole, 'warning', undefined, rejectReason);
      }}]}>
        <Box className="p-4"><Input.TextArea placeholder="Nhập lý do..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></Box>
      </Modal>

      <Modal visible={approveModalVisible} title="Ký duyệt" onClose={() => setApproveModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Xác nhận", highLight: true, onClick: () => handleAction('approve', 'van_thu', 'pending', undefined, approveText) }]}>
        <Box className="p-4"><Input.TextArea placeholder="Ý kiến chỉ đạo..." value={approveText} onChange={(e) => setApproveText(e.target.value)} /></Box>
      </Modal>

      <Modal visible={submitResultModalVisible} title="Trình kết quả" onClose={() => setSubmitResultModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Xác nhận", highLight: true, onClick: () => handleAction('submit', submitTargetRole, 'pending', undefined, submitResultText) }]}>
        <Box className="p-4"><Input.TextArea placeholder="Kết quả xử lý..." value={submitResultText} onChange={(e) => setSubmitResultText(e.target.value)} /></Box>
      </Modal>

      <Modal visible={assignModalVisible} title="Giao việc" onClose={() => setAssignModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Xác nhận", highLight: true, onClick: () => handleAction('assign', assignTargetRole, undefined, assignDeadline ? { hanXuLy: assignDeadline } : {}, assignNote) }]}>
        <Box className="p-4 space-y-4">
          <Select value={assignTargetRole} onChange={(v: any) => setAssignTargetRole(v as UserRole)}>
            <Select.Option value="truong_ban" title="Trưởng ban" />
            <Select.Option value="chuyen_vien" title="Chuyên viên" />
          </Select>
          <Input.TextArea placeholder="Ý kiến chỉ đạo..." value={assignNote} onChange={(e) => setAssignNote(e.target.value)} />
          <Input type={"date" as any} value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)} />
        </Box>
      </Modal>

      <Modal visible={publishModalVisible} title="Phát hành văn bản" onClose={() => setPublishModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Phát hành", highLight: true, onClick: () => {
         handleAction('complete', 'van_thu', 'completed', { soVanBanPhatHanh: publishDocNumber, ngayPhatHanh: publishDate }, `Phát hành văn bản số: ${publishDocNumber}`);
         navigate('/', { replace: true });
      } }]}>
        <Box className="p-4 space-y-4">
          <Input placeholder="Số VB phát hành..." value={publishDocNumber} onChange={(e) => setPublishDocNumber(e.target.value)} />
          <Input type={"date" as any} value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
        </Box>
      </Modal>

      {/* New Modals for Internal flows */}
      <Modal visible={selectDeptModalVisible} title="Chọn Ban nhận" onClose={() => setSelectDeptModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Gửi", highLight: true, onClick: handleSelectDeptSubmit }]}>
        <Box className="p-4">
          <Text className="mb-2 font-medium">Gửi văn bản đến Ban:</Text>
          <Select value={selectedDeptIds} onChange={(v: any) => setSelectedDeptIds(v as DepartmentId[])} multiple>
            {departments.map(d => (
              <Select.Option key={d.id} value={d.id} title={d.name} />
            ))}
          </Select>
          <Box className="mt-4">
            <Text className="font-medium text-gray-700 mb-2">Nội dung gửi:</Text>
            <Input.TextArea 
              placeholder="Nhập nội dung gửi Ban khác..." 
              value={selectDeptNote} 
              onChange={(e) => setSelectDeptNote(e.target.value)} 
            />
          </Box>
        </Box>
      </Modal>

      <Modal visible={publishInfoModalVisible} title="Lấy số & Gửi để biết" onClose={() => setPublishInfoModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Phát hành & Gửi", highLight: true, onClick: handlePublishInfoSubmit }]}>
        <Box className="p-4 space-y-4">
          <Input placeholder="Số VB phát hành..." value={publishDocNumber} onChange={(e) => setPublishDocNumber(e.target.value)} />
          <Input type={"date" as any} value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          
          <Box>
            <Text className="mb-2 font-medium">Gửi đến các Ban (Để biết):</Text>
            <Box className="space-y-2 max-h-40 overflow-y-auto">
              {departments.map(d => (
                <Checkbox 
                  key={d.id} 
                  value={d.id}
                  label={d.name} 
                  checked={selectedMultiDepts.includes(d.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedMultiDepts([...selectedMultiDepts, d.id]);
                    else setSelectedMultiDepts(selectedMultiDepts.filter(id => id !== d.id));
                  }}
                />
              ))}
            </Box>
            <Text className="text-xs text-gray-500 mt-2 italic">* Nếu không chọn ban nào, mặc định gửi cho tất cả.</Text>
          </Box>
        </Box>
      </Modal>

      {/* Select Leader Modal */}
      <Modal visible={submitLeaderModalVisible} title="Trình Lãnh đạo Ban" onClose={() => setSubmitLeaderModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Xác nhận trình", highLight: true, onClick: handleSubmitLeaderSubmit }]}>
        <Box className="p-4 space-y-4">
          <Text className="font-medium text-gray-700">Chọn Lãnh đạo xử lý chính và báo cáo:</Text>
          <Box className="space-y-3 mt-2">
            {currentDeptLeaders.map(leader => (
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
            ))}
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

export default DocumentDetail;
