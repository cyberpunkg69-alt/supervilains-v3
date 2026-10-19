-- SUPERVILAINS V4.9 : Equité des classements.
-- Un personnage personnel peut modifier l'apparence uniquement, jamais la
-- distribution des niveaux de danger, bonus et points des patrouilles.
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
    'hits',v_enc.hits,'started_at',v_enc.started_at);
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
  'danger',v_enc.danger,'hits',0,'started_at',v_enc.started_at);
END;$$;


REVOKE ALL ON FUNCTION public.arena_start() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.arena_start() TO authenticated;
