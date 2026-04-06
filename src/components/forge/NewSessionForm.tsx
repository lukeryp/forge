/**
 * NewSessionForm — Client Component
 *
 * Multi-step wizard for creating a FORGE session and scoring all 4 drills.
 *
 * Steps:
 *   0 — Session setup (date, notes)
 *   1 — Driving drill score
 *   2 — Approach drill score
 *   3 — Chipping drill score
 *   4 — Putting drill score
 *   5 — Completion screen (shows RYP index)
 *
 * The session is created on the server when the user advances from step 0.
 * Each drill score is submitted individually as the user completes each step.
 * If the user leaves mid-session, the in-progress session is preserved.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DrillScoreForm } from './DrillScoreForm';
import { RypIndexGauge } from './RypIndexGauge';
import { DRILL_LABELS } from '@/lib/forge/constants';
import { computeRypIndex } from '@/lib/forge/scoring';
import type { ForgeDrillType } from '@/lib/forge/constants';

interface NewSessionFormProps {
  playerId: string;
}

type StepId = 'setup' | ForgeDrillType | 'complete';

const DRILL_STEPS: ForgeDrillType[] = ['driving', 'approach', 'chipping', 'putting'];

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  drillScores,
}: {
  currentStep:  StepId;
  drillScores:  Partial<Record<ForgeDrillType, number>>;
}) {
  const steps: Array<{ id: StepId; label: string }> = [
    { id: 'setup',    label: 'Setup' },
    { id: 'driving',  label: 'Drive' },
    { id: 'approach', label: 'Approach' },
    { id: 'chipping', label: 'Chip' },
    { id: 'putting',  label: 'Putt' },
  ];

  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-1.5" aria-label="Progress">
      {steps.map((step, idx) => {
        const isDone    = currentStep === 'complete' || idx < currentIdx;
        const isActive  = step.id === currentStep;
        const drillDone = DRILL_STEPS.includes(step.id as ForgeDrillType)
          && drillScores[step.id as ForgeDrillType] !== undefined;

        return (
          <div key={step.id} className="flex items-center gap-1.5">
            {idx > 0 && (
              <div
                className={cn(
                  'h-px w-4 flex-shrink-0 transition-colors',
                  isDone ? 'bg-brand-green' : 'bg-white/[0.1]',
                )}
              />
            )}
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 transition-all',
                isDone || drillDone
                  ? 'bg-brand-green text-white'
                  : isActive
                    ? 'border-2 border-brand-green text-brand-green bg-transparent'
                    : 'border border-white/[0.15] text-muted-foreground/50 bg-transparent',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              {isDone || drillDone ? '✓' : idx + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Setup step ─────────────────────────────────────────────────────────────────

function SetupStep({
  playerId,
  onCreated,
}: {
  playerId:  string;
  onCreated: (sessionId: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date,       setDate]       = useState(today);
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/forge/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id:    playerId,
          session_date: date,
          notes:        notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Failed to create session');
        return;
      }

      const body = await res.json() as { data: { id: string } };
      onCreated(body.data.id);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => { void handleStart(e); }} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-bold">Start FORGE Session</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You&apos;ll score all 4 drills step by step.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="session_date" className="block text-sm font-medium">
          Session date
        </label>
        <input
          id="session_date"
          type="date"
          required
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green/50 focus:ring-1 focus:ring-brand-green/30"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="session_notes" className="block text-sm font-medium">
          Session notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="session_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Conditions, goals, what you&apos;re working on…"
          maxLength={1000}
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-brand-green/40 focus:ring-1 focus:ring-brand-green/20"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
          'bg-brand-green text-white hover:bg-brand-green/90 active:scale-[0.98]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {submitting ? 'Creating session…' : 'Begin Scoring →'}
      </button>
    </form>
  );
}

// ── Complete step ──────────────────────────────────────────────────────────────

function CompleteStep({
  sessionId,
  drillScores,
  onViewSession,
  onNewSession,
}: {
  sessionId:    string;
  drillScores:  Partial<Record<ForgeDrillType, number>>;
  onViewSession: () => void;
  onNewSession:  () => void;
}) {
  const pillars = {
    driving_index:  drillScores.driving  ?? null,
    approach_index: drillScores.approach ?? null,
    chipping_index: drillScores.chipping ?? null,
    putting_index:  drillScores.putting  ?? null,
  };
  const rypResult  = computeRypIndex(pillars);
  const pillarsN   = rypResult?.pillars_scored ?? 0;

  // Mark session complete in background
  useState(() => {
    void fetch(`/api/forge/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_at: new Date().toISOString() }),
    });
  });

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <p className="text-xs text-brand-green uppercase tracking-widest font-semibold mb-1">
          Session Complete
        </p>
        <h2 className="text-2xl font-bold">The Forge is done.</h2>
      </div>

      <RypIndexGauge
        rypIndex={rypResult?.ryp_index ?? null}
        pillarsScored={pillarsN}
      />

      {/* Per-pillar summary */}
      <div className="w-full space-y-2">
        {DRILL_STEPS.map((drill) => {
          const idx = drillScores[drill];
          return (
            <div key={drill} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{DRILL_LABELS[drill]}</span>
              <span
                className="font-semibold tabular-nums"
                style={{
                  color: idx === undefined ? 'rgba(255,255,255,0.3)'
                    : idx >= 75 ? '#00af51'
                    : idx >= 50 ? '#f4ee19'
                    : '#ef4444',
                }}
              >
                {idx !== undefined ? Math.round(idx) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onViewSession}
          className="w-full rounded-xl py-3 text-sm font-semibold bg-brand-green text-white hover:bg-brand-green/90 transition active:scale-[0.98]"
        >
          View Session Detail →
        </button>
        <button
          onClick={onNewSession}
          className="w-full rounded-xl py-3 text-sm font-medium border border-white/[0.1] hover:bg-white/[0.04] transition"
        >
          Start Another Session
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NewSessionForm({ playerId }: NewSessionFormProps) {
  const router = useRouter();

  const [sessionId,   setSessionId]  = useState<string | null>(null);
  const [currentStep, setStep]       = useState<StepId>('setup');
  const [drillScores, setDrillScores] = useState<Partial<Record<ForgeDrillType, number>>>({});

  const currentDrillIdx = DRILL_STEPS.indexOf(currentStep as ForgeDrillType);
  const isLastDrill     = currentDrillIdx === DRILL_STEPS.length - 1;

  function handleDrillSuccess(drill: ForgeDrillType, skillIndex: number) {
    const updated = { ...drillScores, [drill]: skillIndex };
    setDrillScores(updated);

    if (isLastDrill) {
      setStep('complete');
    } else {
      const nextDrill = DRILL_STEPS[currentDrillIdx + 1];
      if (nextDrill) setStep(nextDrill);
    }
  }

  function handleBack() {
    if (currentDrillIdx <= 0) return;
    const prevDrill = DRILL_STEPS[currentDrillIdx - 1];
    if (prevDrill) setStep(prevDrill);
  }

  if (currentStep === 'complete' && sessionId) {
    return (
      <CompleteStep
        sessionId={sessionId}
        drillScores={drillScores}
        onViewSession={() => router.push(`/forge/sessions/${sessionId}`)}
        onNewSession={() => {
          setSessionId(null);
          setStep('setup');
          setDrillScores({});
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator (shown once session is created) */}
      {sessionId && (
        <div className="flex items-center justify-between">
          <StepIndicator
            currentStep={currentStep}
            drillScores={drillScores}
          />
          <span className="text-xs text-muted-foreground">
            {currentStep !== 'setup' && `${DRILL_LABELS[currentStep as ForgeDrillType]} drill`}
          </span>
        </div>
      )}

      {currentStep === 'setup' && (
        <SetupStep
          playerId={playerId}
          onCreated={(id) => {
            setSessionId(id);
            setStep('driving');
          }}
        />
      )}

      {DRILL_STEPS.includes(currentStep as ForgeDrillType) && sessionId && (
        <DrillScoreForm
          sessionId={sessionId}
          drillType={currentStep as ForgeDrillType}
          onSuccess={handleDrillSuccess}
          onCancel={currentDrillIdx > 0 ? handleBack : undefined}
          isLastDrill={isLastDrill}
        />
      )}
    </div>
  );
}
