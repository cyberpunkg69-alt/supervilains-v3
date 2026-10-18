-- V4.7.1 HOTFIX: align source-photo storage rules with the existing
-- browser uploader. The uploader preserves JPEG, PNG or WebP without
-- recompression to avoid "blank canvas" images on some Android devices.
-- Only one canonical basename per format: source.jpg/png/webp.
-- Existing JPEG photos and draft records remain unchanged.

ALTER POLICY custom_villain_storage_upload_own_source ON storage.objects
WITH CHECK (
  bucket_id = 'villain-source'
  AND storage.filename(storage.objects.name) IN ('source.jpg','source.png','source.webp')
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
  )
);

ALTER POLICY custom_villain_storage_replace_own_source ON storage.objects
USING (
  bucket_id = 'villain-source'
  AND storage.filename(storage.objects.name) IN ('source.jpg','source.png','source.webp')
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
  )
)
WITH CHECK (
  bucket_id = 'villain-source'
  AND storage.filename(storage.objects.name) IN ('source.jpg','source.png','source.webp')
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
  )
);

ALTER POLICY custom_villain_storage_delete_own_source ON storage.objects
USING (
  bucket_id = 'villain-source'
  AND storage.filename(storage.objects.name) IN ('source.jpg','source.png','source.webp')
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
  )
);

CREATE OR REPLACE FUNCTION public.custom_villain_attach_photo(
  p_villain_id uuid,p_object_path text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid := auth.uid(); v_folder text; v_file text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  v_folder := v_uid::text || '/' || p_villain_id::text || '/';
  v_file := substring(p_object_path FROM char_length(v_folder)+1);
  IF p_object_path IS NULL OR left(p_object_path,char_length(v_folder)) <> v_folder
    OR v_file NOT IN ('source.jpg','source.png','source.webp')
  THEN RAISE EXCEPTION 'Chemin de photo non autorise'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id='villain-source'
      AND o.name=p_object_path
  ) THEN RAISE EXCEPTION 'Photo source non chargee'; END IF;
  UPDATE public.custom_villains v
  SET source_photo_path=p_object_path,
    portrait_path=NULL,troll_path=NULL,capture_path=NULL,thumbnail_path=NULL,
    status='draft',updated_at=now()
  WHERE v.id=p_villain_id AND v.owner_user_id=v_uid AND v.status IN ('draft','failed');
  RETURN FOUND;
END;$$;

REVOKE ALL ON FUNCTION public.custom_villain_attach_photo(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.custom_villain_attach_photo(uuid,text) TO authenticated;
