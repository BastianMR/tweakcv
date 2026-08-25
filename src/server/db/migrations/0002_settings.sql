-- 0002_settings: singleton de configuración (data-model.md).
-- api_key NUNCA vive acá: va en data/credentials.json (gitignored).

CREATE TABLE setting (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider_preset TEXT NOT NULL DEFAULT 'mock'
    CHECK (provider_preset IN ('openai', 'groq', 'openrouter', 'ollama', 'lmstudio', 'custom', 'mock')),
  base_url TEXT,
  model TEXT,
  vision_capable INTEGER NOT NULL DEFAULT 0 CHECK (vision_capable IN (0, 1)),
  ui_language TEXT NOT NULL DEFAULT 'es' CHECK (ui_language IN ('es', 'en')),
  log_level TEXT NOT NULL DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO setting (id) VALUES (1);
