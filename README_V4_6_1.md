# SUPERVILAINS V4.6.1 — Correctif des photos blanches

## Diagnostic
Une photo source pouvait être visible dans le champ d'aperçu local mais blanche dans « MES SUPER-VILAINS » après l'envoi. Le Storage et la fiche étaient présents : la cause probable était la conversion systématique JPEG via un canvas mobile, qui peut générer silencieusement une image blanche.

## Correctifs appliqués
- JPEG/PNG/WebP de 8 Mio maximum : transfert des octets originaux **sans conversion ni dégradation**.
- Le chemin stocké contient l'extension réelle : `source.jpg`, `source.png` ou `source.webp`, avec le vrai `contentType`.
- Nouveaux droits Storage privés sur ces trois noms de fichiers (migration `supabase/006_original_photo_formats.sql`).
- Photos plus volumineuses / HEIC : conversion JPEG nécessaire, avec une vérification du résultat avant l'upload pour bloquer les images entièrement blanches.
- Dans la liste, lecture du Blob via `storage.download` avec la session authentifiée, pour éviter les vignettes périmées. Fallback URL signée lorsque le téléchargement Blob échoue.
- Si le JPEG **déjà stocké** est blanc, le jeu affiche un avertissement et invite à sélectionner à nouveau l'original.
- Lors d'un changement de format, l'ancienne photo est supprimée uniquement après association réussie de la nouvelle.
- Service Worker : cache `supervilains-v4-6-1-photo-originale-sans-blanc`.

## Limitations
Le JPEG déjà stocké entièrement blanc ne peut pas retrouver les pixels de la photo originale sans que le joueur la sélectionne à nouveau. La fiche et sa progression sont conservées.

## Tests automatiques effectués
- Chaîne JS compilée sans erreur (jeu, créateur, arène, service worker).
- Simulations JPEG/PNG/WebP : le Blob uploadé est identique au Blob original.
- Simulation de conversion volumineuse valide et refus d'une conversion produisant du blanc.
- Simulation complète de création, d'upload, de téléchargement Blob privé, d'affichage, et de détection d'une ancienne photo blanche.
- Vérification des policies Storage et préservation des données côté Supabase.
- Test réel sur téléphone à confirmer par l'utilisateur.
