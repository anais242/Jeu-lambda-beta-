-- ═══════════════════════════════════════════
--  POKO — Script de création des tables Supabase
--  Colle ce script dans : Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════

-- TABLE JOUEURS
create table if not exists poko_users (
  username        text primary key,
  email           text unique not null,
  avatar          text default '🃏',
  password_hash   text not null,
  balance         integer default 5000,
  total_games     integer default 0,
  total_wins      integer default 0,
  total_earned    integer default 0,
  total_lost      integer default 0,
  longest_streak  integer default 0,
  current_streak  integer default 0,
  last_daily_bonus bigint default null,
  banned          boolean default false,
  vip             boolean default false,
  created_at      bigint default extract(epoch from now())*1000,
  last_login      bigint default extract(epoch from now())*1000
);

-- TABLE TRANSACTIONS
create table if not exists poko_transactions (
  id          bigint primary key,
  username    text references poko_users(username) on delete cascade,
  type        text not null,  -- 'win','loss','deposit','withdraw','bonus'
  amount      integer not null,
  label       text not null,
  date        bigint not null,
  balance     integer not null
);

-- TABLE HISTORIQUE DES PARTIES
create table if not exists poko_game_history (
  id            bigint primary key,
  username      text references poko_users(username) on delete cascade,
  date          bigint not null,
  mise          integer not null,
  result        text not null,  -- 'win','lose','gameover'
  stage         integer not null,
  change        integer not null,
  balance_after integer not null,
  label         text not null
);

-- TABLE PARAMÈTRES ADMIN
create table if not exists poko_admin_settings (
  key   text primary key,
  value text not null
);

-- TABLE LOGS ADMIN
create table if not exists poko_admin_logs (
  id    bigint primary key default extract(epoch from now())*1000,
  ts    bigint not null,
  type  text not null,
  msg   text not null
);

-- Accès public en lecture/écriture (Row Level Security désactivé pour simplifier)
alter table poko_users          enable row level security;
alter table poko_transactions   enable row level security;
alter table poko_game_history   enable row level security;
alter table poko_admin_settings enable row level security;
alter table poko_admin_logs     enable row level security;

-- Politique : accès total avec la clé anon (pour notre usage)
create policy "public_all" on poko_users          for all using (true) with check (true);
create policy "public_all" on poko_transactions   for all using (true) with check (true);
create policy "public_all" on poko_game_history   for all using (true) with check (true);
create policy "public_all" on poko_admin_settings for all using (true) with check (true);
create policy "public_all" on poko_admin_logs     for all using (true) with check (true);
