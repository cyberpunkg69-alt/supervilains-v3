# SUPERVILAINS V4.23 — Maillage ionique 3D

## Retour vidéo Android V4.22
Vidéo d'environ 30 secondes : le personnage Morgane Makeup est visible devant le policier jusqu'au rattrapage, sans masquage majeur lors du passage à 100 %. Le jeu affiche ensuite la jauge finale de capture. Le cadrage, la progression et la transition sont désormais cohérents.

### Problème corrigé
L'ancienne animation autour du fugitif consistait en barres lumineuses turquoise superposées et ressemblait davantage à un portique qu'à un filet.

### Solution intégrée
- Le rendu 3D utilise désormais une structure de fils minces orientables dans l'espace (segments 3D à section volumique), sans dépendance externe.
- À la fin de la poursuite, une projection de filet ionique **se déploie autour de la cible** en 3D, avec les faces avant, arrière et latérales.
- Le filet dispose d'un tissage horizontal, vertical et de quelques fils diagonaux, ainsi que de bordures et d'une animation d'ouverture sur environ 0,4 seconde.
- L'effet se joue uniquement pendant la transition de 1,3 seconde, avant le mini-jeu de précision final. Il **ne valide pas la capture à la place du joueur**.
- Les scènes 3D hors interception sont inchangées ; performance préservée par le dessin de seulement quelques centaines de triangles supplémentaires pendant l'animation.

### Fonctionnalités préservées
- Caméra mobile, policier vu de dos, trois voies, gestes et commandes tactiles, obstacles, boucliers.
- Portraits existants et personnalisés, cache local privé d'images, Supabase.
- Jauge finale, probabilités de capture, bonus, sauvegarde SOLO et mode ARÈNE.
- Repli 2D en cas d'indisponibilité de WebGL.

## Tests effectués
- Syntaxe JavaScript : OK.
- Simulation de rendu pour chaque voie et pour les progressions 0 %, 75 % et 100 % : 9 images traitées avec succès.
- Scène au moment du filet : environ 7 224 triangles, aucune exception lors du test simulé.
- Le rendu visuel final et les performances sur Android restent à confirmer sur le téléphone de l'utilisateur.

## Test de la V4.23
Fermer puis rouvrir la PWA sans effacer ses données ; manquer une capture SOLO, finir le parcours, puis regarder le filet lumineux autour du fugitif à 100 %. Vérifier que la jauge de visée apparaît toujours après le court effet.
