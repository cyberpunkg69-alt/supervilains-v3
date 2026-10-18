-- SUPERVILAINS V4.8.1 — Correctif import manuel des trois portraits.
-- Cause : storage.foldername(v.name) désignait le NOM du personnage dans
-- la sous-requête (v.name), pas le CHEMIN du fichier (storage.objects.name).
-- Les uploads étaient toujours refusés par les règles RLS de Storage.
--
-- Corrige INSERT / UPDATE / DELETE uniquement pour les créations privées.
-- Ne change ni les droits de lecture, ni les données, ni les buckets.
-- Les fichiers autorisés suivent :
--   <user_id>/<villain_id>/{portrait,troll,capture}.{jpg,png,webp}

ALTER POLICY custom_villain_manual_image_insert ON storage.objects
WITH CHECK (
  bucket_id = 'villain-generated'
  AND storage.filename(storage.objects.name) IN (
    'portrait.jpg','portrait.png','portrait.webp',
    'troll.jpg','troll.png','troll.webp',
    'capture.jpg','capture.png','capture.webp'
  )
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
      AND v.source_photo_path IS NOT NULL
  )
);

ALTER POLICY custom_villain_manual_image_update ON storage.objects
USING (
  bucket_id = 'villain-generated'
  AND storage.filename(storage.objects.name) IN (
    'portrait.jpg','portrait.png','portrait.webp',
    'troll.jpg','troll.png','troll.webp',
    'capture.jpg','capture.png','capture.webp'
  )
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
      AND v.source_photo_path IS NOT NULL
  )
)
WITH CHECK (
  bucket_id = 'villain-generated'
  AND storage.filename(storage.objects.name) IN (
    'portrait.jpg','portrait.png','portrait.webp',
    'troll.jpg','troll.png','troll.webp',
    'capture.jpg','capture.png','capture.webp'
  )
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
      AND v.source_photo_path IS NOT NULL
  )
);

ALTER POLICY custom_villain_manual_image_delete ON storage.objects
USING (
  bucket_id = 'villain-generated'
  AND storage.filename(storage.objects.name) IN (
    'portrait.jpg','portrait.png','portrait.webp',
    'troll.jpg','troll.png','troll.webp',
    'capture.jpg','capture.png','capture.webp'
  )
  AND (storage.foldername(storage.objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.custom_villains AS v
    WHERE v.owner_user_id = (SELECT auth.uid())
      AND v.id::text = (storage.foldername(storage.objects.name))[2]
      AND v.status IN ('draft','failed')
      AND v.source_photo_path IS NOT NULL
  )
);
