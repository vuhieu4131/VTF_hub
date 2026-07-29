export interface CustomPermission {
  id: string; // e.g., 'schedule', 'events', or custom UUID
  name: string; // e.g., 'Quyền lên lịch', 'Quyền tạo sự kiện (Thông báo)'
  allowedUserIds: string[];
  isSystem?: boolean; // If true, cannot be deleted
}

export type DocumentStatus = 'pending' | 'warning' | 'waiting' | 'overdue' | 'completed' | 'deleted' | 'info';

export type UserRole = 'guest' | 'van_thu' | 'giam_doc' | 'pho_giam_doc' | 'truong_ban' | 'chuyen_vien' | 'admin';
export type DepartmentId = 'ban_giam_doc' | 'van_thu' | 'tchc' | 'khtc' | 'ptht' | 'htdv' | 'ksnb';
export type UserStatus = 'pending_approval' | 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role: UserRole;
  jobTitle?: string;
  departmentId: DepartmentId;
  
  // Auth and HR specific fields
  status?: UserStatus;
  profileId?: string; // Linked HR Profile ID
}

export interface UserProfile {
  id: string;
  employeeCode: string; // Mã viên chức
  fullName: string;
  dob: string; // Ngày sinh
  phone: string; // Định dạng 0xxx xxx xxx
  email: string; // @mst.gov.vn
  jobTitle: string; // Chức vụ
  professionalTitle: string; // Chức danh (CVCC, CVC)
  departmentId: DepartmentId;

  // Salary and extra income
  salaryCoefficient: number; // HSL
  nextSalaryRaiseDate: string; // Ngày lên lương (DD/MM/YYYY)
  salaryRaiseDecision: string; // Quyết định số
  
  extraIncomeCoefficient: number; // HSTNTT
  nextExtraIncomeRaiseDate: string; // Ngày lên bậc TNTT (DD/MM/YYYY)
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
