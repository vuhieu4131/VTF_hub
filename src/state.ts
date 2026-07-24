import { atom, selector } from "recoil";
import { getUserInfo } from "zmp-sdk";
import { Document, DocumentStatus, User, UserRole, DepartmentId } from "types/document";
import documents from "../mock/documents.json";

export const currentUserState = atom<User>({
  key: "currentUser",
  default: {
    id: "vt_1",
    name: "Nguyễn Văn Thư 1",
    role: "van_thu",
    departmentId: "van_thu"
  },
});

export const userState = selector({
  key: "user",
  get: async () => {
    try {
      const { userInfo } = await getUserInfo({ autoRequestPermission: true });
      return userInfo;
    } catch (e) {
      return { id: "1", name: "Guest", avatar: "" };
    }
  },
});

export const documentListState = atom<Document[]>({
  key: "documentList",
  default: [],
});

export const keywordState = atom({
  key: "keyword",
  default: "",
});

export type FilterStatus = 'all' | 'processed' | DocumentStatus;
export const filterStatusState = atom<FilterStatus>({
  key: "filterStatus",
  default: 'all',
});

export const showRejectedOnlyState = atom<boolean>({
  key: "showRejectedOnly",
  default: false,
});

export const filteredDocumentListState = selector<Document[]>({
  key: "filteredDocumentList",
  get: ({ get }) => {
    const keyword = get(keywordState).toLowerCase();
    const filter = get(filterStatusState);
    const showRejectedOnly = get(showRejectedOnlyState);
    const docs = get(documentListState);
    const currentUser = get(currentUserState);
    
    return docs.filter(doc => {
      if (showRejectedOnly) {
        const isRejected = doc.history && doc.history.length > 0 && doc.history[0].action === 'reject';
        if (!isRejected) return false;
      }

      const matchStatus = filter === 'all' || 
                          filter === 'processed' ||
                          doc.trangThai === filter || 
                          (filter === 'warning' && doc.trangThai === 'waiting');
      const matchKeyword = doc.soKyHieu.toLowerCase().includes(keyword) || 
                           doc.trichYeu.toLowerCase().includes(keyword);
      
      const notDeleted = doc.trangThai !== 'deleted';

      // Advanced RBAC filtering
      let isAssigned = false;
      
      if (doc.trangThai === 'info') {
        // Broadcast info document
        if (!doc.targetDepartmentIds || doc.targetDepartmentIds.length === 0) {
          isAssigned = true;
        } else {
          isAssigned = doc.targetDepartmentIds.includes(currentUser.departmentId);
        }
      } else if (doc.assigneeRole === currentUser.role || doc.assigneeRole === undefined) {
        if (doc.assigneeId && doc.assigneeId !== currentUser.id) {
          isAssigned = false;
        } else if (!doc.documentType || doc.documentType === 'external_in') {
          isAssigned = true;
        } else {
          const isSender = doc.senderDepartmentId === currentUser.departmentId;
          const isTarget = doc.targetDepartmentIds?.includes(currentUser.departmentId);

          if (doc.documentType === 'internal_submit') {
            if (currentUser.role === 'giam_doc' || currentUser.role === 'van_thu') isAssigned = true;
            else if (isSender) isAssigned = true;
          } else if (doc.documentType === 'internal_cross') {
            const status = doc.internalStatus;
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

      const hasParticipated = doc.history?.some(h => 
        (h.actorRole === currentUser.role && 
        (!h.targetDepartmentId || h.targetDepartmentId === currentUser.departmentId)) ||
        (h.targetUserId === currentUser.id) ||
        (doc.reporterIds && doc.reporterIds.includes(currentUser.id))
      ) || false;

      let matchRole = false;
      if (filter === 'processed') {
         matchRole = hasParticipated && !isAssigned;
      } else if (filter === 'all') {
         matchRole = isAssigned || hasParticipated;
      } else {
         matchRole = isAssigned;
      }
      
      return matchStatus && matchKeyword && matchRole && notDeleted;
    });
  }
});
