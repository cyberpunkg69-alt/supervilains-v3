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
