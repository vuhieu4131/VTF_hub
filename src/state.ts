import { atom, selector } from "recoil";
import { getUserInfo } from "zmp-sdk";
import { Document, DocumentStatus, UserRole } from "types/document";
import documents from "../mock/documents.json";

export const currentUserRoleState = atom<UserRole>({
  key: "currentUserRole",
  default: "van_thu",
});

export const currentUserNameState = atom<string>({
  key: "currentUserName",
  default: "Nguyễn Văn Thư (Văn thư)",
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
  default: documents as Document[],
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
    const currentRole = get(currentUserRoleState);
    
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

      // RBAC filtering
      let matchRole = true;
      const isCurrentlyAssigned = doc.assigneeRole === currentRole || doc.assigneeRole === undefined;
      const hasParticipated = doc.history?.some(h => h.actorRole === currentRole);

      if (filter === 'processed') {
         matchRole = hasParticipated && !isCurrentlyAssigned;
      } else if (currentRole === 'truong_ban' || currentRole === 'chuyen_vien') {
         if (filter === 'all') {
            matchRole = isCurrentlyAssigned || hasParticipated;
         } else {
            matchRole = isCurrentlyAssigned;
         }
      }
      
      return matchStatus && matchKeyword && matchRole && notDeleted;
    });
  }
});
