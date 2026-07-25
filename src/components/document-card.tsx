import React from "react";
import { Box, Text } from "zmp-ui";
import { Document } from "types/document";
import { useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../state";

interface DocumentCardProps {
  document: Document;
  currentTab?: string;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, currentTab }) => {
  const navigate = useNavigate();
  const currentUser = useRecoilValue(currentUserState);
  
  const statusColors: any = {
    pending: "text-orange-600",
    warning: "text-yellow-600",
    waiting: "text-purple-600",
    overdue: "text-red-600",
    completed: "text-green-600",
  };
  
  const statusBg: any = {
    pending: "bg-orange-100",
    warning: "bg-yellow-100",
    waiting: "bg-purple-100",
    overdue: "bg-red-100",
    completed: "bg-green-100",
  };

  const statusLabels: any = {
    pending: "Chờ xử lý",
    warning: "Sắp đến hạn",
    waiting: "Chờ ý kiến",
    overdue: "Trễ hạn",
    completed: "Hoàn thành",
  };

  const isRejected = document.history && document.history.length > 0 && document.history[0].action === 'reject';
  
  let isAssigned = false;
  if (currentUser) {
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
  }

  const hasParticipated = currentUser ? (document.creatorId === currentUser.id || document.history?.some(h => 
    h.actorId === currentUser.id
  ) || false) : false;

  const isProcessed = hasParticipated && !isAssigned;

  let currentStatusBg = isRejected && document.trangThai === 'warning' ? "bg-red-100" : statusBg[document.trangThai];
  let currentStatusColor = isRejected && document.trangThai === 'warning' ? "text-red-600" : statusColors[document.trangThai];
  let currentStatusLabel = isRejected && document.trangThai === 'warning' ? "Bị trả lại" : statusLabels[document.trangThai];

  if (isProcessed) {
    currentStatusBg = "bg-green-100";
    currentStatusColor = "text-green-600";
    currentStatusLabel = "Đã xử lý";
  }

  return (
    <Box 
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100 active:opacity-70"
      onClick={() => navigate(`/document-detail?id=${document.id}`)}
    >
      <Box className="flex justify-between items-start mb-2">
        <Text size="large" className="font-bold text-gray-800">
          {document.soKyHieu}
        </Text>
        <Box className={`px-2 py-1 rounded-full ${currentStatusBg}`}>
          <Text size="xSmall" className={`font-semibold ${currentStatusColor}`}>
            {currentStatusLabel}
          </Text>
        </Box>
      </Box>
      <Text className="text-gray-600 mb-2 line-clamp-2">
        {document.trichYeu}
      </Text>
      <Box className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
        <Text size="small" className="text-gray-500 font-medium truncate max-w-[30%]">
          STT: {document.soCongVanDen || '...'}
        </Text>
        <Text size="small" className="text-blue-600 font-medium truncate max-w-[35%] text-center">
          {document.assigneeRole === 'giam_doc' ? 'Giám đốc' : 
           document.assigneeRole === 'truong_ban' ? 'Trưởng ban' : 
           document.assigneeRole === 'chuyen_vien' ? 'Chuyên viên' : 'Văn thư'}
        </Text>
        <Text size="small" className="text-gray-500 font-medium truncate max-w-[35%] text-right">
          Hạn: {document.hanXuLy || 'Không'}
        </Text>
      </Box>
    </Box>
  );
};
