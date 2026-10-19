-- SUPERVILAINS V4.12 — UNE FAILLE ULTIME PAR RENCONTRE EN SOLO ET ARENE.
-- Carte choisie à l'aveugle, serveur vérifie le choix (1 chance sur 6).
-- La même règle pour les 6 officiels et tous les personnalisés :
-- aucun avantage de score ni manipulation de carte dans le client.
ALTER TABLE public.arena_encounters
  ADD COLUMN IF NOT EXISTS weakness_slot smallint NOT NULL DEFAULT floor(random()*6)::smallint
  CHECK (weakness_slot BETWEEN 0 AND 5);
ALTER TABLE public.arena_encounters
  ADD COLUMN IF NOT EXISTS weakness_used boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.arena_start()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_user uuid:=auth.uid();v_player uuid;v_enc public.arena_encounters%rowtype;
 v_today bigint;v_last timestamptz;v_id int;
 v_dangers smallint[]:=array[1,2,2,3,4,5]::smallint[];
 v_custom uuid:=NULL;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 SELECT p.id INTO v_player FROM public.arena_players p WHERE p.id=v_user FOR UPDATE;
 IF v_player IS NULL THEN RAISE EXCEPTION 'Crée un pseudo pour entrer dans l''arène';END IF;
 SELECT * INTO v_enc FROM public.arena_encounters e
  WHERE e.player_id=v_user AND e.status='active' FOR UPDATE;
 IF FOUND THEN
  IF v_enc.started_at>now()-interval '5 minutes' THEN
   RETURN jsonb_build_object('id',v_enc.id,'villain_id',v_enc.villain_id,
    'custom_villain_id',v_enc.custom_villain_id,'danger',v_enc.danger,
    'hits',v_enc.hits,'weakness_used',v_enc.weakness_used,'started_at',v_enc.started_at);
  END IF;
  UPDATE public.arena_encounters SET status='fled',resolved_at=now(),updated_at=now()
   WHERE id=v_enc.id;
 END IF;
 SELECT count(*) INTO v_today FROM public.arena_encounters e
  WHERE e.player_id=v_user
   AND e.started_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 IF v_today>=30 THEN RAISE EXCEPTION '30 patrouilles maximum par jour';END IF;
 SELECT max(e.started_at) INTO v_last FROM public.arena_encounters e WHERE e.player_id=v_user;
 IF v_last>now()-interval '8 seconds' THEN
  RAISE EXCEPTION 'Radar en recharge, réessaie dans quelques secondes';
 END IF;
 -- Probabilité de rencontrer un de ses personnages VALIDÉS : 45 %.
 -- Choix serveur uniquement; pas d'avantage sur les autres joueurs.
 IF random()<0.45 THEN
  SELECT v.id INTO v_custom
  FROM public.custom_villains v
  WHERE v.owner_user_id=v_user AND v.status='ready'
   AND v.portrait_path IS NOT NULL
   AND v.troll_path IS NOT NULL
   AND v.capture_path IS NOT NULL
  ORDER BY random() LIMIT 1;
 END IF;
 -- Sélection des six profils de combat reste UNIFORME, comme avant.
 -- La fiche personnelle est un skin uniquement : choisir danger=5 dans sa fiche
 -- ne permet jamais d'augmenter la fréquence des boss ou le score moyen.
 v_id:=floor(random()*6)::int;
 INSERT INTO public.arena_encounters(player_id,villain_id,danger,custom_villain_id)
 VALUES(v_user,v_id,v_dangers[v_id+1],v_custom)
 RETURNING * INTO v_enc;
 RETURN jsonb_build_object('id',v_enc.id,'villain_id',v_enc.villain_id,
  'custom_villain_id',v_enc.custom_villain_id,
  'danger',v_enc.danger,'hits',0,'weakness_used',false,'started_at',v_enc.started_at);
END;$$;


REVOKE ALL ON FUNCTION public.arena_start() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.arena_start() TO authenticated;


CREATE OR REPLACE FUNCTION public.arena_guess_weakness(p_encounter uuid,p_slot integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_uid uuid:=auth.uid();
 v_enc public.arena_encounters%rowtype;
 v_correct boolean;v_points integer:=0;
 v_weakness text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF p_slot IS NULL OR p_slot<0 OR p_slot>5 THEN
  RAISE EXCEPTION 'Carte invalide';
 END IF;
 SELECT * INTO v_enc FROM public.arena_encounters e
  WHERE e.id=p_encounter AND e.player_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_enc.status<>'active' THEN
  RAISE EXCEPTION 'Cette rencontre est deja terminee';
 END IF;
 IF v_enc.weakness_used THEN RAISE EXCEPTION 'Faille ultime deja tentee';END IF;
 IF v_enc.started_at<now()-interval '5 minutes' THEN
  UPDATE public.arena_encounters
   SET status='fled',resolved_at=now(),updated_at=now()
   WHERE id=v_enc.id;
  RETURN jsonb_build_object('success',false,'expired',true,'resolved',true,'points',0,
    'villain_id',v_enc.villain_id,'custom_villain_id',v_enc.custom_villain_id);
 END IF;
 v_correct:=p_slot=v_enc.weakness_slot;
 UPDATE public.arena_encounters
  SET weakness_used=true,updated_at=now()
  WHERE id=v_enc.id;
 IF NOT v_correct THEN
  RETURN jsonb_build_object('success',false,'resolved',false,'weakness_used',true,
   'selected_slot',p_slot,'villain_id',v_enc.villain_id,
   'custom_villain_id',v_enc.custom_villain_id);
 END IF;
 -- Même barème que arena_capture(), selon le même profil de danger serveur.
 -- Aucun bonus artificiel pour les personnages personnalisés.
 v_points:=55+v_enc.danger*25+v_enc.hits*5+
   CASE WHEN v_enc.villain_id IN(3,4,5) THEN 35 ELSE 0 END;
 INSERT INTO public.arena_captures(
   player_id,encounter_id,villain_id,points,perfect,custom_villain_id
 ) VALUES(v_uid,v_enc.id,v_enc.villain_id,v_points,false,v_enc.custom_villain_id);
 UPDATE public.arena_encounters
 SET status='caught',resolved_at=now(),updated_at=now()
 WHERE id=v_enc.id;
 IF v_enc.custom_villain_id IS NOT NULL THEN
  SELECT COALESCE(NULLIF(btrim(v.weakness_object),''),
    NULLIF(btrim(v.weakness_label),''),'Faille ultime')
  INTO v_weakness FROM public.custom_villains v
  WHERE v.id=v_enc.custom_villain_id AND v.owner_user_id=v_uid;
 ELSE
  v_weakness:=CASE v_enc.villain_id
   WHEN 0 THEN 'Brosse à dents'
   WHEN 1 THEN 'Lunettes'
   WHEN 2 THEN 'Magret de canard'
   WHEN 3 THEN 'Micro'
   WHEN 4 THEN 'Bescherelle'
   WHEN 5 THEN 'Déodorant'
   ELSE 'Faille ultime' END;
 END IF;
 RETURN jsonb_build_object('success',true,'resolved',true,
   'ultimate',true,'weakness_used',true,'selected_slot',p_slot,
   'points',v_points,'perfect',false,'weakness_object',v_weakness,
   'villain_id',v_enc.villain_id,
   'custom_villain_id',v_enc.custom_villain_id);
END;$$;

REVOKE ALL ON FUNCTION public.arena_guess_weakness(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.arena_guess_weakness(uuid,integer) TO authenticated;
COMMENT ON FUNCTION public.arena_guess_weakness(uuid,integer) IS
 'One server-validated blind 1-of-6 ultimate weakness card per encounter';
