import { useMemo } from 'react';

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildGrid(year: number, month: number): (number | null)[] {
  // getDay(): 0=Sun … 6=Sat → convert to Mon-based: Mon=0 … Sun=6
  const rawDow = new Date(year, month, 1).getDay();
  const firstDow = (rawDow + 6) % 7;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function prevYM(year: number, month: number) {
  return month === 0 ? [year - 1, 11] : [year, month - 1];
}
function nextYM(year: number, month: number) {
  return month === 11 ? [year + 1, 0] : [year, month + 1];
}

interface Props {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  /** view mode: show count badges */
  countsByDate?: Record<string, number>;
  /** edit mode: show selected state + allow toggle */
  selectedDates?: string[];
  onDateToggle?: (date: string) => void;
}

export function MonthCalendar({ year, month, onMonthChange, countsByDate, selectedDates, onDateToggle }: Props) {
  const cells = useMemo(() => buildGrid(year, month), [year, month]);
  const selectedSet = useMemo(() => new Set(selectedDates ?? []), [selectedDates]);

  const now = new Date();
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const isEditMode = !!onDateToggle;

  const [py, pm] = prevYM(year, month);
  const [ny, nm] = nextYM(year, month);

  return (
    <div className="select-none">
      {/* Month header */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => onMonthChange(py, pm)}
          className="w-11 h-11 flex items-center justify-center text-xl font-light text-black"
          aria-label="前月"
        >
          ‹
        </button>
        <span className="text-sm font-medium tracking-wide">
          {year}年{month + 1}月
        </span>
        <button
          onClick={() => onMonthChange(ny, nm)}
          className="w-11 h-11 flex items-center justify-center text-xl font-light text-black"
          aria-label="経月"
        >
          ›
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs py-1 ${i === 5 || i === 6 ? 'text-gray-300' : 'text-gray-400'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;

          const dateStr = toDateStr(year, month, day);
          const isToday = dateStr === todayStr;
          const isSelected = selectedSet.has(dateStr);
          const count = countsByDate?.[dateStr];
          const hasMark = isEditMode ? isSelected : (count ?? 0) > 0;

          return (
            <button
              key={idx}
              disabled={!isEditMode}
              onClick={() => onDateToggle?.(dateStr)}
              className={`flex flex-col items-center py-1.5 gap-0.5 min-h-[2.75rem] ${
                isEditMode ? 'active:opacity-60' : 'cursor-default'
              }`}
            >
              <span
                className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors ${
                  hasMark
                    ? 'bg-black text-white'
                    : isToday
                    ? 'border border-black text-black'
                    : 'text-black'
                }`}
              >
                {day}
              </span>
              {/* count badge (view mode) */}
              {!isEditMode && count !== undefined && count > 0 && (
                <span className="text-[10px] font-bold text-black leading-none">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
