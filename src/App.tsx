import { useState, useMemo } from 'react';
import { useStore } from './store/useStore';
import { MonthCalendar } from './components/MonthCalendar';
import {
  type Vehicle,
  getAlertLevel,
  getCurrentPeriod,
  getNextPeriod,
  countWashesInPeriod,
  ALERT_COLORS,
} from './types';
import { useGistSync, GIST_DESCRIPTION } from './lib/gistSync';
import './index.css';

function formatLastSync(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    <div className="pt-safe shrink-0 bg-white/85 backdrop-blur-xl border-b border-gray-200/60">
      <div className="flex items-center justify-center h-11 px-4">
        <span className="text-[17px] font-semibold tracking-tight text-black">{title}</span>
      </div>
    </div>
  );
}

function BottomBack({ onBack, label = '戻る' }: { onBack: () => void; label?: string }) {
  return (
    <div className="border-t border-gray-200/60 pb-safe shrink-0 bg-white/85 backdrop-blur-xl">
      <button
        onClick={onBack}
        className="w-full h-12 text-[15px] text-[#007AFF] flex items-center justify-center gap-0.5 active:opacity-60"
      >
        <span className="text-lg leading-none">‹</span>
        <span>{label}</span>
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

  const sync = useGistSync(vehicles, importBackup);
  const [patDraft, setPatDraft] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [pullConfirm, setPullConfirm] = useState(false);

  const today = todayStr();
  const [pickedDate, setPickedDate] = useState<string>(today);
  const countsByDate = useMemo(() => getCountsByDate(), [getCountsByDate]);
  const pickedCars = useMemo(
    () => sortByReturnTime(getVehiclesForDate(pickedDate)),
    [getVehiclesForDate, pickedDate]
  );
  const pickedCarsByTime = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    for (const v of pickedCars) {
      const key = v.returnTime ?? '';
      const arr = map.get(key);
      if (arr) arr.push(v);
      else map.set(key, [v]);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });
    return keys.map((time) => ({ time, cars: map.get(time)! }));
  }, [pickedCars]);

  const editingVehicle = useMemo(
    () => vehicles.find((v) => v.id === editingId) ?? null,
    [vehicles, editingId]
  );

  const currentPeriod = getCurrentPeriod(now);
  const nextPeriod = getNextPeriod(now);

  // sorted by ascending current-period wash-day count (cars with fewer scheduled washes first)
  const sortedVehicles = [...vehicles].sort(
    (a, b) =>
      countWashesInPeriod(a.washDates, currentPeriod) -
      countWashesInPeriod(b.washDates, currentPeriod)
  );

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

  async function handleEnableSync() {
    if (!patDraft.trim()) {
      setBackupMsg('PAT を入力してください');
      setTimeout(() => setBackupMsg(''), 3000);
      return;
    }
    sync.setPat(patDraft);
    setPatDraft('');
    try {
      const { restored } = await sync.enable();
      setBackupMsg(restored ? '既存の Gist から復元しました' : '新しい Gist を作成しました');
    } catch {
      setBackupMsg('同期の開始に失敗しました');
    }
    setTimeout(() => setBackupMsg(''), 3000);
  }

  async function handlePullNow() {
    setPullConfirm(false);
    try {
      await sync.pullNow();
      setBackupMsg('Gist から復元しました');
    } catch {
      setBackupMsg('復元に失敗しました');
    }
    setTimeout(() => setBackupMsg(''), 3000);
  }

  async function handlePushNow() {
    try {
      await sync.pushNow();
      setBackupMsg('Gist に保存しました');
    } catch {
      setBackupMsg('保存に失敗しました');
    }
    setTimeout(() => setBackupMsg(''), 3000);
  }

  function handleDisableSync() {
    sync.disable();
    setBackupMsg('同期を解除しました');
    setTimeout(() => setBackupMsg(''), 3000);
  }

  async function handleHardReload() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // ignore
    }
    const url = new URL(window.location.href);
    url.searchParams.set('_', Date.now().toString());
    window.location.replace(url.toString());
  }

  // ── MAIN ───────────────────────────────────────────────────────────────────────────
  if (view === 'main') {
    const [, pm, pd] = pickedDate.split('-');
    const isPickedToday = pickedDate === today;
    const dowJa = ['日', '月', '火', '水', '木', '金', '土'];
    const pickedDow = dowJa[new Date(pickedDate + 'T00:00:00').getDay()];
    const dateLabel = isPickedToday
      ? `今日 ${parseInt(pm, 10)}/${parseInt(pd, 10)} (${pickedDow})`
      : `${parseInt(pm, 10)}/${parseInt(pd, 10)} (${pickedDow})`;

    return (
      <div className="app-shell">
        <div className="px-4 pt-safe shrink-0">
          <MonthCalendar
            year={calYear}
            month={calMonth}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
            countsByDate={countsByDate}
            highlightedDate={pickedDate}
            onDateSelect={setPickedDate}
            onTodayClick={() => {
              setCalYear(now.getFullYear());
              setCalMonth(now.getMonth());
              setPickedDate(today);
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain border-t border-gray-200/60 mt-1">
          <div className="flex items-baseline justify-between px-4 pt-3 pb-2">
            <p className="text-[15px] font-semibold text-black">
              {dateLabel}
              {pickedCars.length > 0 && (
                <span className="text-gray-400 font-normal ml-2">{pickedCars.length}台</span>
              )}
            </p>
            {!isPickedToday && (
              <button
                onClick={() => setPickedDate(today)}
                className="text-[13px] text-[#007AFF] active:opacity-60"
              >
                今日へ
              </button>
            )}
          </div>
          {pickedCars.length === 0 ? (
            <p className="px-4 py-3 text-[14px] text-gray-400">予定なし</p>
          ) : (
            <div className="px-4 pb-3 space-y-1.5">
              {pickedCarsByTime.map(({ time, cars }) => (
                <div key={time || 'no-time'} className="flex items-baseline gap-3">
                  <span className="text-[12px] text-gray-500 w-11 shrink-0 tabular-nums">
                    {time || '時刻なし'}
                  </span>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1">
                    {cars.map((v) => {
                      const alert = getAlertLevel(v, now);
                      return (
                        <li key={v.id} className="flex items-baseline gap-1">
                          <span className={`text-[15px] font-medium ${ALERT_COLORS[alert]}`}>
                            {v.plateNumber}
                          </span>
                          {v.customerName && (
                            <span className="text-[11px] text-gray-400">{v.customerName}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200/60 pb-safe flex bg-white/85 backdrop-blur-xl">
          <button
            onClick={() => setView('vehicles')}
            className="flex-1 h-12 text-[13px] font-medium text-[#007AFF] active:opacity-60"
          >
            車両管理
          </button>
          <button
            onClick={() => setView('backup')}
            className="flex-1 h-12 text-[13px] text-gray-500 active:opacity-60"
          >
            設定
          </button>
        </div>
      </div>
    );
  }

  // ── VEHICLE LIST ──────────────────────────────────────────────────────────────────────
  if (view === 'vehicles') {
    return (
      <div className="app-shell bg-[#F2F2F7]">
        <PageTitle title="車両管理" />

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {vehicles.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-12 text-center">車両が登録されていません</p>
          ) : (
            <ul className="mx-4 mt-4 bg-white rounded-xl overflow-hidden divide-y divide-gray-200/60">
              {sortedVehicles.map((v) => {
                const alert = getAlertLevel(v, now);
                return (
                  <li key={v.id}>
                    <div className="flex items-center pl-4 pr-1 py-2.5 gap-1">
                      <button onClick={() => openSchedule(v)} className="flex-1 text-left min-w-0 py-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[15px] font-medium ${ALERT_COLORS[alert]}`}>
                            {v.plateNumber}
                          </span>
                          {v.customerName && (
                            <span className="text-[13px] text-gray-500">{v.customerName}</span>
                          )}
                          {v.returnTime && (
                            <span className="text-[12px] text-gray-400">{v.returnTime}帰</span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-400 mt-0.5">
                          今期 {countWashesInPeriod(v.washDates, currentPeriod)}日
                          {countWashesInPeriod(v.washDates, nextPeriod) > 0 && (
                            <span className="ml-2">
                              来期 {countWashesInPeriod(v.washDates, nextPeriod)}日
                            </span>
                          )}
                        </p>
                      </button>
                      <button
                        onClick={() => openEdit(v)}
                        className="text-[13px] text-[#007AFF] px-3 h-11 flex items-center"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(v.id)}
                        className="text-[13px] text-[#FF3B30] px-3 h-11 flex items-center"
                      >
                        削除
                      </button>
                    </div>
                    {deleteConfirm === v.id && (
                      <div className="mx-3 mb-3 p-3 bg-[#F2F2F7] rounded-lg text-[13px]">
                        <p className="text-gray-700 mb-2">削除しますか？</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { deleteVehicle(v.id); setDeleteConfirm(null); }}
                            className="px-3 py-1.5 bg-[#FF3B30] text-white text-xs font-medium rounded-lg"
                          >
                            削除
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 bg-white text-gray-700 text-xs rounded-lg"
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

          <div className="mx-4 mt-3 mb-2 px-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span className="text-yellow-500">● 当期未予約</span>
            <span className="text-red-500">● 前日未予約</span>
            <span className="text-gray-400">締日: 毎月15日</span>
          </div>
        </div>

        <div className="bg-white border-t border-gray-200/60 shrink-0">
          <form onSubmit={handleAdd} className="px-4 py-3 space-y-2">
            <input
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="車番 *"
              className="w-full bg-[#F2F2F7] rounded-lg px-3 py-2.5 text-[15px] outline-none focus:bg-white focus:ring-1 focus:ring-[#007AFF]"
              autoCapitalize="none"
              required
            />
            <input
              value={newCustomer}
              onChange={(e) => setNewCustomer(e.target.value)}
              placeholder="顧客名"
              className="w-full bg-[#F2F2F7] rounded-lg px-3 py-2.5 text-[15px] outline-none focus:bg-white focus:ring-1 focus:ring-[#007AFF]"
            />
            <div className="flex gap-2 items-center">
              <input
                type="time"
                value={newReturnTime}
                onChange={(e) => setNewReturnTime(e.target.value)}
                className="flex-1 bg-[#F2F2F7] rounded-lg px-3 py-2.5 text-[15px] outline-none focus:bg-white focus:ring-1 focus:ring-[#007AFF]"
              />
              <span className="text-[12px] text-gray-500 shrink-0">帰車時刻</span>
              <button type="submit" className="px-4 py-2.5 bg-black text-white text-[15px] font-medium rounded-lg shrink-0">
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
      <div className="app-shell bg-[#F2F2F7]">
        <PageTitle title="車両編集" />

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form onSubmit={handleEditSave} className="pt-4 pb-2">
            <div className="mx-4 bg-white rounded-xl overflow-hidden divide-y divide-gray-200/60">
              <div className="flex items-center px-4 py-2.5 gap-3">
                <label className="text-[15px] text-black w-20 shrink-0">車番</label>
                <input
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="flex-1 text-[15px] outline-none bg-transparent placeholder:text-gray-400"
                  required
                  autoCapitalize="none"
                />
              </div>
              <div className="flex items-center px-4 py-2.5 gap-3">
                <label className="text-[15px] text-black w-20 shrink-0">顧客名</label>
                <input
                  value={editCustomer}
                  onChange={(e) => setEditCustomer(e.target.value)}
                  className="flex-1 text-[15px] outline-none bg-transparent placeholder:text-gray-400"
                />
              </div>
              <div className="flex items-center px-4 py-2.5 gap-3">
                <label className="text-[15px] text-black w-20 shrink-0">帰車時刻</label>
                <input
                  type="time"
                  value={editReturnTime}
                  onChange={(e) => setEditReturnTime(e.target.value)}
                  className="flex-1 text-[15px] outline-none bg-transparent placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="mx-4 mt-5 space-y-2">
              <button
                type="submit"
                className="w-full py-3 bg-black text-white text-[15px] font-medium rounded-xl"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => openSchedule(editingVehicle)}
                className="w-full py-3 bg-white text-[15px] text-[#007AFF] rounded-xl"
              >
                洗車日を設定
              </button>
            </div>
          </form>
        </div>

        <BottomBack onBack={() => setView('vehicles')} />
      </div>
    );
  }

  // ── SCHEDULE EDITOR ────────────────────────────────────────────────────────────────────────
  if (view === 'schedule' && editingVehicle) {
    return (
      <div className="app-shell">
        <PageTitle title={`${editingVehicle.plateNumber} の洗車日`} />

        <div className="flex-1 overflow-y-auto overscroll-contain px-4">
          <MonthCalendar
            year={calYear}
            month={calMonth}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
            selectedDates={editingVehicle.washDates}
            onDateToggle={(date) => toggleWashDate(editingVehicle.id, date)}
            onTodayClick={() => {
              setCalYear(now.getFullYear());
              setCalMonth(now.getMonth());
            }}
          />
          <p className="text-[15px] font-medium text-center mb-1">
            今期 {countWashesInPeriod(editingVehicle.washDates, currentPeriod)} 日
            {countWashesInPeriod(editingVehicle.washDates, nextPeriod) > 0 && (
              <span className="ml-3 text-gray-400">
                来期 {countWashesInPeriod(editingVehicle.washDates, nextPeriod)} 日
              </span>
            )}
          </p>
          <p className="text-[12px] text-gray-400 text-center mb-4">
            日付をタップして洗車日を設定 / 解除
          </p>
        </div>

        <div className="border-t border-gray-200/60 pb-safe shrink-0 bg-white">
          <div className="px-4 pt-3 pb-1">
            <button
              onClick={() => setView('main')}
              className="w-full py-3 bg-black text-white text-[15px] font-medium rounded-xl"
            >
              確定してホームへ
            </button>
          </div>
          <BottomBack onBack={() => setView('vehicles')} label="車両一覧へ戻る" />
        </div>
      </div>
    );
  }

  // ── BACKUP ──────────────────────────────────────────────────────────────────────────────
  if (view === 'backup') {
    const syncStatusLabel =
      sync.status === 'syncing'
        ? '同期中…'
        : sync.status === 'error'
        ? 'エラー'
        : '有効';
    const syncStatusColor =
      sync.status === 'syncing'
        ? 'text-gray-400'
        : sync.status === 'error'
        ? 'text-[#FF3B30]'
        : 'text-gray-500';

    return (
      <div className="app-shell bg-[#F2F2F7]">
        <PageTitle title="設定" />

        <div className="flex-1 overflow-y-auto overscroll-contain pb-6">
          {/* 車両情報 */}
          <p className="px-4 pt-5 pb-1.5 text-[12px] text-gray-500 uppercase tracking-wide">
            車両
          </p>
          <div className="mx-4 bg-white rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3">
              <span className="text-[15px] text-black">登録車両数</span>
              <span className="ml-auto text-[15px] text-gray-400">{vehicles.length} 台</span>
            </div>
          </div>

          {/* Gist 同期 */}
          <p className="px-4 pt-6 pb-1.5 text-[12px] text-gray-500 uppercase tracking-wide">
            GitHub Gist 自動同期
          </p>
          <div className="mx-4 bg-white rounded-xl overflow-hidden">
            {!sync.enabled ? (
              <div className="p-4 space-y-3">
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  GitHub の Personal Access Token (gist 権限のみ) を貼り付けて同期を開始すると、変更が
                  自動で private Gist (description:「{GIST_DESCRIPTION}」) に保存されます。別端末でも
                  同じ PAT を貼れば自動で復元できます。
                </p>
                <input
                  type={showPat ? 'text' : 'password'}
                  value={patDraft}
                  onChange={(e) => setPatDraft(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full bg-[#F2F2F7] rounded-lg px-3 py-2.5 text-[15px] outline-none focus:bg-white focus:ring-1 focus:ring-[#007AFF]"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <label className="flex items-center gap-2 text-[13px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={showPat}
                    onChange={(e) => setShowPat(e.target.checked)}
                  />
                  PAT を表示
                </label>
                <button
                  onClick={handleEnableSync}
                  disabled={sync.status === 'syncing'}
                  className="w-full py-3 bg-black text-white text-[15px] font-medium rounded-lg disabled:opacity-50"
                >
                  {sync.status === 'syncing' ? '接続中…' : '同期を開始'}
                </button>
                <a
                  href="https://github.com/settings/tokens/new?scopes=gist&description=Taxi+Car+Wash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[13px] text-[#007AFF] text-center"
                >
                  PAT を新規作成（gist 権限のみ）
                </a>
              </div>
            ) : (
              <div className="divide-y divide-gray-200/60">
                <div className="flex items-center px-4 py-3">
                  <span className="text-[15px] text-black">状態</span>
                  <span className={`ml-auto text-[15px] ${syncStatusColor}`}>{syncStatusLabel}</span>
                </div>
                <div className="flex items-center px-4 py-3">
                  <span className="text-[15px] text-black">Gist ID</span>
                  <span className="ml-auto text-[15px] text-gray-400 truncate max-w-[55%]">
                    {sync.gistId.slice(0, 12)}…
                  </span>
                </div>
                {sync.lastSync && (
                  <div className="flex items-center px-4 py-3">
                    <span className="text-[15px] text-black">最終同期</span>
                    <span className="ml-auto text-[15px] text-gray-400">{formatLastSync(sync.lastSync)}</span>
                  </div>
                )}
                {sync.error && (
                  <div className="px-4 py-3">
                    <p className="text-[13px] text-[#FF3B30] break-all">{sync.error}</p>
                  </div>
                )}
                <button
                  onClick={handlePushNow}
                  disabled={sync.status === 'syncing'}
                  className="w-full text-left px-4 py-3 text-[15px] text-[#007AFF] disabled:opacity-50"
                >
                  今すぐ保存
                </button>
                <button
                  onClick={() => setPullConfirm(true)}
                  disabled={sync.status === 'syncing'}
                  className="w-full text-left px-4 py-3 text-[15px] text-[#007AFF] disabled:opacity-50"
                >
                  Gist から復元
                </button>
                <button
                  onClick={handleDisableSync}
                  className="w-full text-left px-4 py-3 text-[15px] text-[#FF3B30]"
                >
                  同期を解除（PAT も削除）
                </button>
              </div>
            )}
          </div>

          {pullConfirm && (
            <div className="mx-4 mt-3 p-3 bg-white rounded-xl">
              <p className="text-[13px] text-gray-700 mb-2">
                現在のデータを Gist の内容で上書きします。よろしいですか？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handlePullNow}
                  className="px-3 py-1.5 bg-[#FF3B30] text-white text-xs font-medium rounded-lg"
                >
                  復元
                </button>
                <button
                  onClick={() => setPullConfirm(false)}
                  className="px-3 py-1.5 bg-[#F2F2F7] text-gray-700 text-xs rounded-lg"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* 再読み込み */}
          <p className="px-4 pt-6 pb-1.5 text-[12px] text-gray-500 uppercase tracking-wide">
            メンテナンス
          </p>
          <div className="mx-4 bg-white rounded-xl p-4">
            <p className="text-[13px] text-gray-500 mb-3">
              動作がおかしい時・データが反映されない時に押してください。
            </p>
            <button
              onClick={handleHardReload}
              className="w-full py-3 bg-black text-white text-[15px] font-medium rounded-lg"
            >
              再読み込みする
            </button>
          </div>

          {backupMsg && (
            <p className="mt-4 text-[13px] text-center text-gray-500">{backupMsg}</p>
          )}
        </div>

        <BottomBack onBack={() => setView('main')} />
      </div>
    );
  }

  return null;
}
