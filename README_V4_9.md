# SUPERVILAINS V4.9 — Personnages personnalisés jouables (SOLO + ARÈNE)

## Déjà opérationnel

Les créations **VALIDÉES**, avec leurs trois images importées depuis ChatGPT et stockées en privé dans Supabase, rejoignent automatiquement les deux moteurs quand l'agent est connecté à son compte ARÈNE.

### SOLO

- Dans **COFFRE → Mes méchants personnalisés**, chaque création affiche son portrait, sa difficulté, son compteur de captures et **📡 TRAQUER**.
- Chaque personnage rejoint également les rencontres possibles de son quartier correspondant à son danger.
- Radar : 10 signaux, 5 tentatives, scanner de fausses pistes inchangé.
- Combat : portrait normal au début, portrait « TROLLER » à l'attaque, image « CAPTURÉ ! » après victoire.
- La **faille ultime personnalisée** est intégrée au tirage de **6 cartes mystère**, une seule bonne réponse.
- Voix synthétique française sur l'appareil à partir des phrases de la fiche, si le joueur a activé les voix.
- Les captures personnelles sont sauvegardées sous `state.owned["custom:<uuid>"]`, sans créer un index instable.
- Les 6 personnages officiels et les 30 succès / 1 000 G, les 50 missions et les sauvegardes existantes ne changent pas.

### ARÈNE COMPÉTITIVE

- Les joueurs voient **uniquement leurs propres personnages validés**, puisque les images restent privées : aucune galerie publique n'est créée automatiquement.
- À chaque patrouille, **45 % de chance** (lorsque des personnages validés existent) que le méchant affiché soit l'un de leurs personnages.
- PostgreSQL effectue toujours le **même tirage uniforme parmi les 6 profils officiels de danger**, même lorsque l'image et le nom proviennent d'un personnage personnalisé.
- Le méchant personnel est une identité visuelle et narrative seulement dans l'ARÈNE : la difficulté, les probabilités, les 30 patrouilles/jour et les points restent calculés par PostgreSQL avec le barème d'origine.
- Portrait à la détection, « TROLLER » après attaque, portrait « CAPTURÉ ! » en cas de victoire.
- Les statistiques serveur enregistrent, sans modifier le calcul des classements, `custom_villain_id` sur les rencontres et captures concernées.
- Le duel privé et le classement restent inchangés : chaque joueur peut avoir ses propres personnages lors des rencontres du duel.

## Récupération du compte et confidentialité

- Le module `custom_play.js` utilise le **client Supabase déjà créé par l'ARÈNE**. Aucune nouvelle clé privée ni reconnexion n'est demandée.
- Les URL des portraits sont des URL **signées privées**, renouvelées régulièrement, non copiées dans le stockage local du jeu.
- À la déconnexion, les personnages privés disparaissent de l'affichage.
- Lorsqu'une création est validée, rouverte ou supprimée, la bibliothèque de cibles est rafraîchie.
- Dans le SOLO, les six originaux conservent leurs images, voix MP3, failles et succès initiaux.
- Une création qui redevient brouillon disparaît des prochaines rencontres, sans perdre les compteurs de captures déjà enregistrés en SOLO.

## Fichiers et migrations

- `index.html` : intégration SOLO et interface du COFFRE, deux portraits de réaction, voix TTS.
- `arena.js` : visuels personnalisés dans les captures compétitives, résultats visuels.
- `villain_creator.js` : signaux d'actualisation lors de la validation.
- `custom_play.js` : synchronisation authentifiée des créations, URL signées.
- `supabase/011_custom_villains_arena.sql` : nouvelles colonnes et logique de capture côté serveur.
- `supabase/012_custom_villain_arena_fairness.sql` : conserve les probabilités et points rigoureusement identiques aux anciens méchants (skin uniquement).
- `service-worker.js` : cache PWA V4.9, nouvelles fonctionnalités disponibles après actualisation.

## Vérifications

- Syntaxe JavaScript de l'ensemble du jeu, du créateur, du moteur compétitif et du module privé.
- Simulations SOLO : profils multiples, 6 cartes, 6 originaux inchangés, déclenchement du radar, conservation des captures personnelles sous UUID.
- Simulations ARÈNE : apparition du portrait privé, réaction TROLLER, visuels officiels inchangés, chances calculées selon le danger retourné par le serveur.
- Simulations de synchronisation : connexion, 3 images privées signées, déconnexion et nettoyage des personnages.
- PostgreSQL : fonctions `arena_start` / `arena_capture` réservées aux agents authentifiés ; Morgane makeup est validée et possède les trois images.
- **À tester sur téléphone** : une traque personnalisée SOLO et plusieurs patrouilles réelles dans l'ARÈNE pour valider les visuels et le partage de session. Aucun match en ligne réel n'a été simulé au moyen d'un compte joueur.
