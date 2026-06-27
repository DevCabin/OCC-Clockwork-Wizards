-- Migration: Create weekly_discovery_rules table
-- Stores user-defined rules for weekly product discovery

create table if not exists weekly_discovery_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  allocation_percent integer not null check (allocation_percent >= 0 and allocation_percent <= 100),
  tags text[] default '{}',
  search_terms text[] default '{}',
  max_candidates integer default 10 check (max_candidates > 0),
  min_score integer default 70 check (min_score >= 0 and min_score <= 100),
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for active rules lookup
create index if not exists weekly_discovery_rules_active_idx on weekly_discovery_rules (is_active) where is_active = true;

-- Index for category lookups
create index if not exists weekly_discovery_rules_category_idx on weekly_discovery_rules (category);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weekly_discovery_rules_updated_at
  BEFORE UPDATE ON weekly_discovery_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
