import React from "react";
import { Box, Text } from "zmp-ui";
import { Document } from "types/document";
import { useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../state";
import { getBranchStatus } from "../utils/workflow";

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
    } else {
      const isTargetUser = (document.targetUserIds && document.targetUserIds.includes(currentUser.id)) || (document.reporterIds && document.reporterIds.includes(currentUser.id));
      const isTargetDept = document.targetDepartmentIds && document.targetDepartmentIds.includes(currentUser.departmentId);
      
      let expectedRole = document.assigneeRole;
      if (document.documentType === 'internal_cross' && document.history) {
         const relevantEvent = document.history.find(h => 
           h.targetUserIds?.includes(currentUser.id) || 
           (h.targetDepartmentIds && h.targetDepartmentIds.includes(currentUser.departmentId))
         );
         if (relevantEvent && relevantEvent.targetRole) {
           expectedRole = relevantEvent.targetRole;
         }
      }
      
      if (expectedRole === currentUser.role || expectedRole === undefined || isTargetUser || (isTargetDept && currentUser.role === 'truong_ban')) {
      let ignoreAssigneeId = false;
      if (document.documentType === 'internal_cross') {
         if (['ld_b_reviewing', 'cv_b_processing', 'ld_a_receiving', 'cv_a_summarizing'].includes(document.internalStatus || '')) {
           ignoreAssigneeId = true;
         }
      }
      
      const isExplicitlyTargeted = (document.targetUserIds && document.targetUserIds.includes(currentUser.id)) || (document.reporterIds && document.reporterIds.includes(currentUser.id));
      if (document.assigneeId && document.assigneeId !== currentUser.id && !ignoreAssigneeId && !isExplicitlyTargeted) {
        isAssigned = false;
      } else if (!document.documentType || document.documentType === 'external_in') {
        isAssigned = true;
      } else {
        const isSender = document.senderDepartmentId === currentUser.departmentId;
        const isTarget = document.targetDepartmentIds?.includes(currentUser.departmentId) || document.targetUserIds?.includes(currentUser.id) || document.reporterIds?.includes(currentUser.id);

        if (document.documentType === 'internal_submit') {
          if (currentUser.role === 'giam_doc' || currentUser.role === 'van_thu') isAssigned = true;
          else if (isSender) isAssigned = true;
        } else if (document.documentType === 'internal_cross') {
          const status = document.internalStatus;
          if (['cv_a_created', 'ld_a_reviewing'].includes(status || '')) {
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
  }

  const hasParticipated = currentUser ? (document.creatorId === currentUser.id || document.history?.some(h => 
    h.actorId === currentUser.id
  ) || false) : false;

  const branchStatus = currentUser ? getBranchStatus(document, currentUser.id, currentUser.departmentId) : 'processing';
  if (branchStatus === 'completed') {
    isAssigned = false;
  }

  const isProcessed = hasParticipated && !isAssigned;

  let currentStatusBg = "bg-orange-100";
  let currentStatusColor = "text-orange-600";
  let currentStatusLabel = "Đang xử lý";

  if (isRejected && document.trangThai === 'warning') {
    currentStatusBg = "bg-red-100";
    currentStatusColor = "text-red-600";
    currentStatusLabel = "Bị trả lại";
  } else if (currentUser && hasParticipated) {
    if (branchStatus === 'completed') {
      currentStatusLabel = 'Đã hoàn thành';
      currentStatusBg = 'bg-green-100';
      currentStatusColor = 'text-green-600';
      
      const targetedHistory = document.history?.find(h => 
        (h.targetUserIds?.includes(currentUser.id) || h.assigneeId === currentUser.id || h.reporterIds?.includes(currentUser.id)) && 
        ['assign', 'submit', 'forward_info'].includes(h.action)
      );
      const personalDeadline = targetedHistory?.hanXuLy || document.hanXuLy;
      const completionEvent = document.history?.find(h => 
         h.actorId === currentUser.id && 
         (['approve', 'reject', 'complete'].includes(h.action) || (h.action === 'submit' && h.isReturn))
      );
      
      if (personalDeadline && completionEvent) {
        const deadlineDate = new Date(personalDeadline).setHours(23, 59, 59, 999);
        const completionDate = new Date(completionEvent.timestamp).getTime();
        
        if (completionDate > deadlineDate) {
          currentStatusLabel += " (Quá hạn)";
          currentStatusBg = "bg-red-100";
          currentStatusColor = "text-red-600";
        } else if (completionDate < new Date(personalDeadline).setHours(0, 0, 0, 0)) {
          currentStatusLabel += " (Trước hạn)";
        } else {
          currentStatusLabel += " (Đúng hạn)";
        }
      }
    } else if (branchStatus === 'waiting_reply') {
      currentStatusLabel = 'Đã hoàn thành (Chờ trả lời)';
      currentStatusBg = 'bg-blue-100';
      currentStatusColor = 'text-blue-600';
    } else {
      currentStatusLabel = isAssigned ? 'Chờ xử lý' : 'Đang xử lý';
      currentStatusBg = 'bg-orange-100';
      currentStatusColor = 'text-orange-600';
      
      // If it's pending and overdue for them personally
      const targetedHistory = document.history?.find(h => 
        (h.targetUserIds?.includes(currentUser.id) || h.assigneeId === currentUser.id || h.reporterIds?.includes(currentUser.id)) && 
        ['assign', 'submit', 'forward_info'].includes(h.action)
      );
      const personalDeadline = targetedHistory?.hanXuLy || document.hanXuLy;
      if (personalDeadline) {
        const deadlineDate = new Date(personalDeadline).setHours(23, 59, 59, 999);
        if (Date.now() > deadlineDate) {
          currentStatusLabel += " (Quá hạn)";
          currentStatusBg = "bg-red-100";
          currentStatusColor = "text-red-600";
        }
      }
    }
  } else {
    // For observers who haven't participated, show global status
    if (document.trangThai === 'completed') {
      currentStatusBg = "bg-green-100";
      currentStatusColor = "text-green-600";
      currentStatusLabel = "Hoàn tất luân chuyển";
    }
  }

  const isUnread = currentUser && (!document.readBy || !document.readBy.includes(currentUser.id));

  return (
    <Box 
      className={`bg-white rounded-xl p-4 mb-3 shadow-sm border ${isUnread ? 'border-red-200' : 'border-gray-100'} active:opacity-70`}
      onClick={() => navigate(`/document-detail?id=${document.id}`)}
    >
      <Box className="flex justify-between items-start mb-2 relative">
        <Text size="large" className={`font-bold text-gray-800 ${isUnread ? 'pr-2' : ''}`}>
          {isUnread && (
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
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
