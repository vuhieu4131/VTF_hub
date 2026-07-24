export type DocumentStatus = 'pending' | 'warning' | 'waiting' | 'overdue' | 'completed' | 'deleted';

export type UserRole = 'van_thu' | 'giam_doc' | 'truong_ban' | 'chuyen_vien';

export interface DocumentHistory {
  id: string;
  action: 'create' | 'assign' | 'submit' | 'reject' | 'approve' | 'complete' | 'edit' | 'delete' | 'recall' | 'ask_opinion' | 'give_opinion';
  actorName: string;
  actorRole: UserRole;
  targetRole?: UserRole;
  timestamp: string; // ISO 8601
  note?: string;
}

export interface Document {
  id: string;
  soCongVanDen: string;
  ngayCVD: string; // Ngày công văn đến (ISO 8601 YYYY-MM-DD)
  soKyHieu: string;
  trichYeu: string;
  donViBanHanh: string;
  ngayTrenVanBan: string; // Ngày ghi trên văn bản (ISO 8601 YYYY-MM-DD)
  hanXuLy?: string; // Hạn xử lý (ISO 8601 YYYY-MM-DD), optional
  trangThai: DocumentStatus;
  ghiChu?: string;
  
  // Publish Fields
  soVanBanPhatHanh?: string;
  ngayPhatHanh?: string;
  
  // Phase 2 RBAC Fields
  assigneeRole?: UserRole; // Who is currently holding this document
  assigneeName?: string;
  history?: DocumentHistory[];
}
