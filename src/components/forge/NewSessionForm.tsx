'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DrillScoreForm } from './DrillScoreForm';
import { RypIndexGauge } from './RypIndexGauge';
import { DRILL_LABELS } from '@/lib/forge/constants';
import { computeRypIndex, indexTone } from '@/lib/forge/scoring';
import type { ForgeDrillType } from '@/lib/forge/constants';

type StepId = 'setup' | ForgeDrillType | 'complete';

const DRILL_STEPS: ForgeDrillType[] = ['driving', 'approach', 'chipping', 'putting'];

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

function stepColour(drill: ForgeDrillType, score: number | undefined): string {
  if (score === undefined) return 'rgba(237, 232, 220, 0.25)';
  const tone = indexTone(drill, score);
  if (tone === 'elite' || tone === 'tour') return FAIRWAY;
  if (tone === 'strong' || tone === 'average') return BONE;
  if (tone === 'developing') return ASH;
  return CLAY;
}

function signed(n: number | undefined): string {
  if (n === undefined) return '—';
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

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
    <div className="flex items-center gap-2" aria-label="Progress">
      {steps.map((step, idx) => {
        const isDone    = currentStep === 'complete' || idx < currentIdx;
        const isActive  = step.id === currentStep;
        const drillDone = DRILL_STEPS.includes(step.id as ForgeDrillType)
          && drillScores[step.id as ForgeDrillType] !== undefined;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className="h-px w-4 flex-shrink-0 transition-colors"
                style={{
                  background: isDone ? FAIRWAY : 'var(--border-subtle)',
                }}
              />
            )}
            <div
              className="w-7 h-7 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: (isDone || drillDone) ? FAIRWAY : 'transparent',
                color: (isDone || drillDone) ? '#0A0A0A'
                  : isActive ? FAIRWAY : ASH,
                border: (isDone || drillDone) ? '0'
                  : isActive ? `1.5px solid ${FAIRWAY}`
                  : '1px solid var(--border-subtle)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                fontSize: 11,
              }}
              aria-hidden="true"
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
  onCreated,
}: {
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
    <form onSubmit={(e) => { e.preventDefault(); void handleStart(e); }} className="space-y-6" noValidate>
      <div>
        <p className="ryp-label">New session</p>
        <h2 className="ryp-h2" style={{ marginTop: 8 }}>Start scoring</h2>
        <p style={{ color: ASH, fontSize: 13, marginTop: 6 }}>
          Score all four drills, one step at a time.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="session_date" className="ryp-label block">
          Session date
        </label>
        <input
          id="session_date"
          type="date"
          required
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="ryp-input"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="session_notes" className="ryp-label block">
          Notes — optional
        </label>
        <textarea
          id="session_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Conditions, goals, what you're working on."
          maxLength={1000}
          rows={3}
          className="ryp-input resize-none"
        />
      </div>

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

      <button
        type="submit"
        disabled={submitting}
        className="ryp-btn-primary w-full"
        style={{ padding: '12px 16px' }}
      >
        {submitting ? 'Creating session…' : 'Begin scoring →'}
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
  sessionId:     string;
  drillScores:   Partial<Record<ForgeDrillType, number>>;
  onViewSession: () => void;
  onNewSession:  () => void;
}) {
  const pillars = {
    driving_index:  drillScores.driving  ?? null,
    approach_index: drillScores.approach ?? null,
    chipping_index: drillScores.chipping ?? null,
    putting_index:  drillScores.putting  ?? null,
  };
  const rypResult = computeRypIndex(pillars);
  const pillarsN  = rypResult?.pillars_scored ?? 0;
  const [patchError, setPatchError] = useState<string | null>(null);
  const [patchState, setPatchState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const markComplete = React.useCallback(async () => {
    setPatchState('saving');
    setPatchError(null);
    try {
      const res = await fetch(`/api/forge/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setPatchState('saved');
    } catch (e) {
      setPatchState('error');
      setPatchError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [sessionId]);

  useEffect(() => {
    void markComplete();
  }, [markComplete]);

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="text-center">
        <p className="ryp-label" style={{ color: FAIRWAY }}>Session complete</p>
        <h2 className="ryp-h2" style={{ marginTop: 8 }}>Four drills in the books.</h2>
        {patchState === 'error' && patchError && (
          <div
            className="mt-4 px-3 py-2"
            style={{
              background: 'transparent',
              border: '1px solid rgba(199, 91, 57, 0.30)',
              borderRadius: 8,
              color: BONE,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'center',
            }}
            role="alert"
          >
            <span style={{ color: CLAY }}>Couldn&rsquo;t mark complete</span>
            <button
              type="button"
              onClick={() => { void markComplete(); }}
              className="ryp-btn-tertiary"
              style={{ fontSize: 13 }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <RypIndexGauge
        rypIndex={rypResult?.ryp_index ?? null}
        pillarsScored={pillarsN}
      />

      <div className="w-full space-y-3">
        {DRILL_STEPS.map((drill) => {
          const idx = drillScores[drill];
          return (
            <div
              key={drill}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span style={{ color: ASH, fontSize: 13 }}>
                {DRILL_LABELS[drill]}
              </span>
              <span
                className="ryp-mono"
                style={{ fontSize: 16, fontWeight: 500, color: stepColour(drill, idx) }}
              >
                {signed(idx)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onViewSession}
          className="ryp-btn-primary w-full"
          style={{ padding: '12px 16px' }}
        >
          View session detail →
        </button>
        <button
          onClick={onNewSession}
          className="ryp-btn-secondary w-full"
          style={{ padding: '12px 16px' }}
        >
          Start another session
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NewSessionForm() {
  const router = useRouter();

  const [sessionId,   setSessionId]   = useState<string | null>(null);
  const [currentStep, setStep]        = useState<StepId>('setup');
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
        onViewSession={() => router.push(`/sessions/${sessionId}`)}
        onNewSession={() => {
          setSessionId(null);
          setStep('setup');
          setDrillScores({});
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {sessionId && (
        <div className="flex items-center justify-between">
          <StepIndicator currentStep={currentStep} drillScores={drillScores} />
          <span className="ryp-label">
            {currentStep !== 'setup' && DRILL_LABELS[currentStep as ForgeDrillType]}
          </span>
        </div>
      )}

      {currentStep === 'setup' && (
        <SetupStep
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

