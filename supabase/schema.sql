create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.disease_rules (
  id uuid primary key default gen_random_uuid(),
  insurer_name text not null,
  product_type text not null,
  disease_code text,
  disease_name text not null,
  search_keywords text,
  original_exception_text text,
  min_elapsed_text text,
  treatment_period_text text,
  hospitalization_text text,
  surgery_text text,
  remarks text,
  source_file text,
  source_version text,
  applied_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  admin_name text,
  query text,
  insurer_filter text,
  product_type_filter text,
  result_count integer not null default 0,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.import_history (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  source_version text,
  insurer_name text,
  row_count integer not null default 0,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_disease_rules_insurer on public.disease_rules (insurer_name);
create index if not exists idx_disease_rules_product_type on public.disease_rules (product_type);
create index if not exists idx_disease_rules_code on public.disease_rules (disease_code);
create index if not exists idx_disease_rules_name_trgm on public.disease_rules using gin (disease_name gin_trgm_ops);
create index if not exists idx_disease_rules_keywords_trgm on public.disease_rules using gin (search_keywords gin_trgm_ops);
create index if not exists idx_disease_rules_exception_trgm on public.disease_rules using gin (original_exception_text gin_trgm_ops);
create index if not exists idx_search_logs_created_at on public.search_logs (created_at desc);

create or replace trigger trg_disease_rules_updated_at
before update on public.disease_rules
for each row
execute function public.set_updated_at();
