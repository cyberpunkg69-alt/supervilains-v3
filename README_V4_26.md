# SUPERVILAINS V4.26 — Fugitifs 3D animés

## Origine de la mise à jour

Le test vidéo Android de **V4.25.1** (Eric, 32 secondes) confirme que le policier est désormais correctement orienté pendant les glissades, que la course continue dans les trois voies et que le filet final s'affiche à 100 %. Aucun bug bloquant visible. On poursuit donc l'étape graphique approuvée après la refonte du policier : moderniser le modèle des fugitifs.

## Nouveautés

- Silhouette plus expressive : buste, taille, veste en relief, sacoche dorsale, tête et cheveux
- Vraie animation procédurale des bras, coudes, genoux, pieds et chaussures pendant la fuite
- Petits mouvements latéraux et rebonds de course ; bras relevés pendant l'interception finale
- Quelques détails distinctifs pour Eric, Morgane Makeup, Léa, Natsu, Amélie, Manu et Ludo
- Repli sur une tenue générique adaptée à la couleur du personnage pour les futurs vilains personnalisés
- La photographie de visage reste un **portrait HTML flottant au-dessus du modèle 3D**, et n'est jamais transmise comme texture à WebGL

## Ce qui ne change pas

- Moteur de jeu et collisions, trois voies, commandes, vitesse, obstacles, boucliers
- Policier V4.25.1 (course, saut et glissade)
- Filet ionique arrondi V4.24, durée de la séquence, jauge de précision finale
- Récompenses, sauvegardes, listes de vilains et modes SOLO/ARÈNE
- Aucun service de génération d'images payant, aucune requête API supplémentaire
- Rendu Canvas 2D de secours si WebGL n'est pas disponible

## Vérifications

- Code JavaScript de la nouvelle scène : syntaxe OK
- **96 tests de rendu simulés** : huit personnages (sept existants + un personnalisé), trois voies, quatre poses (course, saut policier, glissade policier, interception). Aucun appel de dessin en échec ni valeur de géométrie invalide
- Entre environ 7 680 et 11 040 triangles pour les scènes testées, décor inclus
- Cache de la PWA renouvelé : `supervilains-v4-26-animated-villains`

**Reste à vérifier** : fluidité et lisibilité des nouveaux personnages sur un véritable Android. Le simulateur de géométrie n'est pas un test graphique complet du GPU du téléphone.

## Test Android

Fermer complètement la PWA sans effacer les données. Relancer une poursuite SOLO après une capture ratée ; vérifier les mouvements du fugitif, les tenues, le policier en glissade et enfin le filet et la jauge finale.
