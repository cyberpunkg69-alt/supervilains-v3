# SUPERVILAINS V3 — Installation sur téléphone et en ligne

## 1. Activer GitHub Pages (nécessaire une seule fois)
Sur ce dépôt GitHub, ouvre **Settings → Pages**.
Sous « Build and deployment », sélectionne **GitHub Actions** comme source.
Le workflow présent dans `.github/workflows/deploy.yml` publiera le jeu à chaque mise à jour.
Regarde l'onglet **Actions** pour vérifier que le déploiement est vert.

Adresse attendue une fois le déploiement réussi :
https://cyberpunkg69-alt.github.io/supervilains-v3/

## 2. Ajouter les six photos
Les fichiers du jeu fonctionnent déjà avec les émojis, même sans photos.
Les portraits personnels ne sont pas encore dans ce dépôt. Depuis l'archive
`SUPERVILAINS_V3_6_MECHANTS_GITHUB_READY.zip` fournie dans ChatGPT,
dépose dans le dossier `assets/` les fichiers suivants :
`manu.jpg`, `lea.webp`, `natsu.jpg`, `amelie.jpg`, `ludo.jpg`, `eric.jpg`.

**Attention** : un dépôt public expose publiquement les photos et les textes associés.
Assure-toi d'avoir les autorisations de publication des personnes représentées.

## 3. Activer l'arène multijoueur
Créer un projet sur Supabase : https://supabase.com
Dans SQL Editor, exécuter le contenu de `supabase/001_arena.sql`.
Dans Settings → API Keys, copier la **publishable key** (non secrète).
Dans `config.js`, compléter :
```js
window.SUPERVILAINS_ONLINE = {
  url: "https://ID_DU_PROJET.supabase.co",
  publishableKey: "sb_publishable_..."
};
```
Ne jamais mettre de `service_role` ni de clé `sb_secret_` dans GitHub.

Dans Supabase → Authentication → URL Configuration,
ajouter `https://cyberpunkg69-alt.github.io/supervilains-v3/`
dans les URL de redirection autorisées.
Pour tester la connexion, utiliser deux comptes e-mail différents.

## 4. Notes de gameplay
- Mode solo : six zones, six boss, failles ultimes, progression sauvegardée dans le téléphone.
- Arène : captures classées validées par le serveur, 30 patrouilles par jour, classements semaine/mois/général, défis privés de 24 heures.
- Les captures solo n'alimentent pas les scores en ligne.
