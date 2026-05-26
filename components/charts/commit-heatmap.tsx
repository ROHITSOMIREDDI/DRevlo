'use client';

import React from 'react';
import { format, subDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface CommitData {
  date: string; // YYYY-MM-DD
  count: number;
}

interface CommitHeatmapProps {
  commits: CommitData[];
  days?: number;
}

export default function CommitHeatmap({ commits, days = 90 }: CommitHeatmapProps) {
  const today = new Date();
  const startDate = subDays(today, days);
  
  // Align start date to the beginning of the week
  const gridStartDate = startOfWeek(startDate);

  // Generate all days in the interval
  const allDays = eachDayOfInterval({
    start: gridStartDate,
    end: today,
  });

  // Helper to determine background color intensity based on commit count
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-slate-900 border-slate-950/20';
    if (count <= 2) return 'bg-cyan-950/80 border-cyan-800/20 text-cyan-400';
    if (count <= 5) return 'bg-cyan-800/80 border-cyan-600/30 text-cyan-200';
    if (count <= 8) return 'bg-cyan-600/80 border-cyan-400/40 text-cyan-100';
    return 'bg-cyan-400 border-cyan-200 text-slate-950 shadow-lg shadow-cyan-400/20';
  };

  // Group days by week (for column layout)
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  allDays.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Weekday labels
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-100">Commit Heatmap</h3>
          <p className="text-xs text-slate-400">Contribution frequency over the selected period</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
          <span>Less</span>
          <div className="h-3 w-3 rounded bg-slate-900 border border-slate-950/20" />
          <div className="h-3 w-3 rounded bg-cyan-950/80" />
          <div className="h-3 w-3 rounded bg-cyan-800/80" />
          <div className="h-3 w-3 rounded bg-cyan-600/80" />
          <div className="h-3 w-3 rounded bg-cyan-400" />
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[640px]">
          {/* Weekday labels column */}
          <div className="grid grid-rows-7 gap-1 pr-3 text-[10px] text-slate-500 font-bold text-right pt-6 select-none">
            {weekdays.map((day, idx) => (
              <div key={day} className="h-3 flex items-center justify-end">
                {idx % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>

          {/* Grid columns of weeks */}
          <div className="flex-1 flex gap-1">
            {weeks.map((week, weekIdx) => {
              // Extract month label if week starts a new month
              const showMonthLabel =
                weekIdx === 0 ||
                (weekIdx > 0 &&
                  week[0].getMonth() !== weeks[weekIdx - 1][0].getMonth());

              return (
                <div key={weekIdx} className="flex flex-col gap-1 relative">
                  {/* Month Label */}
                  {showMonthLabel && (
                    <span className="absolute top-0 left-0 -translate-y-5 text-[9px] font-bold text-slate-500 tracking-wider uppercase select-none">
                      {format(week[0], 'MMM')}
                    </span>
                  )}

                  {/* Offset empty header for month labels */}
                  <div className="h-2" />

                  {week.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const commitRecord = commits.find((c) => c.date === dateStr);
                    const count = commitRecord ? commitRecord.count : 0;
                    const intensityClass = getIntensityClass(count);

                    return (
                      <div
                        key={dateStr}
                        className={`h-3 w-3 rounded border transition-all duration-150 hover:scale-125 hover:z-10 group relative cursor-pointer ${intensityClass}`}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-32 -translate-x-1/2 scale-0 rounded-lg border border-slate-800 bg-slate-900 p-2 text-center text-[10px] font-semibold text-slate-200 shadow-2xl transition-all duration-100 group-hover:scale-100 pointer-events-none">
                          <p className="text-slate-100">{count} commits</p>
                          <p className="text-[8px] text-slate-500">{format(day, 'MMM d, yyyy')}</p>
                          <div className="absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1 rotate-45 border-r border-b border-slate-800 bg-slate-900" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
