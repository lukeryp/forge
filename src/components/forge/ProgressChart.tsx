/**
 * ProgressChart — Client Component
 *
 * Renders the historical FORGE progress chart using Recharts.
 * Shows RYP Performance Index over time (primary) with per-pillar
 * lines toggleable via legend clicks.
 *
 * Must be a Client Component because Recharts is browser-only.
 */

'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ForgeHistoryPoint } from '@/lib/forge/schemas';
import { DRILL_LABELS } from '@/lib/forge/constants';

interface ProgressChartProps {
  history:   ForgeHistoryPoint[];
  className?: string;
}

type ChartLine = 'ryp' | 'driving' | 'approach' | 'chipping' | 'putting';

const LINE_CONFIG: Record<ChartLine, { key: string; label: string; color: string; dash?: string }> = {
  ryp:      { key: 'ryp_index',      label: 'RYP Index',               color: '#00af51' },
  driving:  { key: 'driving_index',  label: DRILL_LABELS.driving,      color: '#f4ee19',  dash: '4 4' },
  approach: { key: 'approach_index', label: DRILL_LABELS.approach,     color: '#60a5fa',  dash: '4 4' },
  chipping: { key: 'chipping_index', label: DRILL_LABELS.chipping,     color: '#a78bfa',  dash: '4 4' },
  putting:  { key: 'putting_index',  label: DRILL_LABELS.putting,      color: '#fb923c',  dash: '4 4' },
};

interface CustomTooltipProps {
  active?:  boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?:   string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm min-w-[140px]">
      <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        entry.value !== null && entry.value !== undefined ? (
          <div key={entry.name} className="flex items-center justify-between gap-4 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground text-xs">{entry.name}</span>
            </div>
            <span className="font-semibold tabular-nums" style={{ color: entry.color }}>
              {Math.round(entry.value)}
            </span>
          </div>
        ) : null
      ))}
    </div>
  );
}

export function ProgressChart({ history, className }: ProgressChartProps) {
  const [hiddenLines, setHiddenLines] = useState<Set<ChartLine>>(new Set(['driving', 'approach', 'chipping', 'putting']));

  if (history.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-muted-foreground text-sm', className)}>
        No completed sessions yet — finish a session to see your progress.
      </div>
    );
  }

  function toggleLine(line: ChartLine) {
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) {
        next.delete(line);
      } else {
        next.add(line);
      }
      return next;
    });
  }

  const chartData = history.map((point) => ({
    ...point,
    // Format date for display: "Apr 2"
    date: new Date(point.session_date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
    }),
  }));

  return (
    <div className={cn('space-y-4', className)}>
      {/* Legend toggles */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(LINE_CONFIG) as [ChartLine, typeof LINE_CONFIG[ChartLine]][]).map(
          ([key, config]) => (
            <button
              key={key}
              onClick={() => toggleLine(key)}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all',
                hiddenLines.has(key)
                  ? 'border-white/[0.06] text-muted-foreground/50 bg-transparent'
                  : 'border-white/[0.1] text-foreground bg-white/[0.04]',
              )}
              aria-pressed={!hiddenLines.has(key)}
              aria-label={`Toggle ${config.label} line`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: hiddenLines.has(key) ? 'rgba(255,255,255,0.2)' : config.color }}
              />
              {config.label}
            </button>
          ),
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip content={<CustomTooltip />} />

          {(Object.entries(LINE_CONFIG) as [ChartLine, typeof LINE_CONFIG[ChartLine]][]).map(
            ([key, config]) => (
              <Line
                key={key}
                type="monotone"
                dataKey={config.key}
                name={config.label}
                stroke={config.color}
                strokeWidth={key === 'ryp' ? 2.5 : 1.5}
                strokeDasharray={config.dash}
                dot={key === 'ryp' ? { r: 3, fill: config.color, strokeWidth: 0 } : false}
                activeDot={{ r: 5, strokeWidth: 0 }}
                connectNulls
                hide={hiddenLines.has(key)}
              />
            ),
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
