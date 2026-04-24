export interface Vehicle {
  id: string;
  plateNumber: string;
  customerName: string;
  returnTime: string | null; // "HH:MM"
  washDates: string[]; // "YYYY-MM-DD"
  createdAt: string;
}

export type AlertLevel = 'none' | 'yellow' | 'red';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 締日は毎月15日。当期（16日〜翌15日）に洗車未予約なら yellow、14日でも未予約なら red */
export function getAlertLevel(vehicle: Vehicle, today: Date = new Date()): AlertLevel {
  const day = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();

  let periodStart: Date;
  let periodEnd: Date;

  if (day > 15) {
    periodStart = new Date(year, month, 16);
    periodEnd = new Date(year, month + 1, 15);
  } else {
    periodStart = new Date(year, month - 1, 16);
    periodEnd = new Date(year, month, 15);
  }

  const ps = toDateStr(periodStart);
  const pe = toDateStr(periodEnd);
  const hasWash = vehicle.washDates.some((d) => d >= ps && d <= pe);

  if (hasWash) return 'none';
  if (day === 14) return 'red';
  return 'yellow';
}

export const ALERT_COLORS: Record<AlertLevel, string> = {
  none: 'text-black',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
};
