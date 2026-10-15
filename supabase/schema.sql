-- =====================================================================
-- Word Cloud Harapan — "Satu Kata untuk Indonesia" (YCS 2026)
-- Jalankan SELURUH file ini sekali di Supabase → SQL Editor → Run.
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Schema privat: TIDAK diekspos ke API (anon/authenticated tidak bisa baca)
create schema if not exists private;
revoke all on schema private from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema private from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on schema private from authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Tabel utama
-- ---------------------------------------------------------------------
create table if not exists public.words (
  id         bigint generated always as identity primary key,
  word       text not null check (word ~ '^[a-z]{2,20}$'),
  created_at timestamptz not null default now(),
  is_dummy   boolean not null default false
);
create index if not exists words_word_idx on public.words (word);
create index if not exists words_created_at_idx on public.words (created_at);

alter table public.words enable row level security;

drop policy if exists "words_select_semua" on public.words;
create policy "words_select_semua" on public.words
  for select to anon, authenticated using (true);

drop policy if exists "words_insert_publik" on public.words;
create policy "words_insert_publik" on public.words
  for insert to anon, authenticated with check (is_dummy = false);
-- Sengaja TIDAK ada policy UPDATE/DELETE → publik tidak bisa mengubah/menghapus.

revoke all on public.words from anon, authenticated;
grant select on public.words to anon, authenticated;
grant insert (word, is_dummy) on public.words to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Tabel privat: rate limit, kata terlarang, PIN admin
-- ---------------------------------------------------------------------
create table if not exists private.word_rate (
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists word_rate_ip_idx on private.word_rate (ip_hash, created_at);
create index if not exists word_rate_time_idx on private.word_rate (created_at);

-- substring = true → kata kasar berat, juga diblok bila muncul DI DALAM kata lain
create table if not exists private.blocked_words (
  word      text primary key,
  substring boolean not null default false
);

insert into private.blocked_words (word, substring) values
  ('anjing',false),('anjir',false),('bangsat',true),('babi',false),('bajingan',true),
  ('brengsek',false),('kampret',false),('kunyuk',false),('monyet',false),('asu',false),
  ('jancok',true),('jancuk',true),('cok',false),('cuk',false),('kontol',true),
  ('memek',true),('ngentot',true),('entot',true),('ngewe',true),('tolol',false),
  ('goblok',false),('goblog',false),('bego',false),('idiot',false),('tai',false),
  ('taik',false),('tahi',false),('keparat',false),('sialan',false),('pantek',false),
  ('pepek',true),('peler',false),('titit',false),('puki',false),('pukimak',true),
  ('lonte',true),('pelacur',false),('sundal',false),('jablay',false),('bencong',false),
  ('banci',false),('kafir',false),('mampus',false),('modar',false),('matamu',false),
  ('ndasmu',false),('perek',false),('bokep',true),('porno',true),('sange',false),
  ('colmek',true),('coli',false),('fuck',true),('shit',false),('bitch',false),
  ('asshole',true),('dick',false),('pussy',false),('bastard',false),('nigga',true),
  ('nigger',true),('seks',false),('sex',false),('kimak',false),('setan',false),
  ('iblis',false),('bodoh',false),('dungu',false)
on conflict (word) do nothing;

create table if not exists private.admin_pin (
  id         int primary key default 1 check (id = 1),
  pin_hash   text not null,
  updated_at timestamptz not null default now()
);

create table if not exists private.admin_fail (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);
create index if not exists admin_fail_time_idx on private.admin_fail (created_at);

revoke all on all tables in schema private from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema private from anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Trigger: kata terlarang + rate limit
-- ---------------------------------------------------------------------
create or replace function private.cek_kata_baru()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kata    text;
  v_rapat   text;
  v_headers text;
  v_ip      text;
  v_hash    text;
  v_n       int;
begin
  -- Data dummy hanya bisa masuk lewat SQL Editor (policy menolak is_dummy dari publik)
  if new.is_dummy then
    return new;
  end if;

  new.created_at := now();
  v_kata  := lower(btrim(new.word));
  new.word := v_kata;
  v_rapat := regexp_replace(v_kata, '(.)\1+', '\1', 'g');  -- "anjiiing" → "anjing"

  if exists (
    select 1 from private.blocked_words b
    where b.word in (v_kata, v_rapat)
       or (b.substring and (position(b.word in v_kata) > 0 or position(b.word in v_rapat) > 0))
  ) then
    raise exception 'blocked_word' using errcode = 'P0001', hint = 'Kata ini tidak diizinkan.';
  end if;

  -- IP dari header permintaan PostgREST (entri pertama x-forwarded-for), disimpan sebagai hash
  v_headers := nullif(current_setting('request.headers', true), '');
  if v_headers is not null then
    v_ip := btrim(split_part(coalesce(v_headers::json ->> 'x-forwarded-for', ''), ',', 1));
  end if;
  v_ip   := coalesce(nullif(v_ip, ''), 'tanpa-ip');
  v_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');

  -- bersihkan catatan lama agar tabel tetap kecil
  delete from private.word_rate where created_at < now() - interval '1 hour';

  select count(*) into v_n from private.word_rate
   where ip_hash = v_hash and created_at > now() - interval '10 minutes';
  if v_n >= 30 then
    raise exception 'rate_limit: terlalu banyak kiriman dari jaringan ini' using errcode = 'P0001';
  end if;

  select count(*) into v_n from private.word_rate
   where created_at > now() - interval '1 minute';
  if v_n >= 120 then
    raise exception 'rate_limit: server sedang ramai' using errcode = 'P0001';
  end if;

  insert into private.word_rate (ip_hash) values (v_hash);
  return new;
end;
$$;

revoke all on function private.cek_kata_baru() from public;

drop trigger if exists words_cek_kata_baru on public.words;
create trigger words_cek_kata_baru
  before insert on public.words
  for each row execute function private.cek_kata_baru();

-- ---------------------------------------------------------------------
-- 4. View jumlah per kata (dipakai frontend)
-- ---------------------------------------------------------------------
create or replace view public.word_counts
with (security_invoker = true) as
  select word, count(*)::int as total
  from public.words
  group by word;

grant select on public.word_counts to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Realtime (INSERT langsung tampil di layar)
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'words'
     ) then
    execute 'alter publication supabase_realtime add table public.words';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. Admin: verifikasi PIN di server (frontend tidak pernah menyimpan PIN)
--    Hasil: 'ok' | 'invalid' | 'locked' | 'no_pin'
--    Sengaja tidak memakai RAISE agar catatan gagal tidak ikut di-rollback.
-- ---------------------------------------------------------------------
create or replace function private.cek_pin(p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_fail int;
begin
  delete from private.admin_fail where created_at < now() - interval '1 day';

  select count(*) into v_fail from private.admin_fail
   where created_at > now() - interval '15 minutes';
  if v_fail >= 10 then
    return 'locked';
  end if;

  select pin_hash into v_hash from private.admin_pin where id = 1;
  if v_hash is null then
    return 'no_pin';
  end if;

  if p_pin is not null and length(p_pin) between 1 and 72
     and extensions.crypt(p_pin, v_hash) = v_hash then
    return 'ok';
  end if;

  insert into private.admin_fail default values;
  return 'invalid';
end;
$$;
revoke all on function private.cek_pin(text) from public;

create or replace function public.admin_login(p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.cek_pin(p_pin);
end;
$$;

-- Hapus semua baris dengan kata tertentu. Hasil: jumlah baris terhapus,
-- -1 = PIN salah, -2 = terkunci, -3 = PIN belum diatur.
create or replace function public.admin_delete_word(p_pin text, p_word text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_n int;
begin
  v_status := private.cek_pin(p_pin);
  if v_status = 'invalid' then return -1; end if;
  if v_status = 'locked'  then return -2; end if;
  if v_status = 'no_pin'  then return -3; end if;

  delete from public.words where word = lower(btrim(p_word));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Daftar lengkap untuk ekspor CSV. PIN salah → hasil kosong (cek dulu dengan admin_login).
create or replace function public.admin_list(p_pin text)
returns table (id bigint, word text, created_at timestamptz, is_dummy boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.cek_pin(p_pin) <> 'ok' then
    return;
  end if;
  return query
    select w.id, w.word, w.created_at, w.is_dummy
    from public.words w
    order by w.created_at desc, w.id desc;
end;
$$;

revoke all on function public.admin_login(text) from public;
revoke all on function public.admin_delete_word(text, text) from public;
revoke all on function public.admin_list(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.admin_login(text) to anon, authenticated';
    execute 'grant execute on function public.admin_delete_word(text, text) to anon, authenticated';
    execute 'grant execute on function public.admin_list(text) to anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. ATUR / GANTI PIN ADMIN — ganti GANTI_PIN lalu jalankan baris ini saja:
-- ---------------------------------------------------------------------
-- insert into private.admin_pin (id, pin_hash) values (1, extensions.crypt('GANTI_PIN', extensions.gen_salt('bf'))) on conflict (id) do update set pin_hash = excluded.pin_hash, updated_at = now();
--
-- Membuka kunci admin setelah 10x PIN salah (opsional):
-- delete from private.admin_fail;
