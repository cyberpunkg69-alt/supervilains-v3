-- SUPERVILAINS V4.11 — Le fil public ne doit pas confondre les
-- personnages privés avec les six super-vilains officiels.
-- -1 = capture d'un personnage personnel (identité non divulguée).
-- Aucun score ou mécanisme d'arène n'est modifié.
CREATE OR REPLACE FUNCTION public.arena_feed()
RETURNS TABLE(handle text, villain_id smallint, points integer, captured_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 RETURN QUERY
 SELECT p.handle,
        (CASE WHEN c.custom_villain_id IS NOT NULL THEN -1 ELSE c.villain_id END)::smallint AS villain_id,
        c.points,
        c.created_at
 FROM public.arena_captures c
 JOIN public.arena_players p ON p.id=c.player_id
 ORDER BY c.created_at DESC LIMIT 12;
END;$$;
REVOKE ALL ON FUNCTION public.arena_feed() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.arena_feed() TO authenticated;
