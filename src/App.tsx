import { useState, useMemo, useRef } from 'react';
import { useStore } from './store/useStore';
import { MonthCalendar } from './components/MonthCalendar';
import { type Vehicle } from './types';
import './index.css';

type View = 'main' | 'vehicles' | 'schedule';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const { vehicles, addVehicle, deleteVehicle, toggleWashDate, getCountsByDate, getVehiclesForDate } =
    useStore();

  const now = new Date();
  const [view, setView] = useState<View>('main');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlate, setNewPlate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const today = todayStr();
  const countsByDate = useMemo(() => getCountsByDate(), [getCountsByDate]);
  const todayCars = useMemo(() => getVehiclesForDate(today), [getVehiclesForDate, today]);

  const editingVehicle = useMemo(
    () => vehicles.find((v) => v.id === editingId) ?? null,
    [vehicles, editingId]
  );

  function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlate.trim()) return;
    const v = addVehicle(newPlate);
    setNewPlate('');
    // immediately open schedule editor
    setEditingId(v.id);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setView('schedule');
  }

  function openSchedule(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setView('schedule');
  }

  function handleMonthChange(y: number, m: number) {
    setCalYear(y);
    setCalMonth(m);
  }

  // ── Main view ──────────────────────────────────────────────────
  if (view === 'main') {
    return (
      <div className="app-shell">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-safe">
            <MonthCalendar
              year={calYear}
              month={calMonth}
              onMonthChange={handleMonthChange}
              countsByDate={countsByDate}
            />
          </div>

          <div className="px-4 pt-4 pb-2 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
              今日&nbsp;
              {now.getMonth() + 1}/{now.getDate()}
            </p>
            {todayCars.length === 0 ? (
              <p className="text-sm text-gray-300">予定なし</p>
            ) : (
              <ul className="space-y-3">
                {todayCars.map((v) => (
                  <li key={v.id} className="text-base font-medium text-black">
                    {v.plateNumber}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pb-safe">
          <button
            onClick={() => setView('vehicles')}
            className="w-full h-12 text-sm text-black tracking-wide"
          >
            車両設定
          </button>
        </div>
      </div>
    );
  }

  // ── Vehicle list view ──────────────────────────────────────────
  if (view === 'vehicles') {
    return (
      <div className="app-shell">
        <div className="flex items-center h-12 px-4 border-b border-gray-100 pt-safe shrink-0">
          <button
            onClick={() => setView('main')}
            className="text-sm text-black w-11 h-11 flex items-center"
          >
            ←
          </button>
          <span className="text-sm font-medium">車両設定</span>
        </div>

        <form
          onSubmit={handleAddVehicle}
          className="flex gap-2 px-4 py-3 border-b border-gray-100 shrink-0"
        >
          <input
            ref={inputRef}
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value)}
            placeholder="車番を入力"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
            autoCapitalize="none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white text-sm rounded-lg shrink-0"
          >
            追加
          </button>
        </form>

        <div className="flex-1 overflow-y-auto">
          {vehicles.length === 0 ? (
            <p className="text-sm text-gray-300 px-4 py-6">車両が登録されていません</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {vehicles.map((v) => (
                <li key={v.id} className="flex items-center px-4 py-3">
                  <button
                    onClick={() => openSchedule(v)}
                    className="flex-1 text-left"
                  >
                    <span className="text-sm font-medium text-black">{v.plateNumber}</span>
                    <span className="text-xs text-gray-300 ml-2">{v.washDates.length}日設定</span>
                  </button>
                  <button
                    onClick={() => deleteVehicle(v.id)}
                    className="text-xs text-gray-300 w-11 h-11 flex items-center justify-end"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── Schedule editor view ───────────────────────────────────────
  if (view === 'schedule' && editingVehicle) {
    return (
      <div className="app-shell">
        <div className="flex items-center h-12 px-4 border-b border-gray-100 pt-safe shrink-0">
          <button
            onClick={() => setView('vehicles')}
            className="text-sm text-black w-11 h-11 flex items-center"
          >
            ←
          </button>
          <span className="text-sm font-medium">{editingVehicle.plateNumber}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <MonthCalendar
            year={calYear}
            month={calMonth}
            onMonthChange={handleMonthChange}
            selectedDates={editingVehicle.washDates}
            onDateToggle={(date) => toggleWashDate(editingVehicle.id, date)}
          />
          <p className="text-xs text-gray-300 text-center pb-6">
            日付をタップして洗車日を設定 / 解除
          </p>
        </div>
      </div>
    );
  }

  return null;
}
