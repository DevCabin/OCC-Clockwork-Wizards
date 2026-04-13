create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  title text not null,
  description text,
  image_url text,
  price numeric,
  currency text,
  product_url text not null,
  source_domain text,
  run_date date not null,
  created_at timestamptz default now(),
  unique (product_url, run_date)
);

create index if not exists products_run_date_desc_idx on products (run_date desc);
