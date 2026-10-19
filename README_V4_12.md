# SUPERVILAINS V4.12 — Failles ultimes des nouveaux personnages (SOLO + ARÈNE)

## Objectif
Tous les super-vilains validés ont une **faille ultime personnelle** déterminée par le champ `weakness_object` de la fiche (ou par le texte de `weakness_label` pour les anciennes fiches). Les six personnages originaux conservent leur objet historique.

**Exemple : Morgane makeup**
- Faiblesse descriptive : « Un démaquillant trop gras ».
- Objet qui permet de la capturer par faille ultime : **💄 Rouge à lèvres**.
- Le nom et l'icône de l'objet sont indiqués dans la zone des cartes, mais sa position reste secrète.

## Mode SOLO
- Les six cartes contiennent une seule carte correspondant à la faille du personnage, et cinq fausses cartes empruntées aux six objets officiels.
- Mélange aléatoire à chaque rencontre, un seul essai, cartes face cachée.
- Bonne carte : capture instantanée, **+160 pièces**, **+130 XP**, **+1 filet** en bonus, mêmes règles déjà appliquées aux six officiels.
- Mauvaise carte : une seule tentative consommée, énergie réduite comme avant, puis poursuivre avec les boutons TROLLER/CAPTURER.
- L'objet personnalisé est affiché après une capture par faille ultime. Les photos et missions officielles restent intactes.

## Mode ARÈNE
- Même grille de six cartes pour chaque rencontre, qu'elle concerne un personnage officiel ou personnel.
- Le serveur PostgreSQL choisit aléatoirement **une seule bonne position entre 0 et 5** et garde ce secret. Le navigateur ne peut ni lire la position ni écrire dans `arena_encounters`.
- RPC `arena_guess_weakness(p_encounter uuid,p_slot integer)` : **une seule tentative par patrouille** avec validation par l'identité du joueur, verrouillage transactionnel et vérification de la limite de cinq minutes.
- Bonne carte : capture instantanée avec **le même barème de points que la fonction serveur normale**, sans bonus de classement spécifique et sans capture parfaite artificielle.
- Mauvaise carte : la patrouille reste active ; l'agent peut encore affaiblir et capturer normalement. Impossible de demander d'autres cartes après la première.
- Le mécanisme est offert à **tous** les joueurs et tous les adversaires, sans avantage exclusif lié à la création d'un personnage.
- Aucune nouvelle donnée personnelle n'est rendue publique.

## Créateur de super-vilains
Le champ **Objet de faille ultime (six cartes mystère)** est maintenant obligatoire pour les nouvelles fiches dans l'interface. Le champ Faiblesse du personnage reste séparé. Les anciens personnages restent compatibles via la valeur de secours.

## Corrections d'interface
Le danger se présente sur **5 niveaux** (ex. danger 3/5) et non 3/6 ; les **6** correspondent au nombre de cartes mystère et au nombre des premiers méchants officiels.

## Fichiers modifiés
- `index.html` : éditeur, indice de faille SOLO, nouvelle grille ARÈNE, et messages de résultat.
- `arena.js` : affichage des cartes et actions vers RPC sécurisé.
- `supabase/013_arena_ultimate_weakness.sql` : choix secret, protection contre les tentatives multiples, récompense calculée côté serveur.
- `service-worker.js` et `manifest.webmanifest` : mise à jour PWA.

## Tests de non-régression
- Vérification programmatique de 50 mélanges pour chaque méchant officiel et trois exemples de personnages personnalisés : **6 cartes, une et une seule bonne, aucun doublon**.
- Test d'une bonne carte SOLO : capture instantanée avec récompense; test de mauvaise carte : deuxième tentative bloquée.
- Test d'affichage de Morgane ARÈNE : bonne cible **💄 Rouge à lèvres**, six cartes cachées, une mauvaise carte désactivant les six choix.
- Vérification SQL : `authenticated` ne peut ni lire la bonne position, ni modifier les cartes; seul le RPC serveur sécurisé y accède.

**À valider sur deux véritables téléphones** : jeu réactualisé, bonne/mauvaise carte dans l'ARÈNE, et capture de Morgane dans le SOLO.
