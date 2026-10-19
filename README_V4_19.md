# SUPERVILAINS V4.19 — CORRECTIONS VISUELLES DE LA POURSUITE

Retour après inspection d'une vidéo Android de 25 s : le mode WebGL 3D s'active correctement et la ville et les obstacles s'affichent. Deux défauts principaux étaient visibles : le policier courait face à la caméra et le fugitif était trop petit au loin.

## Modifications
- **Policier vu de dos** : suppression des yeux orientés vers la caméra, orientation de la visière vers l'avant de la course, dos du gilet renforcé par des éléments réfléchissants, badge **POLICE** superposé et placé dynamiquement.
- **Méchant plus lisible** : le fugitif est rapproché progressivement de la caméra et son portrait est légèrement agrandi. Une étiquette avec son nom se positionne au-dessus de lui pendant la poursuite.
- **Course plus vivante** : mouvements amplifiés des bras et des jambes, rebond vertical plus affirmé pendant les foulées.
- Les deux personnages sont dessinés comme des coureurs qui se déplacent dans le même sens, vers l'horizon.
- Ces retouches ne changent pas les collisions, les récompenses, la progression de la course, la sauvegarde, les portraits personnels privés ni la jauge de capture finale.
- Le **Service Worker V4.19** actualise la version des ressources WebGL sans supprimer les données de progression locales.

## Tests
- Syntaxe JavaScript de `pursuit3d.js` : OK.
- Simulation d'une trame WebGL : OK (6 576 triangles, aucun appel invalide pendant la simulation).
- **Déploiement GitHub Pages** : à confirmer après la modification.
- Test visuel de la nouvelle version sur Android encore nécessaire : fermer puis rouvrir la PWA sans vider ses données, manquer un filet dans le SOLO, observer la poursuite avec l'indicateur MODE 3D.

Cette version conserve la silhouette cartoon low-poly. Une future évolution pourra utiliser des modèles riggés pour une animation proche des runners 3D professionnels.
