-- SUPERVILAINS V4.6.1 : conserver les JPEG/PNG/WebP originaux
-- Les anciens objets .../source.jpg et les fiches existantes restent inchanges.
-- Un nouveau televersement garde le vrai format de la photo et son type MIME.
-- Pour des formats non compatibles (HEIC/HEIF) ou >8 Mio, l'application
-- produit un JPEG et n'accepte pas les images vides apres conversion.

ALTER POLICY custom_villain_storage_upload_own_source ON storage.objects
WITH CHECK (
 bucket_id='villain-source'
 AND storage.filename(storage.objects.name)=ANY(ARRAY['source.jpg','source.png','source.webp'])
 AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
 AND EXISTS(
  SELECT 1 FROM public.custom_villains AS v
  WHERE v.owner_user_id=(SELECT auth.uid())
  AND v.id::text=(storage.foldername(storage.objects.name))[2]
  AND v.status IN ('draft','failed')
 )
);

ALTER POLICY custom_villain_storage_replace_own_source ON storage.objects
USING(
 bucket_id='villain-source'
 AND storage.filename(storage.objects.name)=ANY(ARRAY['source.jpg','source.png','source.webp'])
 AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
 AND EXISTS(
  SELECT 1 FROM public.custom_villains AS v
  WHERE v.owner_user_id=(SELECT auth.uid())
  AND v.id::text=(storage.foldername(storage.objects.name))[2]
  AND v.status IN ('draft','failed')
 )
)
WITH CHECK (
 bucket_id='villain-source'
 AND storage.filename(storage.objects.name)=ANY(ARRAY['source.jpg','source.png','source.webp'])
 AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
 AND EXISTS(
  SELECT 1 FROM public.custom_villains AS v
  WHERE v.owner_user_id=(SELECT auth.uid())
  AND v.id::text=(storage.foldername(storage.objects.name))[2]
  AND v.status IN ('draft','failed')
 )
);

ALTER POLICY custom_villain_storage_delete_own_source ON storage.objects
USING(
 bucket_id='villain-source'
 AND storage.filename(storage.objects.name)=ANY(ARRAY['source.jpg','source.png','source.webp'])
 AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
 AND EXISTS(
  SELECT 1 FROM public.custom_villains AS v
  WHERE v.owner_user_id=(SELECT auth.uid())
  AND v.id::text=(storage.foldername(storage.objects.name))[2]
  AND v.status IN ('draft','failed')
 )
);
