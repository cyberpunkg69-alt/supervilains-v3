-- SUPERVILAINS — migration 002 / Createur de super-vilains IA
-- Prive par defaut. Les operations IA et la publication publique sont des etapes ulterieures.
BEGIN;

CREATE TABLE IF NOT EXISTS public.custom_villains (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
 alias text CHECK (alias IS NULL OR char_length(alias)<=80),
 description text CHECK (description IS NULL OR char_length(description)<=1000),
 weakness_label text NOT NULL CHECK (char_length(btrim(weakness_label)) BETWEEN 2 AND 120),
 weakness_object text CHECK (weakness_object IS NULL OR char_length(weakness_object)<=120),
 danger_level smallint NOT NULL DEFAULT 2 CHECK (danger_level BETWEEN 1 AND 5),
 district text CHECK (district IS NULL OR char_length(district)<=80),
 wanted_reason text CHECK (wanted_reason IS NULL OR char_length(wanted_reason)<=900),
 intro_line text CHECK (intro_line IS NULL OR char_length(intro_line)<=350),
 taunt_line text CHECK (taunt_line IS NULL OR char_length(taunt_line)<=350),
 capture_line text CHECK (capture_line IS NULL OR char_length(capture_line)<=350),
 voice_type text NOT NULL DEFAULT 'comique' CHECK
   (voice_type IN ('grave','comique','froid','theatral','diabolique','autoritaire')),
 source_photo_path text, portrait_path text, troll_path text,
 capture_path text, thumbnail_path text,
 status text NOT NULL DEFAULT 'draft' CHECK
   (status IN ('draft','uploading','queued','generating','ready','failed')),
 is_public boolean NOT NULL DEFAULT false CHECK (is_public=false),
 photo_permission_confirmed_at timestamptz NOT NULL,
 regenerations_used smallint NOT NULL DEFAULT 0 CHECK (regenerations_used BETWEEN 0 AND 3),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT custom_villains_owner_pair UNIQUE(id,owner_user_id),
 CONSTRAINT custom_villains_asset_paths CHECK(
  (source_photo_path IS NULL OR source_photo_path LIKE owner_user_id::text||'/'||id::text||'/%') AND
  (portrait_path IS NULL OR portrait_path LIKE owner_user_id::text||'/'||id::text||'/%') AND
  (troll_path IS NULL OR troll_path LIKE owner_user_id::text||'/'||id::text||'/%') AND
  (capture_path IS NULL OR capture_path LIKE owner_user_id::text||'/'||id::text||'/%') AND
  (thumbnail_path IS NULL OR thumbnail_path LIKE owner_user_id::text||'/'||id::text||'/%')
 )
);
CREATE INDEX IF NOT EXISTS custom_villains_owner_latest ON public.custom_villains(owner_user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.custom_villain_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 villain_id uuid NOT NULL, owner_user_id uuid NOT NULL,
 job_type text NOT NULL CHECK (job_type IN ('portrait','troll','capture','voice','full_bundle')),
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
 progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
 attempt smallint NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 5),
 error_message text CHECK (error_message IS NULL OR char_length(error_message)<=500),
 created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz,
 finished_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT custom_villain_jobs_villain_owner_fk FOREIGN KEY(villain_id,owner_user_id)
 REFERENCES public.custom_villains(id,owner_user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS custom_villain_jobs_owner_latest ON public.custom_villain_jobs(owner_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS custom_villain_jobs_pending ON public.custom_villain_jobs(status,created_at)
 WHERE status IN ('queued','running');

CREATE TABLE IF NOT EXISTS public.custom_villain_audio (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 villain_id uuid NOT NULL UNIQUE,owner_user_id uuid NOT NULL,
 voice_type text NOT NULL CHECK (voice_type IN ('grave','comique','froid','theatral','diabolique','autoritaire')),
 intro_audio_path text,taunt_audio_path text,capture_audio_path text,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','generating','ready','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT custom_villain_audio_villain_owner_fk FOREIGN KEY(villain_id,owner_user_id)
 REFERENCES public.custom_villains(id,owner_user_id) ON DELETE CASCADE,
 CONSTRAINT custom_villain_audio_asset_paths CHECK(
  (intro_audio_path IS NULL OR intro_audio_path LIKE owner_user_id::text||'/'||villain_id::text||'/%') AND
  (taunt_audio_path IS NULL OR taunt_audio_path LIKE owner_user_id::text||'/'||villain_id::text||'/%') AND
  (capture_audio_path IS NULL OR capture_audio_path LIKE owner_user_id::text||'/'||villain_id::text||'/%')
 )
);
CREATE INDEX IF NOT EXISTS custom_villain_audio_owner ON public.custom_villain_audio(owner_user_id);

-- Les internautes non connectes n'ont aucun acces. Les joueurs connectes
-- lisent leurs propres fiches ; seul le serveur peut creer des jobs/images/sons.
ALTER TABLE public.custom_villains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_villain_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_villain_audio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.custom_villains,public.custom_villain_jobs,public.custom_villain_audio
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.custom_villains,public.custom_villain_jobs,public.custom_villain_audio TO authenticated;
CREATE POLICY custom_villains_read_own ON public.custom_villains FOR SELECT TO authenticated
 USING(owner_user_id=(SELECT auth.uid()));
CREATE POLICY custom_villain_jobs_read_own ON public.custom_villain_jobs FOR SELECT TO authenticated
 USING(owner_user_id=(SELECT auth.uid()));
CREATE POLICY custom_villain_audio_read_own ON public.custom_villain_audio FOR SELECT TO authenticated
 USING(owner_user_id=(SELECT auth.uid()));

-- Cree un brouillon avec les champs autorises uniquement.
-- photo_permission=true signifie que le joueur atteste pouvoir utiliser la photo.
CREATE OR REPLACE FUNCTION public.custom_villain_create(p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_name text;v_weakness text;v_voice text;v_danger smallint;v_id uuid;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Fiche invalide';END IF;
 IF p_payload->>'photo_permission' IS DISTINCT FROM 'true' THEN
  RAISE EXCEPTION 'Autorisation d utiliser la photo requise';
 END IF;
 v_name:=btrim(coalesce(p_payload->>'name',''));
 v_weakness:=btrim(coalesce(p_payload->>'weakness_label',''));
 IF char_length(v_name) NOT BETWEEN 2 AND 60 THEN RAISE EXCEPTION 'Nom : 2 a 60 caracteres';END IF;
 IF char_length(v_weakness) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Faille : 2 a 120 caracteres';END IF;
 v_voice:=coalesce(nullif(btrim(p_payload->>'voice_type'),''),'comique');
 IF v_voice NOT IN ('grave','comique','froid','theatral','diabolique','autoritaire')
 THEN RAISE EXCEPTION 'Voix invalide';END IF;
 BEGIN
  v_danger:=coalesce((p_payload->>'danger_level')::smallint,2);
 EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'Niveau de danger invalide';
 END;
 IF v_danger NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Danger : 1 a 5';END IF;
 -- Protege contre les creations simultanees depassant le quota de 10.
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text,2026));
 IF (SELECT count(*) FROM public.custom_villains WHERE owner_user_id=v_uid)>=10
 THEN RAISE EXCEPTION 'Limite de 10 super-vilains atteinte';END IF;
 INSERT INTO public.custom_villains(
  owner_user_id,name,alias,description,weakness_label,weakness_object,
  danger_level,district,wanted_reason,intro_line,taunt_line,capture_line,
  voice_type,photo_permission_confirmed_at
 ) VALUES(
  v_uid,v_name,nullif(btrim(p_payload->>'alias'),''),
  nullif(btrim(p_payload->>'description'),''),v_weakness,
  nullif(btrim(p_payload->>'weakness_object'),''),v_danger,
  nullif(btrim(p_payload->>'district'),''),
  nullif(btrim(p_payload->>'wanted_reason'),''),
  nullif(btrim(p_payload->>'intro_line'),''),
  nullif(btrim(p_payload->>'taunt_line'),''),
  nullif(btrim(p_payload->>'capture_line'),''),
  v_voice,now()
 ) RETURNING id INTO v_id;
 RETURN v_id;
END;$$;

-- Mise a jour de la fiche uniquement, sans droit de changer le proprietaire,
-- le statut du travail IA, les chemins generes ou le nombre de regenerations.
CREATE OR REPLACE FUNCTION public.custom_villain_update(p_villain_id uuid,p_payload jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Fiche invalide';END IF;
 UPDATE public.custom_villains v SET
  name=CASE WHEN p_payload?'name' THEN btrim(coalesce(p_payload->>'name','')) ELSE v.name END,
  alias=CASE WHEN p_payload?'alias' THEN nullif(btrim(p_payload->>'alias'),'') ELSE v.alias END,
  description=CASE WHEN p_payload?'description' THEN nullif(btrim(p_payload->>'description'),'') ELSE v.description END,
  weakness_label=CASE WHEN p_payload?'weakness_label' THEN btrim(coalesce(p_payload->>'weakness_label','')) ELSE v.weakness_label END,
  weakness_object=CASE WHEN p_payload?'weakness_object' THEN nullif(btrim(p_payload->>'weakness_object'),'') ELSE v.weakness_object END,
  danger_level=CASE WHEN p_payload?'danger_level' THEN (p_payload->>'danger_level')::smallint ELSE v.danger_level END,
  district=CASE WHEN p_payload?'district' THEN nullif(btrim(p_payload->>'district'),'') ELSE v.district END,
  wanted_reason=CASE WHEN p_payload?'wanted_reason' THEN nullif(btrim(p_payload->>'wanted_reason'),'') ELSE v.wanted_reason END,
  intro_line=CASE WHEN p_payload?'intro_line' THEN nullif(btrim(p_payload->>'intro_line'),'') ELSE v.intro_line END,
  taunt_line=CASE WHEN p_payload?'taunt_line' THEN nullif(btrim(p_payload->>'taunt_line'),'') ELSE v.taunt_line END,
  capture_line=CASE WHEN p_payload?'capture_line' THEN nullif(btrim(p_payload->>'capture_line'),'') ELSE v.capture_line END,
  voice_type=CASE WHEN p_payload?'voice_type' THEN btrim(coalesce(p_payload->>'voice_type','')) ELSE v.voice_type END,
  updated_at=now()
 WHERE v.id=p_villain_id AND v.owner_user_id=v_uid;
 RETURN FOUND;
END;$$;

-- Liaison d'une photo apres son chargement effectif dans Storage.
CREATE OR REPLACE FUNCTION public.custom_villain_attach_photo(p_villain_id uuid,p_object_path text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_prefix text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 v_prefix:=v_uid::text||'/'||p_villain_id::text||'/';
 IF p_object_path IS NULL
    OR left(p_object_path,char_length(v_prefix))<>v_prefix
    OR p_object_path!~* '\.(jpg|jpeg|png|webp)$'
 THEN RAISE EXCEPTION 'Chemin de photo invalide';END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o
               WHERE o.bucket_id='villain-source' AND o.name=p_object_path)
 THEN RAISE EXCEPTION 'Photo non chargee';END IF;
 UPDATE public.custom_villains v SET source_photo_path=p_object_path,updated_at=now()
 WHERE v.id=p_villain_id AND v.owner_user_id=v_uid AND v.status IN ('draft','failed');
 RETURN FOUND;
END;$$;

REVOKE ALL ON FUNCTION public.custom_villain_create(jsonb),
 public.custom_villain_update(uuid,jsonb),
 public.custom_villain_attach_photo(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.custom_villain_create(jsonb),
 public.custom_villain_update(uuid,jsonb),
 public.custom_villain_attach_photo(uuid,text) TO authenticated;

-- Buckets prives. Les fichiers appartiennent a un chemin uid/villain-id/nom.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES
 ('villain-source','villain-source',false,8388608,ARRAY['image/jpeg','image/png','image/webp']::text[]),
 ('villain-generated','villain-generated',false,16777216,ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
 ('villain-audio','villain-audio',false,8388608,ARRAY['audio/mpeg','audio/mp3','audio/ogg','audio/wav']::text[])
ON CONFLICT(id) DO NOTHING;

-- Lecture des fichiers uniquement par le joueur auquel appartient la fiche.
CREATE POLICY custom_villain_storage_read_own ON storage.objects
FOR SELECT TO authenticated USING(
 bucket_id IN ('villain-source','villain-generated','villain-audio')
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND EXISTS (SELECT 1 FROM public.custom_villains v
   WHERE v.owner_user_id=(SELECT auth.uid())
   AND v.id::text=(storage.foldername(name))[2])
);
-- Le client ne peut televerser/mettre a jour/supprimer QUE sa photo source.
CREATE POLICY custom_villain_storage_upload_own_source ON storage.objects
FOR INSERT TO authenticated WITH CHECK(
 bucket_id='villain-source'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND name~* '\.(jpg|jpeg|png|webp)$'
 AND EXISTS(SELECT 1 FROM public.custom_villains v
  WHERE v.owner_user_id=(SELECT auth.uid())
   AND v.id::text=(storage.foldername(name))[2]
   AND v.status IN ('draft','failed'))
);
CREATE POLICY custom_villain_storage_replace_own_source ON storage.objects
FOR UPDATE TO authenticated USING(
 bucket_id='villain-source'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND EXISTS(SELECT 1 FROM public.custom_villains v
  WHERE v.owner_user_id=(SELECT auth.uid())
   AND v.id::text=(storage.foldername(name))[2]
   AND v.status IN ('draft','failed'))
) WITH CHECK(
 bucket_id='villain-source'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND name~* '\.(jpg|jpeg|png|webp)$'
 AND EXISTS(SELECT 1 FROM public.custom_villains v
  WHERE v.owner_user_id=(SELECT auth.uid())
   AND v.id::text=(storage.foldername(name))[2]
   AND v.status IN ('draft','failed'))
);
CREATE POLICY custom_villain_storage_delete_own_source ON storage.objects
FOR DELETE TO authenticated USING(
 bucket_id='villain-source'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND EXISTS(SELECT 1 FROM public.custom_villains v
  WHERE v.owner_user_id=(SELECT auth.uid())
   AND v.id::text=(storage.foldername(name))[2]
   AND v.status IN ('draft','failed'))
);

COMMENT ON TABLE public.custom_villains IS 'Fiches de super-vilains personnels : statut IA reserve au serveur.';
COMMENT ON TABLE public.custom_villain_jobs IS 'Suivi des generations IA : lecture proprietaire, ecriture serveur.';
COMMENT ON TABLE public.custom_villain_audio IS 'Voix synthetiques : lecture proprietaire, ecriture serveur.';
COMMIT;