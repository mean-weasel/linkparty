-- Migration 038: Add source_url column to queue_items
--
-- YouTube, tweet, and Reddit queue items currently discard the original URL
-- after metadata extraction. This column stores the source URL so users can
-- open the original content.

ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Optional index for future lookups by source URL
CREATE INDEX IF NOT EXISTS idx_queue_items_source_url ON queue_items (source_url) WHERE source_url IS NOT NULL;
