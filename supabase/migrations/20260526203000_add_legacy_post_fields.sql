alter table posts
  add column if not exists legacy_source_url text,
  add column if not exists legacy_source_path text,
  add column if not exists content_source text not null default 'generated';

create index if not exists posts_legacy_source_path_idx on posts (legacy_source_path);
create index if not exists posts_content_source_idx on posts (content_source);