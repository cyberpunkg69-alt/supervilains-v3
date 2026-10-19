-- SUPERVILAINS V4.9 — mes méchants personnels dans l'ARÈNE, sans tricherie.
-- Le joueur ne choisit JAMAIS le résultat, les chances ou les points.
-- Tous les personnages personnalisés sont privés à leur propriétaire.
ALTER TABLE public.arena_encounters
 ADD COLUMN IF NOT EXISTS custom_villain_id uuid REFERENCES public.custom_villains(id) ON DELETE SET NULL;
ALTER TABLE public.arena_captures
 ADD COLUMN IF NOT EXISTS custom_villain_id uuid REFERENCES public.custom_villains(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS arena_encounters_custom_owner_idx
 ON public.arena_encounters(player_id,custom_villain_id,started_at DESC)
 WHERE custom_villain_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.arena_start()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_user uuid:=auth.uid();v_player uuid;v_enc public.arena_encounters%rowtype;
 v_today bigint;v_last timestamptz;v_id int;
 v_dangers smallint[]:=array[1,2,2,3,4,5]::smallint[];
 v_custom uuid:=NULL;v_custom_danger smallint:=NULL;
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
  SELECT v.id,v.danger_level INTO v_custom,v_custom_danger
  FROM public.custom_villains v
  WHERE v.owner_user_id=v_user AND v.status='ready'
   AND v.portrait_path IS NOT NULL
   AND v.troll_path IS NOT NULL
   AND v.capture_path IS NOT NULL
  ORDER BY random() LIMIT 1;
 END IF;
 IF v_custom IS NULL THEN
  v_id:=floor(random()*6)::int;
 ELSE
  -- Même adversaire et mêmes points qu'une cible officielle de danger équivalent.
  v_id:=CASE v_custom_danger
   WHEN 1 THEN 0
   WHEN 2 THEN CASE WHEN random()<0.5 THEN 1 ELSE 2 END
   WHEN 3 THEN 3
   WHEN 4 THEN 4
   ELSE 5 END;
 END IF;
 INSERT INTO public.arena_encounters(player_id,villain_id,danger,custom_villain_id)
 VALUES(v_user,v_id,v_dangers[v_id+1],v_custom)
 RETURNING * INTO v_enc;
 RETURN jsonb_build_object('id',v_enc.id,'villain_id',v_enc.villain_id,
  'custom_villain_id',v_enc.custom_villain_id,
  'danger',v_enc.danger,'hits',0,'started_at',v_enc.started_at);
END;$$;

CREATE OR REPLACE FUNCTION public.arena_capture(p_encounter uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_user uuid:=auth.uid();v_enc public.arena_encounters%rowtype;
 v_chance int;v_success boolean;v_perfect boolean:=false;v_points int:=0;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 SELECT * INTO v_enc FROM public.arena_encounters e
 WHERE e.id=p_encounter AND e.player_id=v_user FOR UPDATE;
 IF NOT FOUND OR v_enc.status<>'active' THEN
  RAISE EXCEPTION 'Cette capture est déjà résolue';END IF;
 IF v_enc.started_at<now()-interval '5 minutes' THEN
  UPDATE public.arena_encounters SET status='fled',resolved_at=now(),updated_at=now()
  WHERE id=v_enc.id;
  RETURN jsonb_build_object('success',false,'expired',true,'points',0,
   'villain_id',v_enc.villain_id,'custom_villain_id',v_enc.custom_villain_id);
 END IF;
 -- L'identité personnalisée est purement visuelle : les statistiques et
 -- la probabilité restent définies sur le serveur (même barème historique).
 v_chance:=least(92,greatest(22,53-v_enc.danger*5+v_enc.hits*18));
 v_success:=random()*100<v_chance;
 IF v_success THEN
  v_perfect:=v_enc.hits=3 AND random()<0.30;
  v_points:=55+v_enc.danger*25+v_enc.hits*5+
   CASE WHEN v_enc.villain_id IN(3,4,5) THEN 35 ELSE 0 END+
   CASE WHEN v_perfect THEN 40 ELSE 0 END;
  INSERT INTO public.arena_captures(player_id,encounter_id,villain_id,points,perfect,custom_villain_id)
  VALUES(v_user,v_enc.id,v_enc.villain_id,v_points,v_perfect,v_enc.custom_villain_id);
 END IF;
 UPDATE public.arena_encounters SET
  status=CASE WHEN v_success THEN 'caught' ELSE 'escaped' END,
  resolved_at=now(),updated_at=now() WHERE id=v_enc.id;
 RETURN jsonb_build_object('success',v_success,'points',v_points,'perfect',v_perfect,
  'villain_id',v_enc.villain_id,'custom_villain_id',v_enc.custom_villain_id,
  'chance',v_chance,'hits',v_enc.hits);
END;$$;
-- Permissions RPC existantes explicitement conservées.
REVOKE ALL ON FUNCTION public.arena_start(),public.arena_capture(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.arena_start(),public.arena_capture(uuid) TO authenticated;
