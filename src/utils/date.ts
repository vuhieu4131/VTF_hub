function areSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return areSameDay(date, today);
}

export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return areSameDay(date, tomorrow);
}

export function displayTime(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}h${minutes}`;
}

export function displayHalfAnHourTimeRange(date: Date) {
  const endTime = new Date(date);
  endTime.setMinutes(endTime.getMinutes() + 30);
  return `${displayTime(date)} - ${displayTime(endTime)}`;
}

export function displayDate(date: Date, hint?: boolean) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString();
  if (hint && isToday(date)) {
    return `Hôm nay - ${day}/${month}/${year}`;
  }
  if (hint && isTomorrow(date)) {
    return `Ngày mai - ${day}/${month}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

export function checkNextSalaryRaise(baseDateStr: string, titleCode: string, targetMonth: number, targetYear: number) {
  if (!baseDateStr) return { isMatch: false };
  let bYear = -1, bMonth = -1, bDay = -1;
  
  if (baseDateStr.includes('-')) {
     const parts = baseDateStr.split('-');
     if (parts.length === 3) { bYear = parseInt(parts[0]); bMonth = parseInt(parts[1]) - 1; bDay = parseInt(parts[2]); }
  } else if (baseDateStr.includes('/')) {
     const parts = baseDateStr.split('/');
     if (parts.length === 3) { bDay = parseInt(parts[0]); bMonth = parseInt(parts[1]) - 1; bYear = parseInt(parts[2]); }
  }
  
  if (bYear === -1 || isNaN(bYear)) return { isMatch: false };

  let yearsToAdd = 3; // Mặc định là 3 năm
  const code = (titleCode || "").trim().toUpperCase();
  if (["CV", "CVC", "CVCC", "CHUYÊN VIÊN", "CHUYÊN VIÊN CHÍNH", "CHUYÊN VIÊN CAO CẤP"].includes(code)) {
      yearsToAdd = 3;
  } else if (["NV", "TQ", "NHÂN VIÊN", "THỦ QUỸ"].includes(code)) {
      yearsToAdd = 2;
  } else if (["TN", "TẬP SỰ", "THỰC TẬP SINH"].includes(code)) {
      yearsToAdd = 1;
  }
  
  const nextYear = bYear + yearsToAdd;
  const isMatch = (nextYear === targetYear && bMonth === targetMonth);
  
  const dStr = bDay.toString().padStart(2, '0');
  const mStr = (bMonth + 1).toString().padStart(2, '0');
  const nextDateStr = `${dStr}/${mStr}/${nextYear}`;

  return { isMatch, nextDateStr, bDay };
}

export function checkNextExtraIncomeRaise(baseDateStr: string, jobTitleCode: string | undefined, targetMonth: number, targetYear: number) {
  if (!baseDateStr) return { isMatch: false };
  let bYear = -1, bMonth = -1, bDay = -1;
  
  if (baseDateStr.includes('-')) {
     const parts = baseDateStr.split('-');
     if (parts.length === 3) { bYear = parseInt(parts[0]); bMonth = parseInt(parts[1]) - 1; bDay = parseInt(parts[2]); }
  } else if (baseDateStr.includes('/')) {
     const parts = baseDateStr.split('/');
     if (parts.length === 3) { bDay = parseInt(parts[0]); bMonth = parseInt(parts[1]) - 1; bYear = parseInt(parts[2]); }
  }
  
  if (bYear === -1 || isNaN(bYear)) return { isMatch: false };

  let yearsToAdd = 0;
  const code = (jobTitleCode || "").trim().toUpperCase();
  if (["GD", "PGD", "TB", "PB"].includes(code)) {
      yearsToAdd = 5;
  } else if (["CV", "CV0", "LX"].includes(code)) {
      yearsToAdd = 3;
  } else {
      // Mặc định hoặc mã khác
      yearsToAdd = 3;
  }
  
  const nextYear = bYear + yearsToAdd;
  const isMatch = (nextYear === targetYear && bMonth === targetMonth);
  
  const dStr = bDay.toString().padStart(2, '0');
  const mStr = (bMonth + 1).toString().padStart(2, '0');
  const nextDateStr = `${dStr}/${mStr}/${nextYear}`;

  return { isMatch, nextDateStr, bDay };
}
