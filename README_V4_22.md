# SUPERVILAINS V4.22 — Caméra de poursuite et rattrapage visible

Après le test vidéo de V4.21 sur Android : Léa est correctement capturée, le mode WebGL 3D fonctionne, le policier est vu de dos et les récompenses (+156 pièces, +138 XP) sont cohérentes pour cette capture. En fin de parcours, la cible était néanmoins partiellement masquée derrière le policier.

## Changements
- **Caméra suiveuse dans les trois voies** : elle cadre mieux l'agent lorsqu'il se déplace à gauche ou à droite.
- **Rattrapage plus lisible** : les derniers 22 % de progression rapprochent le fugitif du policier en maintenant un décalage latéral suffisant pour voir les deux modèles 3D.
- **Effet de filet 3D renforcé** : les rayons lumineux apparaissent autour du méchant pendant l'interception.
- **Interception prolongée de 0,85 à 1,3 seconde**, puis retour vers la jauge de précision déjà présente en Solo.
- Pendant cette transition, les obstacles ne s'affichent plus devant la cible ; les collisions et les commandes restent bloquées selon le fonctionnement précédent.
- **Cache Service Worker versionné V4.22** pour diffuser les scripts actualisés à la PWA.

Aucun changement aux tables Supabase, à l'ARÈNE, aux images privées, à la sauvegarde locale, au gain de récompenses ni aux règles de capture. Retour automatique au mode 2D si WebGL n'est pas pris en charge.

## Vérifications techniques
- `pursuit3d.js` et `pursuit.js` : syntaxe JavaScript vérifiée.
- Scène simulée en douze configurations : voies -1, 0 et +1 ; progressions 0 %, 80 %, 97 % et 100 %.
- Dans les trois voies, le policier et le méchant conservent des positions distinctes à 97–100 % ; aucun échec de rendu dans la simulation.
- **Essai visuel réel Android encore nécessaire**, car la simulation WebGL ne remplace pas une vérification à l'écran.

## Essai utilisateur
Fermer puis rouvrir l'application sans vider les données. Rater un filet en Solo, progresser jusqu'à 100 %, vérifier que le policier et le fugitif restent visibles ensemble, que le filet lumineux apparaît pendant 1,3 seconde, puis que la jauge finale s'ouvre normalement.
