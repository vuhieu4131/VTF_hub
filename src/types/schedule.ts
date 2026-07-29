export type ScheduleSession = 'Sáng' | 'Chiều' | 'Tối' | 'Cả ngày';
export type ScheduleType = 'agency' | 'department' | 'personal' | 'leave';

export interface ScheduleEvent {
  id: string;
  creatorId: string; // Người tạo
  date: string; // YYYY-MM-DD
  endDate?: string; // Tùy chọn: Từ ngày đến ngày
  session: ScheduleSession;
  time: string; // VD: 08.00, 14.30
  title: string;
  content: string;
  location: string;
  participants: string; // Text list of participants or departments
  participantUserIds?: string[]; // Cho lịch cá nhân/phòng ban nếu cần gửi thông báo
  participantDepartmentIds?: string[];
  type: ScheduleType;
  status?: 'pending' | 'approved' | 'rejected'; // Trạng thái phê duyệt (dành cho đề nghị lịch)
  notes?: string; // Ghi chú (VD: Xe biển số...)
  createdAt: string;
}
