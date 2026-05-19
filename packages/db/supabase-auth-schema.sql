create extension if not exists pgcrypto;

create table if not exists public.bb_users (
  id varchar primary key default gen_random_uuid(),
  email varchar(255) not null unique,
  password_hash text not null,
  full_name varchar(200) not null,
  role varchar(20) not null default 'customer',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);

create index if not exists "IDX_bb_users_email" on public.bb_users (email);
create index if not exists "IDX_bb_users_role" on public.bb_users (role);

create table if not exists public.bb_sessions (
  sid varchar primary key,
  sess jsonb not null,
  expire timestamp(6) not null
);

create index if not exists "IDX_bb_sessions_expire" on public.bb_sessions (expire);
