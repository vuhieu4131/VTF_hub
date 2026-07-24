import React, { useMemo, useState } from "react";
import { Page, Box, Text, Header, Button, useNavigate, Modal, Select, Input } from "zmp-ui";
import { useRecoilState, useRecoilValue } from "recoil";
import { documentListState, currentUserRoleState, currentUserNameState } from "../state";
import { useSearchParams } from "react-router-dom";
import { DocumentStatus, UserRole } from "../types/document";

const DocumentDetail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [docs, setDocs] = useRecoilState(documentListState);
  const currentRole = useRecoilValue(currentUserRoleState);
  const currentUserName = useRecoilValue(currentUserNameState);
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

  const [opinionModalVisible, setOpinionModalVisible] = useState(false);
  const [opinionType, setOpinionType] = useState<'ask' | 'give'>('ask');
  const [opinionText, setOpinionText] = useState('');

  const [submitResultModalVisible, setSubmitResultModalVisible] = useState(false);
  const [submitResultText, setSubmitResultText] = useState('');
  const [submitTargetRole, setSubmitTargetRole] = useState<UserRole>('truong_ban');

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approveText, setApproveText] = useState('');

  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishDocNumber, setPublishDocNumber] = useState('');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [publishConfirmModalVisible, setPublishConfirmModalVisible] = useState(false);

  const document = useMemo(() => docs.find((d) => d.id === id), [docs, id]);

  // Sync edit form when document loads
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

  const addHistory = (doc: any, action: any, note?: string, targetRole?: UserRole) => {
    const history = doc.history || [];
    return [
      {
        id: Date.now().toString(),
        action,
        actorName: currentUserName,
        actorRole: currentRole,
        targetRole,
        timestamp: new Date().toISOString(),
        note
      },
      ...history
    ];
  };

  const handleAction = (action: string, nextRole?: UserRole, newStatus?: DocumentStatus, extraUpdates?: any, note?: string) => {
    setDocs(docs.map(doc => {
      if (doc.id === id) {
        return { 
          ...doc, 
          trangThai: newStatus || doc.trangThai,
          assigneeRole: nextRole || doc.assigneeRole,
          ...extraUpdates,
          history: addHistory(doc, action, note, nextRole)
        };
      }
      return doc;
    }));
    setAssignModalVisible(false);
    setEditModalVisible(false);
    setRejectModalVisible(false);
    setOpinionModalVisible(false);
    setSubmitResultModalVisible(false);
    setApproveModalVisible(false);
    setPublishModalVisible(false);
    setPublishConfirmModalVisible(false);
    setAssignNote('');
    setAssignDeadline('');
    setRejectReason('');
    setOpinionText('');
    setSubmitResultText('');
    setApproveText('');
    setPublishDocNumber('');
    setPublishDate('');
  };

  const handleRejectClick = () => {
    setRejectModalVisible(true);
  };

  const submitReject = () => {
    const previousRole = document.history?.find(h => h.actorRole !== currentRole)?.actorRole || 'van_thu';
    handleAction('reject', previousRole, 'warning', undefined, rejectReason);
  };

  const handleAskOpinionClick = () => {
    setOpinionType('ask');
    setOpinionModalVisible(true);
  };

  const handleGiveOpinionClick = () => {
    setOpinionType('give');
    setOpinionModalVisible(true);
  };

  const submitOpinion = () => {
    if (opinionType === 'ask') {
      handleAction('ask_opinion', 'truong_ban', 'waiting', undefined, opinionText);
    } else {
      const previousRole = document.history?.find(h => h.actorRole !== currentRole)?.actorRole || 'chuyen_vien';
      handleAction('give_opinion', previousRole, 'pending', undefined, opinionText);
    }
  };

  const handleSubmitResultClick = (target: UserRole) => {
    setSubmitTargetRole(target);
    setSubmitResultModalVisible(true);
  };

  const submitResult = () => {
    handleAction('submit', submitTargetRole, 'pending', undefined, submitResultText);
  };

  const handleApproveClick = () => {
    setApproveModalVisible(true);
  };

  const submitApprove = () => {
    handleAction('approve', 'van_thu', 'pending', undefined, approveText);
  };

  const submitPublish = () => {
    setPublishConfirmModalVisible(true);
  };

  const finalSubmitPublish = () => {
    handleAction('complete', 'van_thu', 'completed', { soVanBanPhatHanh: publishDocNumber, ngayPhatHanh: publishDate }, `Phát hành văn bản số: ${publishDocNumber}`);
    navigate('/', { replace: true });
  };

  const statusColors: any = {
    pending: "text-orange-600 bg-orange-100",
    warning: "text-yellow-600 bg-yellow-100",
    waiting: "text-purple-600 bg-purple-100",
    overdue: "text-red-600 bg-red-100",
    completed: "text-green-600 bg-green-100",
    deleted: "text-gray-600 bg-gray-200",
  };
  const statusLabels: any = {
    pending: "Chờ xử lý",
    warning: "Vướng mắc / Đến hạn",
    waiting: "Chờ ý kiến",
    overdue: "Trễ hạn",
    completed: "Hoàn thành",
    deleted: "Đã hủy bỏ / Thu hồi",
  };

  const renderActionButtons = () => {
    if (document.trangThai === 'deleted') return null;

    const isLastActor = document.history?.[0]?.actorRole === currentRole;
    const isAssignee = document.assigneeRole === currentRole;
    const isBrandNew = document.history?.length === 1;

    // Cho phép sửa nếu đang là người xử lý (Văn thư) hoặc Thu hồi rồi mới được sửa
    if (isAssignee && currentRole === 'van_thu' && document.trangThai !== 'completed') {
       // Optional: Add Edit button for assignee here if needed
    }

    if (isLastActor && !isAssignee && document.trangThai !== 'completed') {
      const isCreator = currentRole === 'van_thu' && isBrandNew;

      return (
        <>
          {isCreator && (
            <Button 
              variant="secondary"
              className="flex-1" 
              onClick={() => setEditModalVisible(true)}
            >
              Chỉnh sửa
            </Button>
          )}
          {isCreator ? (
            <Button 
              variant="secondary"
              className="flex-1 text-red-600 border border-red-200" 
              onClick={() => handleAction('delete', undefined, 'deleted')}
            >
              Xoá
            </Button>
          ) : (
            <Button 
              variant="secondary"
              className="flex-1 text-orange-600 border border-orange-200" 
              onClick={() => handleAction('recall', currentRole)}
            >
              Thu hồi
            </Button>
          )}
        </>
      );
    }

    if (!isAssignee) return null;

    switch (currentRole) {
      case 'van_thu':
        const isRejectedToVanThu = document.trangThai === 'warning';
        if (isRejectedToVanThu) {
          return (
            <>
              <Button 
                variant="secondary"
                className="flex-1" 
                onClick={() => setEditModalVisible(true)}
              >
                Chỉnh sửa
              </Button>
              <Button 
                className="flex-1 !bg-blue-600 text-white" 
                onClick={() => handleAction('submit', 'giam_doc', 'pending')}
              >
                Trình lại
              </Button>
            </>
          );
        }

        return (
          <>
            <Button 
              className="flex-1 !bg-green-600 text-white" 
              onClick={() => setPublishModalVisible(true)}
            >
              Phát hành & Đóng hồ sơ
            </Button>
          </>
        );
      case 'giam_doc':
        const mostRecentOtherActorGiamDoc = document.history?.find((h: any) => h.actorRole !== 'giam_doc')?.actorRole;
        const isFromBelow = mostRecentOtherActorGiamDoc === 'truong_ban' || mostRecentOtherActorGiamDoc === 'chuyen_vien';
        
        if (isFromBelow) {
          return (
            <>
              <Button 
                variant="secondary"
                className="flex-1 text-red-600 border border-red-200" 
                onClick={handleRejectClick}
              >
                Trả lại
              </Button>
              <Button 
                className="flex-1 !bg-blue-600 text-white" 
                onClick={handleApproveClick}
              >
                Ký duyệt
              </Button>
            </>
          );
        }

        return (
          <>
            <Button 
              variant="secondary"
              className="flex-1 text-red-600 border border-red-200" 
              onClick={handleRejectClick}
            >
              Trả lại
            </Button>
            <Button 
              variant="secondary"
              className="flex-1" 
              onClick={() => { setAssignTargetRole('truong_ban'); setAssignModalVisible(true); }}
            >
              Giao Ban
            </Button>
            <Button 
              className="flex-1 !bg-blue-600 text-white" 
              onClick={handleApproveClick}
            >
              Ký duyệt
            </Button>
          </>
        );
      case 'truong_ban':
        if (document.trangThai === 'waiting') {
          return (
            <Button 
              className="w-full !bg-purple-600 text-white" 
              onClick={handleGiveOpinionClick}
            >
              Phản hồi ý kiến
            </Button>
          );
        }

        const mostRecentOtherActor = document.history?.find((h: any) => h.actorRole !== 'truong_ban')?.actorRole;
        const isFromChuyenVien = mostRecentOtherActor === 'chuyen_vien';
        if (isFromChuyenVien) {
          return (
            <>
              <Button 
                variant="secondary"
                className="flex-1 text-red-600 border border-red-200" 
                onClick={handleRejectClick}
              >
                Trả lại
              </Button>
              <Button 
                className="flex-1 !bg-blue-600 text-white" 
                onClick={() => handleSubmitResultClick('giam_doc')}
              >
                Trình Lãnh đạo
              </Button>
            </>
          );
        }

        const firstSignificantActionTb = document.history?.find((h: any) => ['reject', 'submit', 'approve', 'complete', 'create'].includes(h.action));
        const isRejectedFlowTb = firstSignificantActionTb?.action === 'reject';

        return (
          <>
            <Button 
              variant="secondary"
              className="flex-1 text-red-600 border border-red-200" 
              onClick={handleRejectClick}
            >
              Trả lại
            </Button>
            <Button 
              variant="secondary"
              className="flex-1" 
              onClick={() => { setAssignTargetRole('chuyen_vien'); setAssignModalVisible(true); }}
            >
              {isRejectedFlowTb ? "Phân công lại" : "Phân công"}
            </Button>
            <Button 
              className="flex-1 !bg-blue-600 text-white" 
              onClick={() => handleSubmitResultClick('giam_doc')}
            >
              Trình Lãnh đạo
            </Button>
          </>
        );
      case 'chuyen_vien':
        return (
          <>
            <Button 
              variant="secondary"
              className="flex-1 text-purple-600 border border-purple-200" 
              onClick={handleAskOpinionClick}
            >
              Báo vướng mắc
            </Button>
            <Button 
              className="flex-1 !bg-blue-600 text-white" 
              onClick={() => handleSubmitResultClick('truong_ban')}
            >
              Trình kết quả
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  const getActionLabel = (h: any) => {
    const map: any = {
      create: "Tạo mới văn bản",
      assign: "Phân công xử lý",
      submit: "Trình duyệt kết quả",
      reject: "Chuyển trả lại",
      approve: "Đã duyệt",
      complete: "Đóng hồ sơ hoàn thành",
      edit: "Đã cập nhật (Sửa) thông tin",
      delete: "Đã hủy bỏ văn bản",
      recall: "Đã thu hồi văn bản",
      ask_opinion: "Báo vướng mắc / Xin ý kiến",
      give_opinion: "Cho ý kiến chỉ đạo"
    };
    let label = map[h.action] || h.action;

    if ((h.action === 'reject' || h.action === 'assign' || h.action === 'submit') && h.targetRole) {
      const roleNames = {
        'van_thu': 'Văn thư',
        'giam_doc': 'Giám đốc',
        'truong_ban': 'Trưởng ban',
        'chuyen_vien': 'Chuyên viên'
      };
      const roleName = roleNames[h.targetRole as keyof typeof roleNames];
      if (roleName) {
        if (h.action === 'submit') {
          label += ` lên ${roleName}`;
        } else {
          label += ` cho ${roleName}`;
        }
      }
    }

    return label;
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
            <Box className={`px-3 py-1 rounded-full ${statusColors[document.trangThai]}`}>
              <Text size="small" className="font-semibold">
                {statusLabels[document.trangThai]}
              </Text>
            </Box>
          </Box>
        </Box>

        <Box className="bg-white p-4 rounded-xl shadow-sm mb-4">
          <Text className="font-bold text-base mb-3 border-b border-gray-100 pb-2">Thông tin xử lý</Text>
          
          <Box className="flex justify-between items-start mb-3">
            <Text className="text-gray-500 mt-1">Số thứ tự:</Text>
            <Text className="text-gray-800 font-bold">{document.soCongVanDen || '...'}</Text>
          </Box>
          <Box className="flex justify-between items-start mb-3">
            <Text className="text-gray-500 mt-1">Ngày nhập:</Text>
            <Text className="text-gray-800 font-medium">{document.ngayCVD ? new Date(document.ngayCVD).toLocaleDateString('vi-VN') : '...'}</Text>
          </Box>
          <Box className="flex justify-between items-start mb-3">
            <Text className="text-gray-500 mt-1">Ngày trên văn bản:</Text>
            <Text className="text-gray-800 font-medium">{document.ngayTrenVanBan || '...'}</Text>
          </Box>
          <Box className="flex justify-between items-start mb-3">
            <Text className="text-gray-500 mt-1">Đơn vị ban hành:</Text>
            <Text className="text-gray-800 font-medium text-right max-w-[50%]">{document.donViBanHanh}</Text>
          </Box>
          <Box className="flex justify-between mb-3">
            <Text className="text-gray-500">Người đang xử lý:</Text>
            <Text className="text-blue-600 font-medium">
              {document.assigneeRole === 'giam_doc' ? 'Lãnh đạo cơ quan' :
               document.assigneeRole === 'truong_ban' ? 'Lãnh đạo Ban' :
               document.assigneeRole === 'chuyen_vien' ? 'Chuyên viên' : 'Văn thư'}
            </Text>
          </Box>
          {document.hanXuLy && (
            <Box className="flex justify-between items-start mb-3">
              <Text className="text-gray-500">Hạn xử lý:</Text>
              <Box className="text-right">
                <Text className="text-red-600 font-bold">{document.hanXuLy}</Text>
                {document.ngayCVD && new Date(document.hanXuLy) < new Date(document.ngayCVD) && (
                  <Text className="text-red-500 text-xs mt-1 italic">(Văn bản đến chậm)</Text>
                )}
              </Box>
            </Box>
          )}
          {document.trangThai === 'completed' && document.soVanBanPhatHanh && (
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
      <Box className="absolute bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex space-x-2 z-50">
        {renderActionButtons()}
      </Box>

      {/* Assign Modal */}
      <Modal
        visible={assignModalVisible}
        title="Giao việc"
        onClose={() => { setAssignModalVisible(false); setAssignNote(''); setAssignDeadline(''); }}
        actions={[
          { text: "Hủy", close: true },
          { text: "Xác nhận", highLight: true, onClick: () => {
            const extraUpdates = assignDeadline ? { hanXuLy: assignDeadline } : {};
            handleAction('assign', assignTargetRole, undefined, extraUpdates, assignNote);
          }}
        ]}
      >
        <Box className="p-4 space-y-4">
          <Box>
            <Text className="mb-2 font-medium">Chọn người nhận:</Text>
            <Select value={assignTargetRole} onChange={(v: any) => setAssignTargetRole(v as UserRole)}>
              <Select.Option value="truong_ban" title="Trưởng ban (Lãnh đạo Ban)" />
              <Select.Option value="chuyen_vien" title="Chuyên viên" />
            </Select>
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Ý kiến chỉ đạo</Text>
            <Input.TextArea 
              placeholder="Nhập nội dung chỉ đạo..."
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Thời hạn xử lý trước ngày</Text>
            <Input 
              type="date"
              value={assignDeadline}
              onChange={(e) => setAssignDeadline(e.target.value)}
            />
          </Box>
        </Box>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        title="Chỉnh sửa văn bản"
        onClose={() => setEditModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Lưu lại", highLight: true, onClick: () => handleAction('edit', undefined, undefined, { 
              soKyHieu: editForm.soKyHieu,
              donViBanHanh: editForm.donViBanHanh,
              ngayTrenVanBan: editForm.ngayTrenVanBan,
              trichYeu: editForm.trichYeu, 
              hanXuLy: editForm.hanXuLy 
            }) 
          }
        ]}
      >
        <Box className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <Box>
            <Text className="mb-2 font-medium">Số ký hiệu</Text>
            <Input 
              value={editForm.soKyHieu}
              onChange={(e) => setEditForm({...editForm, soKyHieu: e.target.value})}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Đơn vị ban hành</Text>
            <Input 
              value={editForm.donViBanHanh}
              onChange={(e) => setEditForm({...editForm, donViBanHanh: e.target.value})}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Ngày trên văn bản</Text>
            <Input 
              type="date"
              value={editForm.ngayTrenVanBan}
              onChange={(e) => setEditForm({...editForm, ngayTrenVanBan: e.target.value})}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Trích yếu</Text>
            <Input.TextArea 
              value={editForm.trichYeu}
              onChange={(e) => setEditForm({...editForm, trichYeu: e.target.value})}
            />
          </Box>
          <Box>
            <Text className="mb-2 font-medium">Hạn xử lý (nếu có)</Text>
            <Input 
              type="date"
              value={editForm.hanXuLy}
              onChange={(e) => setEditForm({...editForm, hanXuLy: e.target.value})}
            />
          </Box>
        </Box>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        title="Trả lại văn bản"
        onClose={() => { setRejectModalVisible(false); setRejectReason(''); }}
        actions={[
          { text: "Hủy", close: true },
          { text: "Xác nhận", highLight: true, onClick: submitReject }
        ]}
      >
        <Box className="p-4">
          <Text className="mb-2 font-medium">Lý do trả lại:</Text>
          <Input.TextArea 
            placeholder="Nhập lý do tại sao hồ sơ không đạt yêu cầu..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Box>
      </Modal>

      {/* Opinion Modal */}
      <Modal
        visible={opinionModalVisible}
        title={opinionType === 'ask' ? "Báo vướng mắc / Xin ý kiến" : "Phản hồi ý kiến"}
        onClose={() => { setOpinionModalVisible(false); setOpinionText(''); }}
        actions={[
          { text: "Hủy", close: true },
          { text: "Gửi", highLight: true, onClick: submitOpinion }
        ]}
      >
        <Box className="p-4">
          <Text className="mb-2 font-medium">Nội dung chi tiết:</Text>
          <Input.TextArea 
            placeholder="Nhập nội dung ý kiến..."
            value={opinionText}
            onChange={(e) => setOpinionText(e.target.value)}
          />
        </Box>
      </Modal>

      {/* Submit Result Modal */}
      <Modal
        visible={submitResultModalVisible}
        title="Trình kết quả xử lý"
        onClose={() => { setSubmitResultModalVisible(false); setSubmitResultText(''); }}
        actions={[
          { text: "Hủy", close: true },
          { text: "Xác nhận", highLight: true, onClick: submitResult }
        ]}
      >
        <Box className="p-4">
          <Text className="mb-2 font-medium">Kết quả thực hiện:</Text>
          <Input.TextArea 
            placeholder="Nhập nội dung báo cáo kết quả..."
            value={submitResultText}
            onChange={(e) => setSubmitResultText(e.target.value)}
          />
        </Box>
      </Modal>

      {/* Approve Modal */}
      <Modal
        visible={approveModalVisible}
        title="Ký duyệt & Chỉ đạo"
        onClose={() => { setApproveModalVisible(false); setApproveText(''); }}
        actions={[
          { text: "Hủy", close: true },
          { text: "Xác nhận", highLight: true, onClick: submitApprove }
        ]}
      >
        <Box className="p-4">
          <Text className="mb-2 font-medium">Ý kiến chỉ đạo:</Text>
          <Input.TextArea 
            placeholder="Nhập nội dung chỉ đạo thêm (nếu có)..."
            value={approveText}
            onChange={(e) => setApproveText(e.target.value)}
          />
        </Box>
      </Modal>

      {/* Publish Modal */}
      <Modal
        visible={publishModalVisible}
        title="Phát hành văn bản"
        onClose={() => { setPublishModalVisible(false); setPublishDocNumber(''); setPublishDate(new Date().toISOString().split('T')[0]); }}
        actions={[
          { text: "Hủy", close: true },
          { text: "Phát hành", highLight: true, onClick: submitPublish }
        ]}
      >
        <Box className="p-4">
          <Text className="mb-2 font-medium">Số văn bản phát hành:</Text>
          <Input 
            className="mb-4"
            placeholder="Ví dụ: 123/QĐ-UBND"
            value={publishDocNumber}
            onChange={(e) => setPublishDocNumber(e.target.value)}
          />
          <Text className="mb-2 font-medium">Ngày phát hành:</Text>
          <Input 
            type="date"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
          />
        </Box>
      </Modal>

      {/* Publish Confirm Modal */}
      <Modal
        visible={publishConfirmModalVisible}
        title="Xác nhận đóng hồ sơ"
        onClose={() => setPublishConfirmModalVisible(false)}
        actions={[
          { text: "Hủy", close: true },
          { text: "Xác nhận Đóng hồ sơ", highLight: true, onClick: finalSubmitPublish }
        ]}
      >
        <Box className="p-4 text-center">
          <Text className="text-gray-700">
            Bạn có chắc chắn muốn phát hành văn bản này và đóng hồ sơ không? Hành động này không thể hoàn tác.
          </Text>
        </Box>
      </Modal>
    </Page>
  );
};

export default DocumentDetail;
