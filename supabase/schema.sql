-- 100bon — schéma Supabase
-- À exécuter une fois dans Supabase > SQL Editor.
-- Les objets métier (parfums, huiles, layerings) sont stockés en jsonb dans la
-- forme exacte de olfactotheque_db.json : les types TS restent la source de vérité.

create table if not exists public.meta (
  key text primary key,
  value jsonb not null
);

create table if not exists public.families (
  id text primary key,
  label text not null,
  color text not null,
  sort int not null default 0
);

create table if not exists public.note_categories (
  id text primary key,
  label text not null,
  sort int not null default 0
);

create table if not exists public.notes (
  id text primary key,
  name text not null,
  category text not null references public.note_categories(id)
);

create table if not exists public.perfumes (
  id text primary key,
  data jsonb not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oils (
  id text primary key,
  data jsonb not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.layerings (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.similarities (
  id bigint generated always as identity primary key,
  a text not null references public.perfumes(id) on delete cascade,
  b text not null references public.perfumes(id) on delete cascade,
  relation text not null check (relation in ('doublon', 'proche', 'complementaire')),
  reason text not null,
  unique (a, b)
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists perfumes_touch on public.perfumes;
create trigger perfumes_touch before update on public.perfumes
  for each row execute function public.touch_updated_at();
drop trigger if exists oils_touch on public.oils;
create trigger oils_touch before update on public.oils
  for each row execute function public.touch_updated_at();
drop trigger if exists layerings_touch on public.layerings;
create trigger layerings_touch before update on public.layerings
  for each row execute function public.touch_updated_at();

-- Sécurité : app mono-utilisateur. Seuls les utilisateurs connectés ont accès.
-- Désactive les inscriptions (Authentication > Sign In / Providers > "Allow new users to sign up")
-- après avoir créé ton compte, et renseigne ALLOWED_EMAIL côté Vercel.
do $$
declare t text;
begin
  foreach t in array array['meta','families','note_categories','notes','perfumes','oils','layerings','similarities']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format(
      'create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Photos de flacons (lecture publique, écriture réservée aux connectés).
insert into storage.buckets (id, name, public)
values ('bottles', 'bottles', true)
on conflict (id) do nothing;

drop policy if exists "bottles write" on storage.objects;
create policy "bottles write" on storage.objects for all to authenticated
  using (bucket_id = 'bottles') with check (bucket_id = 'bottles');
