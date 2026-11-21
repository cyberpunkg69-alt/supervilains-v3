# LEONIDA TRACKER V2.5 — 21 novembre 2026

Compagnon GTA VI gratuit pour mobile, avec carte, découvertes, progression personnelle et actualités.

## Nouveau : communauté en direct

- **Compteur de vues** : nombre d'ouvertures distinctes de pages, comptées sur le serveur depuis son dernier démarrage. Un identifiant de page évite qu'une reconnexion automatique compte deux fois la même visite.
- **Joueurs connectés** : nombre de sessions actives sur LEONIDA TRACKER au cours des 65 dernières secondes (ce n'est pas le nombre de joueurs connectés à GTA VI). Actualisation des nombres toutes les 6 secondes, signal de présence toutes les 25 secondes.
- **Chat public GTA 6** : fenêtre flottante mobile/desktop, pseudo choisi sans inscription, salon partagé, messages de 2 à 320 caractères, actualisation toutes les 6 secondes.
- **Protection** : rendu texte sans insertion HTML, interdiction des liens et coordonnées dans les messages, limites d'envoi de 4 messages/minute par session et 20 par adresse réseau anonymisée, signalements de messages, masquage après trois signalements distincts. Les pseudos ne sont pas vérifiés ; aucune identité Roblox/Xbox/PlayStation n'est demandée.
- **Vie privée** : identifiant aléatoire de navigateur conservé localement, pas de stockage d'adresse IP brute dans le module de chat, pas de messages privés. Ne pas partager de renseignements personnels.
- **Avertissement de persistance** : le serveur Render gratuit ne dispose pas encore de base de données persistante pour ces trois fonctions. Les visites et l'historique de messages résident uniquement en mémoire (jusqu'à 200 messages, 24h) et se réinitialisent quand l'instance s'arrête ou redémarre. Les compteurs ne sont donc PAS des totaux permanents. Une base de données séparée devra être ajoutée avant d'en faire un service public pérenne.
- **Service** : les routes publiques du backend sont dans \`community.py\` et \`news_api.py\`. Frontend dans \`chat.js\` / \`chat.css\`. HTTPS via Render.

### API

- POST \`/api/community/join\` (sid, page)
- POST \`/api/community/heartbeat\` (sid)
- POST \`/api/community/leave\` (sid)
- GET \`/api/community/state\`
- POST \`/api/community/send\` (sid, nickname, text)
- POST \`/api/community/report\` (sid, messageId)
- POST \`/api/community/delete\` (sid, messageId)

Les routes POST n'acceptent que l'origine autorisée du frontend (et localhost de développement). CORS autorise GET, POST, OPTIONS avec Content-Type JSON.

### Compatibilité

La carte, les coordonnées calibrées, les marqueurs compacts, les traductions et le suivi des découvertes sont conservés. La progression personnelle reste stockée localement sous \`leonida-tracker-state-v1\`, indépendante du chat.

### Liens

- Site : https://leonida-tracker-gta6.onrender.com/
- API : https://leonida-tracker-news.onrender.com/

Projet non officiel ; non affilié à Rockstar Games / Take-Two Interactive.
