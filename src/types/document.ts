export type DocumentStatus = 'pending' | 'warning' | 'waiting' | 'overdue' | 'completed' | 'deleted' | 'info';

export type UserRole = 'van_thu' | 'giam_doc' | 'truong_ban' | 'chuyen_vien' | 'admin';
export type DepartmentId = 'ban_giam_doc' | 'van_thu' | 'tchc' | 'khtc' | 'ptht' | 'htdv' | 'ksnb';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  jobTitle?: string;
  departmentId: DepartmentId;
}

export type DocumentType = 'external_in' | 'internal_cross' | 'internal_submit';

export interface DocumentHistory {
  id: string;
  action: 'create' | 'assign' | 'submit' | 'reject' | 'approve' | 'complete' | 'edit' | 'delete' | 'recall' | 'ask_opinion' | 'give_opinion' | 'forward_info';
  actorName: string;
  actorRole: UserRole;
  targetRole?: UserRole;
  timestamp: string; // ISO 8601
  note?: string;
  targetDepartmentId?: string;
  targetUserId?: string;
  assigneeId?: string;
  targetDepartmentIds?: string[];
  isReturn?: boolean;
  targetUserIds?: string[];
  reporterIds?: string[];
  actorId?: string;
  previousState?: any;
  noiDungDeXuat?: string;
  senderDepartmentId?: string;
  hanXuLy?: string;
}

export interface Document {
  id: string;
  creatorId?: string;
  creatorName?: string;
  documentType?: DocumentType;
  internalStatus?: string; // e.g. cv_a_created, ld_a_reviewing, ld_b_reviewing, etc.
  senderDepartmentId?: DepartmentId;
  targetDepartmentIds?: DepartmentId[]; // Can be multiple for "gửi để biết"
  targetUserIds?: string[];
  
  soCongVanDen: string;
  ngayCVD: string; // Ngày công văn đến (ISO 8601 YYYY-MM-DD)
  soKyHieu: string;
  trichYeu: string;
  donViBanHanh: string;
  ngayTrenVanBan: string; // Ngày ghi trên văn bản (ISO 8601 YYYY-MM-DD)
  hanXuLy?: string; // Hạn xử lý (ISO 8601 YYYY-MM-DD), optional
  trangThai: DocumentStatus;
  ghiChu?: string;
  noiDungDeXuat?: string;
  
  // Publish Fields
  soVanBanPhatHanh?: string;
  ngayPhatHanh?: string;
  
  // RBAC Fields
  assigneeRole?: UserRole; // Who is currently holding this document (for simple flows)
  assigneeId?: string; // Specific user holding the document (e.g. for Trình LĐ Ban)
  reporterIds?: string[]; // Users who receive this document as "Để báo cáo / Để biết"
  assigneeName?: string;
  assignees?: { role: UserRole, departmentId: DepartmentId, userId?: string }[]; // For complex multi-recipient flows
  history?: DocumentHistory[];
  createdAt?: string;
  readBy?: string[];
}
