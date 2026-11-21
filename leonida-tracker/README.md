# LEONIDA TRACKER V3.1 — 21 novembre 2026

Carte GTA VI communautaire, Money Finder, GPS indicatif, chat et statistiques de fréquentation.

## Corrections du 21 novembre 2026

### Compteur de visiteurs uniques

- Chaque navigateur crée un identifiant aléatoire \`leonida-chat-session-v1\`, enregistré dans son \`localStorage\`. Les actualisations du navigateur et les reconnexions ne génèrent **plus** une visite supplémentaire pour ce même identifiant.
- Un navigateur Web ne peut pas récupérer l'adresse MAC de l'appareil. Les statistiques ne collectent aucune adresse MAC et n'exigent aucun compte.
- Effacer les données du site ou changer de navigateur crée une nouvelle identité : « visiteurs uniques » reste une **approximation par navigateur**, non une identification matérielle de personnes.
- La présence « joueurs connectés » est actualisée toutes les 6 secondes ; elle compte les sessions actives durant les 65 dernières secondes, pas les joueurs GTA Online.

### Chat : pièces jointes, liens vidéo et archivage

- Champ facultatif pour les liens **YouTube, YouTube Shorts, Twitch et TikTok** ; les liens d'images provenant d'**Imgur, Reddit ou Unsplash** sont également acceptés. Les URL HTTPS sont contrôlées côté serveur (liste d'hôtes autorisés).
- **Fichiers image** : JPEG, PNG, WebP — limite de 1 Mo.
- **Courtes vidéos** : MP4, WebM — limite de 2,5 Mo.
- Le serveur contrôle le type MIME, la signature binaire, le volume total chargé et les limites d'envoi (trois fichiers par cinq minutes).
- Les médias publiés s'affichent dans le chat sous forme de photo ou de vidéo consultable. Ils sont associés au message et sont masqués après des signalements suffisants.
- Les messages locaux précédemment chargés sont archivés dans le navigateur \`leonida-chat-local-archive-v1\` lorsque le serveur redémarre. **L'archive locale est visible uniquement sur cet appareil**, pas par les autres joueurs. Les messages déjà perdus avant cette mise à jour ne sont pas récupérables.
- Les uploads et les messages restent *temporaires côté serveur tant que la connexion PostgreSQL n'a pas été activée*. En mode mémoire : les images/vidéos sont conservées au plus 4 heures, les messages jusqu'à 24 heures, et ces durées peuvent être raccourcies par un redémarrage.
- Modération minimale : signalement et masquage après plusieurs alertes, limitations de volume, filtrage des liens. **Une modération humaine et un vrai dispositif de contrôle des images et des vidéos restent nécessaires avant une ouverture à grande échelle**.

### Backend PostgreSQL préparé

La nouvelle base gratuite Render existe, mais **n'est pas encore connectée à la Web API** faute d'accès aux identifiants de connexion depuis les outils disponibles :

- Base : [leonida-tracker-community-db](https://dashboard.render.com/d/dpg-dc0m77u1egvs738co2ug-a), plan Free, région Francfort, identifiant \`dpg-dc0m77u1egvs738co2ug-a\`.
- **Expiration : 21 décembre 2026**, selon Render. Un plan gratuit PostgreSQL Render ne convient pas à la conservation définitive : prévoir une migration vers une base durable avant expiration et des sauvegardes régulières. Aucun abonnement payant n'a été souscrit.
- Service API : [leonida-tracker-news](https://dashboard.render.com/web/srv-dc0lcbcs728c73akl3r0), région Francfort. Site public : https://leonida-tracker-gta6.onrender.com/.

Les fichiers \`community_pg.py\` et \`requirements.txt\` contiennent le schéma et l'adaptateur prêts à l'emploi pour une connexion PostgreSQL sécurisée. La base stockera les identifiants de navigateurs sous forme de hash SHA-256 (pas de MAC), les messages publics et les données des pièces jointes.

**Activation manuelle nécessaire dans Render (ne partage pas les identifiants de connexion dans une conversation publique)** :

1. Ouvrir le tableau de bord de la base ci-dessus, onglet **Connect**, et copier son **Internal Database URL** (il contient un mot de passe secret).
2. Ouvrir le service Web **leonida-tracker-news**, onglet **Settings**. Modifier **Build Command** et inscrire \`pip install -r leonida-tracker/requirements.txt\`. L'adaptateur PostgreSQL utilise \`psycopg[binary]==3.3.9\` compatible Python 3.14.
3. Dans **Environment**, ajouter la variable secrète \`DATABASE_URL\` avec la valeur de l'**Internal Database URL** copiée à l'étape 1. Ne jamais placer cette URL dans GitHub ni dans l'application frontend !
4. Enregistrer, relancer un déploiement de ce service et vérifier \`https://leonida-tracker-news.onrender.com/api/community/state\` : la réponse doit indiquer \`"mode":"persistent"\`, \`"temporary":false\`.
5. **Important :** cette solution de test devra être migrée avant le 21 décembre 2026. Sans migration, la base expire et les données risquent d'être supprimées. Pour un stockage pérenne, préférer un projet dédié Supabase ou une base payante conservée avec sauvegardes, selon le choix explicite du propriétaire.

Si \`DATABASE_URL\` n'est pas définie, la version temporaire reste active avec \`"mode":"temporary"\` ; le site ne prétend pas que les données sont durables.

### Limites et bonnes pratiques

- Le chat est public. Ne pas partager d'adresse personnelle, de numéro de téléphone ou de documents sensibles. Seuls les médias dont les droits de diffusion sont détenus par le joueur doivent être publiés.
- L'archivage local n'est pas une sauvegarde du serveur et ne synchronise pas plusieurs appareils.
- La base gratuite Render est limitée en stockage, notamment pour les vidéos ; une solution de stockage objet indépendante sera recommandée avant de relever les limites vidéo.
- Les fichiers du site et l'API ne doivent jamais exposer la variable \`DATABASE_URL\`.
- La progression et les favoris du joueur restent dans \`leonida-tracker-state-v1\` et les tournées GPS dans \`leonida-gps-tour-v1\`.

## Fichiers

- \`community.py\` — compteurs de navigateur, chat en mémoire, validation et stockage temporaire des médias
- \`community_pg.py\` — adaptateur PostgreSQL facultatif et tables persistantes
- \`news_api.py\` — API HTTP du chat, des statistiques, du partage et des nouveautés
- \`chat.js\` / \`chat.css\` — interface mobile, archive locale, galerie et liens vidéo
- \`hunter.js\` / \`hunter.css\` / \`hunter-ui.js\` — Money Finder et GPS
- \`sw.js\` — cache hors ligne mobile

Projet fan non officiel, sans lien avec Rockstar Games ou Take-Two Interactive.
