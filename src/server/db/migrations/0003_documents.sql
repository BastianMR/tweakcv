-- 0003_documents: document, imported_entity, assessment (data-model.md US2)
-- Estados document: pending → reviewed → imported | error (reintentable)

CREATE TABLE document (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other'
    CHECK (kind IN ('diploma', 'cv', 'assessment_result', 'certificate', 'transcript', 'other')),
  description TEXT NOT NULL DEFAULT '',
  extracted_json TEXT,
  extraction_meta_json TEXT NOT NULL DEFAULT '{"state":"queued"}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'imported', 'error')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_document_profile ON document (profile_id);

-- trazabilidad FR-010: qué entidad de perfil salió de qué documento.
-- document_id es nullable: al borrar el documento la fila SOBREVIVE con
-- orphaned=1 y document_id NULL (SET NULL), preservando la marca.
CREATE TABLE imported_entity (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES document (id) ON DELETE SET NULL,
  target_table TEXT NOT NULL
    CHECK (target_table IN ('experiences', 'education', 'skills', 'projects', 'assessments', 'profile')),
  target_id TEXT NOT NULL,
  fields_imported_json TEXT NOT NULL DEFAULT '[]',
  orphaned INTEGER NOT NULL DEFAULT 0 CHECK (orphaned IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_imported_entity_document ON imported_entity (document_id);

CREATE TABLE assessment (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('kolbe', 'cliftonstrengths', '16personalities', 'disc', 'mbti', 'other')),
  taken_on TEXT CHECK (
    taken_on IS NULL
    OR taken_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  results_json TEXT NOT NULL,
  document_ref TEXT REFERENCES document (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (profile_id, type, taken_on)
);
