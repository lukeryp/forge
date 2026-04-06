/**
 * FORGE — drill game constants and configuration.
 *
 * This file is the authoritative source for:
 *   - Which games exist and which pillar they belong to
 *   - Human-readable labels for drills and games
 *   - Difficulty ratings (used in UI badges)
 *   - Scoring input bounds (used by Zod schemas + scoring engine)
 *
 * Scoring formulas live in lib/forge/scoring.ts.
 * Zod schemas live in lib/forge/schemas.ts.
 */

// ── Pillar types ───────────────────────────────────────────────────────────────

export const FORGE_DRILL_TYPES = ['driving', 'approach', 'chipping', 'putting'] as const;
export type ForgeDrillType = (typeof FORGE_DRILL_TYPES)[number];

// ── Game types ─────────────────────────────────────────────────────────────────

export const FORGE_GAME_TYPES = [
  // Driving
  'fairway_funnels',
  'cold_start',
  'the_gauntlet',
  // Approach
  'never_repeat',
  'nine_shot',
  'the_ladder',
  // Chipping
  'up_and_down_survivor',
  'pressure_chip',
  // Putting
  'gate_drill',
  'speed_ladder',
  'the_closer',
] as const;
export type ForgeGameType = (typeof FORGE_GAME_TYPES)[number];

// ── Difficulty levels ──────────────────────────────────────────────────────────

export const FORGE_DIFFICULTIES = ['moderate', 'high', 'extreme'] as const;
export type ForgeDifficulty = (typeof FORGE_DIFFICULTIES)[number];

// ── Game configuration registry ───────────────────────────────────────────────
// Authoritative mapping: game → drill type, label, difficulty, brief description.

export interface ForgeGameConfig {
  game:        ForgeGameType;
  drill:       ForgeDrillType;
  label:       string;
  difficulty:  ForgeDifficulty;
  description: string;
  /** Chapter 15 pass standard (shown as hint in UI) */
  passStandard: string;
}

export const FORGE_GAME_CONFIGS: Record<ForgeGameType, ForgeGameConfig> = {
  // ── Driving ──────────────────────────────────────────────────────────────────
  fairway_funnels: {
    game:         'fairway_funnels',
    drill:        'driving',
    label:        'Fairway Funnels',
    difficulty:   'moderate',
    description:  '20 balls across 4 narrowing fairway widths (30→25→20→15 yd). Reset if any segment scores below +5.',
    passStandard: 'Complete full 20-ball sequence without a reset.',
  },
  cold_start: {
    game:         'cold_start',
    drill:        'driving',
    label:        'Cold Start',
    difficulty:   'high',
    description:  '3 "first-tee" drives separated by approach shots. No warm-up. Full pre-shot routine on each.',
    passStandard: 'Score all 3 drives without a mechanical warm-up.',
  },
  the_gauntlet: {
    game:         'the_gauntlet',
    drill:        'driving',
    label:        'The Gauntlet',
    difficulty:   'extreme',
    description:  '9 declared holes on the range. One drive each. Par = 0. Restart if total reaches +5.',
    passStandard: 'Complete 9 holes at +4 or better.',
  },

  // ── Approach ──────────────────────────────────────────────────────────────────
  never_repeat: {
    game:         'never_repeat',
    drill:        'approach',
    label:        'Never-Repeat Challenge',
    difficulty:   'moderate',
    description:  '40 balls. Never the same club/target twice consecutively. Reset if cumulative avg exceeds +1/shot.',
    passStandard: 'Complete all 40 shots without a reset.',
  },
  nine_shot: {
    game:         'nine_shot',
    drill:        'approach',
    label:        'The 9-Shot',
    difficulty:   'high',
    description:  '1 club × 9 shots: 3 trajectories (low/med/high) × 3 shapes (draw/straight/fade). Birdie = both correct.',
    passStandard: 'Achieve −3 or better (3+ birdies).',
  },
  the_ladder: {
    game:         'the_ladder',
    drill:        'approach',
    label:        'The Ladder',
    difficulty:   'extreme',
    description:  '5 targets at ascending distances. Miss by >20% of distance = reset to rung 1.',
    passStandard: 'Climb all 5 rungs without a reset.',
  },

  // ── Chipping ──────────────────────────────────────────────────────────────────
  up_and_down_survivor: {
    game:         'up_and_down_survivor',
    drill:        'chipping',
    label:        'Up-and-Down Survivor',
    difficulty:   'moderate',
    description:  '10 balls from different locations/lies. Must get up-and-down ≥6/10 to survive.',
    passStandard: 'Get up-and-down at least 6 of 10 times.',
  },
  pressure_chip: {
    game:         'pressure_chip',
    drill:        'chipping',
    label:        'Pressure Chip',
    difficulty:   'high',
    description:  '10 chips from same spot. Land on towel (3ft past pin) + finish within 1 club = +1. Miss towel = −1. Target: +5.',
    passStandard: 'Score +5 or better.',
  },

  // ── Putting ───────────────────────────────────────────────────────────────────
  gate_drill: {
    game:         'gate_drill',
    drill:        'putting',
    label:        'Gate Drill Under Fire',
    difficulty:   'moderate',
    description:  '10 putts through a 1-ball-wide gate, 3ft from hole. Must make 8/10. Missing the gate = double failure.',
    passStandard: 'Make 8 of 10 through the gate. Fail = 9/10 required next round.',
  },
  speed_ladder: {
    game:         'speed_ladder',
    drill:        'putting',
    label:        'Speed Ladder',
    difficulty:   'high',
    description:  '5 putts from 5ft, 10ft, 15ft, 20ft, 30ft in order. Each must finish past hole but within 3ft. Miss = reset.',
    passStandard: 'Climb all 5 rungs without a reset.',
  },
  the_closer: {
    game:         'the_closer',
    drill:        'putting',
    label:        'The Closer',
    difficulty:   'extreme',
    description:  'Stage 1: 6ft, make 4/5. Stage 2: 8ft, make 3/5. Stage 3: 10ft, make 2/5. Fail any stage = full reset.',
    passStandard: 'Complete all 3 stages without a reset.',
  },
} as const;

// ── Games grouped by drill (for UI rendering) ─────────────────────────────────

export const GAMES_BY_DRILL: Record<ForgeDrillType, ForgeGameType[]> = {
  driving:  ['fairway_funnels', 'cold_start', 'the_gauntlet'],
  approach: ['never_repeat', 'nine_shot', 'the_ladder'],
  chipping: ['up_and_down_survivor', 'pressure_chip'],
  putting:  ['gate_drill', 'speed_ladder', 'the_closer'],
};

// ── Drill labels ───────────────────────────────────────────────────────────────

export const DRILL_LABELS: Record<ForgeDrillType, string> = {
  driving:  'Driving',
  approach: 'Approach',
  chipping: 'Chipping',
  putting:  'Putting',
};

// ── Drill icons (Lucide icon names, resolved in components) ───────────────────

export const DRILL_ICON_NAMES: Record<ForgeDrillType, string> = {
  driving:  'Zap',
  approach: 'Target',
  chipping: 'Crosshair',
  putting:  'Circle',
};

// ── Difficulty badge colours (Tailwind class fragments) ───────────────────────

export const DIFFICULTY_STYLES: Record<ForgeDifficulty, string> = {
  moderate: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  high:     'bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30',
  extreme:  'bg-red-500/20 text-red-300 border-red-500/30',
};

// ── RYP Performance Index ──────────────────────────────────────────────────────

/**
 * Equal pillar weights for the RYP Performance Index.
 * All four drills must be scored for the index to be meaningful,
 * but partial sessions show a partial index over completed drills only.
 */
export const RYP_INDEX_PILLAR_WEIGHT = 0.25 as const;

/**
 * Minimum drills required to show the RYP index as "valid".
 * Sessions with fewer completed drills show a partial index with a caveat.
 */
export const RYP_INDEX_MIN_DRILLS = 4 as const;

// ── Score normalisation bounds ─────────────────────────────────────────────────
// These bounds drive both the scoring engine and Zod input validation.
// Keeping them here (not scattered in schemas + scoring) prevents drift.

export const SCORE_BOUNDS = {
  fairway_funnels: {
    // 4 segments × 5 balls = 20 total
    segment_hits_min: 0,
    segment_hits_max: 5,
    segments:         4,
  },
  cold_start: {
    hits_min: 0,
    hits_max: 3,
  },
  the_gauntlet: {
    holes:      9,
    // Per-hole scoring: -1 birdie, 0 par, 1 bogey, 2 double
    hole_score_min: -1,
    hole_score_max:  2,
  },
  never_repeat: {
    shots_min:      1,
    shots_max:      40,
    // avg_score_per_shot in "approach index" units; capped at practical extremes
    avg_score_min: -2,
    avg_score_max:  4,
  },
  nine_shot: {
    shots: 9,
    // Per-shot: -1 birdie, 0 par_partial, 1 bogey
    shot_score_min: -1,
    shot_score_max:  1,
  },
  the_ladder: {
    rungs_min: 0,
    rungs_max: 5,
  },
  up_and_down_survivor: {
    made_min: 0,
    made_max: 10,
  },
  pressure_chip: {
    // Net score: each towel-land = +1, miss = -1, over 10 shots → range -10 to +10
    net_min: -10,
    net_max:  10,
  },
  gate_drill: {
    made_min: 0,
    made_max: 10,
  },
  speed_ladder: {
    rungs_min: 0,
    rungs_max: 5,
  },
  the_closer: {
    stage_made_min: 0,
    stage_made_max: 5,
    stages:         3,
  },
} as const;

// ── API rate limits ────────────────────────────────────────────────────────────

export const FORGE_RATE_LIMITS = {
  /** Session create/list: 30 requests per minute per user */
  sessions: { maxRequests: 30, windowMs: 60_000 },
  /** Drill score write: 60 per minute (rapid entry during a session) */
  drills:   { maxRequests: 60, windowMs: 60_000 },
  /** History read: 20 per minute */
  history:  { maxRequests: 20, windowMs: 60_000 },
} as const;

// ── History chart config ───────────────────────────────────────────────────────

/** Maximum sessions to return for the history/chart endpoint */
export const FORGE_HISTORY_LIMIT = 50 as const;
