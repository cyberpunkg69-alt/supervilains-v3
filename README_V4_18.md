# SUPERVILAINS V4.18 — LA GRANDE ÉVASION EN 3D 🚓

## Changement graphique du mini-jeu de poursuite

La course déclenchée par un filet raté en mode SOLO dispose désormais d'un **rendu WebGL 3D natif**. Cette évolution conserve strictement le moteur de jeu, les trois voies, les commandes tactiles, les trois boucliers, la jauge de capture finale et les récompenses de la V4.17.

### Nouveauté visuelle
- **Caméra suiveuse** derrière le policier, légèrement déportée en fonction des changements de voie.
- **Personnages en 3D** : corps entier modélisé avec des volumes, bras et jambes qui oscillent pendant la course, saut et glissade visibles.
- **Visage du fugitif** : le portrait existant est superposé à la tête animée. Cette couche HTML permet de continuer à utiliser les portraits privés sous URL temporaire ou `blob:`, sans les envoyer dans une texture WebGL soumise à CORS.
- **Ville en 3D** : avenue, trois voies, bandes de circulation, trottoirs, bâtiments de plusieurs hauteurs, fenêtres, enseignes, lampadaires et arbres.
- **Obstacles en volume** : barrières à sauter, portiques sous lesquels glisser, barrages à éviter par changement de voie.
- **Perspective et lumière** : profondeur, éclairage des faces, brouillard distant, couleurs arcade, oscillation de caméra et petite secousse lorsque l'agent heurte un obstacle.
- **Indicateur « MODE 3D »** dans le coin du parcours pour vérifier que WebGL fonctionne.

Tout le rendu 3D se trouve dans **`pursuit3d.js`**. Aucune bibliothèque CDN, clé API, génération d'image en ligne ou table Supabase supplémentaire n'est nécessaire.

### Compatibilité et performances
- Le rendu 3D est dessiné sur un deuxième canvas placé au-dessus du canvas de la V4.17. Les gestes tactiles restent reçus par le canvas de jeu original.
- Résolution limitée à **1,55 × le ratio physique d'écran** et rendu plafonné à environ 55 images par seconde, pour ménager les GPU mobiles.
- **Repli automatique 2D** si WebGL n'est pas disponible ou si le rendu 3D provoque une erreur.
- Quand la poursuite se termine, la scène et la photo superposée sont masquées, l'URL du portrait est retirée de cette couche, et les récompenses sont attribuées uniquement par le code SOLO existant.
- La **sauvegarde locale, l'ARÈNE et la validation Supabase** ne sont pas modifiées.
- `service-worker.js` précharge `pursuit3d.js` pour éviter les téléchargements répétés.
- Les images personnelles restent stockées dans Supabase et dans leur cache privé existant, jamais dans le dépôt public ou le cache public des assets.

### Test sur Android
1. Fermer et rouvrir l'application installée ; ne surtout pas effacer les données de la PWA.
2. Ouvrir un quartier, trouver un suspect au radar, commencer le combat SOLO et rater une capture au filet.
3. Dans **LA GRANDE ÉVASION**, vérifier que le badge **MODE 3D** apparaît.
4. Tester gauche, droite, saut, glissade ; vérifier que la course s'anime et que le visage du bon méchant suit son corps.
5. Gagner la course puis viser la jauge finale ; vérifier le coffre et les bonus normaux **+70 pièces / +35 XP** de la poursuite.
6. Tester aussi trois collisions et le bouton Abandonner ; ils ne doivent pas attribuer de capture.
7. Vérifier que l'ARÈNE, la progression et les personnages personnalisés fonctionnent comme auparavant.

Cette V4.18 est une **3D stylisée procédurale**, pas un personnage humanoïde photoréaliste ni un moteur de production avec squelette importé (GLTF). Les modèles sont simples pour privilégier la rapidité sur Android.

## Vérifications techniques
- Syntaxe JavaScript de `pursuit3d.js`, `pursuit.js`, du script principal et du Service Worker : OK.
- Test de simulation de la scène WebGL et génération de géométrie : OK.
- La validation du rendu visuel en WebGL réel et des FPS sur un téléphone Android reste à effectuer.
