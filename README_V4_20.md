# SUPERVILAINS V4.20 — Poursuite 3D avec rapprochement du fugitif

Cette mise à jour fait suite à une vidéo de test Android d'environ 27 secondes (personnage : Léa). Elle confirme que la V4.19 montre bien le policier de dos avec son uniforme et que la capture finale fonctionne, mais que le méchant reste trop petit à l'horizon.

## Correctifs
- **Rapprochement visible** : la position du méchant en 3D dépend désormais de la progression réelle de la course ; il se rapproche nettement de la caméra à mesure que la jauge approche de 100 %.
- **Esquive du fugitif** : déplacement horizontal adouci pour limiter la superposition du personnage et du policier sur l'écran.
- **Portrait plus lisible** : dimension de la photo de visage adaptée à la projection, plafonnée pour préserver la place occupée par la course.
- **Fin de poursuite** : annonce « 🚓 FUGITIF RATTRAPÉ ! » pendant 0,85 seconde avant de lancer la jauge finale, le temps de voir la scène de rattrapage.
- **Collision gelée à la victoire** : aucun obstacle ne peut retirer de bouclier pendant cette courte transition.
- Les commandes sont temporairement verrouillées lors de la transition vers la jauge.
- Le Service Worker passe au cache `supervilains-v4-20-visible-chase` pour forcer une mise à jour des scripts publics.

## Invariants
La jauge de précision finale, les pièces, XP, succès, portraits privés, sauvegarde et les modes SOLO/ARÈNE ne sont pas modifiés. Pas de nouvelle API ni dépendance externe. Le mode 2D reste un secours automatique lorsque WebGL n'est pas opérationnel.

## Contrôles
- Syntaxe JavaScript de la scène, du moteur de poursuite, de la page et du Service Worker : OK.
- Cohérence des points de raccordement, des assets précachés et de l'événement de fin de poursuite : OK.
- **Test visuel sur Android à confirmer** : ouvrir la PWA sans supprimer ses données, rater un filet en SOLO, vérifier que Léa se rapproche visiblement de 50 à 100 %, puis observer le message avant la jauge.
