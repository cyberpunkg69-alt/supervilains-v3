# SUPERVILAINS V4.13 — Coffre unifié et statistiques dynamiques

## Carte SOLO

Le panneau « MES MÉCHANTS SUR LA CARTE » a été retiré pour éliminer la répétition des personnages déjà présents dans les cartes de quartiers personnalisés. Le radar, les patrouilles et les portraits des quartiers restent opérationnels. Le chargement automatique des créations validées depuis Supabase est inchangé.

## Coffre unifié

- Le coffre utilise une **seule grille** : six super-vilains historiques puis tous les super-vilains personnalisés validés.
- Même style de vignette, même photo de portrait et même compteur individuel de captures SOLO.
- Exemple : si Morgane a été capturée 2 fois, sa vignette indique **×2 ARRÊTÉS**.
- Une création validée s'affiche même avec **×0 CAPTURE**, sans nécessité de l'arrêter au préalable.
- Les six personnages historiques non encore capturés conservent la présentation « DOSSIER ??? ».
- La section indépendante « Mes méchants personnalisés » du coffre a été supprimée. Le laboratoire de création reste accessible.

## Signification des compteurs

- **Captures** : nombre total d'arrestations SOLO (historique, ne se remet pas à zéro).
- **Répertoire** : nombre de super-vilains **différents capturés** / nombre de super-vilains disponibles, y compris les créations personnelles chargées.
- **Quartiers** : nombre de quartiers accessibles au niveau actuel / nombre total de quartiers affichés, y compris les zones personnalisées.

Avec six personnages historiques déjà capturés et une Morgane capturée 2 fois, une fois ses données privées chargées : **Répertoire 7/7**, **Quartiers 7/7** si tous les quartiers sont débloqués.

## Compatibilité et sécurité

La sauvegarde locale `supervilains_operation_minuit_v3_meme` conserve ses clés et ses compteurs. Les captures des personnages personnels restent dans `state.owned["custom:"+id]`. Aucune migration destructive, aucune réinitialisation de progression, aucune modification de Supabase, des images, des missions ou de l'arène. Les succès historiques « 6 originaux » restent volontairement liés aux six personnages de base.

## Vérifications

- Code JavaScript du jeu : **syntaxe compilée avec succès**.
- Références aux identifiants DOM : **aucune manquante**.
- Identifiants HTML : **aucun doublon**.
- Panneau carte et ancienne grille personnalisée : **retirés du DOM**.
- Calculs du répertoire et des quartiers : utilisent les listes actuelles (plus de plafond codé en dur à 6).
- PWA : nouveau cache V4.13 et manifeste mis à jour.

**À vérifier dans l'application mobile après rafraîchissement** : affichage de Morgane avec ×2 ARRÊTÉS et statistiques 7/7 lorsque son dossier est chargé.
