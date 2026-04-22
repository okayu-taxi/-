export type WashType = 'basic' | 'premium' | 'full';
export type WashStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Vehicle {
  id: string;
  plateNumber: string;
  driverName: string;
  vehicleModel: string;
  lastWashedAt: string | null;
  createdAt: string;
}

export interface WashRecord {
  id: string;
  vehicleId: string;
  washType: WashType;
  status: WashStatus;
  scheduledAt: string;
  completedAt: string | null;
  notes: string;
  cost: number;
  createdAt: string;
}

export const WASH_TYPE_LABELS: Record<WashType, string> = {
  basic: '基本洗車',
  premium: 'プレミアム洗車',
  full: 'フルコース洗車',
};

export const WASH_TYPE_COSTS: Record<WashType, number> = {
  basic: 800,
  premium: 1500,
  full: 2500,
};

export const WASH_STATUS_LABELS: Record<WashStatus, string> = {
  pending: '待機中',
  in_progress: '洗車中',
  completed: '完了',
  cancelled: 'キャンセル',
};

export const WASH_STATUS_COLORS: Record<WashStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};
