/**
 * FORGE drill system — canonical spec from cert.rypgolf.com.
 *
 * Four outdoor pillars (Driving, Approach, Chipping, Putting) each scored
 * as golf: per-ball outcomes from Eagle (−2) to Triple (+3). Running total
 * is the raw Ryp [pillar] Index. Lower is better — Elite is negative.
 *
 * Composite FORGE Performance Index (outdoor):
 *   Approach 40% · Driving 20% · Chipping 20% · Putting 20%
 *
 * Challenge mode: exit at −5 (win) or +5 (lose). Otherwise play full session.
 */

// ── Pillar types ──────────────────────────────────────────────────────────────

export const FORGE_DRILL_TYPES = ['driving', 'approach', 'chipping', 'putting'] as const;
export type ForgeDrillType = (typeof FORGE_DRILL_TYPES)[number];

export const DRILL_LABELS: Record<ForgeDrillType, string> = {
  driving:  'Driving',
  approach: 'Approach',
  chipping: 'Chipping',
  putting:  'Putting',
};

export const DRILL_SUBTITLE: Record<ForgeDrillType, string> = {
  driving:  'Tee performance — distance + directional accuracy, weighted by miss severity.',
  approach: 'Proximity to pin — 5% Eagle, 10% Birdie, beyond Par, mishit Double.',
  chipping: 'Up-and-down proximity — thresholds tighten with level.',
  putting:  'Three-tier putting session — 60 putts across 3°, 2°, 1° of break.',
};

// ── Per-ball outcome vocabulary ───────────────────────────────────────────────
// Each pillar uses a subset of these labels. Values are golf points.

export const OUTCOME_POINTS = {
  eagle:  -2,
  birdie: -1,
  par:     0,
  bogey:  +1,
  double: +2,
  triple: +3,
} as const;
export type Outcome = keyof typeof OUTCOME_POINTS;

// ── Driving abacus (5 columns) ────────────────────────────────────────────────
// Level 1: boundaries 40yd from fairway edge, good miss = Par (0).
// Level 4: 10yd boundary, good miss = Bogey (+1).

export interface DrivingAbacusConfig {
  level:                 1 | 2 | 3 | 4;
  label:                 string;
  boundary_yards:        number;   // distance from fairway edge that separates good miss from bad miss
  good_miss_points:      number;   // 0 at level 1–3, +1 at level 4
  bad_miss_points:       number;   // always +2
  fairway_hit_points:    number;   // always −1
}

export const DRIVING_LEVELS: DrivingAbacusConfig[] = [
  { level: 1, label: 'Level 1 — 40yd boundary', boundary_yards: 40, good_miss_points: 0, bad_miss_points: 2, fairway_hit_points: -1 },
  { level: 2, label: 'Level 2 — 30yd boundary', boundary_yards: 30, good_miss_points: 0, bad_miss_points: 2, fairway_hit_points: -1 },
  { level: 3, label: 'Level 3 — 20yd boundary', boundary_yards: 20, good_miss_points: 0, bad_miss_points: 2, fairway_hit_points: -1 },
  { level: 4, label: 'Level 4 — 10yd boundary · good miss = bogey', boundary_yards: 10, good_miss_points: 1, bad_miss_points: 2, fairway_hit_points: -1 },
];

// 5-column abacus: Bad Left / Good Left / Fairway / Good Right / Bad Right
export const DRIVING_COLUMNS = [
  { id: 'bad_left',    label: 'Bad Miss Left',  severity: 'bad',  side: 'left'  as const },
  { id: 'good_left',   label: 'Good Miss Left', severity: 'good', side: 'left'  as const },
  { id: 'fairway',     label: 'Fairway Hit',    severity: 'hit',  side: 'center' as const },
  { id: 'good_right',  label: 'Good Miss Right',severity: 'good', side: 'right' as const },
  { id: 'bad_right',   label: 'Bad Miss Right', severity: 'bad',  side: 'right' as const },
] as const;
export type DrivingColumnId = (typeof DRIVING_COLUMNS)[number]['id'];

// Shape prescription: shots 5/10/15/20 have required shape+club
export const DRIVING_SHAPE_PRESCRIPTION: Record<number, { shape: 'draw' | 'fade'; club: '3-wood' | 'driver' }> = {
  5:  { shape: 'draw', club: '3-wood' },
  10: { shape: 'fade', club: 'driver' },
  15: { shape: 'draw', club: 'driver' },
  20: { shape: 'fade', club: 'driver' },
};

export const DRIVING_SESSION_BALLS = 20;

// ── Driving handicap baseline tables ──────────────────────────────────────────
// Driving Index = baseline + running_total

export const DRIVING_BASELINE_MEN: Array<{ avg_distance_yd: number; baseline: number }> = [
  { avg_distance_yd: 300, baseline: -5 },
  { avg_distance_yd: 270, baseline:  0 },
  { avg_distance_yd: 255, baseline:  5 },
  { avg_distance_yd: 240, baseline: 10 },
  { avg_distance_yd: 220, baseline: 15 },
  { avg_distance_yd: 205, baseline: 20 },
  { avg_distance_yd: 190, baseline: 25 },
];

export const DRIVING_BASELINE_WOMEN: Array<{ avg_distance_yd: number; baseline: number }> = [
  { avg_distance_yd: 250, baseline: -5 },
  { avg_distance_yd: 225, baseline:  0 },
  { avg_distance_yd: 210, baseline:  5 },
  { avg_distance_yd: 195, baseline: 10 },
  { avg_distance_yd: 180, baseline: 15 },
  { avg_distance_yd: 165, baseline: 20 },
  { avg_distance_yd: 150, baseline: 25 },
];

// ── Approach ──────────────────────────────────────────────────────────────────

export const APPROACH_OUTCOMES = [
  { id: 'eagle',  label: 'Within 5% of distance',   points: -2, tone: 'best' },
  { id: 'birdie', label: 'Within 10% of distance',  points: -1, tone: 'good' },
  { id: 'par',    label: 'Beyond 10%',              points:  0, tone: 'neutral' },
  { id: 'double', label: 'Mishit',                  points: +2, tone: 'bad' },
] as const;
export type ApproachOutcomeId = (typeof APPROACH_OUTCOMES)[number]['id'];

export const APPROACH_VERSIONS = [
  { id: 'stock',    label: 'Stock', description: '20 stock shots to range pins' },
  { id: 'variable', label: 'Variable', description: '14 stock + 2 draw + 2 fade + 2 wind, random sequence' },
] as const;
export type ApproachVersionId = (typeof APPROACH_VERSIONS)[number]['id'];

export const APPROACH_SESSION_BALLS = 20;

// ── Chipping ──────────────────────────────────────────────────────────────────
// Four levels. Each level changes the thresholds, but the outcome names stay consistent.

export interface ChippingLevelConfig {
  level: 1 | 2 | 3 | 4;
  label: string;
  outcomes: Array<{ id: 'birdie' | 'par' | 'bogey' | 'double' | 'triple'; label: string; points: number }>;
}

export const CHIPPING_LEVELS: ChippingLevelConfig[] = [
  {
    level: 1,
    label: 'Level 1 — Developmental',
    outcomes: [
      { id: 'birdie', label: 'Within 2 driver lengths (~7.5 ft)', points: -1 },
      { id: 'par',    label: 'Beyond — anywhere else',            points:  0 },
      { id: 'double', label: 'Mishit / miss',                     points: +2 },
    ],
  },
  {
    level: 2,
    label: 'Level 2 — Competitive',
    outcomes: [
      { id: 'birdie', label: 'Within 1 driver length (~3.75 ft)', points: -1 },
      { id: 'par',    label: 'Within 2 lengths (~7.5 ft)',        points:  0 },
      { id: 'bogey',  label: 'Beyond 2 lengths',                  points: +1 },
      { id: 'double', label: 'Mishit / miss',                     points: +2 },
    ],
  },
  {
    level: 3,
    label: 'Level 3 — Advanced',
    outcomes: [
      { id: 'birdie', label: 'Within 1 wedge length (~2.9 ft)',   points: -1 },
      { id: 'par',    label: 'Within 2 wedge lengths (~5.8 ft)',  points:  0 },
      { id: 'bogey',  label: 'Beyond 2 wedge lengths',            points: +1 },
      { id: 'double', label: 'Mishit / miss',                     points: +2 },
    ],
  },
  {
    level: 4,
    label: 'Level 4 — Elite',
    outcomes: [
      { id: 'birdie', label: 'Within 2 ft',                       points: -1 },
      { id: 'par',    label: 'Within 4 ft',                       points:  0 },
      { id: 'double', label: 'Beyond 4 ft',                       points: +2 },
      { id: 'triple', label: 'Mishit / miss',                     points: +3 },
    ],
  },
];

export const CHIPPING_LIES = ['fairway', 'rough', 'bunker'] as const;
export type ChippingLie = (typeof CHIPPING_LIES)[number];

export const CHIPPING_SESSION_BALLS = 20;

// ── Putting ───────────────────────────────────────────────────────────────────

export const PUTTING_OUTCOMES = [
  { id: 'make',  label: 'Made',                                     points: -1 },
  { id: 'par',   label: 'Past hole, within one putter length',      points:  0 },
  { id: 'miss',  label: 'Short or beyond range',                    points: +1 },
] as const;
export type PuttingOutcomeId = (typeof PUTTING_OUTCOMES)[number]['id'];

export const PUTTING_TIERS = [
  { id: 'tier_3', label: '3° slope', putts: 20, order: 0 },
  { id: 'tier_2', label: '2° slope', putts: 20, order: 1 },
  { id: 'tier_1', label: '1° slope', putts: 20, order: 2 },
] as const;
export type PuttingTierId = (typeof PUTTING_TIERS)[number]['id'];

export const PUTTING_SESSION_PUTTS = 60;

// ── Index interpretation scales (per pillar) ──────────────────────────────────

export interface InterpretationTier {
  label: string;
  maxIndex: number;  // inclusive upper bound; last tier uses Infinity
  tone: 'elite' | 'tour' | 'strong' | 'average' | 'developing' | 'needs_work';
}

export const DRIVING_INTERPRETATION: InterpretationTier[] = [
  { label: 'Elite Driver',      maxIndex: -10,      tone: 'elite' },
  { label: 'Tour Caliber',      maxIndex:  -3,      tone: 'tour' },
  { label: 'Strong Driver',     maxIndex:   5,      tone: 'strong' },
  { label: 'Average Driver',    maxIndex:  14,      tone: 'average' },
  { label: 'Developing Driver', maxIndex:  23,      tone: 'developing' },
  { label: 'Needs Work',        maxIndex: Infinity, tone: 'needs_work' },
];

export const APPROACH_INTERPRETATION: InterpretationTier[] = [
  { label: 'Tour Caliber',      maxIndex: -15,      tone: 'tour' },
  { label: 'Strong Iron Play',  maxIndex:  -5,      tone: 'strong' },
  { label: 'Average Iron Play', maxIndex:   2,      tone: 'average' },
  { label: 'Developing',        maxIndex:   7,      tone: 'developing' },
  { label: 'Needs Work',        maxIndex: Infinity, tone: 'needs_work' },
];

export const CHIPPING_INTERPRETATION: InterpretationTier[] = [
  { label: 'Elite Short Game',  maxIndex: -5,       tone: 'elite' },
  { label: 'Tour Caliber',      maxIndex:  0,       tone: 'tour' },
  { label: 'Strong',            maxIndex:  5,       tone: 'strong' },
  { label: 'Average',           maxIndex: 12,       tone: 'average' },
  { label: 'Developing',        maxIndex: 20,       tone: 'developing' },
  { label: 'Needs Work',        maxIndex: Infinity, tone: 'needs_work' },
];

export const PUTTING_INTERPRETATION: InterpretationTier[] = [
  { label: 'Tour Caliber',      maxIndex: -4,       tone: 'tour' },
  { label: 'Strong Putter',     maxIndex:  0,       tone: 'strong' },
  { label: 'Average Putter',    maxIndex:  5,       tone: 'average' },
  { label: 'Developing',        maxIndex:  9,       tone: 'developing' },
  { label: 'Needs Work',        maxIndex: Infinity, tone: 'needs_work' },
];

export const INTERPRETATION_BY_DRILL: Record<ForgeDrillType, InterpretationTier[]> = {
  driving:  DRIVING_INTERPRETATION,
  approach: APPROACH_INTERPRETATION,
  chipping: CHIPPING_INTERPRETATION,
  putting:  PUTTING_INTERPRETATION,
};

// ── Composite FORGE Performance Index weights (outdoor) ───────────────────────
// "Approach is the game" — 40% of the composite.

export const COMPOSITE_WEIGHTS: Record<ForgeDrillType, number> = {
  approach: 0.40,
  driving:  0.20,
  chipping: 0.20,
  putting:  0.20,
};

export const RYP_INDEX_MIN_DRILLS = 4 as const;

// ── Challenge-mode exit thresholds ────────────────────────────────────────────

export const CHALLENGE_EXIT = {
  win_at:  -5,
  lose_at:  5,
} as const;

// ── API rate limits ───────────────────────────────────────────────────────────

export const FORGE_RATE_LIMITS = {
  sessions: { maxRequests: 30, windowMs: 60_000 },
  drills:   { maxRequests: 60, windowMs: 60_000 },
  history:  { maxRequests: 20, windowMs: 60_000 },
} as const;

export const FORGE_HISTORY_LIMIT = 50 as const;
