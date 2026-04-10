-- M-3: Alliance System
-- Two alliances tables: alliances (header) and alliance_members (per-participant per-round link)

CREATE TABLE alliances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id      UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  round_number  INT  NOT NULL,
  name          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','active','betraying','dissolved')),
  proposer_id   UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ,            -- pending proposals expire after 60s
  betrayal_started_at  TIMESTAMPTZ,    -- when betrayal phase begins
  betrayal_deadline_at TIMESTAMPTZ,    -- when betrayal vote resolves (60s window)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alliance_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id    UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  round_number   INT  NOT NULL,
  betrayal_vote  TEXT CHECK (betrayal_vote IN ('stay','betray') OR betrayal_vote IS NULL),
  voted_at       TIMESTAMPTZ,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One participant can only be in one alliance per round
  UNIQUE (participant_id, round_number)
);

-- Indexes
CREATE INDEX idx_alliances_arena        ON alliances(arena_id);
CREATE INDEX idx_alliances_status       ON alliances(status);
CREATE INDEX idx_alliance_members_alliance ON alliance_members(alliance_id);
CREATE INDEX idx_alliance_members_participant ON alliance_members(participant_id);
