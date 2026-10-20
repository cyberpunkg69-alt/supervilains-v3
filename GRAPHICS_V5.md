# SUPERVILAINS — La Grande Evasion, refonte graphique V5 beta

## Ce qui est réellement intégré
- Nouveau renderer `pursuit-real3d.js` : Three.js 0.180.0, matériaux PBR, éclairage hemisphérique et directionnel, ombres basse résolution, brouillard.
- Personnages skinnés : le modèle GLB d'exemple `Soldier.glb` est chargé une seule fois puis instancié deux fois grâce à `SkeletonUtils.clone`. Animation `Run` conservée par `AnimationMixer`.
- Décors : asphalte et béton à textures procédurales, immeubles multi-étages, fenêtres, trottoirs, arbres et lampadaires. Tout est purement cosmétique.
- Le fichier `pursuit.js` reste la source de vérité pour obstacles, sauts, glissades, vitesse, collisions, pourcentage, nombre de boucliers, poursuite finale et récompenses.
- Si la 3D moderne n'est pas disponible, le moteur historique `pursuit3d.js` peut prendre le relais. Si le modèle GLB ne charge pas pendant une poursuite moderne, `pursuit.js` affiche temporairement ou durablement le rendu Canvas 2D. Aucune partie n'est perdue.
- Le code ne requiert ni API OpenAI ni abonnement payant.

## Limites connues de cette première étape
- Les deux figurants sont des **modèles génériques** issus d'un seul GLB et **ne représentent pas encore les visages ni les tenues de Manu, Lea, Natsu, Amelie, Ludo, Eric ou Morgane**.
- La course `Run` est réelle ; le saut et la glissade font pour l'instant varier la pose du corps par transformation globale, sans clips dédiés.
- Le modele de test et les modules Three.js sont charges via jsDelivr à la première utilisation ; **connexion requise pour le premier chargement**, sous réserve du cache navigateur. Le fichier local du moteur est précaché par le service worker.
- Les textures des rues sont créées côté appareil ; les façades urbaines restent de la géométrie optimisée, ce n'est pas un jeu photoréaliste.
- La fluidité dépend de la puce graphique et n'a pas encore été évaluée sur tous les téléphones.

## Provenance des ressources
- Bibliothèque : [three.js](https://threejs.org/), MIT, revision 0.180.0.
- Modèle provisoire : [Soldier.glb](https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/Soldier.glb), personnage « Vanguard » (T. Choonyung / Mixamo, Adobe) présenté par les exemples de Three.js. Les droits du personnage sont distincts de la licence MIT du code Three.js. **Ne pas distribuer ce GLB comme un asset autonome.** L'utilisation finale et ses conditions de licence doivent être vérifiées avant commercialisation.

## Pour la prochaine étape
1. Obtenir ou créer des figurants humains GLB humanoïdes licenciés et compatibles avec les animations de course, saut et glissade, adaptés à une police urbaine et aux super-vilains.
2. Intégrer les portraits/tenues de chaque personnage avec autorisation, sans exposer les photos personnelles dans une bibliothèque publique.
3. Mettre les modèles optimisés sur un hébergement autorisé, avec cache, LOD et une option qualité basse/haute sur mobile.
4. Tester les FPS et les temps de chargement sur les appareils réels avant de supprimer les moteurs de secours.

## Essai
Ouvrir une partie SOLO, rater une capture, puis démarrer **La Grande Evasion**. Si le bandeau « 3D SEMI-RÉALISTE BÊTA » apparaît et si les coureurs ont des articulations et habits modélisés, le nouveau moteur est chargé. Sinon l'affichage de secours reste jouable.

## V5.3 — Sam et Harper optimises, chargement local sur mobile

- Deux GLB humains fournis par l'utilisateur, verifies : skin avec 1 animation `Run` et 168 canaux chacun. Version mobile avec textures compressees : Sam ~5,8 Mio et Harper ~6,4 Mio (contre 20,0 et 17,8 Mio a l'origine). Les modeles sont conserves sur l'appareil ; ils ne sont **pas commites en binaire dans GitHub**.
- Le laboratoire `lab-3d-v3.html` peut importer puis enregistrer ces GLB **une seule fois** dans la base IndexedDB `supervilains-pursuit-models-v1` via `pursuit-local-models.js`. Les noms de fichier contenant `sam` et `harper` sont reconnus automatiquement.
- La poursuite `pursuit-real3d.js` donne priorite au GLB `sam` pour le policier et les hommes, au GLB `harper` pour Lea, Amelie et Morgane. Textures originales preservees, animation de course des fichiers, basculement automatique vers Soldier si aucun modele local n'existe.
- **Important** : fonctionne seulement dans le navigateur/app d'origine ayant importe les fichiers. IndexedDB ne se synchronise pas avec les autres appareils/utilisateurs ; ne pas effacer les donnees du site. Pour un lancement public, les GLB devront etre publies sur un hebergement approprie, avec autorisation de redistribution validee, puis testes en situation reelle.
- Limites actuelles : pas d'animations Jump/Slide GLB dediees ; vetements et visages individuels non finalises ; pas de test automatique de FPS sur tous les telephones ; aucune decimation geometrique dans cette optimisation.

## V5.4 — Import des personnages depuis La Grande Evasion

La video utilisateur de la V5.3 montrait bien « SOLDAT DE SECOURS » : les assets GLB n'etaient pas disponibles dans le stockage local du contexte d'execution du jeu. Les donnees IndexedDB d'un onglet navigateur ne sont pas garanties identiques a celles de l'application PWA installee si leurs contextes de stockage sont differents.

- Nouveau bouton `🎭 3D` visible dans l'en-tete du mini-jeu, a cote d'ABANDONNER.
- La poursuite est mise en pause lors de l'ouverture de l'importateur, avec sauvegarde de son etat de pause d'origine.
- Deux commandes d'import distinguent Sam/Harper meme lorsque le fichier choisi a ete renomme.
- Controle du format GLB dans `pursuit-local-models.js`, stockage IndexedDB dans **le meme contexte** que le jeu, puis affichage de l'etat Sam/Harper.
- Le moteur `pursuit-real3d.js` expose maintenant `reloadModels()` pour actualiser les vrais coureurs au cours d'une partie.
- Service Worker incremente en `supervilains-v5-4-import-in-game`.
- Aucun changement de la progression, des collisions, des personnages capturables ni des recompenses.

**Test a faire sur appareil reel** : importer Sam et Harper via la fenetre de poursuite. Verifier les coches pour chaque personnage, voir le badge `3D V5.4 • GLB CIVILS`, puis reprendre la course. Le premier chargement peut prendre plusieurs secondes. Si le badge n'apparait pas ou si un GLB echoue a s'initialiser, relever le message de l'importateur.
