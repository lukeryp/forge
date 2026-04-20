-- ============================================================
-- FORGE PWA — standalone schema (self-serve, auth.users-keyed)
-- Applied: 2026-04-19. No club/coach/player coupling.
-- All rows: RLS own-rows only (user_id = auth.uid()).
-- ============================================================

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE forge_drill_type AS ENUM ('driving', 'approach', 'chipping', 'putting');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forge_game_type AS ENUM (
    'fairway_funnels', 'cold_start', 'the_gauntlet',
    'never_repeat', 'nine_shot', 'the_ladder',
    'up_and_down_survivor', 'pressure_chip',
    'gate_drill', 'speed_ladder', 'the_closer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shared trigger: bumps updated_at on every UPDATE
CREATE OR REPLACE FUNCTION forge_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── forge_profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forge_profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  handicap   decimal(4,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_forge_profiles_updated_at ON forge_profiles;
CREATE TRIGGER trg_forge_profiles_updated_at
  BEFORE UPDATE ON forge_profiles
  FOR EACH ROW EXECUTE FUNCTION forge_set_updated_at();

ALTER TABLE forge_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forge_profiles_select_own ON forge_profiles;
CREATE POLICY forge_profiles_select_own ON forge_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS forge_profiles_insert_own ON forge_profiles;
CREATE POLICY forge_profiles_insert_own ON forge_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS forge_profiles_update_own ON forge_profiles;
CREATE POLICY forge_profiles_update_own ON forge_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Auto-create profile on auth.users insert.
-- SECURITY DEFINER + explicit search_path to harden against path hijack.
CREATE OR REPLACE FUNCTION forge_handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.forge_profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trg_forge_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_forge_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION forge_handle_new_user();

-- ── forge_sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forge_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date   date NOT NULL DEFAULT CURRENT_DATE,
  notes          text,
  completed_at   timestamptz,

  driving_index  decimal(5,2) CHECK (driving_index  IS NULL OR (driving_index  BETWEEN -50 AND 100)),
  approach_index decimal(5,2) CHECK (approach_index IS NULL OR (approach_index BETWEEN -50 AND 100)),
  chipping_index decimal(5,2) CHECK (chipping_index IS NULL OR (chipping_index BETWEEN -50 AND 100)),
  putting_index  decimal(5,2) CHECK (putting_index  IS NULL OR (putting_index  BETWEEN -50 AND 100)),
  ryp_index      decimal(5,2) CHECK (ryp_index      IS NULL OR (ryp_index      BETWEEN -50 AND 100)),

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forge_sessions_user_date
  ON forge_sessions(user_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_forge_sessions_in_progress
  ON forge_sessions(user_id, completed_at)
  WHERE completed_at IS NULL;

DROP TRIGGER IF EXISTS trg_forge_sessions_updated_at ON forge_sessions;
CREATE TRIGGER trg_forge_sessions_updated_at
  BEFORE UPDATE ON forge_sessions
  FOR EACH ROW EXECUTE FUNCTION forge_set_updated_at();

ALTER TABLE forge_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forge_sessions_select_own ON forge_sessions;
CREATE POLICY forge_sessions_select_own ON forge_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS forge_sessions_insert_own ON forge_sessions;
CREATE POLICY forge_sessions_insert_own ON forge_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS forge_sessions_update_own ON forge_sessions;
CREATE POLICY forge_sessions_update_own ON forge_sessions
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS forge_sessions_delete_own ON forge_sessions;
CREATE POLICY forge_sessions_delete_own ON forge_sessions
  FOR DELETE USING (user_id = auth.uid());

-- ── forge_drill_scores ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forge_drill_scores (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES forge_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  drill_type   forge_drill_type NOT NULL,
  -- game_type retained nullable for legacy/optional variant metadata;
  -- the per-ball model uses raw_inputs exclusively.
  game_type    forge_game_type,
  raw_inputs   jsonb NOT NULL DEFAULT '{}',
  skill_index  decimal(5,2) NOT NULL CHECK (skill_index BETWEEN -50 AND 100),
  notes        text,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (session_id, drill_type)
);

CREATE INDEX IF NOT EXISTS idx_forge_drills_session_id
  ON forge_drill_scores(session_id);

CREATE INDEX IF NOT EXISTS idx_forge_drills_user_drill_date
  ON forge_drill_scores(user_id, drill_type, recorded_at DESC);

DROP TRIGGER IF EXISTS trg_forge_drill_scores_updated_at ON forge_drill_scores;
CREATE TRIGGER trg_forge_drill_scores_updated_at
  BEFORE UPDATE ON forge_drill_scores
  FOR EACH ROW EXECUTE FUNCTION forge_set_updated_at();

ALTER TABLE forge_drill_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forge_drills_select_own ON forge_drill_scores;
CREATE POLICY forge_drills_select_own ON forge_drill_scores
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS forge_drills_insert_own ON forge_drill_scores;
CREATE POLICY forge_drills_insert_own ON forge_drill_scores
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS forge_drills_update_own ON forge_drill_scores;
CREATE POLICY forge_drills_update_own ON forge_drill_scores
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS forge_drills_delete_own ON forge_drill_scores;
CREATE POLICY forge_drills_delete_own ON forge_drill_scores
  FOR DELETE USING (user_id = auth.uid());
