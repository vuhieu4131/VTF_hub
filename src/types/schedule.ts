export type ScheduleSession = 'Sáng' | 'Chiều' | 'Tối';
export type ScheduleType = 'agency' | 'department' | 'personal';

export interface ScheduleEvent {
  id: string;
  creatorId: string; // Người tạo
  date: string; // YYYY-MM-DD
  session: ScheduleSession;
  time: string; // VD: 08.00, 14.30
  title: string;
  content: string;
  location: string;
  participants: string; // Text list of participants or departments
  participantUserIds?: string[]; // Cho lịch cá nhân/phòng ban nếu cần gửi thông báo
  participantDepartmentIds?: string[];
  type: ScheduleType;
  notes?: string; // Ghi chú (VD: Xe biển số...)
  createdAt: string;
}
