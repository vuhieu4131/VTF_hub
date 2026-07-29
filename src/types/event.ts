export type EventType = 'announcement' | 'anniversary' | 'other';

export interface AgencyEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  creatorId: string;
  createdAt: string;
}

export type FeedbackStatus = 'new' | 'read' | 'resolved';

export interface Feedback {
  id: string;
  content: string;
  creatorId?: string; // Tùy chọn nếu muốn ẩn danh thì để trống
  creatorName?: string;
  status: FeedbackStatus;
  createdAt: string;
  adminNote?: string;
}
