create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  rule_name text not null,
  product_title text not null,
  product_url text not null,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  body_md text not null,
  run_date date not null,
  created_at timestamptz default now(),
  unique (product_id)
);

create index if not exists posts_run_date_desc_idx on posts (run_date desc);
create index if not exists posts_created_at_desc_idx on posts (created_at desc);