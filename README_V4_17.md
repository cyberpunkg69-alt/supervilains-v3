# SUPERVILAINS V4.17 — LA GRANDE ÉVASION 🚓

## Nouveauté : poursuite après capture SOLO ratée

Lorsque le joueur consomme un filet ionique dans le mode **SOLO** et que la capture échoue, le super-vilain s'enfuit. Le nouveau module `pursuit.js` ouvre automatiquement une course mobile en perspective 2.5D, avec le policier jouable et le portrait du fugitif devant lui.

### Commandes
- Balayer vers la gauche ou la droite pour changer de voie (trois voies).
- Balayer vers le haut pour sauter les barrières basses.
- Balayer vers le bas pour se baisser sous les portiques.
- Éviter complètement les grands barrages en changeant de voie.
- Quatre boutons accessibles sous le jeu. Clavier : flèches, ou WASD.
- Bouton **ABANDONNER** et pause automatique lorsque l'application passe en arrière-plan.

La course accélère progressivement. Après **trois collisions**, le fugitif est perdu. Si le policier le rejoint avant cela, une **dernière jauge de capture** apparaît.

### Capture et récompenses
- Le filet raté a déjà été consommé ; le dernier tir après poursuite est **gratuit**.
- La jauge finale reprend exactement la géométrie mouvante du SOLO V4.15.
- Une précision d'au moins **80 %** garantit la capture ; sinon, il subsiste au minimum 65 % de chances de réussite.
- Une capture obtenue dans ce mode donne les récompenses habituelles du SOLO, **+70 pièces et +35 XP**.
- Le personnage rejoint le coffre habituel, les compteurs de capture et les succès existants suivent le même traitement que les captures classiques.
- Les compteurs `pursuits` et `pursuitWins` sont ajoutés à la sauvegarde locale existante sans changer sa clé.
- Si le filet final est manqué, ou si le joueur perd / abandonne la course, le fugitif s'échappe sans récompense de capture.

### Compatibilité
- Mini-jeu rendu avec Canvas 2D en perspective (version arcade 2.5D), sans nouvelle bibliothèque 3D ou API payante.
- Reconnaît les six méchants historiques et les méchants personnels effectivement intégrés au SOLO.
- Réutilise leurs portraits déjà chargés, y compris les `blob:` URL locales privées des utilisateurs.
- Le mode ARÈNE, ses règles compétitives et ses fonctions serveur sont **inchangés**.
- Aucune modification Supabase, aucun fichier de photos personnelles ajouté au dépôt.
- Le Service Worker V4.17 met `pursuit.js` et `pursuit.css` en cache, tout en continuant à privilégier le réseau pour les mises à jour.
- Si le mini-jeu est indisponible sur un appareil, l'ancien comportement du SOLO (réaction du vilain et reprise de combat) est conservé.

## Vérifications manuelles recommandées sur Android
1. Fermer puis rouvrir la PWA installée, sans supprimer ses données.
2. Sur la carte, entrer dans un quartier et découvrir le suspect avec le radar.
3. Rater une capture au filet dans le SOLO : **LA GRANDE ÉVASION** apparaît.
4. Tester les glissements et les boutons ; tenter une course gagnante puis une course perdante.
5. Rattraper un méchant et réussir le dernier tir : vérifier le compteur de captures, le coffre, les +70 pièces et +35 XP.
6. Vérifier qu'une perte ou un abandon ne donne pas de capture.
7. Vérifier que les duels et les classements dans l'ARÈNE restent identiques.

Cette version est une **première course jouable**, pas encore un environnement 3D complet avec modèles animés et décors spécifiques par personnage.
