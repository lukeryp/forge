'use client';

import { useMemo, useState } from 'react';
import {
  DRILL_LABELS,
  DRIVING_COLUMNS,
  DRIVING_LEVELS,
  DRIVING_SESSION_BALLS,
  DRIVING_SHAPE_PRESCRIPTION,
  APPROACH_OUTCOMES,
  APPROACH_VERSIONS,
  APPROACH_SESSION_BALLS,
  CHIPPING_LEVELS,
  CHIPPING_LIES,
  CHIPPING_SESSION_BALLS,
  PUTTING_OUTCOMES,
  PUTTING_TIERS,
} from '@/lib/forge/constants';
import { scoreDriving, scoreApproach, scoreChipping, scorePutting, skillIndexLabel } from '@/lib/forge/scoring';
import type { ForgeDrillType } from '@/lib/forge/constants';

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

interface DrillScoreFormProps {
  sessionId:  string;
  drillType:  ForgeDrillType;
  onSuccess:  (drillType: ForgeDrillType, skillIndex: number) => void;
  onCancel?:  () => void;
  isLastDrill?: boolean;
}

// ── Shared outcome button ─────────────────────────────────────────────────────

function OutcomeButton({
  label,
  points,
  onClick,
  disabled,
  shortcut,
}: {
  label:    string;
  points:   number;
  onClick:  () => void;
  disabled: boolean;
  shortcut?: string;
}) {
  const colour = points < 0 ? FAIRWAY : points === 0 ? BONE : CLAY;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-4 py-3 transition-colors"
      style={{
        background: 'transparent',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        color: BONE,
        minHeight: 56,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: BONE }}>{label}</p>
          {shortcut && (
            <p className="ryp-mono" style={{ fontSize: 10, color: ASH, marginTop: 2 }}>
              {shortcut}
            </p>
          )}
        </div>
        <span
          className="ryp-mono"
          style={{ fontSize: 18, fontWeight: 500, color: colour }}
        >
          {points > 0 ? `+${points}` : points}
        </span>
      </div>
    </button>
  );
}

// ── Outcome log (compact per-ball history) ────────────────────────────────────

function OutcomeLog({
  outcomes,
  points,
  onUndo,
  target,
  shapePrescription,
}: {
  outcomes: string[];
  points:   number;
  onUndo:   () => void;
  target:   number;
  shapePrescription?: Record<number, { shape: string; club: string }>;
}) {
  return (
    <div
      className="px-4 py-3"
      style={{
        background: 'var(--surface-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
      }}
    >
      <div className="flex items-baseline justify-between">
        <p className="ryp-label">Running total</p>
        <p
          className="ryp-mono"
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: points < 0 ? FAIRWAY : points === 0 ? BONE : CLAY,
          }}
        >
          {points > 0 ? `+${points}` : points}
        </p>
      </div>
      <p className="ryp-mono" style={{ fontSize: 11, color: ASH, marginTop: 4 }}>
        {outcomes.length} / {target} shots
      </p>

      {outcomes.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {outcomes.map((o, i) => {
              const nextShot = i + 1;
              const prescribed = shapePrescription?.[nextShot];
              return (
                <span
                  key={i}
                  className="ryp-mono"
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    color: ASH,
                  }}
                  title={prescribed ? `Shot ${nextShot}: ${prescribed.shape} with ${prescribed.club}` : `Shot ${nextShot}`}
                >
                  {nextShot}.{o.slice(0, 3)}
                </span>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onUndo}
            className="ryp-btn-tertiary"
            style={{ marginTop: 12, fontSize: 12 }}
          >
            ← Undo last
          </button>
        </>
      )}
    </div>
  );
}

// ── Driving ───────────────────────────────────────────────────────────────────

function DrivingForm({
  onSubmit, submitting, error, onCancel, isLastDrill, defaults,
}: {
  onSubmit: (inputs: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
  onCancel?: () => void;
  isLastDrill: boolean;
  defaults: { gender: 'men' | 'women'; avg_distance_yd: number };
}) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [gender, setGender] = useState<'men' | 'women'>(defaults.gender);
  const [distance, setDistance] = useState<number>(defaults.avg_distance_yd);
  const [outcomes, setOutcomes] = useState<string[]>([]);

  const nextShot = outcomes.length + 1;
  const prescribed = DRIVING_SHAPE_PRESCRIPTION[nextShot];

  const index = useMemo(() => {
    if (outcomes.length === 0) return null;
    return scoreDriving({
      level,
      gender,
      avg_distance_yd: distance,
      ball_outcomes: outcomes as ('bad_left' | 'good_left' | 'fairway' | 'good_right' | 'bad_right')[],
    });
  }, [outcomes, level, gender, distance]);

  const levelCfg = DRIVING_LEVELS.find((l) => l.level === level)!;

  function addOutcome(id: string) {
    setOutcomes((prev) => (prev.length >= 40 ? prev : [...prev, id]));
  }
  function undo() {
    setOutcomes((prev) => prev.slice(0, -1));
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      level,
      gender,
      avg_distance_yd: distance,
      ball_outcomes: outcomes,
    });
  }

  const runningTotal = outcomes.reduce((s, o) => {
    if (o === 'fairway') return s + levelCfg.fairway_hit_points;
    if (o === 'good_left' || o === 'good_right') return s + levelCfg.good_miss_points;
    if (o === 'bad_left' || o === 'bad_right') return s + levelCfg.bad_miss_points;
    return s;
  }, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="ryp-label block">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="ryp-input"
          >
            {DRIVING_LEVELS.map((l) => (
              <option key={l.level} value={l.level}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="ryp-label block">Gender baseline</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'men' | 'women')}
            className="ryp-input"
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
          </select>
        </div>
        <div className="col-span-2 space-y-2">
          <label className="ryp-label block">Average driving distance (yd)</label>
          <input
            type="number"
            min={100}
            max={350}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="ryp-input ryp-mono"
            placeholder="e.g. 270"
          />
          <p style={{ fontSize: 11, color: ASH }}>
            Used to set your handicap baseline. Current baseline shifts the final index.
          </p>
        </div>
      </div>

      <div
        className="px-4 py-3"
        style={{
          background: 'var(--surface-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
        }}
      >
        <p className="ryp-label" style={{ color: FAIRWAY }}>
          Shot {nextShot} of {DRIVING_SESSION_BALLS}
        </p>
        {prescribed ? (
          <p style={{ color: BONE, fontSize: 13, marginTop: 4 }}>
            Prescribed: <strong style={{ color: FAIRWAY }}>
              {prescribed.shape} with {prescribed.club}
            </strong>
          </p>
        ) : (
          <p style={{ color: ASH, fontSize: 12, marginTop: 4 }}>Player choice.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="ryp-label">Abacus — tap where the ball landed</p>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {DRIVING_COLUMNS.map((col) => {
            const pts =
              col.id === 'fairway'       ? levelCfg.fairway_hit_points :
              col.severity === 'good'    ? levelCfg.good_miss_points :
                                           levelCfg.bad_miss_points;
            const colour = pts < 0 ? FAIRWAY : pts === 0 ? BONE : CLAY;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => addOutcome(col.id)}
                disabled={outcomes.length >= 40}
                className="flex flex-col items-center justify-center px-1 py-3"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  cursor: outcomes.length >= 40 ? 'not-allowed' : 'pointer',
                  minHeight: 76,
                  minWidth: 44,
                }}
                aria-label={col.label}
              >
                <span
                  className="ryp-mono"
                  style={{ fontSize: 18, fontWeight: 500, color: colour }}
                >
                  {pts > 0 ? `+${pts}` : pts}
                </span>
                <span
                  style={{ fontSize: 10, color: ASH, marginTop: 4, textAlign: 'center', lineHeight: 1.15 }}
                >
                  {col.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <OutcomeLog
        outcomes={outcomes}
        points={runningTotal}
        onUndo={undo}
        target={DRIVING_SESSION_BALLS}
        shapePrescription={DRIVING_SHAPE_PRESCRIPTION}
      />

      {index !== null && (
        <div
          className="px-4 py-3 flex items-baseline justify-between"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        >
          <div>
            <p className="ryp-label">Ryp Driving Index — so far</p>
            <p style={{ color: BONE, fontSize: 13, marginTop: 2 }}>
              {skillIndexLabel('driving', index)}
            </p>
          </div>
          <p
            className="ryp-mono"
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: index <= -3 ? FAIRWAY : index <= 14 ? BONE : CLAY,
            }}
          >
            {index > 0 ? `+${index}` : index}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="px-3 py-2"
          style={{
            color: CLAY,
            fontSize: 13,
            background: 'rgba(199, 91, 57, 0.10)',
            border: '1px solid rgba(199, 91, 57, 0.30)',
            borderRadius: 8,
          }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="ryp-btn-secondary flex-1" style={{ padding: '12px 16px' }}>
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || outcomes.length === 0}
          className="ryp-btn-primary flex-1"
          style={{ padding: '12px 16px' }}
        >
          {submitting ? 'Saving…' : isLastDrill ? 'Save & complete session' : 'Save drill score'}
        </button>
      </div>
    </form>
  );
}

// ── Approach ──────────────────────────────────────────────────────────────────

function ApproachForm({
  onSubmit, submitting, error, onCancel, isLastDrill,
}: {
  onSubmit: (inputs: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
  onCancel?: () => void;
  isLastDrill: boolean;
}) {
  const [version, setVersion] = useState<'stock' | 'variable'>('stock');
  const [outcomes, setOutcomes] = useState<string[]>([]);

  const index = useMemo(() => {
    if (outcomes.length === 0) return null;
    return scoreApproach({
      version,
      ball_outcomes: outcomes as ('eagle' | 'birdie' | 'par' | 'double')[],
    });
  }, [outcomes, version]);

  function addOutcome(id: string) {
    setOutcomes((prev) => (prev.length >= 40 ? prev : [...prev, id]));
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ version, ball_outcomes: outcomes });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label className="ryp-label block">Session version</label>
        <div className="grid grid-cols-2 gap-2">
          {APPROACH_VERSIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVersion(v.id)}
              className="text-left p-3"
              style={{
                background: 'transparent',
                border: `1px solid ${version === v.id ? FAIRWAY : 'var(--border-subtle)'}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <p style={{ color: version === v.id ? FAIRWAY : BONE, fontSize: 13, fontWeight: 500 }}>
                {v.label}
              </p>
              <p style={{ color: ASH, fontSize: 11, marginTop: 2 }}>{v.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="ryp-label">
          Shot {outcomes.length + 1} of {APPROACH_SESSION_BALLS}
        </p>
        <div className="space-y-2">
          {APPROACH_OUTCOMES.map((o) => (
            <OutcomeButton
              key={o.id}
              label={o.label}
              points={o.points}
              onClick={() => addOutcome(o.id)}
              disabled={outcomes.length >= 40}
            />
          ))}
        </div>
      </div>

      <OutcomeLog
        outcomes={outcomes}
        points={index ?? 0}
        onUndo={() => setOutcomes((prev) => prev.slice(0, -1))}
        target={APPROACH_SESSION_BALLS}
      />

      {index !== null && (
        <div
          className="px-4 py-3 flex items-baseline justify-between"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        >
          <div>
            <p className="ryp-label">Ryp Approach Index — so far</p>
            <p style={{ color: BONE, fontSize: 13, marginTop: 2 }}>
              {skillIndexLabel('approach', index)}
            </p>
          </div>
          <p
            className="ryp-mono"
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: index <= -5 ? FAIRWAY : index <= 2 ? BONE : CLAY,
            }}
          >
            {index > 0 ? `+${index}` : index}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="px-3 py-2" style={{ color: CLAY, fontSize: 13, background: 'rgba(199,91,57,0.10)', border: '1px solid rgba(199,91,57,0.30)', borderRadius: 8 }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="ryp-btn-secondary flex-1" style={{ padding: '12px 16px' }}>
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || outcomes.length === 0}
          className="ryp-btn-primary flex-1"
          style={{ padding: '12px 16px' }}
        >
          {submitting ? 'Saving…' : isLastDrill ? 'Save & complete session' : 'Save drill score'}
        </button>
      </div>
    </form>
  );
}

// ── Chipping ──────────────────────────────────────────────────────────────────

function ChippingForm({
  onSubmit, submitting, error, onCancel, isLastDrill,
}: {
  onSubmit: (inputs: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
  onCancel?: () => void;
  isLastDrill: boolean;
}) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [lie, setLie] = useState<'fairway' | 'rough' | 'bunker' | 'mixed'>('mixed');
  const [outcomes, setOutcomes] = useState<string[]>([]);

  const levelCfg = CHIPPING_LEVELS.find((l) => l.level === level)!;

  const index = useMemo(() => {
    if (outcomes.length === 0) return null;
    return scoreChipping({
      level,
      lie,
      ball_outcomes: outcomes as ('birdie' | 'par' | 'bogey' | 'double' | 'triple')[],
    });
  }, [outcomes, level, lie]);

  function addOutcome(id: string) {
    setOutcomes((prev) => (prev.length >= 40 ? prev : [...prev, id]));
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ level, lie, ball_outcomes: outcomes });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="ryp-label block">Level</label>
          <select
            value={level}
            onChange={(e) => { setLevel(Number(e.target.value) as 1 | 2 | 3 | 4); setOutcomes([]); }}
            className="ryp-input"
          >
            {CHIPPING_LEVELS.map((l) => (
              <option key={l.level} value={l.level}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="ryp-label block">Lie</label>
          <select
            value={lie}
            onChange={(e) => setLie(e.target.value as typeof lie)}
            className="ryp-input"
          >
            <option value="mixed">Mixed</option>
            {CHIPPING_LIES.map((l) => (
              <option key={l} value={l}>{l[0]!.toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="ryp-label">
          Shot {outcomes.length + 1} of {CHIPPING_SESSION_BALLS}
        </p>
        <div className="space-y-2">
          {levelCfg.outcomes.map((o) => (
            <OutcomeButton
              key={o.id}
              label={o.label}
              points={o.points}
              onClick={() => addOutcome(o.id)}
              disabled={outcomes.length >= 40}
            />
          ))}
        </div>
      </div>

      <OutcomeLog
        outcomes={outcomes}
        points={index ?? 0}
        onUndo={() => setOutcomes((prev) => prev.slice(0, -1))}
        target={CHIPPING_SESSION_BALLS}
      />

      {index !== null && (
        <div
          className="px-4 py-3 flex items-baseline justify-between"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        >
          <div>
            <p className="ryp-label">Ryp Chipping Index — so far</p>
            <p style={{ color: BONE, fontSize: 13, marginTop: 2 }}>
              {skillIndexLabel('chipping', index)}
            </p>
          </div>
          <p
            className="ryp-mono"
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: index <= 0 ? FAIRWAY : index <= 12 ? BONE : CLAY,
            }}
          >
            {index > 0 ? `+${index}` : index}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="px-3 py-2" style={{ color: CLAY, fontSize: 13, background: 'rgba(199,91,57,0.10)', border: '1px solid rgba(199,91,57,0.30)', borderRadius: 8 }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="ryp-btn-secondary flex-1" style={{ padding: '12px 16px' }}>
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || outcomes.length === 0}
          className="ryp-btn-primary flex-1"
          style={{ padding: '12px 16px' }}
        >
          {submitting ? 'Saving…' : isLastDrill ? 'Save & complete session' : 'Save drill score'}
        </button>
      </div>
    </form>
  );
}

// ── Putting ───────────────────────────────────────────────────────────────────

function PuttingForm({
  onSubmit, submitting, error, onCancel, isLastDrill,
}: {
  onSubmit: (inputs: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
  onCancel?: () => void;
  isLastDrill: boolean;
}) {
  const [tier, setTier] = useState<0 | 1 | 2>(0);
  const [tier3, setTier3] = useState<string[]>([]);
  const [tier2, setTier2] = useState<string[]>([]);
  const [tier1, setTier1] = useState<string[]>([]);

  const currentTier = PUTTING_TIERS[tier]!;
  const currentOutcomes = tier === 0 ? tier3 : tier === 1 ? tier2 : tier1;
  const setCurrent = tier === 0 ? setTier3 : tier === 1 ? setTier2 : setTier1;

  const allOutcomes = [...tier3, ...tier2, ...tier1];
  const index = useMemo(() => {
    if (allOutcomes.length === 0) return null;
    return scorePutting({
      tier_3_outcomes: tier3 as ('make' | 'par' | 'miss')[],
      tier_2_outcomes: tier2 as ('make' | 'par' | 'miss')[],
      tier_1_outcomes: tier1 as ('make' | 'par' | 'miss')[],
    });
  }, [tier3, tier2, tier1, allOutcomes.length]);

  function addOutcome(id: string) {
    setCurrent((prev) => {
      if (prev.length >= currentTier.putts) return prev;
      const next = [...prev, id];
      if (next.length >= currentTier.putts && tier < 2) {
        queueMicrotask(() => setTier((tier + 1) as 0 | 1 | 2));
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      tier_3_outcomes: tier3,
      tier_2_outcomes: tier2,
      tier_1_outcomes: tier1,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <p className="ryp-label">Current tier</p>
        <div className="grid grid-cols-3 gap-2">
          {PUTTING_TIERS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(i as 0 | 1 | 2)}
              className="text-center py-3"
              style={{
                background: 'transparent',
                border: `1px solid ${i === tier ? FAIRWAY : 'var(--border-subtle)'}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <p style={{ color: i === tier ? FAIRWAY : BONE, fontSize: 13, fontWeight: 500 }}>{t.label}</p>
              <p className="ryp-mono" style={{ color: ASH, fontSize: 11, marginTop: 2 }}>
                {i === 0 ? tier3.length : i === 1 ? tier2.length : tier1.length} / {t.putts}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="ryp-label">
          {currentTier.label} · putt {currentOutcomes.length + 1} of {currentTier.putts}
        </p>
        <div className="space-y-2">
          {PUTTING_OUTCOMES.map((o) => (
            <OutcomeButton
              key={o.id}
              label={o.label}
              points={o.points}
              onClick={() => addOutcome(o.id)}
              disabled={allOutcomes.length >= 120}
            />
          ))}
        </div>
      </div>

      <OutcomeLog
        outcomes={currentOutcomes}
        points={index ?? 0}
        onUndo={() => setCurrent((prev) => prev.slice(0, -1))}
        target={currentTier.putts}
      />

      {index !== null && (
        <div
          className="px-4 py-3 flex items-baseline justify-between"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        >
          <div>
            <p className="ryp-label">Ryp Putting Index — so far</p>
            <p style={{ color: BONE, fontSize: 13, marginTop: 2 }}>
              {skillIndexLabel('putting', index)}
            </p>
          </div>
          <p
            className="ryp-mono"
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: index <= 0 ? FAIRWAY : index <= 5 ? BONE : CLAY,
            }}
          >
            {index > 0 ? `+${index}` : index}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="px-3 py-2" style={{ color: CLAY, fontSize: 13, background: 'rgba(199,91,57,0.10)', border: '1px solid rgba(199,91,57,0.30)', borderRadius: 8 }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="ryp-btn-secondary flex-1" style={{ padding: '12px 16px' }}>
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || allOutcomes.length === 0}
          className="ryp-btn-primary flex-1"
          style={{ padding: '12px 16px' }}
        >
          {submitting ? 'Saving…' : isLastDrill ? 'Save & complete session' : 'Save drill score'}
        </button>
      </div>
    </form>
  );
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

export function DrillScoreForm({
  sessionId,
  drillType,
  onSuccess,
  onCancel,
  isLastDrill = false,
}: DrillScoreFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(inputs: Record<string, unknown>) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forge/sessions/${sessionId}/drills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drill_type: drillType,
          raw_inputs: inputs,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Failed to save score. Please try again.');
        return;
      }

      const body = await res.json() as { data: { skill_index: number } };
      onSuccess(drillType, body.data.skill_index);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="ryp-label">{DRILL_LABELS[drillType]}</p>
        <h3 className="ryp-h2" style={{ marginTop: 8 }}>Score each ball as you go</h3>
      </div>

      {drillType === 'driving' && (
        <DrivingForm
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
          onCancel={onCancel}
          isLastDrill={isLastDrill}
          defaults={{ gender: 'men', avg_distance_yd: 255 }}
        />
      )}
      {drillType === 'approach' && (
        <ApproachForm onSubmit={handleSubmit} submitting={submitting} error={error} onCancel={onCancel} isLastDrill={isLastDrill} />
      )}
      {drillType === 'chipping' && (
        <ChippingForm onSubmit={handleSubmit} submitting={submitting} error={error} onCancel={onCancel} isLastDrill={isLastDrill} />
      )}
      {drillType === 'putting' && (
        <PuttingForm onSubmit={handleSubmit} submitting={submitting} error={error} onCancel={onCancel} isLastDrill={isLastDrill} />
      )}
    </div>
  );
}

