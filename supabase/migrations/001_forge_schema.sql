-- ============================================================
-- RYP Red — FORGE Drill Scoring Schema
-- Four-pillar practice scoring system: Driving, Approach,
-- Chipping, and Putting. Produces the RYP Performance Index.
--
-- Design notes:
--   • forge_sessions is the top-level record (one per practice visit)
--   • forge_drill_scores holds one row per pillar per session
--   • raw_inputs (jsonb) stores game-specific data; the application
--     layer owns validation and score computation
--   • Denormalized index columns on sessions enable fast list/history
--     queries without re-joining drill scores every time
-- ============================================================

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE forge_drill_type AS ENUM (
  'driving',
  'approach',
  'chipping',
  'putting'
);

-- Each game maps to exactly one drill_type (see FORGE_GAMES constant in app)
CREATE TYPE forge_game_type AS ENUM (
  -- Driving (3 games)
  'fairway_funnels',
  'cold_start',
  'the_gauntlet',
  -- Approach (3 games)
  'never_repeat',
  'nine_shot',
  'the_ladder',
  -- Chipping / Short Game (2 games)
  'up_and_down_survivor',
  'pressure_chip',
  -- Putting (3 games)
  'gate_drill',
  'speed_ladder',
  'the_closer'
);

-- ── forge_sessions ─────────────────────────────────────────────────────────────
-- One row per practice session. Denormalized index columns are written
-- by the API whenever a drill score is added/updated so that list
-- queries never need to aggregate drill scores at read time.

CREATE TABLE forge_sessions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id      uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  club_id        uuid NOT NULL REFERENCES clubs(id)   ON DELETE RESTRICT,
  session_date   date NOT NULL DEFAULT CURRENT_DATE,
  notes          text,

  -- Completion: null = session in progress, timestamptz = finished
  completed_at   timestamptz,

  -- Denormalized pillar indexes (0–100 each), null until drill is scored
  driving_index  decimal(5,2) CHECK (driving_index  >= 0 AND driving_index  <= 100),
  approach_index decimal(5,2) CHECK (approach_index >= 0 AND approach_index <= 100),
  chipping_index decimal(5,2) CHECK (chipping_index >= 0 AND chipping_index <= 100),
  putting_index  decimal(5,2) CHECK (putting_index  >= 0 AND putting_index  <= 100),

  -- RYP Performance Index: equal-weighted mean of all completed pillar indexes
  -- null until at least one drill is scored; API recomputes on every drill write
  ryp_index      decimal(5,2) CHECK (ryp_index >= 0 AND ryp_index <= 100),

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Most common query: a player's sessions sorted by date, most recent first
CREATE INDEX idx_forge_sessions_player_date
  ON forge_sessions(player_id, session_date DESC);

-- Coach / admin view: all sessions in a club
CREATE INDEX idx_forge_sessions_club_date
  ON forge_sessions(club_id, session_date DESC);

-- Filter in-progress vs completed sessions
CREATE INDEX idx_forge_sessions_completed
  ON forge_sessions(player_id, completed_at)
  WHERE completed_at IS NULL;

-- ── forge_drill_scores ──────────────────────────────────────────────────────────
-- One row per drill type per session (enforced by UNIQUE constraint).
-- raw_inputs stores game-specific numbers validated at the app layer;
-- skill_index is the normalised 0–100 score computed by the scoring engine.

CREATE TABLE forge_drill_scores (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   uuid NOT NULL REFERENCES forge_sessions(id) ON DELETE CASCADE,
  player_id    uuid NOT NULL REFERENCES players(id)        ON DELETE CASCADE,
  club_id      uuid NOT NULL REFERENCES clubs(id)          ON DELETE RESTRICT,
  drill_type   forge_drill_type NOT NULL,
  game_type    forge_game_type  NOT NULL,

  -- Game-specific raw inputs (validated by Zod at write time)
  raw_inputs   jsonb NOT NULL DEFAULT '{}',

  -- Normalised 0–100 skill index computed from raw_inputs
  skill_index  decimal(5,2) NOT NULL CHECK (skill_index >= 0 AND skill_index <= 100),

  notes        text,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Only one score per pillar per session
  UNIQUE (session_id, drill_type)
);

-- Look up drill scores for a session (used when rendering session detail)
CREATE INDEX idx_forge_drills_session_id
  ON forge_drill_scores(session_id);

-- Player history per drill type (used in per-pillar trend charts)
CREATE INDEX idx_forge_drills_player_drill_date
  ON forge_drill_scores(player_id, drill_type, recorded_at DESC);

-- ── updated_at triggers ────────────────────────────────────────────────────────

CREATE TRIGGER trg_forge_sessions_updated_at
  BEFORE UPDATE ON forge_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_forge_drill_scores_updated_at
  BEFORE UPDATE ON forge_drill_scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE forge_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_drill_scores ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- forge_sessions policies
-- ────────────────────────────────────────────────────────────────────────────

-- Super admins see everything
CREATE POLICY "super_admin_select_forge_sessions" ON forge_sessions
  FOR SELECT USING (is_super_admin());

-- Players see only their own sessions
CREATE POLICY "player_select_own_forge_sessions" ON forge_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Coaches see sessions for their assigned players
CREATE POLICY "coach_select_forge_sessions" ON forge_sessions
  FOR SELECT USING (
    auth_user_role() = 'coach'
    AND club_id = auth_user_club_id()
    AND EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.primary_coach_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Club admins see all sessions in their club
CREATE POLICY "club_admin_select_forge_sessions" ON forge_sessions
  FOR SELECT USING (
    auth_user_role() = 'club_admin'
    AND club_id = auth_user_club_id()
  );

-- Players can create their own sessions
CREATE POLICY "player_insert_forge_session" ON forge_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR auth_user_role() IN ('coach', 'club_admin')
  );

-- Players (and coaches/admins) can update sessions they have access to
CREATE POLICY "player_update_forge_session" ON forge_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR (
      auth_user_role() IN ('coach', 'club_admin')
      AND club_id = auth_user_club_id()
    )
  );

-- Players can delete their own sessions
CREATE POLICY "player_delete_forge_session" ON forge_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR (
      auth_user_role() IN ('coach', 'club_admin')
      AND club_id = auth_user_club_id()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- forge_drill_scores policies (mirror sessions — access flows through session)
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "super_admin_select_forge_drills" ON forge_drill_scores
  FOR SELECT USING (is_super_admin());

CREATE POLICY "player_select_own_forge_drills" ON forge_drill_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "coach_select_forge_drills" ON forge_drill_scores
  FOR SELECT USING (
    auth_user_role() = 'coach'
    AND club_id = auth_user_club_id()
    AND EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.primary_coach_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "club_admin_select_forge_drills" ON forge_drill_scores
  FOR SELECT USING (
    auth_user_role() = 'club_admin'
    AND club_id = auth_user_club_id()
  );

CREATE POLICY "player_insert_forge_drill" ON forge_drill_scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR auth_user_role() IN ('coach', 'club_admin')
  );

CREATE POLICY "player_update_forge_drill" ON forge_drill_scores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR (
      auth_user_role() IN ('coach', 'club_admin')
      AND club_id = auth_user_club_id()
    )
  );

CREATE POLICY "player_delete_forge_drill" ON forge_drill_scores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR (
      auth_user_role() IN ('coach', 'club_admin')
      AND club_id = auth_user_club_id()
    )
  );
