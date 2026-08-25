-- 0001_core: profile, experience, education, skill, project (data-model.md)
-- Toda fila lleva created_at/updated_at ISO-8601 UTC.

CREATE TABLE profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_json TEXT NOT NULL DEFAULT '{}',
  summary TEXT,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX idx_profile_one_active ON profile (is_active) WHERE is_active = 1;

CREATE TABLE experience (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  start_date TEXT NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  end_date TEXT CHECK (
    end_date IS NULL
    OR (
      end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
      AND end_date >= start_date
    )
  ),
  achievements_json TEXT NOT NULL DEFAULT '[]' CHECK (json_array_length(achievements_json) >= 1),
  tags_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_experience_profile ON experience (profile_id, sort_order);

CREATE TABLE education (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field TEXT,
  start_date TEXT NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  end_date TEXT CHECK (
    end_date IS NULL
    OR (
      end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
      AND end_date >= start_date
    )
  ),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  credential_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_education_profile ON education (profile_id);

CREATE TABLE skill (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'soft', 'language')),
  level INTEGER CHECK ((category = 'language' AND level IS NULL) OR level BETWEEN 1 AND 5 OR level IS NULL),
  cefr TEXT CHECK (cefr IS NULL OR cefr GLOB 'A[123]' OR cefr GLOB 'B[12]' OR cefr GLOB 'C[12]'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (category <> 'language' OR cefr IS NOT NULL)
);

CREATE UNIQUE INDEX idx_skill_unique ON skill (profile_id, category, lower(name));

CREATE TABLE project (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tech_json TEXT NOT NULL DEFAULT '[]',
  highlights_json TEXT NOT NULL DEFAULT '[]',
  url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_project_profile ON project (profile_id, sort_order);
