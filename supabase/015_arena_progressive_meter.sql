-- SUPERVILAINS V4.15 : géométrie de la jauge progressive, déterministe côté serveur.
-- La cible se referme/s'ouvre toutes les 3,6 secondes (38 à 16 % au départ,
-- puis 32 à 10 %) et le curseur accélère progressivement jusqu'à x2,08.
-- Ne requiert et n'accepte aucun paramètre client de précision/position.
CREATE OR REPLACE FUNCTION public.arena_meter_geometry_v2(p_elapsed double precision)
RETURNS TABLE(position_pct double precision,zone_width_pct double precision,precision_pct integer)
LANGUAGE sql IMMUTABLE SET search_path TO '' AS $geometry$
WITH timer AS (
 SELECT greatest(0.0,least(coalesce(p_elapsed,0.0),300.0)) AS t
),
travel AS (
 SELECT t,
  (t+0.045*power(least(t,12.0),2)+1.08*greatest(t-12.0,0.0))/2.7 AS trips,
  greatest(10.0,16.0+11.0*(1.0+cos(2.0*pi()*t/3.6))-6.0*least(t/12.0,1.0)) AS width
 FROM timer
),
phase AS (
 SELECT width,(trips-2.0*floor(trips/2.0)) AS p FROM travel
),
actual AS (
 SELECT width,5.0+90.0*(CASE WHEN p<=1.0 THEN p ELSE 2.0-p END) AS pos FROM phase
)
SELECT pos,width,
 round(greatest(0.0,100.0-5.0*greatest(0.0,abs(pos-50.0)-width/2.0)))::integer
FROM actual;
$geometry$;

REVOKE ALL ON FUNCTION public.arena_meter_geometry_v2(double precision) FROM PUBLIC,anon,authenticated;

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
  'one_shot',true,'motion_version',2);
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
 v_now timestamptz;v_elapsed double precision;
 v_position double precision;v_zone_width double precision;v_precision int;v_bonus int;
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
 SELECT g.position_pct,g.zone_width_pct,g.precision_pct
  INTO v_position,v_zone_width,v_precision
  FROM public.arena_meter_geometry_v2(v_elapsed) AS g;
 -- Une reprise après une longue interruption donne une précision neutre.
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
  'motion_version',2,'target_width_pct',round(v_zone_width::numeric,1),
  'villain_id',v_enc.villain_id,'custom_villain_id',v_enc.custom_villain_id);
END;$function$
;

REVOKE ALL ON FUNCTION public.arena_meter_begin(uuid),public.arena_meter_finish(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.arena_meter_begin(uuid),public.arena_meter_finish(uuid) TO authenticated;
COMMENT ON FUNCTION public.arena_meter_finish(uuid) IS
  'Capture progressive V4.15 : cible variable, curseur accelerant, precision et tirage exclusivement controles par PostgreSQL.';
