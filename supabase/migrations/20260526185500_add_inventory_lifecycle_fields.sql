alter table products
  add column if not exists normalized_title text,
  add column if not exists discovered_at timestamptz default now();

update products
set normalized_title = regexp_replace(lower(trim(title)), '\s+', ' ', 'g')
where normalized_title is null;

update products
set discovered_at = coalesce(created_at, now())
where discovered_at is null;

create index if not exists products_normalized_title_idx on products (normalized_title);
create index if not exists products_discovered_at_desc_idx on products (discovered_at desc);

alter table posts
  add column if not exists status text not null default 'published',
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz;

update posts
set status = 'published'
where status is null;

update posts
set published_at = coalesce(published_at, created_at, now())
where published_at is null;

create index if not exists posts_status_idx on posts (status);
create index if not exists posts_published_at_desc_idx on posts (published_at desc);