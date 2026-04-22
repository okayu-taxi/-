import { useState } from 'react';
import { type Vehicle } from '../types';

interface Props {
  vehicles: Vehicle[];
  onAdd: (data: Omit<Vehicle, 'id' | 'lastWashedAt' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

interface FormData {
  plateNumber: string;
  driverName: string;
  vehicleModel: string;
}

const EMPTY_FORM: FormData = { plateNumber: '', driverName: '', vehicleModel: '' };

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'なし';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '今日';
  return `${days}日前`;
}

export function VehicleList({ vehicles, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plateNumber.trim() || !form.driverName.trim()) return;
    onAdd({ ...form });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">車両管理</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          + 車両を追加
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
        >
          <h3 className="font-semibold text-gray-700">新規車両登録</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ナンバープレート *</label>
              <input
                type="text"
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                placeholder="品川 500 あ 1234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">運転手名 *</label>
              <input
                type="text"
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                placeholder="山田 太郎"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">車種</label>
              <input
                type="text"
                value={form.vehicleModel}
                onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                placeholder="トヨタ クラウン"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
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

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          登録されている車両はありません
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚕</span>
                  <div>
                    <p className="font-bold text-gray-800">{v.plateNumber}</p>
                    <p className="text-sm text-gray-600">{v.driverName}</p>
                    {v.vehicleModel && <p className="text-xs text-gray-400">{v.vehicleModel}</p>}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm(v.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                最終洗車: {daysSince(v.lastWashedAt)}
              </div>

              {deleteConfirm === v.id && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <p className="text-red-700 mb-2">この車両を削除しますか？関連する洗車記録も削除されます。</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDelete(v.id); setDeleteConfirm(null); }}
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
          ))}
        </div>
      )}
    </div>
  );
}
