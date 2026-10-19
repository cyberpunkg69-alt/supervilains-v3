# SUPERVILAINS V4.11 — Carte SOLO, vrais portraits et faille rouge à lèvres

## Modifications de la carte

- Les six quartiers officiels restent inchangés dans les statistiques, missions et succès.
- Les cartes officielles affichent **les six vraies photos** des suspects au lieu d'utiliser leurs objets comme image principale. Chaque objet devient une petite icône de faiblesse.
- Les **personnages validés** reçoivent un **quartier distinct** basé sur le champ `district` de leur fiche Supabase, et non plus sur leur niveau de danger.
- Les repaires personnels apparaissent en tête de la grille de la carte, avec le vrai portrait du personnage.
- Pour les fiches dépourvues de quartier : emplacement `REPAIRE DE <NOM>`.
- Si plusieurs personnages personnalisés portent exactement le même quartier, ils partagent une seule carte de quartier et sont tous accessibles depuis la patrouille.
- Un bouton `TRAQUER` demeure aussi dans les panneaux des cibles personnelles.
- Le champ `district` est désormais transmis de la base via `custom_play.js` : le lieu de Morgane est **BOIS DE BOULOGNE**, plus **LIVE MALÉFIQUE**.
- Les zones personnelles n'augmentent pas le compteur original `6/6 quartiers` ni la mission `visiter les 6 quartiers`.
- Les fiches de suspects affichent aussi la photo officielle ou personnalisée et le motif personnalisé si disponible.

## Cartes de faiblesse

- La fiche de **Morgane makeup** conserve sa faiblesse narrative `Un démaquillant trop gras` mais utilise **`Rouge à lèvres` 💄 comme objet de capture**.
- Pour les personnages personnels, le jeu place **une bonne carte parmi les 6 cartes mystère**, avec son nom et un emoji d'objet adéquat au lieu du symbole générique `🎴`.
- Les six adversaires officiels conservent leurs six cartes historiques.
- Aucune faiblesse n'est dévoilée dans la fiche suspect avant la tentative de capture.

## ARÈNE, confidentialité et photos

- Dans le fil des captures, les méchants officiels sont présentés avec leurs portraits (le flux n'affiche plus leurs objets à la place).
- L'identité des personnages privés des autres joueurs reste inconnue : le fil public affiche uniquement `un super-vilain personnel` et l'icône silhouette.
- Le serveur renvoie le code sentinelle `villain_id = -1` pour les captures de méchants privés dans le RPC `arena_feed`.
- **Aucune modification des points, probabilités, quotas ni duels**.

## Fichiers

- `index.html` : carte, affichage, statistiques, tests des cartes de faiblesse.
- `custom_play.js` : transmission du quartier de la fiche Supabase.
- `arena.js` : fil des captures avec images officielles et respect des personnages privés.
- `supabase/013_arena_private_feed_labels.sql` : anonymisation serveur du fil des captures.
- `service-worker.js` : nouveau cache `supervilains-v4-11-personal-districts-lipstick`.

## Vérifications effectuées

- Morgane apparaît à BOIS DE BOULOGNE dans une simulation avec les données réelles de sa fiche.
- Le quartier LIVE MALÉFIQUE reste occupé uniquement par Amélie.
- L'objet **Rouge à lèvres 💄** est bien la carte gagnante parmi les six cartes mystère.
- Les six cartes officielles conservent leurs six failles d'origine.
- Les nouvelles zones ne modifient pas les statistiques de visite des six lieux historiques.
- Une capture perso affichée dans le fil public ne révèle ni le nom ni la photo du personnage.
- Il reste à valider le rendu sur un vrai téléphone après actualisation de la PWA.
