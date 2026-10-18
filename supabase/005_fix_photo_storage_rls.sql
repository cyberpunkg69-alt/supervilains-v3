-- SUPERVILAINS V4.5 — Fix de l'upload privé des photos.
-- Cause: dans les sous-requêtes EXISTS, "name" était résolu en v.name
-- (nom du personnage) au lieu de storage.objects.name (chemin du fichier).
-- Corriger aussi SELECT et DELETE pour la récupération / suppression des photos.
--
-- Il n'y a aucune suppression de données ou de comptes.
-- Chemin autorisé pour une photo source : <auth.uid>/<villain.id>/source.jpg

ALTER POLICY custom_villain_storage_read_own ON storage.objects
USING (
  bucket_id IN ('villain-source','villain-generated','villain-audio')
  AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
  AND EXISTS(
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id=(SELECT auth.uid())
      AND v.id::text=(storage.foldername(storage.objects.name))[2]
  )
);

ALTER POLICY custom_villain_storage_upload_own_source ON storage.objects
WITH CHECK (
  bucket_id='villain-source'
  AND storage.filename(storage.objects.name)='source.jpg'
  AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
  AND EXISTS(
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id=(SELECT auth.uid())
      AND v.id::text=(storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
  )
);

ALTER POLICY custom_villain_storage_replace_own_source ON storage.objects
USING (
  bucket_id='villain-source'
  AND storage.filename(storage.objects.name)='source.jpg'
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
  AND storage.filename(storage.objects.name)='source.jpg'
  AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
  AND EXISTS(
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id=(SELECT auth.uid())
      AND v.id::text=(storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
  )
);

ALTER POLICY custom_villain_storage_delete_own_source ON storage.objects
USING (
  bucket_id='villain-source'
  AND storage.filename(storage.objects.name)='source.jpg'
  AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
  AND EXISTS(
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id=(SELECT auth.uid())
      AND v.id::text=(storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
  )
);
