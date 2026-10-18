-- V4.5 — Chaque brouillon ne peut stocker qu'une photo source active.
-- Nom canonique : <uid>/<id_du_vilain>/source.jpg
ALTER POLICY custom_villain_storage_upload_own_source ON storage.objects
WITH CHECK (
 bucket_id='villain-source'
 AND EXISTS(
  SELECT 1 FROM public.custom_villains v
  WHERE v.owner_user_id=(SELECT auth.uid())
  AND v.status IN ('draft','failed')
  AND name=v.owner_user_id::text||'/'||v.id::text||'/source.jpg'
 )
);
ALTER POLICY custom_villain_storage_replace_own_source ON storage.objects
USING(
 bucket_id='villain-source'
 AND EXISTS(
  SELECT 1 FROM public.custom_villains v
  WHERE v.owner_user_id=(SELECT auth.uid())
  AND v.status IN ('draft','failed')
  AND name=v.owner_user_id::text||'/'||v.id::text||'/source.jpg'
 )
)
WITH CHECK (
 bucket_id='villain-source'
 AND EXISTS(
  SELECT 1 FROM public.custom_villains v
  WHERE v.owner_user_id=(SELECT auth.uid())
  AND v.status IN ('draft','failed')
  AND name=v.owner_user_id::text||'/'||v.id::text||'/source.jpg'
 )
);
