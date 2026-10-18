-- SUPERVILAINS — V4.5 : supprimer uniquement ses propres brouillons
-- Le client efface d'abord sa photo source depuis Storage (politique deja active).
CREATE OR REPLACE FUNCTION public.custom_villain_delete_draft(p_villain_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  DELETE FROM public.custom_villains v
  WHERE v.id=p_villain_id
    AND v.owner_user_id=v_uid
    AND v.status IN ('draft','failed');
  RETURN FOUND;
END;$$;
REVOKE ALL ON FUNCTION public.custom_villain_delete_draft(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.custom_villain_delete_draft(uuid) TO authenticated;
