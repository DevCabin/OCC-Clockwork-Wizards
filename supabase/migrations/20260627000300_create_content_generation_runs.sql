-- Migration: Create content_generation_runs table
-- Tracks weekly content generation job runs

create type generation_run_status as enum (
  'pending',     -- Scheduled but not started
  'running',     -- Currently processing
  'completed',   -- Successfully finished
  'failed',      -- Failed with errors
  'partial'      -- Completed with some failures
);

create table if not exists content_generation_runs (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  status generation_run_status default 'pending',
  
  -- Run timing
  started_at timestamptz,
  finished_at timestamptz,
  
  -- Summary data (flexible JSON for extensibility)
  summary jsonb default '{}',
  error_message text,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS content_generation_runs_week_idx ON content_generation_runs (week_start_date);
CREATE INDEX IF NOT EXISTS content_generation_runs_status_idx ON content_generation_runs (status);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_content_generation_runs_updated_at
  BEFORE UPDATE ON content_generation_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
