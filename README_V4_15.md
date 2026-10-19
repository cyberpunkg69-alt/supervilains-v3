# SUPERVILAINS V4.15 — Jauge vivante et accélération progressive

## Nouveau défi dans les deux modes

- La **zone turquoise** reste centrée, mais **se ferme et s'ouvre** continuellement : un cycle complet dure environ **3,6 secondes**.
- Sa largeur varie d'environ **38 % à 16 %** au départ ; après environ **12 secondes**, elle oscille entre **32 % et 10 %**.
- Le curseur conserve ses allers-retours entre 5 % et 95 % et **accélère continuellement pendant les douze premières secondes**, jusqu'à environ **×2,08** sa vitesse de départ. Sa vitesse se stabilise ensuite pour ne pas devenir ingérable.
- Une ligne sous chaque jauge affiche **la vitesse actuelle et la largeur de la cible**.
- En SOLO, la cible est légèrement plus étroite pour les méchants les plus dangereux (jusqu'à −6 points de largeur).

## Comment la précision fonctionne

- La position et la largeur sont dérivées du **même temps écoulé** (en secondes) dans les deux modes, grâce à une fonction géométrique commune :
  - Temps intégré de déplacement : `(t + 0,045 × min(t,12)² + 1,08 × max(t−12,0)) / 2,7`.
  - Cible : `max(10, 16 + 11 × (1+cos(2πt/3,6)) − 6 × min(t/12,1))`.
  - Précision : **100 % dans la cible**, puis baisse progressive au-delà de ses bords.
- La zone mobile influe réellement sur la précision et les chances de capture : ce n'est pas simplement un effet graphique.
- Le SOLO garde son système de récompenses, son nombre de filets et la sauvegarde locale existante.

## Protection de l'ARÈNE

La migration Supabase `supabase/015_arena_progressive_meter.sql` a été appliquée au projet **supervilains-arene**.

- La RPC `arena_meter_begin(uuid)` annonce la version de mouvement `motion_version=2` ; elle ne réinitialise pas l'horodatage si la jauge est rouverte.
- `arena_meter_finish(uuid)` obtient **position, largeur et précision** depuis `arena_meter_geometry_v2(elapsed)` en base PostgreSQL, avec le temps serveur et sans faire confiance aux coordonnées fournies par le navigateur.
- La probabilité finale reste bornée à **22–92 %** et le bonus de précision reste borné à **±15 points de chance** ; seules les trois neutralisations et une précision d'au moins 90 % peuvent produire une capture parfaite.
- Après une coupure de plus de 30 s, la précision d'ARÈNE reste neutre à 50 %.
- Le client compense visuellement une fraction de sa latence estimée, mais le serveur conserve l'autorité complète.
- L'ancienne jauge côté navigateur reste prévue pour les anciennes réponses serveur sans version `motion_version` pendant une transition.
- Aucune donnée de classement, portrait, personnage, mission, capture ou succès existant n'est réinitialisée.

## Fichiers

- `index.html` : fonction de mouvement partagée, jauge SOLO et jauge ARÈNE animées, indications de vitesse et de zone.
- `arena.js` : suivi de l'horloge serveur et animation synchronisée, compatibilité ancienne version.
- `supabase/015_arena_progressive_meter.sql` : calcul et attribution sécurisés côté PostgreSQL.
- `service-worker.js` et `manifest.webmanifest` : invalidation du cache PWA V4.15.

## Vérifications et test sur téléphone

- Vérification du mouvement serveur à différents temps, largeur qui oscille et vitesse qui augmente.
- Compilation JavaScript et vérification des liens entre scripts/éléments de l'interface.
- Test réel à effectuer après le déploiement GitHub Pages : dans le SOLO puis en ARÈNE, observer la zone s'animer et la barre accélérer, puis déclencher une capture. Vérifier le résultat serveur et les scores sur un téléphone réel.
