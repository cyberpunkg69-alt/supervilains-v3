# SUPERVILAINS V4.14 — Carte, succès personnels et capture chronométrée en ARÈNE

## Corrections visibles

- **CARTE** : bouton « ! » replacé en haut à droite, sous le badge de niveau, sans chevaucher le contour inférieur des quartiers (notamment le quartier de Manu).
- **COFFRE** : version V4.13 conservée : une grille unifiée, portraits et nombres de captures originaux/personnalisés.

## Succès automatiques pour les méchants personnalisés

Les **30 succès historiques et les 1 000 G** continuent de concerner les six méchants historiques.
Chaque personnage personnel validé depuis Supabase ajoute quatre succès (100 G supplémentaires) :

| Succès | Condition | Gain |
| --- | --- | --- |
| Premier dossier | 1 capture SOLO du personnage | 10 G |
| Faille révélée | 1 capture SOLO grâce à sa faille ultime | 20 G |
| Chasse à ce méchant | 5 captures SOLO | 30 G |
| Némésis | 10 captures SOLO | 40 G |

L'identifiant de chaque succès personnalisé intègre l'UUID du personnage : l'ordre des imports, les changements de nom et la reconnexion ne réinitialisent pas l'historique. Les succès déjà remplis sont reconnus lors du chargement du répertoire privé. Le décompte et le total G s'adaptent automatiquement (par exemple 34 succès / 1 100 G si un personnage est disponible). **Ces G ne modifient jamais les points d'ARÈNE**. Les données SOLO et les succès existants sont préservés.

## Nouvelle jauge de capture de l'ARÈNE

1. **CAPTURER** lance la RPC `arena_meter_begin(uuid)` et ouvre la jauge.
2. Le curseur va d'un côté à l'autre (période de 5,4 secondes), la zone idéale est centrée.
3. **LANCER LE FILET** invoque `arena_meter_finish(uuid)`. La base des chances dépend du danger et des neutralisations, comme auparavant.
4. PostgreSQL horodate le départ et l'arrivée et déduit lui-même précision, bonus/malus (entre −15 et +15 points de probabilité), succès, capture parfaite et score.
5. Une capture parfaite exige trois neutralisations et au moins 90 % de précision. Le maximum de probabilité reste 92 % et le minimum 22 %.
6. Quitter l'interface de la jauge **ne remet pas le chrono à zéro**. La sécurité serveur garde un seul départ par rencontre. Après une longue interruption (plus de 30 secondes), la précision est neutralisée à 50 % pour ne pas pénaliser une reprise.
7. Après 5 minutes, le combat expire comme avant. Les cartes de faille ultime et leurs règles restent indépendantes.

Migration `supabase/014_arena_server_meter.sql` : **appliquée** dans le projet Supabase le 19 octobre 2026. Elle ajoute `meter_started_at` et les RPC `arena_meter_begin` et `arena_meter_finish` avec contrôle de l'identité, verrous PostgreSQL, horloge et calcul côté serveur. Aucun paramètre de précision n'est fourni par le navigateur. Les anciennes RPC historiques sont conservées pour la compatibilité.

## Mise en ligne et vérifications

Fichiers mis à jour : `index.html`, `arena.js`, `service-worker.js`, `manifest.webmanifest`; ajout du script SQL.

Vérifications statiques réalisées :
- Compilation des deux scripts JavaScript : OK
- Aucun ID HTML dupliqué ni élément manquant référencé dans `arena.js`
- Quatre succès générés par méchant personnalisé, score de base 1 000 G préservé
- Les nouveaux RPC Supabase et leurs permissions authentifiées sont présents, pas de lecture/écriture publique directe de la jauge
- Nouveau cache V4.14 pour l'application mobile

**Test réel à faire sur téléphone connecté :** successivement ouvrir CARTE (Manu), vérifier SUCCÈS (Morgane), puis lancer une patrouille ARÈNE et cliquer sur CAPTURER pour arrêter la jauge. Un contrôle visuel et un vrai RPC authentifié restent nécessaires pour confirmer le fonctionnement complet.
