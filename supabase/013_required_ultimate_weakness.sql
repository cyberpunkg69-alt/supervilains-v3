-- SUPERVILAINS V4.12.1 — Chaque nouveau personnage doit avoir
-- un objet de faille ultime concret (carte correcte en SOLO + ARENE).
-- Aligne Morgane makeup sur la demande de l'utilisateur : rouge à lèvres.
-- Aucun portrait, photo, score ni personnage original n'est modifié.

UPDATE public.custom_villains
SET weakness_label='Rouge à lèvres',weakness_object='Rouge à lèvres',updated_at=now()
WHERE name='Morgane makeup'
  AND alias='La reine du maquillage'
  AND lower(btrim(weakness_object))=lower('Rouge à lèvres');

-- Existing custom villains have a weakness object; this constraint protects
-- new entries even if a client bypasses the required HTML field.
ALTER TABLE public.custom_villains
 ADD CONSTRAINT custom_villains_ultimate_object_required
 CHECK (weakness_object IS NOT NULL
   AND char_length(btrim(weakness_object)) BETWEEN 2 AND 120);
