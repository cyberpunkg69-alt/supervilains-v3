# LEONIDA TRACKER — GTA VI | v1.1 (correctif Android)

Compagnon de progression **non officiel**, en français, pour joueurs Xbox Series X|S et PlayStation 5. Aucune connexion à la sauvegarde du jeu.

## Correction principale

La V1 affichait la carte FullSweep dans une fenêtre `iframe`. Cette fenêtre restait grise ou affichait une page cassée quand `index.html` était ouvert depuis les téléchargements Android (`content://downloads/...`). **La V1.1 supprime complètement cette iframe** et la remplace par une **grille de repérage autonome**, zoomable et déplaçable, avec les marqueurs aux coordonnées FullSweep (espace 3344×4820). Ces coordonnées sont des pixels de la carte communautaire : **la grille n'est pas un véritable fond cartographique et ne montre pas les rues ni les côtes**. Le bouton « Voir la vraie carte » ouvre FullSweep directement, dans un autre onglet.

Les marqueurs orange sont à trouver, les verts sont déjà trouvés, les gris sont à vérifier. Touchez un marqueur pour ouvrir sa fiche et cocher « Trouvé ». Les boutons ＋ / −, « Tout voir » et « À trouver » contrôlent l'affichage. Le bouton « Localiser » de chaque fiche centre la grille sur sa position.

## Fonctions

- Import des lieux répertoriés depuis l'API publique FullSweep (CC BY 4.0), si la connexion est disponible ; noms et descriptions d'origine, sources distinguées.
- Synchronisation des marqueurs de notre grille avec les cases « Trouvé » dans **notre** liste ; recherche, filtres, favoris, liste de chasse, notes, suivi par catégorie.
- Progression sauvegardée dans le navigateur (`localStorage`), export/import JSON, cache du dernier catalogue reçu.
- Entrées personnelles sans fausse position : une fiche sans coordonnées n'est pas mise sur la grille.
- Pas de faux emplacements insérés en cas de coupure Internet.

## Comment ouvrir sur Android

1. Téléchargez le fichier **`index.html` de la version 1.1** (ou extrayez l'archive ZIP).
2. Ouvrez `index.html` dans un navigateur Android, de préférence Chrome. Si votre gestionnaire de téléchargements empêche l'exécution de JavaScript, hébergez l'application comme un site statique en HTTPS ; le stockage local peut aussi être restreint avec `content://`.
3. La grille et les boutons sont inclus dans le fichier HTML. Internet est requis pour récupérer les positions depuis FullSweep au premier chargement. Le catalogue en cache, quand il existe sur le même navigateur et la même origine, peut servir de repli.
4. Touchez « Voir la vraie carte » pour comparer une fiche avec l'illustration géographique FullSweep.

**Progression V1 → V1.1 :** si vous aviez déjà coché des lieux dans la V1, exportez d'abord la sauvegarde JSON via l'icône de téléchargement de la V1. Ouvrez la V1.1, puis **Réglages → Importer JSON**. Sinon, la progression peut être conservée automatiquement lorsque le navigateur utilise la même origine de stockage, mais ce n'est pas garanti pour un fichier téléchargé séparément sur Android.

## Hébergement web / PWA

Site statique sans compilation. Publiez `index.html`, `icon.svg`, `manifest.webmanifest` et `sw.js` ensemble sur HTTPS (GitHub Pages, Render Static Site, etc.). Le service worker nécessite HTTPS (ou localhost). L'appli n'est pas encore publiée.

## Limites & crédits

- La grille n'est **pas** une représentation réaliste de Leonida. Les positions sont géométriquement liées aux coordonnées du fournisseur, mais leur précision dépend de son catalogue.
- Les pourcentages mesurent le catalogue disponible et non le « 100 % » officiel de GTA VI.
- La base n'est pas exhaustive et plusieurs localisations sont des données communautaires ou non vérifiées.
- Aucune synchronisation Xbox/PS5 ou entre appareils.
- Source des lieux : **FullSweep**, https://fullsweepmap.com/developers/ (CC BY 4.0). Coordonnées pixels 3344×4820. Carte communautaire réelle ouverte par lien : https://fullsweepmap.com/ (imagerie YANIS V15 / GTA VI Mapping Community, créditée par FullSweep).
- Projet de fan non affilié à Rockstar Games, Take-Two Interactive ou FullSweep.