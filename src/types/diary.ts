export interface DailyLog {
  id: string; // Document ID: e.g. "userId_YYYY-MM-DD"
  userId: string;
  date: string; // Format: "YYYY-MM-DD"
  doneTasksText: string;
  doneTasksCount: number;
  plannedTasksText: string;
  plannedTasksCount: number;
  updatedAt: string;
}
