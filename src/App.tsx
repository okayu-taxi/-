import { useState, useMemo, useRef } from 'react';
import { useStore } from './store/useStore';
import { MonthCalendar } from './components/MonthCalendar';
import { type Vehicle, getAlertLevel, ALERT_COLORS } from './types';
import './index.css';

type View = 'main' | 'vehicles' | 'schedule' | 'edit' | 'backup';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sortByReturnTime(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => {
    if (!a.returnTime && !b.returnTime) return 0;
    if (!a.returnTime) return 1;
    if (!b.returnTime) return -1;
    return a.returnTime.localeCompare(b.returnTime);
  });
}

// ── shared nav ──────────────────────────────────────────────────────────────────────────────
function PageTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-12 px-4 border-b border-gray-100 pt-safe shrink-0">
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}

function BottomBack({ onBack, label = '← 戻る' }: { onBack: () => void; label?: string }) {
  return (
    <div className="border-t border-gray-100 pb-safe shrink-0">
      <button onClick={onBack} className="w-full h-14 text-sm text-black flex items-center justify-center">
        {label}
      </button>
    </div>
  );
}

export default function App() {
  const {
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    toggleWashDate,
    getCountsByDate,
    getVehiclesForDate,
    exportBackup,
    importBackup,
  } = useStore();

  const now = new Date();
  const [view, setView] = useState<View>('main');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [editingId, setEditingId] = useState<string | null>(null);

  // forms
  const [newPlate, setNewPlate] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newReturnTime, setNewReturnTime] = useState('');

  // edit form
  const [editPlate, setEditPlate] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editReturnTime, setEditReturnTime] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = todayStr();
  const countsByDate = useMemo(() => getCountsByDate(), [getCountsByDate]);
  const todayCars = useMemo(
    () => sortByReturnTime(getVehiclesForDate(today)),
    [getVehiclesForDate, today]
  );

  const editingVehicle = useMemo(
    () => vehicles.find((v) => v.id === editingId) ?? null,
    [vehicles, editingId]
  );

  // sorted vehicle list: red → yellow → none
  const sortedVehicles = useMemo(() => {
    const order: Record<string, number> = { red: 0, yellow: 1, none: 2 };
    return [...vehicles].sort(
      (a, b) => order[getAlertLevel(a, now)] - order[getAlertLevel(b, now)]
    );
  }, [vehicles, now]);

  function openSchedule(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setView('schedule');
  }

  function openEdit(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setEditPlate(vehicle.plateNumber);
    setEditCustomer(vehicle.customerName);
    setEditReturnTime(vehicle.returnTime ?? '');
    setView('edit');
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlate.trim()) return;
    const v = addVehicle(newPlate, newCustomer, newReturnTime || null);
    setNewPlate('');
    setNewCustomer('');
    setNewReturnTime('');
    // immediately open schedule
    setEditingId(v.id);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setView('schedule');
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    updateVehicle(editingId, {
      plateNumber: editPlate.trim(),
      customerName: editCustomer.trim(),
      returnTime: editReturnTime || null,
    });
    setView('vehicles');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importBackup(ev.target?.result as string);
      setBackupMsg(ok ? '復元しました' : 'ファイルが不正です');
      setTimeout(() => setBackupMsg(''), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── MAIN ───────────────────────────────────────────────────────────────────────────
  if (view === 'main') {
    return (
      <div className="app-shell">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-safe">
            <MonthCalendar
              year={calYear}
              month={calMonth}
              onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
              countsByDate={countsByDate}
            />
          </div>

          <div className="px-4 pt-4 pb-4 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
              今日&nbsp;{now.getMonth() + 1}/{now.getDate()}
              {todayCars.length > 0 && (
                <span className="text-black font-bold ml-2">{todayCars.length}台</span>
              )}
            </p>
            {todayCars.length === 0 ? (
              <p className="text-sm text-gray-300">予定なし</p>
            ) : (
              <ul className="space-y-3">
                {todayCars.map((v) => {
                  const alert = getAlertLevel(v, now);
                  return (
                    <li key={v.id} className="flex items-center gap-3">
                      {v.returnTime && (
                        <span className="text-xs text-gray-400 w-10 shrink-0">{v.returnTime}</span>
                      )}
                      <span className={`text-sm font-medium ${ALERT_COLORS[alert]}`}>
                        {v.plateNumber}
                      </span>
                      {v.customerName && (
                        <span className="text-xs text-gray-400">{v.customerName}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pb-safe flex">
          <button onClick={() => setView('vehicles')} className="flex-1 h-12 text-sm text-black">
            車両管理
          </button>
          <button onClick={() => setView('backup')} className="flex-1 h-12 text-sm text-gray-400">
            バックアップ
          </button>
        </div>
      </div>
    );
  }

  // ── VEHICLE LIST ──────────────────────────────────────────────────────────────────────
  if (view === 'vehicles') {
    return (
      <div className="app-shell">
        <PageTitle title="車両管理" />

        <div className="flex-1 overflow-y-auto">
          {vehicles.length === 0 ? (
            <p className="text-sm text-gray-300 px-4 py-6">車両が登録されていません</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sortedVehicles.map((v) => {
                const alert = getAlertLevel(v, now);
                return (
                  <li key={v.id}>
                    <div className="flex items-center px-4 py-3 gap-2">
                      <button onClick={() => openSchedule(v)} className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${ALERT_COLORS[alert]}`}>
                            {v.plateNumber}
                          </span>
                          {v.customerName && (
                            <span className="text-xs text-gray-400">{v.customerName}</span>
                          )}
                          {v.returnTime && (
                            <span className="text-xs text-gray-300">{v.returnTime}帰</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5">{v.washDates.length}日設定</p>
                      </button>
                      <button
                        onClick={() => openEdit(v)}
                        className="text-xs text-gray-400 w-8 h-11 flex items-center justify-center"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(v.id)}
                        className="text-xs text-gray-300 w-8 h-11 flex items-center justify-center"
                      >
                        削除
                      </button>
                    </div>
                    {deleteConfirm === v.id && (
                      <div className="mx-4 mb-3 p-3 border border-gray-200 rounded-lg text-sm">
                        <p className="text-gray-600 mb-2">削除しますか？</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { deleteVehicle(v.id); setDeleteConfirm(null); }}
                            className="px-3 py-1 bg-black text-white text-xs rounded-lg"
                          >
                            削除
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 border border-gray-200 text-xs rounded-lg"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-100 shrink-0">
          <div className="px-4 pt-2 pb-1 flex gap-4 text-xs">
            <span className="text-yellow-500">● 当期未予約</span>
            <span className="text-red-500">● 前日未予約</span>
            <span className="text-gray-300">締日: 毎月15日</span>
          </div>
          <form onSubmit={handleAdd} className="px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value)}
                placeholder="車番 *"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                autoCapitalize="none"
                required
              />
              <input
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                placeholder="顧客名"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="time"
                value={newReturnTime}
                onChange={(e) => setNewReturnTime(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              />
              <span className="text-xs text-gray-400 self-center shrink-0">帰車時刻</span>
              <button type="submit" className="px-4 py-2 bg-black text-white text-sm rounded-lg shrink-0">
                追加
              </button>
            </div>
          </form>
          <BottomBack onBack={() => setView('main')} />
        </div>
      </div>
    );
  }

  // ── EDIT VEHICLE ─────────────────────────────────────────────────────────────────────
  if (view === 'edit' && editingVehicle) {
    return (
      <div className="app-shell">
        <PageTitle title="車両編集" />

        <form onSubmit={handleEditSave} className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs text-gray-400 mb-1">車番</label>
            <input
              value={editPlate}
              onChange={(e) => setEditPlate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              required
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">顧客名</label>
            <input
              value={editCustomer}
              onChange={(e) => setEditCustomer(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">帰車時刻</label>
            <input
              type="time"
              value={editReturnTime}
              onChange={(e) => setEditReturnTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-black text-white text-sm rounded-lg mt-4"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => openSchedule(editingVehicle)}
            className="w-full py-3 border border-gray-200 text-sm rounded-lg"
          >
            洗車日を設定
          </button>
        </form>

        <BottomBack onBack={() => setView('vehicles')} />
      </div>
    );
  }

  // ── SCHEDULE EDITOR ────────────────────────────────────────────────────────────────────────
  if (view === 'schedule' && editingVehicle) {
    return (
      <div className="app-shell">
        <PageTitle title={`${editingVehicle.plateNumber} の洗車日`} />

        <div className="flex-1 overflow-y-auto px-4">
          <MonthCalendar
            year={calYear}
            month={calMonth}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
            selectedDates={editingVehicle.washDates}
            onDateToggle={(date) => toggleWashDate(editingVehicle.id, date)}
          />
          <p className="text-xs text-gray-300 text-center mb-4">
            日付をタップして洗車日を設定 / 解除
          </p>
        </div>

        <div className="border-t border-gray-100 pb-safe shrink-0">
          <div className="px-4 pt-3 pb-1">
            <button
              onClick={() => setView('main')}
              className="w-full py-3 bg-black text-white text-sm rounded-lg"
            >
              確定してホームへ
            </button>
          </div>
          <BottomBack onBack={() => setView('vehicles')} label="← 車両一覧へ戻る" />
        </div>
      </div>
    );
  }

  // ── BACKUP ──────────────────────────────────────────────────────────────────────────────
  if (view === 'backup') {
    return (
      <div className="app-shell">
        <PageTitle title="バックアップ" />

        <div className="flex-1 px-4 py-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-black mb-1">エクスポート</p>
            <p className="text-xs text-gray-400 mb-3">全データを JSON ファイルとして保存します</p>
            <button
              onClick={exportBackup}
              className="w-full py-3 border border-gray-200 text-sm rounded-lg"
            >
              バックアップをダウンロード
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm font-medium text-black mb-1">インポート</p>
            <p className="text-xs text-gray-400 mb-3">
              バックアップファイルからデータを復元します（現在のデータは上書きされます）
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border border-gray-200 text-sm rounded-lg"
            >
              ファイルから復元
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            {backupMsg && (
              <p className="text-xs text-center mt-3 text-black">{backupMsg}</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-300">
              登録車両数: {vehicles.length}台 ／ 合計洗車日数:{' '}
              {vehicles.reduce((sum, v) => sum + v.washDates.length, 0)}日
            </p>
          </div>
        </div>

        <BottomBack onBack={() => setView('main')} />
      </div>
    );
  }

  return null;
}
