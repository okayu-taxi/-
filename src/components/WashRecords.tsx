import { useState } from 'react';
import {
  type Vehicle,
  type WashRecord,
  type WashType,
  WASH_TYPE_LABELS,
  WASH_TYPE_COSTS,
  WASH_STATUS_LABELS,
  WASH_STATUS_COLORS,
} from '../types';

interface Props {
  vehicles: Vehicle[];
  records: WashRecord[];
  onAdd: (data: { vehicleId: string; washType: WashType; scheduledAt: string; notes: string; cost: number }) => void;
  onUpdateStatus: (id: string, status: WashRecord['status']) => void;
  onDelete: (id: string) => void;
}

type FilterStatus = 'all' | WashRecord['status'];

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'pending', label: '待機中' },
  { value: 'in_progress', label: '洗車中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
];

export function WashRecords({ vehicles, records, onAdd, onUpdateStatus, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [form, setForm] = useState({
    vehicleId: '',
    washType: 'basic' as WashType,
    scheduledAt: new Date().toISOString().slice(0, 16),
    notes: '',
    cost: WASH_TYPE_COSTS.basic,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredRecords = records
    .filter((r) => filterStatus === 'all' || r.status === filterStatus)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const getVehicle = (id: string) => vehicles.find((v) => v.id === id);

  function handleWashTypeChange(washType: WashType) {
    setForm({ ...form, washType, cost: WASH_TYPE_COSTS[washType] });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId) return;
    onAdd(form);
    setForm({
      vehicleId: '',
      washType: 'basic',
      scheduledAt: new Date().toISOString().slice(0, 16),
      notes: '',
      cost: WASH_TYPE_COSTS.basic,
    });
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">洗車記録</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          disabled={vehicles.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + 洗車を登録
        </button>
      </div>

      {vehicles.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          洗車を登録するには、先に車両を登録してください
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
        >
          <h3 className="font-semibold text-gray-700">洗車登録</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">車両 *</label>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">車両を選択</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} - {v.driverName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">洗車コース *</label>
              <select
                value={form.washType}
                onChange={(e) => handleWashTypeChange(e.target.value as WashType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {(Object.keys(WASH_TYPE_LABELS) as WashType[]).map((t) => (
                  <option key={t} value={t}>
                    {WASH_TYPE_LABELS[t]} (¥{WASH_TYPE_COSTS[t].toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">予定日時 *</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">料金 (円)</label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">備考</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="特記事項など"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              登録
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterStatus === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          該当する洗車記録はありません
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const vehicle = getVehicle(record.vehicleId);
            return (
              <div key={record.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl mt-0.5">🚕</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">
                          {vehicle?.plateNumber ?? '不明'} - {vehicle?.driverName ?? ''}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WASH_STATUS_COLORS[record.status]}`}>
                          {WASH_STATUS_LABELS[record.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {WASH_TYPE_LABELS[record.washType]} · ¥{record.cost.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        予定: {new Date(record.scheduledAt).toLocaleString('ja-JP', {
                          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                        {record.completedAt && (
                          <> · 完了: {new Date(record.completedAt).toLocaleString('ja-JP', {
                            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}</>
                        )}
                      </p>
                      {record.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{record.notes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {record.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onUpdateStatus(record.id, 'in_progress')}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          開始
                        </button>
                        <button
                          onClick={() => onUpdateStatus(record.id, 'cancelled')}
                          className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          キャンセル
                        </button>
                      </>
                    )}
                    {record.status === 'in_progress' && (
                      <button
                        onClick={() => onUpdateStatus(record.id, 'completed')}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        完了
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(record.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
                {deleteConfirm === record.id && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <p className="text-red-700 mb-2">この記録を削除しますか？</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onDelete(record.id); setDeleteConfirm(null); }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
