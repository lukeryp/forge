/**
 * DrillScoreForm — Client Component
 *
 * A self-contained form for entering one drill score.
 * Renders the correct input fields based on the selected game type.
 * Validates inputs client-side with the same Zod schemas used by the API.
 * On submit, POSTs to /api/forge/sessions/[id]/drills.
 *
 * Used inside NewSessionForm as a step-by-step wizard.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FORGE_GAME_CONFIGS, GAMES_BY_DRILL, DRILL_LABELS, DIFFICULTY_STYLES } from '@/lib/forge/constants';
import {
  FairwayFunnelsInputSchema,
  ColdStartInputSchema,
  TheGauntletInputSchema,
  NeverRepeatInputSchema,
  NineShotInputSchema,
  TheLadderInputSchema,
  UpAndDownSurvivorInputSchema,
  PressureChipInputSchema,
  GateDrillInputSchema,
  SpeedLadderInputSchema,
  TheCloserInputSchema,
} from '@/lib/forge/schemas';
import type { ForgeDrillType, ForgeGameType } from '@/lib/forge/constants';

interface DrillScoreFormProps {
  sessionId:  string;
  drillType:  ForgeDrillType;
  /** Called after a successful submission */
  onSuccess:  (drillType: ForgeDrillType, skillIndex: number) => void;
  onCancel?:  () => void;
  /** Show a different CTA when scoring the last drill */
  isLastDrill?: boolean;
}

// ── Number input helper ────────────────────────────────────────────────────────

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
  description,
  id,
}: {
  label:        string;
  value:        number;
  min:          number;
  max:          number;
  onChange:     (v: number) => void;
  description?: string;
  id:           string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg font-medium hover:bg-white/[0.1] transition active:scale-95"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className="w-20 text-center bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-2 text-sm font-semibold focus:outline-none focus:border-brand-green/50 focus:ring-1 focus:ring-brand-green/30"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg font-medium hover:bg-white/[0.1] transition active:scale-95"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
        >
          +
        </button>
        <span className="text-xs text-muted-foreground">
          / {max}
        </span>
      </div>
    </div>
  );
}

function BooleanInput({
  label,
  value,
  onChange,
  id,
}: {
  label:    string;
  value:    boolean;
  onChange: (v: boolean) => void;
  id:       string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <label htmlFor={id} className="text-sm font-medium cursor-pointer">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          'w-12 h-6 rounded-full border transition-all duration-200 relative flex-shrink-0',
          value
            ? 'bg-brand-green border-brand-green'
            : 'bg-white/[0.08] border-white/[0.12]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
            value ? 'translate-x-6' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

// ── Per-game input forms ───────────────────────────────────────────────────────

function FairwayFunnelsForm({ value, onChange }: {
  value:    Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const set = (key: string, v: number) => onChange({ ...value, [key]: v });
  const SEGMENTS = [
    { key: 'segment_1_hits', label: 'Segment 1 (30 yd fairway)', hint: 'Hits out of 5' },
    { key: 'segment_2_hits', label: 'Segment 2 (25 yd fairway)', hint: 'Hits out of 5' },
    { key: 'segment_3_hits', label: 'Segment 3 (20 yd fairway)', hint: 'Hits out of 5' },
    { key: 'segment_4_hits', label: 'Segment 4 (15 yd fairway)', hint: 'Hits out of 5 — hardest' },
  ];
  return (
    <div className="space-y-4">
      {SEGMENTS.map((seg) => (
        <NumberInput
          key={seg.key}
          id={seg.key}
          label={seg.label}
          description={seg.hint}
          value={value[seg.key] ?? 0}
          min={0}
          max={5}
          onChange={(v) => set(seg.key, v)}
        />
      ))}
      <NumberInput
        id="resets"
        label="Resets"
        description="How many times did you reset? (informational)"
        value={value.resets ?? 0}
        min={0}
        max={20}
        onChange={(v) => set('resets', v)}
      />
    </div>
  );
}

function ColdStartForm({ value, onChange }: {
  value:    Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
}) {
  const set = (key: string, v: boolean) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-0 divide-y divide-white/[0.06]">
      <BooleanInput
        id="drive_1_hit"
        label="Drive 1 — fairway hit?"
        value={value.drive_1_hit ?? false}
        onChange={(v) => set('drive_1_hit', v)}
      />
      <BooleanInput
        id="drive_2_hit"
        label="Drive 2 — fairway hit?"
        value={value.drive_2_hit ?? false}
        onChange={(v) => set('drive_2_hit', v)}
      />
      <BooleanInput
        id="drive_3_hit"
        label="Drive 3 — fairway hit?"
        value={value.drive_3_hit ?? false}
        onChange={(v) => set('drive_3_hit', v)}
      />
    </div>
  );
}

function GauntletForm({ value, onChange }: {
  value:    Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const scores = (value.hole_scores as number[]) ?? Array(9).fill(0);
  const LABELS = ['-1 (Birdie)', '0 (Par)', '+1 (Bogey)', '+2 (Double)'];

  function setHole(idx: number, v: number) {
    const next = [...scores];
    next[idx] = v;
    onChange({ ...value, hole_scores: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Score each simulated hole: -1 birdie, 0 par, +1 bogey, +2 double.</p>
      <div className="grid grid-cols-3 gap-2">
        {scores.map((s, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs text-muted-foreground">Hole {i + 1}</label>
            <select
              value={s}
              onChange={(e) => setHole(i, parseInt(e.target.value, 10))}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-green/50"
              aria-label={`Hole ${i + 1} score`}
            >
              {LABELS.map((lbl, v) => (
                <option key={v} value={v - 1}>{lbl}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <NumberInput
        id="gauntlet_resets"
        label="Resets (informational)"
        value={(value.resets as number) ?? 0}
        min={0}
        max={20}
        onChange={(v) => onChange({ ...value, resets: v })}
      />
    </div>
  );
}

function NeverRepeatForm({ value, onChange }: {
  value:    Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const set = (key: string, v: number) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-4">
      <NumberInput
        id="shots_completed"
        label="Shots completed"
        description="Total shots before reset (or 40 if no reset)"
        value={value.shots_completed ?? 40}
        min={1}
        max={40}
        onChange={(v) => set('shots_completed', v)}
      />
      <div className="space-y-1.5">
        <label htmlFor="avg_score" className="block text-sm font-medium">
          Average score per shot
        </label>
        <p className="text-xs text-muted-foreground">Approach Skill Index average. 0 = par quality, negative = better.</p>
        <input
          id="avg_score"
          type="number"
          step="0.1"
          value={value.avg_score_per_shot ?? 0}
          min={-2}
          max={4}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) set('avg_score_per_shot', Math.min(4, Math.max(-2, v)));
          }}
          className="w-28 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green/50"
        />
      </div>
      <NumberInput
        id="nr_resets"
        label="Resets (informational)"
        value={value.resets ?? 0}
        min={0}
        max={20}
        onChange={(v) => set('resets', v)}
      />
    </div>
  );
}

function NineShotForm({ value, onChange }: {
  value:    Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const scores = (value.shot_scores as number[]) ?? Array(9).fill(0);
  const COMBOS = [
    'Low Draw', 'Low Straight', 'Low Fade',
    'Mid Draw', 'Mid Straight', 'Mid Fade',
    'High Draw', 'High Straight', 'High Fade',
  ];

  function setShot(idx: number, v: number) {
    const next = [...scores];
    next[idx] = v;
    onChange({ ...value, shot_scores: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        -1 = birdie (shape AND trajectory correct), 0 = par (one correct), +1 = bogey (neither).
      </p>
      <div className="space-y-2">
        {COMBOS.map((combo, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground flex-1">{combo}</span>
            <div className="flex gap-2">
              {[-1, 0, 1].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setShot(i, v)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-xs font-semibold border transition-all',
                    scores[i] === v
                      ? v === -1
                        ? 'bg-brand-green/20 border-brand-green text-brand-green'
                        : v === 0
                          ? 'bg-brand-yellow/20 border-brand-yellow text-brand-yellow'
                          : 'bg-red-500/20 border-red-400 text-red-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:bg-white/[0.08]',
                  )}
                  aria-label={`Shot ${i + 1}: ${v === -1 ? 'birdie' : v === 0 ? 'par' : 'bogey'}`}
                  aria-pressed={scores[i] === v}
                >
                  {v === -1 ? '−1' : v === 0 ? '0' : '+1'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleRungsForm({ value, onChange, max, label, description }: {
  value:       Record<string, number>;
  onChange:    (v: Record<string, number>) => void;
  max:         number;
  label:       string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <NumberInput
        id="rungs_completed"
        label={label}
        description={description}
        value={value.rungs_completed ?? 0}
        min={0}
        max={max}
        onChange={(v) => onChange({ ...value, rungs_completed: v })}
      />
      <NumberInput
        id="rungs_resets"
        label="Resets (informational)"
        value={value.resets ?? 0}
        min={0}
        max={20}
        onChange={(v) => onChange({ ...value, resets: v })}
      />
    </div>
  );
}

function UpAndDownForm({ value, onChange }: {
  value:    Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  return (
    <div className="space-y-4">
      <NumberInput
        id="ud_made"
        label="Up-and-downs made"
        description="Out of 10 attempts from varied lies and distances"
        value={value.made ?? 0}
        min={0}
        max={10}
        onChange={(v) => onChange({ made: v, total: 10, rounds_to_survive: value.rounds_to_survive ?? 1 })}
      />
      <NumberInput
        id="rounds_to_survive"
        label="Survival rounds needed (informational)"
        description="1 if you survived on the first try"
        value={value.rounds_to_survive ?? 1}
        min={1}
        max={10}
        onChange={(v) => onChange({ ...value, rounds_to_survive: v })}
      />
    </div>
  );
}

function PressureChipFormInputs({ value, onChange }: {
  value:    Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const net = value.net_points ?? 0;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="net_points" className="block text-sm font-medium">
          Net points
        </label>
        <p className="text-xs text-muted-foreground">
          Towel land + within 1 club = +1. Miss towel = −1. Range: −10 to +10. Target = +5.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...value, net_points: Math.max(-10, net - 1) })}
            disabled={net <= -10}
            className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg hover:bg-white/[0.1] transition active:scale-95 disabled:opacity-40"
            aria-label="Decrease net points"
          >
            −
          </button>
          <span
            className={cn(
              'w-16 text-center text-2xl font-bold tabular-nums',
              net > 0 ? 'text-brand-green' : net < 0 ? 'text-red-400' : 'text-muted-foreground',
            )}
            aria-live="polite"
          >
            {net > 0 ? `+${net}` : net}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...value, net_points: Math.min(10, net + 1) })}
            disabled={net >= 10}
            className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg hover:bg-white/[0.1] transition active:scale-95 disabled:opacity-40"
            aria-label="Increase net points"
          >
            +
          </button>
        </div>
      </div>
      {net >= 5 && (
        <p className="text-xs text-brand-green font-medium">
          Target achieved (+5)
        </p>
      )}
    </div>
  );
}

function GateDrillFormInputs({ value, onChange }: {
  value:    Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const set = (key: string, v: number) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-4">
      <NumberInput
        id="gate_made"
        label="Putts made through gate"
        description="Pass threshold = 8 of 10. Missing the gate = double failure."
        value={value.made ?? 0}
        min={0}
        max={10}
        onChange={(v) => set('made', v)}
      />
      <NumberInput
        id="gate_misses"
        label="Gate misses (ball clipped a tee)"
        description="Gate misses for coaching insight — recorded separately"
        value={value.gate_misses ?? 0}
        min={0}
        max={10}
        onChange={(v) => set('gate_misses', v)}
      />
      <NumberInput
        id="total_putts"
        label="Total putts (including penalty rounds)"
        value={value.total_putts ?? 10}
        min={10}
        max={50}
        onChange={(v) => set('total_putts', v)}
      />
    </div>
  );
}

function TheCloserFormInputs({ value, onChange }: {
  value:    Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const set = (key: string, v: number) => onChange({ ...value, [key]: v });
  const stages = value.stages_completed ?? 0;

  return (
    <div className="space-y-4">
      <NumberInput
        id="closer_stages"
        label="Stages completed"
        description="Stage 1 (6ft): need 4/5. Stage 2 (8ft): 3/5. Stage 3 (10ft): 2/5."
        value={stages}
        min={0}
        max={3}
        onChange={(v) => set('stages_completed', v)}
      />
      {stages >= 1 && (
        <NumberInput
          id="stage_1_made"
          label="Stage 1 made (6ft)"
          value={value.stage_1_made ?? 0}
          min={0}
          max={5}
          onChange={(v) => set('stage_1_made', v)}
        />
      )}
      {stages >= 2 && (
        <NumberInput
          id="stage_2_made"
          label="Stage 2 made (8ft)"
          value={value.stage_2_made ?? 0}
          min={0}
          max={5}
          onChange={(v) => set('stage_2_made', v)}
        />
      )}
      {stages >= 3 && (
        <NumberInput
          id="stage_3_made"
          label="Stage 3 made (10ft)"
          value={value.stage_3_made ?? 0}
          min={0}
          max={5}
          onChange={(v) => set('stage_3_made', v)}
        />
      )}
      <NumberInput
        id="closer_resets"
        label="Full sequence resets (informational)"
        value={value.resets ?? 0}
        min={0}
        max={20}
        onChange={(v) => set('resets', v)}
      />
    </div>
  );
}

// ── Default inputs per game ────────────────────────────────────────────────────

function defaultInputs(gameType: ForgeGameType): Record<string, unknown> {
  switch (gameType) {
    case 'fairway_funnels':      return { segment_1_hits: 0, segment_2_hits: 0, segment_3_hits: 0, segment_4_hits: 0, resets: 0 };
    case 'cold_start':           return { drive_1_hit: false, drive_2_hit: false, drive_3_hit: false };
    case 'the_gauntlet':         return { hole_scores: Array(9).fill(0), resets: 0 };
    case 'never_repeat':         return { shots_completed: 40, avg_score_per_shot: 0, resets: 0 };
    case 'nine_shot':            return { shot_scores: Array(9).fill(0) };
    case 'the_ladder':           return { rungs_completed: 0, resets: 0 };
    case 'up_and_down_survivor': return { made: 0, total: 10, rounds_to_survive: 1 };
    case 'pressure_chip':        return { net_points: 0, penalty_rounds: 0 };
    case 'gate_drill':           return { made: 0, gate_misses: 0, total_putts: 10 };
    case 'speed_ladder':         return { rungs_completed: 0, resets: 0 };
    case 'the_closer':           return { stage_1_made: 0, stage_2_made: 0, stage_3_made: 0, stages_completed: 0, resets: 0 };
  }
}

// ── Input validation helpers ────────────────────────────────────────────────────

function validateInputsForGame(
  gameType: ForgeGameType,
  inputs: Record<string, unknown>,
): string | null {
  const validators: Record<ForgeGameType, { safeParse: (d: unknown) => { success: boolean; error?: { flatten: () => { fieldErrors: Record<string, string[]> } } } }> = {
    fairway_funnels:      FairwayFunnelsInputSchema,
    cold_start:           ColdStartInputSchema,
    the_gauntlet:         TheGauntletInputSchema,
    never_repeat:         NeverRepeatInputSchema,
    nine_shot:            NineShotInputSchema,
    the_ladder:           TheLadderInputSchema,
    up_and_down_survivor: UpAndDownSurvivorInputSchema,
    pressure_chip:        PressureChipInputSchema,
    gate_drill:           GateDrillInputSchema,
    speed_ladder:         SpeedLadderInputSchema,
    the_closer:           TheCloserInputSchema,
  };
  const result = validators[gameType].safeParse(inputs);
  if (result.success) return null;
  const errs = result.error?.flatten().fieldErrors ?? {};
  return Object.values(errs).flat().join('. ') || 'Invalid inputs';
}

// ── Main form component ────────────────────────────────────────────────────────

export function DrillScoreForm({
  sessionId,
  drillType,
  onSuccess,
  onCancel,
  isLastDrill = false,
}: DrillScoreFormProps) {
  const games         = GAMES_BY_DRILL[drillType];
  // games is always non-empty (min 2 per drill) — safe to assert
  const firstGame     = games[0] as ForgeGameType;
  const [selectedGame, setSelectedGame] = useState<ForgeGameType>(firstGame);
  const [inputs,       setInputs]       = useState<Record<string, unknown>>(defaultInputs(firstGame));
  const [notes,        setNotes]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  function handleGameChange(game: ForgeGameType) {
    setSelectedGame(game);
    setInputs(defaultInputs(game));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const validationError = validateInputsForGame(selectedGame, inputs);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forge/sessions/${sessionId}/drills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drill_type: drillType,
          game_type:  selectedGame,
          raw_inputs: inputs,
          notes:      notes.trim() || undefined,
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

  const gameConfig = FORGE_GAME_CONFIGS[selectedGame];

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6" noValidate>
      {/* Drill heading */}
      <div>
        <h3 className="text-lg font-semibold">{DRILL_LABELS[drillType]}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Select a game and enter your scores</p>
      </div>

      {/* Game selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-xs">
          Choose game
        </p>
        <div className="space-y-2">
          {games.map((game) => {
            const cfg = FORGE_GAME_CONFIGS[game];
            return (
              <button
                key={game}
                type="button"
                onClick={() => handleGameChange(game)}
                className={cn(
                  'w-full text-left rounded-xl border p-3.5 transition-all duration-150',
                  selectedGame === game
                    ? 'border-brand-green/40 bg-brand-green/[0.08]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]',
                )}
                aria-pressed={selectedGame === game}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-semibold',
                      selectedGame === game && 'text-brand-green',
                    )}>
                      {cfg.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {cfg.description}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0',
                    DIFFICULTY_STYLES[cfg.difficulty],
                  )}>
                    {cfg.difficulty}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pass standard reminder */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-brand-yellow font-medium">Pass standard: </span>
          {gameConfig.passStandard}
        </p>
      </div>

      {/* Score inputs */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-xs">
          Your scores
        </p>
        {selectedGame === 'fairway_funnels' && (
          <FairwayFunnelsForm
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
          />
        )}
        {selectedGame === 'cold_start' && (
          <ColdStartForm
            value={inputs as Record<string, boolean>}
            onChange={(v) => setInputs(v)}
          />
        )}
        {selectedGame === 'the_gauntlet' && (
          <GauntletForm value={inputs} onChange={setInputs} />
        )}
        {selectedGame === 'never_repeat' && (
          <NeverRepeatForm
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
          />
        )}
        {selectedGame === 'nine_shot' && (
          <NineShotForm value={inputs} onChange={setInputs} />
        )}
        {selectedGame === 'the_ladder' && (
          <SimpleRungsForm
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
            max={5}
            label="Rungs completed (0–5)"
            description="How many targets did you reach before a reset?"
          />
        )}
        {selectedGame === 'up_and_down_survivor' && (
          <UpAndDownForm
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
          />
        )}
        {selectedGame === 'pressure_chip' && (
          <PressureChipFormInputs
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
          />
        )}
        {selectedGame === 'gate_drill' && (
          <GateDrillFormInputs
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
          />
        )}
        {selectedGame === 'speed_ladder' && (
          <SimpleRungsForm
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
            max={5}
            label="Rungs completed (0–5)"
            description="5ft, 10ft, 15ft, 20ft, 30ft — how many completed without a reset?"
          />
        )}
        {selectedGame === 'the_closer' && (
          <TheCloserFormInputs
            value={inputs as Record<string, number>}
            onChange={(v) => setInputs(v)}
          />
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="drill_notes" className="block text-sm font-medium text-muted-foreground">
          Notes (optional)
        </label>
        <textarea
          id="drill_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you notice? Tendencies, breakthroughs, conditions…"
          maxLength={500}
          rows={2}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-brand-green/40 focus:ring-1 focus:ring-brand-green/20"
        />
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 text-sm font-medium border border-white/[0.1] hover:bg-white/[0.04] transition"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'flex-1 rounded-xl py-3 text-sm font-semibold transition-all',
            'bg-brand-green text-white hover:bg-brand-green/90 active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {submitting
            ? 'Saving…'
            : isLastDrill
              ? 'Save & Complete Session'
              : 'Save Drill Score'
          }
        </button>
      </div>
    </form>
  );
}
