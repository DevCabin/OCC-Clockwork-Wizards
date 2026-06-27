-- Migration: Create weekly_product_candidates table
-- Stores discovered product candidates awaiting review/approval

create type candidate_status as enum (
  'discovered',      -- Just found, needs review
  'needs_review',    -- Flagged for manual review
  'approved',        -- Approved for post generation
  'rejected',        -- Rejected, won't be used
  'drafted',         -- Post has been generated
  'published',       -- Post is live
  'error'            -- Error during processing
);

create table if not exists weekly_product_candidates (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  rule_id uuid references weekly_discovery_rules(id) on delete set null,
  category text,
  tags text[] default '{}',
  search_query text,
  
  -- Product data from extraction
  product_title text not null,
  price numeric,
  description text,
  product_url text not null,
  affiliate_url text,
  image_url text,
  source text default 'amazon',
  
  -- Raw data preservation
  raw_payload jsonb,
  extraction_model text,
  
  -- Scoring
  discovery_score integer check (discovery_score >= 0 and discovery_score <= 100),
  
  -- Status tracking
  status candidate_status default 'discovered',
  error_message text,
  
  -- Links to generated content
  post_id uuid references posts(id) on delete set null,
  
  -- Timestamps
  discovered_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS weekly_product_candidates_week_date_idx ON weekly_product_candidates (week_start_date);
CREATE INDEX IF NOT EXISTS weekly_product_candidates_status_idx ON weekly_product_candidates (status);
CREATE INDEX IF NOT EXISTS weekly_product_candidates_rule_idx ON weekly_product_candidates (rule_id);
CREATE INDEX IF NOT EXISTS weekly_product_candidates_status_week_idx ON weekly_product_candidates (status, week_start_date);

-- Unique constraint to prevent duplicate products per week
CREATE UNIQUE INDEX IF NOT EXISTS weekly_product_candidates_week_url_unique 
  ON weekly_product_candidates (week_start_date, product_url);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_weekly_product_candidates_updated_at
  BEFORE UPDATE ON weekly_product_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
