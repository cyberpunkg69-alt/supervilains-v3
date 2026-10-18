# SUPERVILAINS V4.1 — INVITER UN AMI

## Partage depuis l’ARÈNE
- Le bouton **📨 INVITER UN AMI** est accessible même si le joueur n’est pas encore connecté.
- Le panneau de partage propose : **menu de partage natif Android/iOS**, **WhatsApp**, **Messenger**, **SMS**, et **Copier**.
- WhatsApp prépare un message avec le lien du jeu ; SMS ouvre l’application avec le texte.
- Messenger n’a pas de lien d’envoi universel sans intégration Meta : le bouton ouvre Messenger et copie l’invitation à coller dans la conversation.
- L’URL utilisée est celle du jeu hébergé sur GitHub Pages, pas l’adresse du serveur Supabase.

## Invitations aux duels
- Après **CRÉER UN DÉFI**, le joueur peut utiliser **PARTAGER MON DÉFI**.
- Les duels en attente affichent un bouton **INVITER UN AMI À CE DÉFI**, même après avoir rechargé la page.
- Le message contient le code serveur de 10 caractères et un lien `?duel=CODE`.
- Lorsqu’un ami ouvre ce lien, le jeu affiche l’ARÈNE et préremplit son champ de code.
- Pour ne pas perdre l’invitation en passant par la connexion e-mail Supabase, ce code est temporairement sauvegardé dans le navigateur pendant 24 heures.
- Le code reste à usage unique côté serveur : une seule personne peut accepter ce défi. Il est supprimé du stockage temporaire après l’acceptation.
- Les liens de retour d’authentification conservent l’URL canonique qui figure dans les redirections autorisées du serveur.

## Compatibilité
- Aucun changement à Supabase SQL ni à la validation serveur des captures et scores.
- Mode solo, progression, 50 missions, 100 motifs, 30 succès / 1000 G, voix et images préservés.
- Mise à jour du cache mobile : `supervilains-v4-1-invitations-duels`.

## Test rapide
1. Depuis ARÈNE, ouvrir INVITER UN AMI et tester Copier / WhatsApp.
2. En tant que joueur connecté, CRÉER UN DÉFI puis PARTAGER MON DÉFI.
3. Ouvrir le lien contenant `?duel=CODE` sur un autre appareil (ou en navigation privée).
4. Vérifier la pré-saisie, se connecter avec un autre compte et cliquer sur REJOINDRE.
5. Vérifier que le duel apparaît parmi les défis des deux comptes.

Le test d’un duel réel exige **deux comptes distincts** ; le code a été vérifié localement, mais un duel entre deux téléphones doit encore être validé en conditions réelles.
