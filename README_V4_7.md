# SUPERVILAINS V4.7 — Moteur d'images IA du créateur

## Fonctionnement

Dans le jeu, ouvrir **COFFRE → Créer mon super-vilain → Mes super-vilains**. Les fiches créées précédemment (dont Morgane makeup) restent conservées.

Après ajout d'une vraie photo et de son autorisation, une carte affiche :
- **PORTRAIT** — la photo transformée en personnage caricatural, univers bleu/violet SUPERVILAINS ;
- **TROLLER** — la même personne avec une grimace et la langue tirée ;
- **CAPTURÉ !** — la même personne en tenue de prisonnier, menottée, avec « CAPTURÉ ! » au bas de l'image.

Bouton **GÉNÉRER 3 IMAGES IA** : trois demandes séparées, dans cet ordre, pour que chaque résultat soit conservé. Si l'une échoue, relancer plus tard uniquement celles qui manquent. Bouton **REFAIRE** sur chaque image déjà générée, avec limite de 3 régénérations par personnage.

Les images sont des **images fixes WebP** 1024×1024, pas encore des GIF animés. Elles ne sont pas encore intégrées aux combats solo. L'aperçu de voix reste local ; aucune synthèse vocale IA serveur n'est activée à ce stade.

## Configuration indispensable — secret du fournisseur

L'API Images est payante et distincte d'un abonnement ChatGPT.

1. Créer une clé API et définir un budget / des limites de dépense dans **https://platform.openai.com/**.
2. Ouvrir le projet Supabase **supervilains-arene** puis **Edge Functions → Secrets**.
3. Ajouter un secret nommé **`OPENAI_API_KEY`** et coller sa valeur depuis le tableau de bord OpenAI.
4. Ne jamais publier ni coller la clé dans GitHub, dans le jeu ou dans une conversation.
5. Recharger l'application, ouvrir le créateur et vérifier le message **IA prête**.
6. Sur la carte d'un personnage ayant une photo, appuyer sur **GÉNÉRER 3 IMAGES IA** ; une confirmation prévient de la consommation de crédits.

Sans cette clé, l'interface explique que le moteur est inactif et n'autorise pas de génération payante. Le déploiement Supabase de la fonction ne suffit donc pas à produire des images. Une clé valide avec facturation API active est indispensable.

## Protection et coûts

- Edge Function déployée **`villain-image-ai`**, `verify_jwt=true`, autorisée uniquement aux sessions d'agents connectés.
- L'identité de l'utilisateur est vérifiée côté serveur via Supabase Auth. Les clients ne peuvent ni appeler l'API IA directement ni écrire les résultats dans la base.
- `OPENAI_API_KEY` n'apparaît jamais dans les fichiers de l'application publique.
- Quota initial : **9 demandes par joueur sur 24 heures**, **45 demandes globales sur 24 heures**.
- Maximum **3 régénérations** par méchant.
- Un seul travail IA actif par personnage ; réservation transactionnelle avant tout appel facturable. Les travaux interrompus sont déverrouillés après huit minutes.
- Prompts serveur communs avec la photo d'origine comme image de référence, `gpt-image-1.5`, fidélité haute.
- Images WebP stockées dans `villain-generated` **privé**, chemin `<user_uid>/<villain_uuid>/<portrait|troll|capture>.webp`; aperçu temporaire signé.
- Les trois variantes sont validées indépendamment ; une erreur n'efface pas les images réussies.
- Le remplacement d'une photo source invalide les anciens chemins d'images en base ; le mode solo et l'ARÈNE officielle restent inchangés.
- Le propriétaire doit confirmer qu'il dispose du droit et des autorisations appropriées pour utiliser la photo.

## Code et infrastructure

- `supabase/functions/villain-image-ai/index.ts`
- `supabase/006_image_ai_jobs.sql`
- `supabase/007_reset_generated_on_new_photo.sql`
- `villain_creator.js`
- `index.html`

## Tests

La fonction Edge est déployée mais **aucune génération payante réelle n'a été effectuée** pendant le développement, car aucun secret de fournisseur n'a été configuré via les outils disponibles. L'interface a été simulée avec des réponses serveur : les trois étapes et les aperçus privés fonctionnent. Un essai réel avec une photo ne sera possible qu'après la configuration du secret et de la facturation API.
