import React, { useMemo, useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { Page, Box, Text, Header, Button, useNavigate, Modal, Select, Input, Checkbox } from "zmp-ui";
import { useRecoilState, useRecoilValue } from "recoil";
import { documentListState, currentUserState, userListState } from "../state";
import { useSearchParams } from "react-router-dom";
import { DocumentStatus, UserRole, DepartmentId, DocumentHistory } from "../types/document";
import { departments } from "../constants/departments";

const isDateOverdue = (targetDateStr: string | undefined, baseDateStr: string | undefined) => {
  if (!targetDateStr || !baseDateStr) return false;
  const parse = (s: string) => {
    if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) return p[2].length === 4 ? `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : s;
    }
    return s;
  };
  return parse(targetDateStr) > parse(baseDateStr);
};

const TimelineItem = ({ h, getActionLabel, userList }: { h: any, getActionLabel: (h: any) => string, userList: any[] }) => {
  const [expanded, setExpanded] = useState(false);

  const targetDeptNames = h.targetDepartmentIds?.map((id: string) => departments.find(d => d.id === id)?.name || id) || [];
  const targetUserNames = h.targetUserIds?.map((id: string) => userList.find(u => u.id === id)?.name || id) || [];
  
  const allTargets = [...targetDeptNames, ...targetUserNames];

  return (
    <Box className="relative pl-6 border-l-2 border-blue-200">
      <Box className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></Box>
      <Text className="text-sm font-semibold text-gray-800">{getActionLabel(h)}</Text>
      <Text className="text-xs text-gray-500 mt-1">{h.actorName} - {new Date(h.timestamp).toLocaleString()}</Text>
      
      {allTargets.length > 0 && (
        <Box className="mt-2">
          <Text className="text-xs text-gray-600 font-medium mb-1">Đã chuyển đến:</Text>
          <Box className="flex flex-wrap gap-1">
            {(expanded ? allTargets : allTargets.slice(0, 2)).map((name, i) => (
              <Box key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                {name}
              </Box>
            ))}
            {!expanded && allTargets.length > 2 && (
              <Box 
                className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] cursor-pointer active:bg-gray-200"
                onClick={() => setExpanded(true)}
              >
                +{allTargets.length - 2} nữa
              </Box>
            )}
            {expanded && allTargets.length > 2 && (
              <Box 
                className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] cursor-pointer active:bg-gray-200"
                onClick={() => setExpanded(false)}
              >
                Thu gọn
              </Box>
            )}
          </Box>
        </Box>
      )}

      {h.note && (
        <Box className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-700 italic border-l-4 border-blue-400">
          "{h.note}"
        </Box>
      )}
    </Box>
  );
};

const DocumentDetail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [docs, setDocs] = useRecoilState(documentListState);
  const currentUser = useRecoilValue(currentUserState);
  const userList = useRecoilValue(userListState);
  
  if (!currentUser) return null;
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
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [showTreePicker, setShowTreePicker] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  const [selectDeptNote, setSelectDeptNote] = useState('');
  const [selectDeptDeadline, setSelectDeptDeadline] = useState('');

  const [publishInfoModalVisible, setPublishInfoModalVisible] = useState(false);
  const [selectedMultiDepts, setSelectedMultiDepts] = useState<DepartmentId[]>([]);

  // New Modal for Trình Lãnh đạo Ban
  const [submitLeaderModalVisible, setSubmitLeaderModalVisible] = useState(false);
  const [submitLeaderStatus, setSubmitLeaderStatus] = useState<string>('');
  const [submitLeaderNote, setSubmitLeaderNote] = useState<string>('');
  const [selectedMainProcessorId, setSelectedMainProcessorId] = useState<string>('');
  const [selectedReporterIds, setSelectedReporterIds] = useState<string[]>([]);

  const [assignCrossModalVisible, setAssignCrossModalVisible] = useState(false);
  const [assignCrossUserIds, setAssignCrossUserIds] = useState<string[]>([]);
  const [assignCrossNote, setAssignCrossNote] = useState('');
  
  const [finishCrossModalVisible, setFinishCrossModalVisible] = useState(false);
  const [finishCrossNote, setFinishCrossNote] = useState('');
  
  const currentDeptLeaders = useMemo(() => {
    return userList.filter(u => u.departmentId === currentUser.departmentId && u.role === 'truong_ban');
  }, [userList, currentUser.departmentId]);

  const currentDeptMembers = useMemo(() => {
    return userList.filter(u => u.departmentId === currentUser.departmentId && u.id !== currentUser.id);
  }, [userList, currentUser.departmentId, currentUser.id]);

  const document = useMemo(() => docs.find((d) => d.id === id), [docs, id]);

  const currentDeadline = useMemo(() => {
    if (!document) return undefined;
    const relevantHistory = document.history?.find(h => h.actorId === currentUser.id && ['submit', 'assign', 'forward_info', 'create'].includes(h.action));
    return relevantHistory?.hanXuLy || document.hanXuLy;
  }, [document, currentUser.id]);

  React.useEffect(() => {
    if (document) {
      setEditForm({ 
        soKyHieu: document.soKyHieu,
        donViBanHanh: document.donViBanHanh,
        ngayTrenVanBan: document.ngayTrenVanBan,
        trichYeu: document.trichYeu, 
        hanXuLy: currentDeadline || '' 
      });

      if (id && (!document.readBy || !document.readBy.includes(currentUser.id))) {
        // Mark as read
        updateDoc(doc(db, "documents", id), {
          readBy: [...(document.readBy || []), currentUser.id]
        }).catch(console.error);
      }
    }
  }, [document, currentUser.id, id]);

  if (!document) {
    return (
      <Page>
        <Header title="Chi tiết văn bản" />
        <Box className="p-4"><Text>Không tìm thấy văn bản!</Text></Box>
      </Page>
    );
  }

  const isInternal = document.documentType === 'internal_cross' || document.documentType === 'internal_submit';

  const addHistory = (doc: any, action: DocumentHistory['action'], note?: string, targetRole?: UserRole, extraUpdates?: any) => {
    const history = doc.history || [];
    
    const snapshot: any = {};
    if (doc.trangThai !== undefined) snapshot.trangThai = doc.trangThai;
    if (doc.assigneeRole !== undefined) snapshot.assigneeRole = doc.assigneeRole;
    if (doc.assigneeId !== undefined) snapshot.assigneeId = doc.assigneeId;
    if (doc.internalStatus !== undefined) snapshot.internalStatus = doc.internalStatus;
    if (doc.targetDepartmentIds !== undefined) snapshot.targetDepartmentIds = doc.targetDepartmentIds;
    if (doc.targetUserIds !== undefined) snapshot.targetUserIds = doc.targetUserIds;
    if (doc.reporterIds !== undefined) snapshot.reporterIds = doc.reporterIds;
    if (doc.noiDungDeXuat !== undefined) snapshot.noiDungDeXuat = doc.noiDungDeXuat;

    const newEvent: any = {
      id: Date.now().toString(),
      action,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentRole,
      targetRole,
      timestamp: new Date().toISOString(),
      note,
      previousState: snapshot
    };

    if (extraUpdates) {
      if (extraUpdates.targetUserIds) newEvent.targetUserIds = extraUpdates.targetUserIds;
      else if (extraUpdates.assigneeId) newEvent.targetUserIds = [extraUpdates.assigneeId];
      
      if (extraUpdates.targetDepartmentIds) newEvent.targetDepartmentIds = extraUpdates.targetDepartmentIds;
      
      if (extraUpdates.reporterIds) newEvent.reporterIds = extraUpdates.reporterIds;
      
      if (extraUpdates.noiDungDeXuat) newEvent.noiDungDeXuat = extraUpdates.noiDungDeXuat;
      if (extraUpdates.senderDepartmentId) newEvent.senderDepartmentId = extraUpdates.senderDepartmentId;
      if (extraUpdates.hanXuLy) newEvent.hanXuLy = extraUpdates.hanXuLy;
    }

    return [
      newEvent,
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
    
    let mergedUpdates = { ...extraUpdates };
    if (targetDept) {
       mergedUpdates.targetDepartmentIds = mergedUpdates.targetDepartmentIds || [targetDept];
    }

    const isTransfer = ['assign', 'submit', 'reject', 'approve', 'forward_info'].includes(action);
    const updatedData: any = {
      trangThai: newStatus || document.trangThai,
      assigneeRole: nextRole || document.assigneeRole,
      ...mergedUpdates,
      history: addHistory(document, action, note, nextRole, mergedUpdates)
    };

    if (isTransfer) {
      updatedData.readBy = [];
      if (mergedUpdates.assigneeId === undefined) {
        updatedData.assigneeId = deleteField();
      }
    }

    // Protect the original deadline from being overwritten by intermediate transfers
    if (mergedUpdates.hanXuLy && document.hanXuLy && action !== 'edit') {
       updatedData.hanXuLy = document.hanXuLy;
    }

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
    setAssignCrossModalVisible(false);
    setFinishCrossModalVisible(false);
    
    setAssignNote('');
    setAssignDeadline('');
    setRejectReason('');
    setSubmitResultText('');
    setApproveText('');
    setPublishDocNumber('');
    setPublishDate('');
    setSelectDeptNote('');
    setSelectDeptDeadline('');
    
    // Navigate home for some actions if needed, otherwise stay.
    // Currently, only submitLeader and assignCross explicitly navigate home.
    if (isTransfer && !['assign', 'forward_info'].includes(action)) {
      navigate('/', { replace: true });
    }
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
    const isTargetUserOrDept = document.targetDepartmentIds?.includes(currentUser.departmentId) || document.targetUserIds?.includes(currentUser.id);

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
    if (status === 'ld_b_reviewing' && currentRole === 'truong_ban' && isTargetUserOrDept) {
      return (
        <>
          <Button className="flex-1 !bg-red-500 text-white" onClick={() => setFinishCrossModalVisible(true)}>
            Kết thúc
          </Button>
          <Button className="flex-1 !bg-blue-600 text-white" onClick={() => setAssignCrossModalVisible(true)}>
            Phân công CV xử lý
          </Button>
        </>
      );
    }
    if (status === 'cv_b_processing' && currentRole === 'chuyen_vien' && isTargetUserOrDept) {
      return (
        <Button className="flex-1 !bg-blue-600 text-white" onClick={() => handleAction('submit', 'truong_ban', 'pending', { internalStatus: 'ld_b_returning' }, 'Đã xử lý xong, trình LĐ Ban trả kết quả')}>
          Trình LĐ Ban (Đã xử lý xong)
        </Button>
      );
    }
    if (status === 'ld_b_returning' && currentRole === 'truong_ban' && isTargetUserOrDept) {
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
    if (selectedTargets.length === 0) {
      alert("Vui lòng chọn ít nhất 1 Ban/Cá nhân nhận!");
      return;
    }
    const targetDeptIds = selectedTargets.filter(id => departments.some(d => d.id === id));
    const targetUserIds = selectedTargets.filter(id => userList.some(u => u.id === id));
    
    handleAction('submit', 'truong_ban', 'pending', { 
      internalStatus: 'ld_b_reviewing', 
      targetDepartmentIds: targetDeptIds,
      targetUserIds: targetUserIds,
      noiDungDeXuat: selectDeptNote || `Gửi văn bản liên thông`,
      senderDepartmentId: currentUser.departmentId,
      ...(selectDeptDeadline ? { hanXuLy: selectDeptDeadline } : {})
    }, selectDeptNote || `Gửi văn bản liên thông`, targetDeptIds[0]);
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
    const processor = userList.find(u => u.id === selectedMainProcessorId);
    const reporterNames = selectedReporterIds.map(id => userList.find(u => u.id === id)?.name).join(', ');
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

  const handleAssignCrossSubmit = () => {
    if (assignCrossUserIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 người xử lý!");
      return;
    }
    const assigneeNames = assignCrossUserIds.map(id => userList.find(u => u.id === id)?.name).join(', ');
    handleAction('assign', 'chuyen_vien', 'pending', { 
      internalStatus: 'cv_b_processing',
      targetUserIds: assignCrossUserIds
    }, assignCrossNote || `Phân công cho: ${assigneeNames}`);
  };

  const handleFinishCrossSubmit = () => {
    handleAction('approve', 'truong_ban', 'pending', { 
      internalStatus: 'ld_a_receiving' 
    }, finishCrossNote || 'Lãnh đạo trực tiếp xử lý và kết thúc');
  };

  const handleRecall = async () => {
    if (!id || !document) return;
    if (!window.confirm("Bạn có chắc chắn muốn thu hồi văn bản này?")) return;

    const lastHistory = document.history?.[0];
    if (!lastHistory || !lastHistory.previousState) return;

    const snapshot = lastHistory.previousState;
    const updatedData = {
      ...snapshot,
      history: addHistory(document, 'recall', 'Đã thu hồi văn bản')
    };

    try {
      await updateDoc(doc(db, "documents", id), updatedData);
    } catch (error) {
      console.error("Error recalling document:", error);
    }
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
            {(() => {
              const isRejected = document.history && document.history.length > 0 && document.history[0].action === 'reject';
              
              let isAssigned = false;
              if (document.trangThai === 'info') {
                if (!document.targetDepartmentIds || document.targetDepartmentIds.length === 0) isAssigned = true;
                else isAssigned = document.targetDepartmentIds.includes(currentUser.departmentId);
              } else if (document.assigneeRole === currentUser.role || document.assigneeRole === undefined) {
                let ignoreAssigneeId = false;
                if (document.documentType === 'internal_cross') {
                   if (['ld_b_reviewing', 'ld_a_receiving', 'cv_a_summarizing'].includes(document.internalStatus || '')) {
                     ignoreAssigneeId = true;
                   }
                }
                
                if (document.assigneeId && document.assigneeId !== currentUser.id && !ignoreAssigneeId) {
                  isAssigned = false;
                } else if (!document.documentType || document.documentType === 'external_in') {
                  isAssigned = true;
                } else {
                  const isSender = document.senderDepartmentId === currentUser.departmentId;
                  const isTarget = document.targetDepartmentIds?.includes(currentUser.departmentId) || document.targetUserIds?.includes(currentUser.id);
        
                  if (document.documentType === 'internal_submit') {
                    if (currentUser.role === 'giam_doc' || currentUser.role === 'van_thu') isAssigned = true;
                    else if (isSender) isAssigned = true;
                  } else if (document.documentType === 'internal_cross') {
                    const status = document.internalStatus;
                    if (['cv_a_created', 'ld_a_reviewing', 'ld_a_receiving', 'cv_a_summarizing'].includes(status || '')) {
                      isAssigned = isSender;
                    } else if (['ld_b_reviewing', 'cv_b_processing', 'ld_b_returning'].includes(status || '')) {
                      isAssigned = isTarget || false;
                    } else {
                      isAssigned = isSender || (isTarget || false);
                    }
                  }
                }
              }
              
              const hasParticipated = document.creatorId === currentUser.id || document.history?.some(h => 
                h.actorId === currentUser.id
              ) || false;
              
              const isProcessed = hasParticipated && !isAssigned;
              
              let currentClasses = statusColors[document.trangThai] || "bg-gray-100 text-gray-800";
              let currentStatusLabel = statusLabels[document.trangThai] || document.trangThai;
              
              if (isRejected && document.trangThai === 'warning') {
                currentClasses = "bg-red-100 text-red-600";
                currentStatusLabel = "Bị trả lại";
              }
              
              if (isProcessed) {
                currentClasses = "bg-green-100 text-green-600";
                currentStatusLabel = "Đã xử lý";
              }

              return (
                <Box className={`px-3 py-1 rounded-full ${currentClasses}`}>
                  <Text size="small" className="font-semibold">
                    {currentStatusLabel}
                  </Text>
                </Box>
              );
            })()}
          </Box>
        </Box>

        <Box className="bg-white p-4 rounded-xl shadow-sm mb-4">
          <Text className="font-bold text-base mb-3 border-b border-gray-100 pb-2">Thông tin xử lý</Text>
          
          {(() => {
            const relevantHistory = document.history?.find(h => h.actorId === currentUser.id && ['submit', 'assign', 'forward_info', 'create'].includes(h.action));
            const displayNoiDungDeXuat = relevantHistory?.noiDungDeXuat || document.noiDungDeXuat;
            const displaySender = relevantHistory?.senderDepartmentId ? departments.find(d => d.id === relevantHistory.senderDepartmentId)?.name : (document.senderDepartmentId ? departments.find(d => d.id === document.senderDepartmentId)?.name : document.donViBanHanh);
            const displayTargetIds = relevantHistory?.targetDepartmentIds || document.targetDepartmentIds;
            const displayHanXuLy = currentDeadline;

            return (
              <>
                {displayNoiDungDeXuat && (
                  <Box className="flex justify-between items-start mb-3">
                    <Text className="text-gray-500 mt-1">Nội dung đề xuất:</Text>
                    <Text className="text-gray-800 font-medium text-right max-w-[60%] italic">
                      "{displayNoiDungDeXuat}"
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
                    {displaySender}
                  </Text>
                </Box>
                {displayTargetIds && displayTargetIds.length > 0 && (
                  <Box className="flex justify-between items-start mb-3">
                    <Text className="text-gray-500 mt-1">Ban nhận:</Text>
                    <Text className="text-gray-800 font-medium text-right max-w-[50%]">
                      {displayTargetIds.map((id: string) => departments.find(d => d.id === id)?.name || id).join(', ')}
                    </Text>
                  </Box>
                )}

                {displayHanXuLy && (
                  <Box className="flex justify-between items-start mb-3">
                    <Text className="text-gray-500">Hạn xử lý:</Text>
                    <Text className="text-red-600 font-bold">{displayHanXuLy}</Text>
                  </Box>
                )}
              </>
            );
          })()}
          
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
                <TimelineItem key={h.id} h={h} getActionLabel={getActionLabel} userList={userList} />
              ))
            ) : (
              <Text className="text-gray-400 text-sm">Chưa có lịch sử</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Action Buttons */}
      {(() => {
        const lastHistory = document.history?.[0];
        const isSenderOfLastAction = lastHistory?.actorId === currentUser.id;
        const isLastActionTransfer = lastHistory && ['assign', 'submit', 'forward_info', 'approve'].includes(lastHistory.action);
        const isUnreadByOthers = !document.readBy || document.readBy.filter(uid => uid !== currentUser.id).length === 0;
        
        // Show recall if the user sent it. Disabled if someone else read it.
        const showRecall = isSenderOfLastAction && isLastActionTransfer && document.trangThai !== 'completed' && document.trangThai !== 'deleted';
        const recallDisabled = !isUnreadByOthers;
        
        const hasActions = (document.trangThai !== 'completed' && document.trangThai !== 'deleted' && document.trangThai !== 'info');
        
        if (!hasActions && !showRecall) return null;

        return (
          <Box className="absolute bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex space-x-2 z-50">
            {hasActions && !isInternal && renderExternalButtons()}
            {hasActions && document.documentType === 'internal_cross' && renderInternalCrossButtons()}
            {hasActions && document.documentType === 'internal_submit' && renderInternalSubmitButtons()}
            
            {showRecall && (
               <Button 
                 variant={recallDisabled ? "secondary" : "primary"} 
                 className={`flex-1 ${recallDisabled ? 'bg-gray-200 text-gray-500' : '!bg-red-500 text-white'}`} 
                 onClick={recallDisabled ? undefined : handleRecall}
                 disabled={recallDisabled}
               >
                 Thu hồi
               </Button>
            )}
          </Box>
        );
      })()}

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

      <Modal 
        visible={assignModalVisible} 
        title="Giao việc" 
        onClose={() => setAssignModalVisible(false)} 
        actions={[
          { text: "Hủy", close: true }, 
          { 
            text: "Xác nhận", 
            highLight: true, 
            onClick: () => {
              if (isDateOverdue(assignDeadline, currentDeadline)) return;
              handleAction('assign', assignTargetRole, undefined, assignDeadline ? { hanXuLy: assignDeadline } : {}, assignNote);
            } 
          }
        ]}
      >
        <Box className="p-4 space-y-4">
          <Select value={assignTargetRole} onChange={(v: any) => setAssignTargetRole(v as UserRole)}>
            <Select.Option value="truong_ban" title="Trưởng ban" />
            <Select.Option value="chuyen_vien" title="Chuyên viên" />
          </Select>
          <Input.TextArea placeholder="Ý kiến chỉ đạo..." value={assignNote} onChange={(e) => setAssignNote(e.target.value)} />
          <Box>
            <Text className="font-medium text-gray-700 mb-2 text-sm">Hạn xử lý (nếu có):</Text>
            <Input type={"date" as any} value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)} />
            {isDateOverdue(assignDeadline, currentDeadline) && (
              <Text className="text-red-500 text-xs mt-1 italic font-medium">Quá hạn so với yêu cầu (Gốc: {currentDeadline})</Text>
            )}
          </Box>
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
      <Modal 
        visible={selectDeptModalVisible} 
        title="Chọn nơi nhận" 
        onClose={() => setSelectDeptModalVisible(false)} 
        actions={[
          { text: "Hủy", close: true }, 
          { 
            text: "Gửi", 
            highLight: true, 
            onClick: () => {
              if (isDateOverdue(selectDeptDeadline, currentDeadline)) return;
              handleSelectDeptSubmit();
            }
          }
        ]}
      >
        <Box className="p-4">
          <Text className="mb-2 font-medium">Gửi văn bản đến:</Text>
          <Box 
            className="flex justify-between items-center p-3 border border-gray-300 rounded-lg bg-white mb-4"
            onClick={() => setShowTreePicker(true)}
          >
            <Text className={selectedTargets.length > 0 ? "text-gray-800" : "text-gray-400"}>
              {selectedTargets.length > 0 ? `Đã chọn ${selectedTargets.length} đơn vị/cá nhân` : 'Chọn đơn vị/cá nhân...'}
            </Text>
            <Box className="text-gray-500">▼</Box>
          </Box>
          <Box className="mt-4">
            <Text className="font-medium text-gray-700 mb-2">Nội dung gửi:</Text>
            <Input.TextArea 
              placeholder="Nhập nội dung gửi Ban khác..." 
              value={selectDeptNote} 
              onChange={(e) => setSelectDeptNote(e.target.value)} 
            />
          </Box>
          <Box className="mt-4">
            <Text className="font-medium text-gray-700 mb-2">Hạn xử lý mới (nếu có):</Text>
            <Input 
              type={"date" as any}
              value={selectDeptDeadline} 
              onChange={(e) => setSelectDeptDeadline(e.target.value)} 
            />
            {isDateOverdue(selectDeptDeadline, currentDeadline) && (
              <Text className="text-red-500 text-xs mt-1 italic font-medium">Quá hạn so với yêu cầu (Gốc: {currentDeadline})</Text>
            )}
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

      <Modal 
        visible={showTreePicker} 
        title="Chọn đơn vị / cá nhân"
        onClose={() => setShowTreePicker(false)}
        actions={[{ text: "Xác nhận", highLight: true, onClick: () => setShowTreePicker(false) }]}
      >
        <Box className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {departments.map(dept => {
             const deptUsers = userList.filter(u => u.departmentId === dept.id);
             const isExpanded = expandedDepts.includes(dept.id);
             const isDeptSelected = selectedTargets.includes(dept.id);
             
             return (
               <Box key={dept.id} className="border-b border-gray-100 pb-3">
                 <Box className="flex justify-between items-center">
                   <Checkbox 
                     label={dept.name}
                     value={dept.id}
                     checked={isDeptSelected}
                     onChange={(e) => {
                       const checked = e.target.checked;
                       const userIds = deptUsers.filter(u => u.id !== document.creatorId && u.id !== currentUser.id).map(u => u.id);
                       if (checked) {
                         setSelectedTargets(prev => Array.from(new Set([...prev, dept.id, ...userIds])));
                       } else {
                         setSelectedTargets(prev => prev.filter(id => id !== dept.id && !userIds.includes(id)));
                       }
                     }}
                   />
                   {deptUsers.length > 0 && (
                     <Box 
                       onClick={() => setExpandedDepts(prev => prev.includes(dept.id) ? prev.filter(id => id !== dept.id) : [...prev, dept.id])} 
                       className="p-2 bg-gray-50 rounded-full"
                     >
                       <Text className="text-xs text-gray-500">{isExpanded ? '▲' : '▼'}</Text>
                     </Box>
                   )}
                 </Box>
                 {isExpanded && (
                   <Box className="pl-6 mt-3 space-y-3 border-l-2 border-gray-100 ml-2">
                     {deptUsers.map(u => {
                       const isCreator = u.id === document.creatorId;
                       const isMe = u.id === currentUser.id;
                       const suffix = (isCreator && isMe) ? ' (Bạn - Người tạo)' : isCreator ? ' (Người tạo)' : isMe ? ' (Bạn)' : '';
                       const isDisabled = isCreator || isMe;
                       
                       return (
                         <Box key={u.id}>
                           <Checkbox
                             label={`${u.name} - ${u.jobTitle || 'Chuyên viên'}${suffix}`}
                             value={u.id}
                             checked={isDisabled || selectedTargets.includes(u.id)}
                             disabled={isDisabled}
                             onChange={(e) => {
                               if (e.target.checked) setSelectedTargets(prev => [...prev, u.id]);
                               else setSelectedTargets(prev => prev.filter(id => id !== u.id));
                             }}
                           />
                         </Box>
                       );
                     })}
                   </Box>
                 )}
               </Box>
             );
          })}
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

      <Modal visible={assignCrossModalVisible} title="Phân công xử lý" onClose={() => setAssignCrossModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Giao việc", highLight: true, onClick: handleAssignCrossSubmit }]}>
        <Box className="p-4 space-y-4">
          <Box>
            <Text className="mb-2 font-medium">Chọn người xử lý:</Text>
            <Box className="space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded bg-white">
              <Checkbox 
                label="Chọn tất cả"
                value="all"
                checked={assignCrossUserIds.length > 0 && assignCrossUserIds.length >= currentDeptMembers.filter(u => u.id !== document.creatorId && u.id !== currentUser.id).length}
                onChange={(e) => {
                  if (e.target.checked) setAssignCrossUserIds(currentDeptMembers.filter(u => u.id !== document.creatorId && u.id !== currentUser.id).map(u => u.id));
                  else setAssignCrossUserIds([]);
                }}
              />
              {currentDeptMembers.map(u => {
                const isCreator = u.id === document.creatorId;
                const isMe = u.id === currentUser.id;
                const suffix = (isCreator && isMe) ? ' (Bạn - Người tạo)' : isCreator ? ' (Người tạo)' : isMe ? ' (Bạn)' : '';
                const isDisabled = isCreator || isMe;
                
                return (
                  <Checkbox 
                    key={u.id}
                    label={`${u.name} - ${u.jobTitle || 'Chuyên viên'}${suffix}`}
                    value={u.id}
                    disabled={isDisabled}
                    checked={assignCrossUserIds.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) setAssignCrossUserIds([...assignCrossUserIds, u.id]);
                      else setAssignCrossUserIds(assignCrossUserIds.filter(id => id !== u.id));
                    }}
                  />
                );
              })}
            </Box>
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Nội dung chỉ đạo:</Text>
            <Input.TextArea placeholder="Nhập ý kiến..." value={assignCrossNote} onChange={(e) => setAssignCrossNote(e.target.value)} />
          </Box>
        </Box>
      </Modal>

      <Modal visible={finishCrossModalVisible} title="Kết thúc xử lý" onClose={() => setFinishCrossModalVisible(false)} actions={[{ text: "Hủy", close: true }, { text: "Xác nhận kết thúc", highLight: true, onClick: handleFinishCrossSubmit }]}>
        <Box className="p-4">
          <Text className="mb-2 font-medium">Kết quả xử lý:</Text>
          <Input.TextArea placeholder="Nhập kết quả xử lý để báo lại cho Ban gửi..." value={finishCrossNote} onChange={(e) => setFinishCrossNote(e.target.value)} />
        </Box>
      </Modal>

    </Page>
  );
};

export default DocumentDetail;
