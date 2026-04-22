import { type Vehicle, type WashRecord, WASH_STATUS_LABELS, WASH_STATUS_COLORS, WASH_TYPE_LABELS } from '../types';

interface Props {
  vehicles: Vehicle[];
  records: WashRecord[];
  onUpdateStatus: (id: string, status: WashRecord['status']) => void;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function Dashboard({ vehicles, records, onUpdateStatus }: Props) {
  const today = new Date().toDateString();
  const todayRecords = records.filter((r) => new Date(r.scheduledAt).toDateString() === today);
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const inProgressCount = records.filter((r) => r.status === 'in_progress').length;
  const completedToday = todayRecords.filter((r) => r.status === 'completed').length;
  const todayRevenue = todayRecords
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.cost, 0);

  const activeRecords = records
    .filter((r) => r.status === 'pending' || r.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const getVehicle = (id: string) => vehicles.find((v) => v.id === id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">今日の概要</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="登録車両数" value={vehicles.length} sub="台" />
          <StatCard label="本日完了" value={completedToday} sub="件" />
          <StatCard label="待機中" value={pendingCount} sub="件" />
          <StatCard label="本日売上" value={`¥${todayRevenue.toLocaleString()}`} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">作業中・待機中</h2>
        {activeRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            現在作業中・待機中の洗車はありません
          </div>
        ) : (
          <div className="space-y-3">
            {activeRecords.map((record) => {
              const vehicle = getVehicle(record.vehicleId);
              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-2xl">🚕</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {vehicle?.plateNumber ?? '不明'} - {vehicle?.driverName ?? ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        {WASH_TYPE_LABELS[record.washType]} ·{' '}
                        {new Date(record.scheduledAt).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${WASH_STATUS_COLORS[record.status]}`}>
                      {WASH_STATUS_LABELS[record.status]}
                    </span>
                    {record.status === 'pending' && (
                      <button
                        onClick={() => onUpdateStatus(record.id, 'in_progress')}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        開始
                      </button>
                    )}
                    {record.status === 'in_progress' && (
                      <button
                        onClick={() => onUpdateStatus(record.id, 'completed')}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        完了
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inProgressCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          現在 <span className="font-bold">{inProgressCount}</span> 台が洗車中です
        </div>
      )}
    </div>
  );
}
