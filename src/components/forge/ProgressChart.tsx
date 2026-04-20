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

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

const LINE_CONFIG: Record<
  ChartLine,
  { key: string; label: string; color: string; dash?: string }
> = {
  ryp:      { key: 'ryp_index',      label: 'FORGE Index',         color: FAIRWAY },
  driving:  { key: 'driving_index',  label: DRILL_LABELS.driving,  color: BONE,  dash: '4 4' },
  approach: { key: 'approach_index', label: DRILL_LABELS.approach, color: ASH,   dash: '4 4' },
  chipping: { key: 'chipping_index', label: DRILL_LABELS.chipping, color: CLAY,  dash: '4 4' },
  putting:  { key: 'putting_index',  label: DRILL_LABELS.putting,  color: BONE,  dash: '2 3' },
};

interface CustomTooltipProps {
  active?:  boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?:   string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="px-3 py-2.5 min-w-[160px]"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
      }}
    >
      <p className="ryp-label" style={{ marginBottom: 6 }}>{label}</p>
      {payload.map((entry) =>
        entry.value !== null && entry.value !== undefined ? (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4"
            style={{ marginTop: 4 }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: entry.color }}
              />
              <span style={{ fontSize: 12, color: ASH }}>{entry.name}</span>
            </div>
            <span
              className="ryp-mono"
              style={{ fontSize: 13, fontWeight: 500, color: entry.color }}
            >
              {Math.round(entry.value)}
            </span>
          </div>
        ) : null,
      )}
    </div>
  );
}

export function ProgressChart({ history, className }: ProgressChartProps) {
  const [hiddenLines, setHiddenLines] = useState<Set<ChartLine>>(
    new Set(['driving', 'approach', 'chipping', 'putting']),
  );

  if (history.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center h-48', className)}
        style={{ color: 'var(--text-muted)', fontSize: 14 }}
      >
        No completed sessions yet — finish a session to see your progress.
      </div>
    );
  }

  function toggleLine(line: ChartLine) {
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }

  const chartData = history.map((point) => ({
    ...point,
    date: new Date(point.session_date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
    }),
  }));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(LINE_CONFIG) as [ChartLine, typeof LINE_CONFIG[ChartLine]][]).map(
          ([key, config]) => {
            const isHidden = hiddenLines.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleLine(key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors"
                style={{
                  fontSize: 12,
                  color: isHidden ? ASH : BONE,
                  border: `1px solid ${isHidden ? 'var(--border-subtle)' : 'var(--border-medium)'}`,
                  borderRadius: 999,
                  background: 'transparent',
                  fontFamily: 'var(--font-ui)',
                }}
                aria-pressed={!isHidden}
                aria-label={`Toggle ${config.label} line`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: isHidden ? 'rgba(237, 232, 220, 0.25)' : config.color,
                  }}
                />
                {config.label}
              </button>
            );
          },
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(237, 232, 220, 0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: ASH, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[-15, 25]}
            tick={{ fill: ASH, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            ticks={[-10, -5, 0, 5, 10, 15, 20]}
            reversed
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
                strokeWidth={key === 'ryp' ? 2 : 1.25}
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
