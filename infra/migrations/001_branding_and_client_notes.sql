BEGIN;

CREATE TABLE IF NOT EXISTS public.nuve_branding (
  installation_id TEXT PRIMARY KEY,
  studio_name TEXT NOT NULL DEFAULT 'Nuvé Studio',
  description TEXT NOT NULL DEFAULT 'Seu estúdio, organizado em um só lugar.',
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  fonts JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_id UUID,
  updated_by_uid TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nuve_branding_installation_id_nonempty CHECK (length(installation_id) BETWEEN 1 AND 100),
  CONSTRAINT nuve_branding_studio_name_length CHECK (length(studio_name) BETWEEN 1 AND 80),
  CONSTRAINT nuve_branding_description_length CHECK (length(description) <= 180),
  CONSTRAINT nuve_branding_colors_object CHECK (jsonb_typeof(colors) = 'object'),
  CONSTRAINT nuve_branding_fonts_object CHECK (jsonb_typeof(fonts) = 'object')
);

CREATE TABLE IF NOT EXISTS public.nuve_branding_logos (
  id UUID PRIMARY KEY,
  installation_id TEXT NOT NULL,
  content BYTEA NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 CHAR(64) NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nuve_branding_logo_mime_allowed CHECK (mime_type IN ('image/webp')),
  CONSTRAINT nuve_branding_logo_size_valid CHECK (size_bytes BETWEEN 1 AND 1048576),
  CONSTRAINT nuve_branding_logo_hash_valid CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_nuve_branding_logos_installation
  ON public.nuve_branding_logos (installation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.nuve_client_notes (
  installation_id TEXT NOT NULL,
  cliente_uid TEXT NOT NULL,
  nota TEXT NOT NULL DEFAULT '',
  updated_by_uid TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (installation_id, cliente_uid),
  CONSTRAINT nuve_client_notes_length CHECK (length(nota) <= 3000)
);

COMMIT;
