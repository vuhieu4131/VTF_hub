import { User, DepartmentId } from "../types/document";

export const mockUsers: User[] = [
  // Văn thư
  { id: "vt_1", name: "Văn thư 1", role: "van_thu", departmentId: "van_thu" },
  { id: "vt_2", name: "Văn thư 2", role: "van_thu", departmentId: "van_thu" },
  // Ban Giám đốc
  { id: "gd_1", name: "Giám đốc", role: "giam_doc", departmentId: "ban_giam_doc" },
  { id: "gd_2", name: "Phó Giám đốc 1", role: "giam_doc", departmentId: "ban_giam_doc" },
  { id: "gd_3", name: "Phó Giám đốc 2", role: "giam_doc", departmentId: "ban_giam_doc" },
  { id: "gd_4", name: "Phó Giám đốc 3", role: "giam_doc", departmentId: "ban_giam_doc" },
  // Ban 1
  { id: "b1_tb", name: "Trưởng ban 1", role: "truong_ban", departmentId: "ban_1" },
  { id: "b1_pb1", name: "Phó ban 1 (Ban 1)", role: "truong_ban", departmentId: "ban_1" },
  { id: "b1_cv1", name: "Chuyên viên 1 (Ban 1)", role: "chuyen_vien", departmentId: "ban_1" },
  { id: "b1_cv2", name: "Chuyên viên 2 (Ban 1)", role: "chuyen_vien", departmentId: "ban_1" },
  // Ban 2
  { id: "b2_tb", name: "Trưởng ban 2", role: "truong_ban", departmentId: "ban_2" },
  { id: "b2_pb1", name: "Phó ban 1 (Ban 2)", role: "truong_ban", departmentId: "ban_2" },
  { id: "b2_cv1", name: "Chuyên viên 1 (Ban 2)", role: "chuyen_vien", departmentId: "ban_2" },
  // Ban 3
  { id: "b3_tb", name: "Trưởng ban 3", role: "truong_ban", departmentId: "ban_3" },
  { id: "b3_cv1", name: "Chuyên viên 1 (Ban 3)", role: "chuyen_vien", departmentId: "ban_3" },
];

export const departments: { id: DepartmentId; name: string }[] = [
  { id: "van_thu", name: "Phòng Văn thư" },
  { id: "ban_giam_doc", name: "Ban Giám đốc" },
  { id: "ban_1", name: "Ban 1" },
  { id: "ban_2", name: "Ban 2" },
  { id: "ban_3", name: "Ban 3" },
  { id: "ban_4", name: "Ban 4" },
  { id: "ban_5", name: "Ban 5" },
];
