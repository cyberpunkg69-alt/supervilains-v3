-- SUPERVILAINS V3 — Supabase PostgreSQL
-- À exécuter dans le SQL Editor du projet Supabase, puis renseigner config.js.
-- Sécurité : aucun point ni capture ne peut être injecté directement par un navigateur.
create table if not exists public.arena_players(
 id uuid primary key references auth.users(id) on delete cascade,
 handle text not null check (handle ~ '^[A-Za-z0-9_]{3,18}$'),
 created_at timestamptz not null default now()
);
create unique index if not exists arena_players_unique_handle on public.arena_players(lower(handle));
create table if not exists public.arena_encounters(
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references auth.users(id) on delete cascade,
 villain_id smallint not null check(villain_id between 0 and 5),
 danger smallint not null check(danger between 1 and 6),
 hits smallint not null default 0 check(hits between 0 and 3),
 status text not null default 'active' check(status in ('active','caught','escaped','fled')),
 started_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 resolved_at timestamptz
);
create unique index if not exists arena_one_active on public.arena_encounters(player_id) where status='active';
create index if not exists arena_encounters_recent on public.arena_encounters(player_id,started_at desc);
create table if not exists public.arena_captures(
 id bigint generated always as identity primary key,
 player_id uuid not null references auth.users(id) on delete cascade,
 encounter_id uuid not null unique references public.arena_encounters(id) on delete cascade,
 villain_id smallint not null check(villain_id between 0 and 5),
 points integer not null check(points between 1 and 1000),
 perfect boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists arena_captures_recent on public.arena_captures(player_id,created_at desc);
create table if not exists public.arena_duels(
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[A-F0-9]{10}$'),
 challenger_id uuid not null references auth.users(id) on delete cascade,
 opponent_id uuid references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 accepted_at timestamptz,
 ends_at timestamptz,
 check(challenger_id is distinct from opponent_id)
);
create index if not exists arena_duels_challenger on public.arena_duels(challenger_id,created_at desc);
create index if not exists arena_duels_opponent on public.arena_duels(opponent_id,created_at desc);

-- Les tables ne sont accessibles que par des fonctions serveur restreintes.
alter table public.arena_players enable row level security;
alter table public.arena_encounters enable row level security;
alter table public.arena_captures enable row level security;
alter table public.arena_duels enable row level security;
revoke all on public.arena_players,public.arena_encounters,public.arena_captures,public.arena_duels from PUBLIC,anon,authenticated;
revoke all on sequence public.arena_captures_id_seq from PUBLIC,anon,authenticated;

create or replace function public.arena_register(p_handle text)
returns text language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_handle text:=btrim(p_handle);
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 if v_handle is null or v_handle !~ '^[A-Za-z0-9_]{3,18}$' then raise exception 'Pseudo : 3 à 18 lettres/chiffres/_';end if;
 insert into public.arena_players(id,handle) values(v_user,v_handle)
 on conflict(id) do update set handle=excluded.handle;
 return v_handle;
exception when unique_violation then raise exception 'Ce pseudo est déjà utilisé';
end;
$$;

create or replace function public.arena_start()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_player uuid;v_enc public.arena_encounters%rowtype;
v_today bigint;v_last timestamptz;v_id int;v_dangers smallint[]:=array[1,2,2,3,4,5]::smallint[];
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 select p.id into v_player from public.arena_players p where p.id=v_user for update;
 if v_player is null then raise exception 'Crée un pseudo pour entrer dans l''arène';end if;
 select * into v_enc from public.arena_encounters e where e.player_id=v_user and e.status='active' for update;
 if found then
  if v_enc.started_at>now()-interval '5 minutes' then
   return jsonb_build_object('id',v_enc.id,'villain_id',v_enc.villain_id,'danger',v_enc.danger,'hits',v_enc.hits,'started_at',v_enc.started_at);
  end if;
  update public.arena_encounters set status='fled',resolved_at=now(),updated_at=now() where id=v_enc.id;
 end if;
 select count(*) into v_today from public.arena_encounters e where e.player_id=v_user and e.started_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if v_today>=30 then raise exception '30 patrouilles maximum par jour';end if;
 select max(e.started_at) into v_last from public.arena_encounters e where e.player_id=v_user;
 if v_last>now()-interval '8 seconds' then raise exception 'Radar en recharge, réessaie dans quelques secondes';end if;
 v_id:=floor(random()*6)::int;
 insert into public.arena_encounters(player_id,villain_id,danger)
 values(v_user,v_id,v_dangers[v_id+1]) returning * into v_enc;
 return jsonb_build_object('id',v_enc.id,'villain_id',v_enc.villain_id,'danger',v_enc.danger,'hits',0,'started_at',v_enc.started_at);
end;
$$;

create or replace function public.arena_attack(p_encounter uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_enc public.arena_encounters%rowtype;v_hits smallint;
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 select * into v_enc from public.arena_encounters e where e.id=p_encounter and e.player_id=v_user for update;
 if not found or v_enc.status<>'active' then raise exception 'Rencontre introuvable';end if;
 if v_enc.started_at<now()-interval '5 minutes' then
  update public.arena_encounters set status='fled',resolved_at=now() where id=v_enc.id;
  raise exception 'La cible s''est enfuie';
 end if;
 if v_enc.hits>=3 then raise exception 'La cible est déjà immobilisée';end if;
 if v_enc.hits>0 and v_enc.updated_at>clock_timestamp()-interval '850 milliseconds' then raise exception 'Recharge en cours';end if;
 update public.arena_encounters set hits=hits+1,updated_at=clock_timestamp() where id=v_enc.id returning hits into v_hits;
 return jsonb_build_object('id',v_enc.id,'hits',v_hits,'status','active');
end;
$$;

create or replace function public.arena_capture(p_encounter uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_enc public.arena_encounters%rowtype;
v_chance int;v_success boolean;v_perfect boolean:=false;v_points int:=0;
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 select * into v_enc from public.arena_encounters e where e.id=p_encounter and e.player_id=v_user for update;
 if not found or v_enc.status<>'active' then raise exception 'Cette capture est déjà résolue';end if;
 if v_enc.started_at<now()-interval '5 minutes' then
  update public.arena_encounters set status='fled',resolved_at=now(),updated_at=now() where id=v_enc.id;
  return jsonb_build_object('success',false,'expired',true,'points',0,'villain_id',v_enc.villain_id);
 end if;
 -- Le navigateur n'envoie jamais de chance, score, ni résultat de capture.
 v_chance:=least(92,greatest(22,53-v_enc.danger*5+v_enc.hits*18));
 v_success:=random()*100<v_chance;
 if v_success then
  v_perfect:=v_enc.hits=3 and random()<0.30;
  v_points:=55+v_enc.danger*25+v_enc.hits*5+
     case when v_enc.villain_id in(3,4,5) then 35 else 0 end+
     case when v_perfect then 40 else 0 end;
  insert into public.arena_captures(player_id,encounter_id,villain_id,points,perfect)
   values(v_user,v_enc.id,v_enc.villain_id,v_points,v_perfect);
 end if;
 update public.arena_encounters set status=case when v_success then 'caught' else 'escaped' end,
   resolved_at=now(),updated_at=now() where id=v_enc.id;
 return jsonb_build_object('success',v_success,'points',v_points,'perfect',v_perfect,
 'villain_id',v_enc.villain_id,'chance',v_chance,'hits',v_enc.hits);
end;
$$;

create or replace function public.arena_flee(p_encounter uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 update public.arena_encounters set status='fled',resolved_at=now(),updated_at=now()
 where id=p_encounter and player_id=auth.uid() and status='active';
 return found;
end;
$$;

create or replace function public.arena_my_stats()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_handle text;v_today timestamptz;
v_attempts bigint;v_total bigint;v_all bigint;v_week bigint;v_month bigint;
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 select p.handle into v_handle from public.arena_players p where p.id=v_user;
 if v_handle is null then return jsonb_build_object('registered',false);end if;
 v_today:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select count(*) into v_attempts from public.arena_encounters e where e.player_id=v_user and e.started_at>=v_today;
 select count(*),coalesce(sum(c.points),0),
 coalesce(sum(c.points) filter(where c.created_at>=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'),0),
 coalesce(sum(c.points) filter(where c.created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'),0)
 into v_total,v_all,v_week,v_month from public.arena_captures c where c.player_id=v_user;
 return jsonb_build_object('registered',true,'handle',v_handle,'captures',v_total,'attempts_today',v_attempts,
 'remaining_today',greatest(0,30-v_attempts),'score_all',v_all,'score_week',v_week,'score_month',v_month);
end;
$$;

create or replace function public.arena_leaderboard(p_period text default 'week')
returns table(pos bigint,player_id uuid,handle text,score bigint,captures bigint,perfects bigint)
language plpgsql stable security definer set search_path='' as $$
declare v_start timestamptz;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 if p_period not in('week','month','all') then raise exception 'Période invalide';end if;
 v_start:=case p_period
 when 'week' then date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'
 when 'month' then date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'
 else '1970-01-01 00:00:00+00'::timestamptz end;
 return query
 with scores as(
 select p.id uid,p.handle name,coalesce(sum(c.points),0)::bigint pts,
 count(c.id)::bigint total,count(c.id) filter(where c.perfect)::bigint perfect_total
 from public.arena_players p left join public.arena_captures c on c.player_id=p.id and c.created_at>=v_start
 group by p.id,p.handle),
 ranked as(select row_number() over(order by s.pts desc,s.total desc,lower(s.name)) place,s.* from scores s)
 select r.place,r.uid,r.name,r.pts,r.total,r.perfect_total from ranked r order by r.place limit 100;
end;
$$;

create or replace function public.arena_feed()
returns table(handle text,villain_id smallint,points integer,captured_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 return query select p.handle,c.villain_id,c.points,c.created_at
 from public.arena_captures c join public.arena_players p on p.id=c.player_id
 order by c.created_at desc limit 12;
end;
$$;

create or replace function public.arena_create_duel()
returns text language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_count bigint;v_code text;
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 perform 1 from public.arena_players p where p.id=v_user for update;
 if not found then raise exception 'Crée un pseudo avant de lancer un duel';end if;
 select count(*) into v_count from public.arena_duels d
 where (d.challenger_id=v_user or d.opponent_id=v_user) and
 ((d.accepted_at is null and d.created_at>now()-interval '24 hours') or (d.accepted_at is not null and d.ends_at>now()));
 if v_count>=5 then raise exception 'Cinq défis simultanés maximum';end if;
 v_code:=upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 10));
 insert into public.arena_duels(code,challenger_id) values(v_code,v_user);
 return v_code;
end;
$$;

create or replace function public.arena_join_duel(p_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_duel public.arena_duels%rowtype;
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 perform 1 from public.arena_players p where p.id=v_user for update;
 if not found then raise exception 'Crée un pseudo avant de rejoindre';end if;
 select * into v_duel from public.arena_duels d where d.code=upper(btrim(p_code)) for update;
 if not found or v_duel.opponent_id is not null or v_duel.created_at<now()-interval '24 hours' then
 raise exception 'Code expiré ou déjà utilisé';end if;
 if v_duel.challenger_id=v_user then raise exception 'Impossible de te défier toi-même';end if;
 update public.arena_duels set opponent_id=v_user,accepted_at=now(),ends_at=now()+interval '24 hours' where id=v_duel.id;
 return true;
end;
$$;

create or replace function public.arena_my_duels()
returns table(code text,challenger text,opponent text,state text,my_score bigint,rival_score bigint,ends_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Connexion requise';end if;
 return query select d.code,pc.handle,po.handle,
 case when d.opponent_id is null then
  case when d.created_at<now()-interval '24 hours' then 'expired' else 'waiting' end
  when d.ends_at<=now() then 'finished' else 'active' end,
 coalesce((select sum(c.points) from public.arena_captures c
  where c.player_id=v_user and c.created_at>=d.accepted_at and c.created_at<=d.ends_at),0)::bigint,
 coalesce((select sum(c.points) from public.arena_captures c
  where c.player_id=(case when d.challenger_id=v_user then d.opponent_id else d.challenger_id end)
  and c.created_at>=d.accepted_at and c.created_at<=d.ends_at),0)::bigint,
 d.ends_at
 from public.arena_duels d join public.arena_players pc on pc.id=d.challenger_id
 left join public.arena_players po on po.id=d.opponent_id
 where d.challenger_id=v_user or d.opponent_id=v_user
 order by d.created_at desc limit 30;
end;
$$;

-- Supabase : ne donner le droit d'exécuter les RPC qu'aux comptes connectés.
revoke all on function public.arena_register(text) from PUBLIC,anon;
revoke all on function public.arena_start() from PUBLIC,anon;
revoke all on function public.arena_attack(uuid) from PUBLIC,anon;
revoke all on function public.arena_capture(uuid) from PUBLIC,anon;
revoke all on function public.arena_flee(uuid) from PUBLIC,anon;
revoke all on function public.arena_my_stats() from PUBLIC,anon;
revoke all on function public.arena_leaderboard(text) from PUBLIC,anon;
revoke all on function public.arena_feed() from PUBLIC,anon;
revoke all on function public.arena_create_duel() from PUBLIC,anon;
revoke all on function public.arena_join_duel(text) from PUBLIC,anon;
revoke all on function public.arena_my_duels() from PUBLIC,anon;
grant execute on function public.arena_register(text),public.arena_start(),
 public.arena_attack(uuid),public.arena_capture(uuid),public.arena_flee(),
 public.arena_my_stats(),public.arena_leaderboard(text),public.arena_feed(),
 public.arena_create_duel(),public.arena_join_duel(text),public.arena_my_duels() to authenticated;
