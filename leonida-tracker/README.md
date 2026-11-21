# LEONIDA TRACKER V3.0 — MONEY FINDER + GPS INTELLIGENT

Déployé sur Render depuis la branche \`leonida-tracker-render\` du dépôt \`cyberpunkg69-alt/supervilains-v3\`. L'application est non officielle et gratuite.

## Argent et butin : MONEY FINDER

La section 💰 MONEY FINDER est accessible sous la carte via « Argent + GPS ».

- Guides et fiches de sources publiques vérifiables : PowerPyx (argent, 22 opérations bancaires, 7 receleurs, 39 opérations de gangs, caches de contrebande), GTABase (argent et receleurs).
- Ces listes sont des **guides**, pas une reproduction intégrale ni une base certifiée de coordonnées. Les filtres couvrent conseils, banques, receleurs, gangs, lieux de notre catalogue et communauté.
- Le flux actualisé de la V2.4 est réutilisé pour les nouvelles pistes d'argent et de trafic dans **GTA 6**. Les signalements Reddit restent étiquetés comme non vérifiés.
- Un moteur de recherche filtre guides et lieux. Un sous-ensemble de lieux associés (d'après titre / catégorie / description) issus du catalogue FullSweep peut être ajouté à la tournée, sans jamais inventer une position.
- Les montants non sourcés ne sont pas affichés. Le guide PowerPyx indique que certains grands coffres atteignent 205 000 $ dans le jeu, sans garantir le même gain à chaque banque.
- Les liens ouvrent les sites des auteurs ; contenus, publicités et conditions de ces sites ne sont pas contrôlés par LEONIDA TRACKER.

## GPS de chasse indicatif

- Recherche des lieux du catalogue FullSweep et ajout depuis une fiche, une carte de découverte ou MONEY FINDER ; **12 arrêts maximum**.
- Enregistrement de la liste dans \`localStorage\` sous \`leonida-gps-tour-v1\`, indépendamment du suivi des découvertes \`leonida-tracker-state-v1\`.
- Filtre des lieux encore à trouver, liste d'étapes numérotées, localisation individuelle avec pulsation turquoise, suppression de points, effacement de la tournée.
- Algorithme d'optimisation géométrique : plus proche voisin, puis amélioration 2-opt, en gardant le premier arrêt comme départ. Il réduit la longueur de la tournée **dans le repère FullSweep**, sans calcul de route routière ou de temps de conduite.
- Visualisation sur le fond GTADB seulement si la conversion FullSweep→GTADB a été calibrée. Sinon le parcours peut être visualisé dans le mode « Grille » (schéma non géoréférencé) ; ne pas confondre avec un GPS routier fiable.
- Chemin SVG en pointillés, étapes numérotées adaptatives au zoom.
- Aucune promesse de localisation précise, pas de fausse estimation de kilomètres ni de durée de déplacement ; les points du catalogue sont communautaires et nécessitent confirmation dans le jeu.

## Fichiers

- \`index.html\` : moteur de carte, fiches, hooks GPS et fichiers front.
- \`hunter-ui.js\` : rendu des deux panneaux sur l'interface.
- \`hunter.js\` : données, filtres, recherche, optimisation et affichage du parcours.
- \`hunter.css\` : styles responsives et tracé SVG.
- \`sw.js\` : cache mobile V3.0 avec tous les nouveaux fichiers.
- \`chat.js\`, \`chat.css\`, \`community.py\`, \`news_api.py\` : chat, visiteurs et actualités déjà présents en V2.5.

## Test manuel sur Chrome Android

1. Charger le site (actualiser si le cache affiche encore V2.5).
2. Appuyer sur « Argent + GPS ». Tester les filtres « Banques », « Receleurs », « Sur carte ».
3. Ajouter au moins trois lieux depuis le moteur GPS ou les fiches.
4. Appuyer sur « Optimiser l'ordre », puis sur « Voir sur la carte ». Vérifier les numéros 1, 2, 3.
5. Localiser un arrêt et vérifier que le marqueur pulse, sans supprimer les autres découvertes cochées.
6. Si la carte affiche « recalage non confirmé », choisir la « Grille » ; celle-ci est indicative.

## Références

- https://www.powerpyx.com/gta-6-money-guide-how-to-get-money-fast/
- https://www.powerpyx.com/gta-6-all-bank-jobs-locations-bank-vaults/
- https://www.powerpyx.com/gta-6-all-fence-locations-how-to-fence-stolen-goods/
- https://www.powerpyx.com/gta-6-all-illegal-gang-operations-locations/
- https://www.gtabase.com/gta-6/map/
- https://fullsweepmap.com/developers/
- https://map.gtadb.org/

Le projet n'est pas affilié à Rockstar Games ou Take-Two Interactive.
