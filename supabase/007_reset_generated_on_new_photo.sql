-- V4.6: replacing a photo invalidates previously generated variants.
-- Never overwrite the official game assets or any other player's media.
CREATE OR REPLACE FUNCTION public.custom_villain_attach_photo(
 p_villain_id uuid,p_object_path text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid(); v_path text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 v_path:=v_uid::text||'/'||p_villain_id::text||'/source.jpg';
 IF p_object_path IS DISTINCT FROM v_path THEN
  RAISE EXCEPTION 'Photo source non conforme';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM storage.objects o
  WHERE o.bucket_id='villain-source' AND o.name=v_path
 ) THEN RAISE EXCEPTION 'Photo source non chargee'; END IF;
 UPDATE public.custom_villains v SET
   source_photo_path=v_path,
   portrait_path=NULL,troll_path=NULL,capture_path=NULL,thumbnail_path=NULL,
   status='draft',updated_at=now()
 WHERE v.id=p_villain_id
   AND v.owner_user_id=v_uid
   AND v.status IN ('draft','failed');
 RETURN FOUND;
END;$$;
REVOKE ALL ON FUNCTION public.custom_villain_attach_photo(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.custom_villain_attach_photo(uuid,text) TO authenticated;
