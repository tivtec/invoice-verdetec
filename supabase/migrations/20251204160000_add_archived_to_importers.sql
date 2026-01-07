-- Add soft-delete flag to importers
ALTER TABLE public.importers
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Index to keep lookups fast
CREATE INDEX IF NOT EXISTS idx_importers_archived ON public.importers(archived);
