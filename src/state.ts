import { atom, selector } from "recoil";
import { getUserInfo } from "zmp-sdk";
import { Document, DocumentStatus, User, UserRole, DepartmentId } from "types/document";
import documents from "../mock/documents.json";

export const currentUserState = atom<User | null>({
  key: "currentUser",
  default: null,
});

export const userListState = atom<User[]>({
  key: "userList",
  default: [],
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
    
    if (!currentUser) return [];
    
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
      } else {
        if (!doc.documentType || doc.documentType === 'external_in') {
          isAssigned = true;
        } else {
          const history = doc.history || [];
          const latestRelevantEvent = history.find(h => {
             const isActor = h.actorId === currentUser.id;
             const isTargetUser = h.targetUserIds?.includes(currentUser.id) || h.reporterIds?.includes(currentUser.id);
             let isTargetDept = false;
             if (h.targetDepartmentIds?.includes(currentUser.departmentId)) {
                 if (h.targetRole) {
                    isTargetDept = h.targetRole === currentUser.role;
                 } else {
                    isTargetDept = true;
                 }
                 if (currentUser.role === 'truong_ban') isTargetDept = true;
             }
             return isActor || isTargetUser || isTargetDept;
          });

          if (latestRelevantEvent) {
             if (latestRelevantEvent.actorId === currentUser.id) {
                 const isAlsoTarget = (latestRelevantEvent.targetUserIds?.includes(currentUser.id)) || 
                                      (latestRelevantEvent.targetDepartmentIds?.includes(currentUser.departmentId) && 
                                       (latestRelevantEvent.targetRole === currentUser.role || currentUser.role === 'truong_ban'));
                 isAssigned = !!isAlsoTarget; 
             } else {
                 isAssigned = true;
             }
          } else {
             if (doc.documentType === 'internal_submit' && (currentUser.role === 'giam_doc' || currentUser.role === 'van_thu')) {
                 isAssigned = true;
             } else if (doc.creatorId === currentUser.id) {
                 isAssigned = doc.trangThai === 'pending' || doc.trangThai === 'waiting';
             } else {
                 isAssigned = false;
             }
          }
        }
      }

      const hasParticipated = doc.creatorId === currentUser.id || doc.history?.some(h => 
        h.actorId === currentUser.id
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

export interface UserStatisticsPermission {
  viewType: 'all' | 'departments' | 'users';
  allowedDepartmentIds?: string[];
  allowedUserIds?: string[];
}

export const statisticsPermissionsState = atom<Record<string, UserStatisticsPermission>>({
  key: "statisticsPermissions",
  default: {},
});

