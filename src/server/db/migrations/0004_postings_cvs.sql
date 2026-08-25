-- 0004_postings_cvs: job_posting + generated_cv (data-model.md US3)
-- generated_cv es INMUTABLE: UPDATE prohibido salvo score_json y exports (contrato).

CREATE TABLE job_posting (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('text', 'image')),
  raw_text TEXT,
  image_ref TEXT,
  parsed_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'parsed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_posting_profile ON job_posting (profile_id);

CREATE TABLE generated_cv (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  posting_id TEXT REFERENCES job_posting (id) ON DELETE SET NULL,
  template_id TEXT NOT NULL DEFAULT 'ats-classic-v1',
  content_json TEXT NOT NULL,
  data_snapshot_json TEXT NOT NULL,
  score_json TEXT,
  exports_json TEXT NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'es',
  parent_cv_id TEXT REFERENCES generated_cv (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_cv_profile ON generated_cv (profile_id);
CREATE INDEX idx_cv_parent ON generated_cv (parent_cv_id);
