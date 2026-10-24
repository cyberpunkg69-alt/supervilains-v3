-- MANU Enchères : correctif appliqué à Supabase le 24 octobre 2026.
-- Autorise WAV pour les vocaux transformés sans modifier les protections existantes.
-- Version de référence de public.manu_chat_post_voice ; cette modification est déjà déployée.

CREATE OR REPLACE FUNCTION public.manu_chat_post_voice(p_nickname text, p_body text, p_voice_path text, p_actor_hash text, p_duration integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_nick text := btrim(coalesce(p_nickname,''));
  v_body text := btrim(coalesce(p_body,''));
  v_created bigint;
  v_total integer;
  v_voice_total integer;
begin
  if p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok',false,'message','Session invalide.');
  end if;
  if char_length(v_nick)<2 or char_length(v_nick)>24
    or v_nick !~ '^[[:alnum:]À-ÿ _.-]+$' then
    return jsonb_build_object('ok',false,'message','Pseudo invalide (2 à 24 caractères).');
  end if;
  if char_length(v_body)>500 then
    return jsonb_build_object('ok',false,'message','Message trop long (500 caractères maximum).');
  end if;
  if p_voice_path is null or p_voice_path !~ '^voices/[a-f0-9-]{36}\.(webm|ogg|m4a|wav)$' then
    return jsonb_build_object('ok',false,'message','Fichier vocal invalide.');
  end if;
  if p_duration is null or p_duration<1 or p_duration>15 then
    return jsonb_build_object('ok',false,'message','Le vocal doit durer au maximum 15 secondes.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('manu-chat-'||p_actor_hash,0));
  if exists(
    select 1 from public.manu_chat_messages
    where actor_hash=p_actor_hash and created_at>now()-interval '5 seconds'
  ) then
    return jsonb_build_object('ok',false,'message','Attends 5 secondes entre deux messages.');
  end if;
  select count(*),count(*) filter(where voice_path is not null)
    into v_total,v_voice_total
    from public.manu_chat_messages
    where actor_hash=p_actor_hash and created_at>now()-interval '24 hours';
  if v_total>=80 then
    return jsonb_build_object('ok',false,'message','Limite de 80 messages par jour atteinte.');
  end if;
  if v_voice_total>=12 then
    return jsonb_build_object('ok',false,'message','Limite de 12 messages vocaux par jour atteinte.');
  end if;
  if exists (
    select 1 from public.manu_chat_messages
    where actor_hash=p_actor_hash and voice_path is not null
      and created_at>now()-interval '45 seconds'
  ) then
    return jsonb_build_object('ok',false,'message','Attends 45 secondes entre deux vocaux.');
  end if;
  insert into public.manu_chat_messages
    (nickname,body,voice_path,actor_hash)
  values (v_nick,v_body,p_voice_path,p_actor_hash)
  returning id into v_created;
  return jsonb_build_object('ok',true,'id',v_created);
end
$function$;
