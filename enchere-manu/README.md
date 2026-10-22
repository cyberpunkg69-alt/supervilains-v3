# MANU aux enchères — cabaret de l'impossible 🎭

Mini-site humoristique public, isolé dans le dossier \`enchere-manu/\` pour ne pas modifier le jeu SUPERVILAINS.

## Le jeu
- Mise à prix : **1 € fictif**.
- Tous les visiteurs peuvent proposer un pseudo, enchérir et voir la meilleure offre.
- Les propositions sont enregistrées sur le serveur Supabase et affichées par actualisation automatique toutes les 3 secondes.
- Historique des 12 dernières offres et nombre de participants uniques (par session).
- Aucun compte, aucun paiement, aucune valeur monétaire. **Personne n'est réellement à vendre.**
- Le serveur verrouille la ligne d'enchère lors de chaque proposition pour garantir qu'une seule meilleure offre soit acceptée à la fois.
- Délai de 3 secondes par session, plafond de +1 000 € fictifs par offre ; maximum global 99 999 € fictifs.

## Architecture
- Interface : GitHub Pages, fichiers HTML/CSS/JS statiques.
- API publique : Supabase Edge Function \`manu-encheres\`.
- Tables dédiées : \`public.manu_auction_state\` et \`public.manu_auction_bids\`.
- Fonction PostgreSQL : \`public.manu_auction_place_bid\`, appelée uniquement avec rôle serveur.
- Aucune clé privée dans le navigateur. Les empreintes des sessions d'enchère sont hachées côté serveur.
- Protection de base contre les surenchères concurrentes et le clic répété. Ce jeu anonyme reste vulnérable aux abus déterminés ; ce n'est pas une plateforme financière ni un système de loterie.

## Administration (depuis l'éditeur SQL Supabase du propriétaire)

Fermer les enchères :
\`\`\`sql
update public.manu_auction_state set status = 'closed' where id = 1;
\`\`\`

Rouvrir :
\`\`\`sql
update public.manu_auction_state set status = 'open' where id = 1;
\`\`\`

Remettre à zéro (efface toutes les anciennes offres) :
\`\`\`sql
begin;
delete from public.manu_auction_bids;
update public.manu_auction_state
  set current_bid = 0, leader = null, bid_count = 0, participant_count = 0,
      updated_at = now(), status = 'open'
  where id = 1;
commit;
\`\`\`

## Hébergement
Le dossier est servi sur GitHub Pages à l'adresse :
https://cyberpunkg69-alt.github.io/supervilains-v3/enchere-manu/

Note : le site réalise une **vente fictive et comique entre amis**. Aucun achat, paiement, réservation ni transfert de personne.


## 🔔 Notifications de surenchère (Android / Chrome)

La page affiche un bandeau de notification dès qu'une nouvelle meilleure enchère arrive,
même sans permission de notifications du système.

Pour recevoir aussi des **notifications push** lorsque l'onglet est fermé :
1. Ouvrir \`https://cyberpunkg69-alt.github.io/supervilains-v3/enchere-manu/live.html\` dans Chrome Android.
2. Appuyer sur **🔔 ACTIVER LES NOTIFICATIONS**, puis autoriser les notifications du site.
3. Chaque nouvelle enchère validée par un autre participant déclenche une notification
   (pseudo + montant fictif) pour les appareils inscrits.
4. Pour arrêter : retourner sur la page et cliquer sur **🔕 DÉSACTIVER LES NOTIFICATIONS**.
   On peut aussi retirer la permission du site dans les paramètres de Chrome.

- API : Supabase Edge Function \`manu-encheres\` (actions \`subscribe\`, \`unsubscribe\`, \`bid\`).
- Notification : Service Worker \`enchere-manu/sw.js\` (Web Push + VAPID), consentement explicite.
- Stockage : \`manu_auction_push_subscriptions\`, protégé par RLS et réservé au service côté serveur.
- Les clés VAPID privées ne sont jamais publiées sur GitHub ou envoyées au navigateur.
- Les alertes sont **facultatives** : les utilisateurs qui ne les activent pas
  peuvent toujours enchérir normalement.
- La réception en arrière-plan dépend des permissions du navigateur et de la
  gestion des applications en arrière-plan sur l'appareil.
- Le site **ne demande ni téléphone, ni adresse e-mail** pour les alertes.
- Ce n'est pas un service de messagerie garanti : le site s'actualise régulièrement
  quand il est ouvert, et les notifications peuvent arriver plus tard ou être bloquées
  par Android selon ses réglages.

## iPhone et iPad : ajout à l'écran d'accueil
Depuis iOS/iPadOS 16.4, les notifications push fonctionnent après installation du site
comme application web sur l'écran d'accueil. Dans Safari, **Partager → Sur l'écran d'accueil → Ouvrir comme app → Ajouter**, puis ouvrir MANU depuis l'icône créée et toucher **Activer les notifications**. Dans un simple onglet Safari, l'autorisation n'est pas proposée.
Le manifest `enchere-manu/manifest.webmanifest` active `display:standalone` et déclare les icônes de MANU.
Sur Android, ouvrir la page dans Chrome et toucher directement **Activer les notifications**.


## 💬 Le chat des enchères — sans inscription

Le salon de discussion **Le Chat des Enchères** est intégré à \`live.html\` et à \`index.html\`.
Accessible directement en cliquant sur **« 💬 Rejoindre le chat »** près du haut de la page.

- Pseudo choisi librement et mémorisé dans le navigateur, sans compte, e-mail ni mot de passe.
- Texte, emojis (sélecteur), photos JPEG/PNG/WebP (l'appareil convertit/compresse en JPEG, max 2 Mo après compression).
- Un seul fichier photo par message, un aperçu avant l'envoi, agrandissement d'un clic.
- Actualisation des messages toutes les ~5 secondes lorsque la page est visible ; historique des messages anciens.
- Le serveur valide les pseudos, contrôle le type réel des images et refuse les messages trop longs (500 caractères).
- Anti-spam : au minimum 5 secondes entre deux messages, 45 secondes entre deux photos, plafonds quotidiens.
- Chaque message dispose d'un bouton **Signaler** ; trois signalements distincts masquent le message.
- Les photos sont **publiques**. Les participants doivent éviter toute donnée personnelle ou photo qu'ils ne veulent pas rendre publique.
- Pas de véritable modération humaine/automatique d'images : l'organisateur doit surveiller le salon et retirer rapidement les contenus problématiques.

Architecture : Edge Function Supabase \`manu-chat\` ; tables privées
\`manu_chat_messages\` et \`manu_chat_reports\` ; bucket public de photos \`manu-chat-photos\`.
Les clés serveur et les empreintes de session ne sont jamais exposées dans GitHub Pages.

Pour supprimer un message en tant qu'organisateur via Supabase SQL Editor :
\`\`\`sql
update public.manu_chat_messages set is_hidden=true where id=NUMERO_DU_MESSAGE;
\`\`\`
Pour supprimer aussi une photo signalée, effacer l'objet associé au chemin
\`photo_path\` dans le bucket \`manu-chat-photos\`.
