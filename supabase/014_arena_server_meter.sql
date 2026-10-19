-- SUPERVILAINS V4.14 — Jauge compétitive sécurisée et versionnée.
-- Cette migration a été appliquée au projet Supabase le 19 octobre 2026.
-- Elle ajoute seulement une colonne et deux RPC (sans supprimer les scores historiques).
ALTER TABLE public.arena_encounters
  ADD COLUMN IF NOT EXISTS meter_started_at timestamptz;

COMMENT ON COLUMN public.arena_encounters.meter_started_at IS
  'Début unique de la jauge chronométré par le serveur, sans possibilité de redémarrer.';

CREATE OR REPLACE FUNCTION public.arena_meter_begin(p_encounter uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_enc public.arena_encounters%rowtype;
 v_now timestamptz;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 SELECT * INTO v_enc FROM public.arena_encounters e
  WHERE e.id=p_encounter AND e.player_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_enc.status<>'active' THEN
  RAISE EXCEPTION 'Rencontre indisponible'; END IF;
 IF v_enc.started_at<clock_timestamp()-interval '5 minutes' THEN
  UPDATE public.arena_encounters SET status='fled',resolved_at=clock_timestamp(),updated_at=clock_timestamp()
   WHERE id=v_enc.id;
  RETURN jsonb_build_object('expired',true,'ready',false);
 END IF;
 v_now:=clock_timestamp();
 IF v_enc.meter_started_at IS NULL THEN
  UPDATE public.arena_encounters SET meter_started_at=v_now,updated_at=v_now WHERE id=v_enc.id;
 ELSE
  v_now:=clock_timestamp();
 END IF;
 RETURN jsonb_build_object(
  'ready',true,'started_ms',extract(epoch from coalesce(v_enc.meter_started_at,v_now))*1000,
  'server_ms',extract(epoch from clock_timestamp())*1000,'period_ms',5400,
  'one_shot',true);
END;$function$
;

CREATE OR REPLACE FUNCTION public.arena_meter_finish(p_encounter uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid:=auth.uid(); v_enc public.arena_encounters%rowtype;
 v_now timestamptz; v_elapsed double precision;v_phase double precision;
 v_position double precision;v_precision int;v_bonus int;
 v_chance int;v_success boolean;v_perfect boolean:=false;v_points int:=0;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 SELECT * INTO v_enc FROM public.arena_encounters e
  WHERE e.id=p_encounter AND e.player_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_enc.status<>'active' THEN
  RAISE EXCEPTION 'Cette capture est deja resolue'; END IF;
 v_now:=clock_timestamp();
 IF v_enc.started_at<v_now-interval '5 minutes' THEN
  UPDATE public.arena_encounters SET status='fled',resolved_at=v_now,updated_at=v_now WHERE id=v_enc.id;
  RETURN jsonb_build_object('success',false,'expired',true,'points',0,
   'villain_id',v_enc.villain_id,'custom_villain_id',v_enc.custom_villain_id);
 END IF;
 IF v_enc.meter_started_at IS NULL THEN
  RAISE EXCEPTION 'Commence la jauge avant de capturer'; END IF;
 v_elapsed:=greatest(0,extract(epoch from v_now-v_enc.meter_started_at));
 -- Allers-retours 5 % à 95 % : trajet simple de 2,7 s, période 5,4 s.
 v_phase:=(v_elapsed/2.7)-2.0*floor((v_elapsed/2.7)/2.0);
 v_position:=case when v_phase<=1 then v_phase else 2-v_phase end;
 v_precision:=round(100*greatest(0,1-abs(v_position-.5)*2));
 -- En cas de reprise après une longue coupure, ne pas pénaliser le joueur.
 IF v_elapsed>30 THEN v_precision:=50; END IF;
 v_bonus:=round((v_precision-50)*0.30);
 v_chance:=least(92,greatest(22,53-v_enc.danger*5+v_enc.hits*18+v_bonus));
 v_success:=random()*100<v_chance;
 IF v_success THEN
  v_perfect:=v_enc.hits=3 AND v_precision>=90;
  v_points:=55+v_enc.danger*25+v_enc.hits*5+
    CASE WHEN v_enc.villain_id IN(3,4,5) THEN 35 ELSE 0 END+
    CASE WHEN v_perfect THEN 40 ELSE 0 END;
  INSERT INTO public.arena_captures(player_id,encounter_id,villain_id,points,perfect,custom_villain_id)
   VALUES(v_uid,v_enc.id,v_enc.villain_id,v_points,v_perfect,v_enc.custom_villain_id);
 END IF;
 UPDATE public.arena_encounters SET
  status=CASE WHEN v_success THEN 'caught' ELSE 'escaped' END,
  resolved_at=v_now,updated_at=v_now WHERE id=v_enc.id;
 RETURN jsonb_build_object(
  'success',v_success,'points',v_points,'perfect',v_perfect,'precision',v_precision,
  'bonus',v_bonus,'chance',v_chance,'hits',v_enc.hits,
  'villain_id',v_enc.villain_id,'custom_villain_id',v_enc.custom_villain_id);
END;$function$
;

REVOKE ALL ON FUNCTION public.arena_meter_begin(uuid),public.arena_meter_finish(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.arena_meter_begin(uuid),public.arena_meter_finish(uuid) TO authenticated;
COMMENT ON FUNCTION public.arena_meter_finish(uuid) IS
  'Capture avec jauge : horodatage, precision et tirage effectues exclusivement par PostgreSQL.';
