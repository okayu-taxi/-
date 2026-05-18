import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

const HOLIDAYS = new Set([
  // 2025
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05','2025-05-06',
  '2025-07-21','2025-08-11','2025-09-15','2025-09-23',
  '2025-10-13','2025-11-03','2025-11-23','2025-11-24',
  // 2026
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
  '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
  // 2027
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23',
  '2027-03-21','2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23',
  '2027-10-11','2027-11-03','2027-11-23',
]);

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
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
  countsByDate?: Record<string, number>;
  selectedDates?: string[];
  onDateToggle?: (date: string) => void;
  /** Date to visually highlight (view-only selection, not a wash mark). */
  highlightedDate?: string;
  /** Tap a date to select it without toggling a wash. */
  onDateSelect?: (date: string) => void;
  /** Tap the year/month header to jump back to today. */
  onTodayClick?: () => void;
}

export function MonthCalendar({
  year,
  month,
  onMonthChange,
  countsByDate,
  selectedDates,
  onDateToggle,
  highlightedDate,
  onDateSelect,
  onTodayClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selectedDates ?? []), [selectedDates]);

  const now = new Date();
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const isEditMode = !!onDateToggle;
  const tappable = isEditMode || !!onDateSelect;

  const [py, pm] = prevYM(year, month);
  const [ny, nm] = nextYM(year, month);

  // Re-center on the middle (current) page after every month change.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollLeft !== el.clientWidth) {
      el.scrollLeft = el.clientWidth;
    }
  }, [year, month]);

  // Detect when a swipe truly settles on prev/next page and update the month.
  // Use scrollend (iOS 16+/Chrome 114+) when available — it fires only after
  // the user's touch ends AND scroll-snap has fully settled, which avoids the
  // jank you get from interrupting the user with a scrollLeft reset mid-swipe.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const settle = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const ratio = el.scrollLeft / w;
      if (ratio < 0.5) {
        onMonthChange(py, pm);
      } else if (ratio > 1.5) {
        onMonthChange(ny, nm);
      }
    };

    if ('onscrollend' in window) {
      el.addEventListener('scrollend' as 'scroll', settle, { passive: true });
      return () => el.removeEventListener('scrollend' as 'scroll', settle);
    }

    // Fallback for older browsers: debounce, leaning long so snap finishes.
    let timer: number | null = null;
    const onScroll = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(settle, 200);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [py, pm, ny, nm, onMonthChange]);

  function renderGrid(y: number, m: number) {
    const cells = buildGrid(y, m);
    return (
      <div className="grid grid-cols-7 w-full">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;

          const dateStr = toDateStr(y, m, day);
          const isToday = dateStr === todayStr;
          const isSelected = selectedSet.has(dateStr);
          const isHighlighted = highlightedDate === dateStr;
          const count = countsByDate?.[dateStr];

          const col = idx % 7; // 0=Sun, 6=Sat
          const isSunday = col === 0;
          const isSaturday = col === 6;
          const isHoliday = HOLIDAYS.has(dateStr);
          const isRedDay = isSunday || isHoliday;

          // - Picked: black-filled circle (white number)
          // - Today (not picked): ring outline, natural number color
          let circleCls = '';
          let isFilled = false;
          if (isHighlighted && !isEditMode) {
            circleCls = 'bg-black text-white';
            isFilled = true;
          } else if (isToday) {
            circleCls = 'ring-1 ring-gray-400';
          }

          const numColor = isFilled
            ? ''
            : isRedDay ? 'text-red-500'
            : isSaturday ? 'text-blue-500'
            : 'text-black';

          return (
            <button
              key={idx}
              disabled={!tappable}
              onClick={() => {
                if (isEditMode) onDateToggle?.(dateStr);
                else onDateSelect?.(dateStr);
              }}
              className={`flex flex-col items-center py-0.5 gap-0 min-h-[2rem] ${
                tappable ? 'active:opacity-60' : 'cursor-default'
              }`}
            >
              <span
                className={`w-7 h-7 flex items-center justify-center text-sm rounded-full ${circleCls} ${numColor}`}
              >
                {day}
              </span>
              {!isEditMode && count !== undefined && count > 0 && (
                <span className="text-[10px] font-semibold text-gray-500 leading-tight tabular-nums">
                  {count}
                </span>
              )}
              {isEditMode && isSelected && (
                <span className="text-[10px] font-bold text-black leading-tight">
                  出番
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between py-1">
        <button
          onClick={() => onMonthChange(py, pm)}
          className="w-10 h-10 flex items-center justify-center text-xl font-light text-black"
          aria-label="前月"
        >
          ‹
        </button>
        {onTodayClick ? (
          <button
            onClick={onTodayClick}
            className="text-sm font-medium tracking-wide px-3 py-2 -my-2 active:opacity-60"
          >
            {year}年{month + 1}月
          </button>
        ) : (
          <span className="text-sm font-medium tracking-wide">
            {year}年{month + 1}月
          </span>
        )}
        <button
          onClick={() => onMonthChange(ny, nm)}
          className="w-10 h-10 flex items-center justify-center text-xl font-light text-black"
          aria-label="翌月"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7">
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs py-1 font-medium ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain"
      >
        <div className="snap-center shrink-0 w-full">
          {renderGrid(py, pm)}
        </div>
        <div className="snap-center shrink-0 w-full">
          {renderGrid(year, month)}
        </div>
        <div className="snap-center shrink-0 w-full">
          {renderGrid(ny, nm)}
        </div>
      </div>
    </div>
  );
}
