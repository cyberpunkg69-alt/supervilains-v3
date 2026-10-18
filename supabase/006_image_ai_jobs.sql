-- V4.6: privileged, quota-limited image generation. Only service_role can execute these.
CREATE UNIQUE INDEX IF NOT EXISTS custom_villain_one_running_image_job
 ON public.custom_villain_jobs(villain_id)
 WHERE status='running' AND job_type IN ('portrait','troll','capture');

CREATE OR REPLACE FUNCTION public.custom_villain_begin_image_job(p_user_id uuid,p_villain_id uuid,p_kind text,p_regenerate boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.custom_villains%ROWTYPE; v_job_id uuid; v_existing text; v_count integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Serveur uniquement'; END IF;
 IF p_user_id IS NULL OR p_villain_id IS NULL OR p_kind NOT IN ('portrait','troll','capture') THEN
  RAISE EXCEPTION 'Parametres de generation invalides';
 END IF;
 -- Serialize budget reservations across users to stop concurrent quota abuse.
 PERFORM pg_advisory_xact_lock(2026,46001);
 SELECT * INTO v FROM public.custom_villains
 WHERE id=p_villain_id AND owner_user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personnage introuvable'; END IF;
 IF v.source_photo_path IS NULL OR v.photo_permission_confirmed_at IS NULL THEN
  RAISE EXCEPTION 'Photo source et autorisation requises';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o
  WHERE o.bucket_id='villain-source' AND o.name=v.source_photo_path)
 THEN RAISE EXCEPTION 'Photo source introuvable'; END IF;
 -- Unlock interrupted edge requests after eight minutes.
 UPDATE public.custom_villain_jobs SET status='failed',
 error_message='Generation interrompue : relancer',finished_at=now(),updated_at=now()
 WHERE villain_id=p_villain_id AND status='running'
 AND job_type IN ('portrait','troll','capture') AND created_at<now()-interval '8 minutes';
 IF EXISTS(SELECT 1 FROM public.custom_villain_jobs WHERE villain_id=p_villain_id
 AND status='running' AND job_type IN ('portrait','troll','capture'))
 THEN RAISE EXCEPTION 'Une image est deja en cours de generation'; END IF;
 v_existing:=CASE p_kind WHEN 'portrait' THEN v.portrait_path
 WHEN 'troll' THEN v.troll_path ELSE v.capture_path END;
 IF v_existing IS NOT NULL AND NOT p_regenerate THEN
  RAISE EXCEPTION 'Image deja creee. Regenerer pour la refaire';
 END IF;
 IF v_existing IS NOT NULL AND p_regenerate AND v.regenerations_used>=3 THEN
  RAISE EXCEPTION 'Limite des 3 regenerations atteinte';
 END IF;
 SELECT count(*) INTO v_count FROM public.custom_villain_jobs j
 WHERE j.owner_user_id=p_user_id AND j.job_type IN ('portrait','troll','capture')
 AND j.created_at>=now()-interval '24 hours';
 IF v_count>=9 THEN RAISE EXCEPTION 'Quota de 9 images par 24 heures atteint'; END IF;
 SELECT count(*) INTO v_count FROM public.custom_villain_jobs j
 WHERE j.job_type IN ('portrait','troll','capture')
 AND j.created_at>=now()-interval '24 hours';
 IF v_count>=45 THEN RAISE EXCEPTION 'Quota global quotidien atteint'; END IF;
 INSERT INTO public.custom_villain_jobs(
 villain_id,owner_user_id,job_type,status,progress,started_at,attempt)
 VALUES(p_villain_id,p_user_id,p_kind,'running',5,now(),
 CASE WHEN v_existing IS NOT NULL AND p_regenerate THEN 2 ELSE 1 END)
 RETURNING id INTO v_job_id;
 UPDATE public.custom_villains
 SET status='generating',regenerations_used=regenerations_used+
 CASE WHEN v_existing IS NOT NULL AND p_regenerate THEN 1 ELSE 0 END,
 updated_at=now() WHERE id=p_villain_id;
 RETURN v_job_id;
END;$$;

CREATE OR REPLACE FUNCTION public.custom_villain_finish_image_job(
 p_job_id uuid,p_success boolean,p_path text DEFAULT NULL,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.custom_villain_jobs%ROWTYPE;
 v public.custom_villains%ROWTYPE;
 expected_path text; new_portrait text; new_troll text; new_capture text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Serveur uniquement'; END IF;
 SELECT * INTO j FROM public.custom_villain_jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND OR j.status<>'running' THEN RETURN false; END IF;
 SELECT * INTO v FROM public.custom_villains WHERE id=j.villain_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 expected_path:=j.owner_user_id::text||'/'||j.villain_id::text||'/'||j.job_type||'.webp';
 IF p_success THEN
  IF p_path IS DISTINCT FROM expected_path THEN RAISE EXCEPTION 'Chemin image non autorise'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='villain-generated' AND o.name=expected_path)
  THEN RAISE EXCEPTION 'Fichier image non disponible'; END IF;
 END IF;
 new_portrait:=CASE WHEN p_success AND j.job_type='portrait' THEN p_path ELSE v.portrait_path END;
 new_troll:=CASE WHEN p_success AND j.job_type='troll' THEN p_path ELSE v.troll_path END;
 new_capture:=CASE WHEN p_success AND j.job_type='capture' THEN p_path ELSE v.capture_path END;
 UPDATE public.custom_villain_jobs SET
  status=CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
  progress=CASE WHEN p_success THEN 100 ELSE 0 END,
  error_message=CASE WHEN p_success THEN NULL ELSE left(coalesce(p_error,'Generation interrompue'),350) END,
  finished_at=now(),updated_at=now() WHERE id=j.id;
 UPDATE public.custom_villains SET
  portrait_path=new_portrait,troll_path=new_troll,capture_path=new_capture,
  status=CASE WHEN new_portrait IS NOT NULL AND new_troll IS NOT NULL AND new_capture IS NOT NULL
  THEN 'ready' WHEN NOT p_success THEN 'failed' ELSE 'draft' END,
  regenerations_used=GREATEST(0,regenerations_used-
   CASE WHEN NOT p_success AND j.attempt=2 THEN 1 ELSE 0 END),
  updated_at=now() WHERE id=v.id;
 RETURN true;
END;$$;
REVOKE ALL ON FUNCTION
 public.custom_villain_begin_image_job(uuid,uuid,text,boolean),
 public.custom_villain_finish_image_job(uuid,boolean,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.custom_villain_begin_image_job(uuid,uuid,text,boolean),
 public.custom_villain_finish_image_job(uuid,boolean,text,text) TO service_role;
COMMENT ON FUNCTION public.custom_villain_begin_image_job(uuid,uuid,text,boolean)
 IS 'Rate-limited atomic paid image request, service_role only';
