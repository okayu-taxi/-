import { useState, useMemo } from 'react';
import { useStore } from './store/useStore';
import { MonthCalendar } from './components/MonthCalendar';
import { type Vehicle, getAlertLevel, ALERT_COLORS } from './types';
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
    <div className="border-b border-gray-100 pt-safe shrink-0">
      <div className="flex items-center justify-center h-12 px-4">
        <span className="text-sm font-medium">{title}</span>
      </div>
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

  const editingVehicle = useMemo(
    () => vehicles.find((v) => v.id === editingId) ?? null,
    [vehicles, editingId]
  );

  // sorted by ascending wash-day count (cars with fewer scheduled washes first)
  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => a.washDates.length - b.washDates.length);
  }, [vehicles]);

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
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-safe">
            <MonthCalendar
              year={calYear}
              month={calMonth}
              onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
              countsByDate={countsByDate}
              highlightedDate={pickedDate}
              onDateSelect={setPickedDate}
            />
          </div>

          <div className="px-4 pt-4 pb-4 border-t border-gray-100 mt-2">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">
                {dateLabel}
                {pickedCars.length > 0 && (
                  <span className="text-black font-bold ml-2">{pickedCars.length}台</span>
                )}
              </p>
              {!isPickedToday && (
                <button
                  onClick={() => setPickedDate(today)}
                  className="text-xs text-gray-400 underline"
                >
                  今日へ
                </button>
              )}
            </div>
            {pickedCars.length === 0 ? (
              <p className="text-sm text-gray-300">予定なし</p>
            ) : (
              <ul className="space-y-3">
                {pickedCars.map((v) => {
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
            設定
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

        <div className="flex-1 overflow-y-auto flex flex-col">
          {vehicles.length === 0 ? (
            <p className="text-sm text-gray-300 px-4 py-6 mt-auto">車両が登録されていません</p>
          ) : (
            <ul className="divide-y divide-gray-100 mt-auto">
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
            <input
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="車番 *"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              autoCapitalize="none"
              required
            />
            <input
              value={newCustomer}
              onChange={(e) => setNewCustomer(e.target.value)}
              placeholder="顧客名"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
            />
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

        <div className="flex-1" />

        <div className="border-t border-gray-100 shrink-0">
          <form onSubmit={handleEditSave} className="px-4 pt-4 pb-2 space-y-3">
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
              className="w-full py-3 bg-black text-white text-sm rounded-lg"
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
          <p className="text-sm font-medium text-center mb-1">
            合計 {editingVehicle.washDates.length} 日
          </p>
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
        <PageTitle title="設定" />

        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-4 py-6 space-y-6 mt-auto">
            <div>
              <p className="text-xs text-gray-300">
                登録車両数: {vehicles.length}台
              </p>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-sm font-medium text-black">GitHub Gist 自動同期</p>
                {sync.enabled && (
                  <span
                    className={`text-xs ${
                      sync.status === 'syncing'
                        ? 'text-gray-400'
                        : sync.status === 'error'
                        ? 'text-red-500'
                        : 'text-black'
                    }`}
                  >
                    {sync.status === 'syncing'
                      ? '同期中…'
                      : sync.status === 'error'
                      ? 'エラー'
                      : '有効'}
                  </span>
                )}
              </div>

              {!sync.enabled ? (
                <>
                  <p className="text-xs text-gray-400 mb-3">
                    GitHub の Personal Access Token (gist 権限のみ) を貼り付けて同期を開始すると、変更が
                    自動で private Gist (description: 「{GIST_DESCRIPTION}」) に保存されます。別端末でも
                    同じ PAT を貼れば自動で復元できます。
                  </p>
                  <input
                    type={showPat ? 'text' : 'password'}
                    value={patDraft}
                    onChange={(e) => setPatDraft(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black mb-2"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-400 mb-3">
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
                    className="w-full py-3 bg-black text-white text-sm rounded-lg disabled:opacity-50"
                  >
                    {sync.status === 'syncing' ? '接続中…' : '同期を開始'}
                  </button>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=gist&description=Taxi+Car+Wash"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-gray-400 underline mt-3 text-center"
                  >
                    PAT を新規作成（gist 権限のみ）
                  </a>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-1">
                    Gist ID: <span className="text-gray-500">{sync.gistId.slice(0, 12)}…</span>
                  </p>
                  {sync.lastSync && (
                    <p className="text-xs text-gray-400 mb-3">
                      最終同期: {formatLastSync(sync.lastSync)}
                    </p>
                  )}
                  {sync.error && (
                    <p className="text-xs text-red-500 mb-3 break-all">{sync.error}</p>
                  )}
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={handlePushNow}
                      disabled={sync.status === 'syncing'}
                      className="flex-1 py-3 border border-gray-200 text-sm rounded-lg disabled:opacity-50"
                    >
                      今すぐ保存
                    </button>
                    <button
                      onClick={() => setPullConfirm(true)}
                      disabled={sync.status === 'syncing'}
                      className="flex-1 py-3 border border-gray-200 text-sm rounded-lg disabled:opacity-50"
                    >
                      Gist から復元
                    </button>
                  </div>
                  {pullConfirm && (
                    <div className="p-3 border border-gray-200 rounded-lg text-sm mb-2">
                      <p className="text-gray-600 mb-2">
                        現在のデータを Gist の内容で上書きします。よろしいですか？
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handlePullNow}
                          className="px-3 py-1 bg-black text-white text-xs rounded-lg"
                        >
                          復元
                        </button>
                        <button
                          onClick={() => setPullConfirm(false)}
                          className="px-3 py-1 border border-gray-200 text-xs rounded-lg"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleDisableSync}
                    className="w-full py-3 text-xs text-gray-400"
                  >
                    同期を解除（PAT も削除されます）
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <p className="text-sm font-medium text-black mb-1">アプリを更新</p>
              <p className="text-xs text-gray-400 mb-3">
                新バージョンが反映されない時はこちら（キャッシュをクリアして再読込）
              </p>
              <button
                onClick={handleHardReload}
                className="w-full py-3 border border-gray-200 text-sm rounded-lg"
              >
                最新版に更新
              </button>
            </div>

            {backupMsg && (
              <p className="text-xs text-center text-black">{backupMsg}</p>
            )}
          </div>
        </div>

        <BottomBack onBack={() => setView('main')} />
      </div>
    );
  }

  return null;
}
