import { DepartmentId } from "../types/document";

export const departments: { id: DepartmentId; name: string }[] = [
  { id: 'ban_giam_doc', name: 'Ban Giám đốc' },
  { id: 'van_thu', name: 'Văn thư' },
  { id: 'tchc', name: 'Ban Tổ chức Hành chính' },
  { id: 'khtc', name: 'Ban Kế hoạch Tài chính' },
  { id: 'ptht', name: 'Ban Phát triển hạ tầng' },
  { id: 'htdv', name: 'Ban Hỗ trợ dịch vụ' },
  { id: 'ksnb', name: 'Ban Kiểm soát nội bộ' },
];
