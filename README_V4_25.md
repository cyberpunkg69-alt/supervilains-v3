# SUPERVILAINS V4.25 — Policier 3D articulé

Cette version améliore la présentation du policier de **La Grande Évasion** sans modifier les mécaniques validées de la V4.24. Les modifications sont intégrées directement au dépôt GitHub sur `main`.

## Nouveaux mouvements

- **Course** : animation procédurale avec hanches, genoux, chevilles, épaules, coudes et mains articulés. Les membres se déplacent en opposition, et le torse suit légèrement la foulée.
- **Saut** : hauteur verticale en courbe, genoux repliés et bras relevés, avec ombre discrète au sol.
- **Glissade** : modèle de l'agent réellement abaissé, buste incliné et pieds orientés vers l'avant, bras et tête repositionnés pour un profil bas.
- **Interception** : posture stabilisée et bras tendu vers le fugitif au moment du déploiement du filet.
- **Uniforme** : gilet police en relief, bandes réfléchissantes, radio, épaulières, casquette, chaussures et gants plus lisibles de dos.
- **Étiquette POLICE** : recalée sur la position du dos pour suivre aussi le saut et la glissade.

Les nouveaux mouvements sont créés sans moteur de personnages externe : les articulations sont reconstruites en WebGL à chaque image à partir de points 3D animés. Il s'agit d'une animation **procédurale stylisée** ; aucun modèle de personnage riggé ni fichier GLTF n'est ajouté dans cette version.

## Compatibilité et sauvegarde

La géométrie du fugitif, son portrait privé (Supabase/cache local), le décor, les obstacles, le filet arrondi de la V4.24, les trois voies et la caméra ne sont pas modifiés. Les collisions, boucliers, commandes tactiles, récompenses et la jauge finale restent pris en charge par le code SOLO existant. Le repli Canvas 2D reste disponible si WebGL est indisponible.

Un nouveau Service Worker `supervilains-v4-25-animated-cop` permet aux PWA installées de télécharger les scripts mis à jour **sans effacer la sauvegarde ni le cache de portraits personnels**.

## Contrôles avant mise en ligne

- Syntaxe JavaScript de `pursuit3d.js` validée.
- Simulation de rendu pour trois voies (-1, 0, 1) × huit états (course, début/milieu/fin du saut, début/milieu/fin de la glissade, interception) : **24/24 configurations rendues sans erreur**.
- Aucune valeur 3D non finie dans le tampon de géométrie.
- Complexité de rendu indicative : environ 7 400 triangles en course, 6 650 en glissade et 10 160 pendant le filet de fin (incluant l'ensemble du décor). Les FPS réels dépendent du téléphone.
- **Contrôle visuel réel Android à confirmer** : ces validations ne constituent pas un test d'interface sur un téléphone physique.

## Test Android

Fermer complètement la PWA et la rouvrir sans vider ses données. Déclencher une poursuite via une capture ratée en SOLO, puis vérifier successivement la course, le saut (↑), la glissade (↓) et les déplacements gauche/droite. Terminer la course pour confirmer que le filet V4.24 et la jauge finale apparaissent comme avant.

## Travaux possibles après validation

Améliorer à leur tour les vêtements et les animations propres aux fugitifs, puis retravailler les sensations de vitesse et les effets de caméra.
