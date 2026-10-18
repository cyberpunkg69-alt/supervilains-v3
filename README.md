# SUPERVILAINS V3 — Meme Hunt

Jeu mobile de capture de six boss fictifs et parodiques (Manu, Léa, Natsu, Amélie, Ludo, Eric), avec leurs failles ultimes, collection, missions, et arène compétitive.

## Jouer
La version solo fonctionne directement sur GitHub Pages. Pour les compétitions multijoueurs, un projet Supabase doit être configuré dans `config.js` avec une URL de projet et une clé **publique**, jamais une clé secrète.

## Déploiement
Dans Settings > Pages, choisir « Deploy from a branch », puis `main` / `/(root)`.

**Important :** les images personnelles publiées ici sont visibles publiquement. Utiliser seulement des images dont la publication est autorisée.

## Créer un super-vilain avec ChatGPT — V4.8
Depuis **COFFRE → CRÉER UN SUPER-VILAIN**, enregistre d'abord la fiche et la photo autorisée. Dans **Mes super-vilains**, utilise **📋 CONSIGNE** pour chacun des trois visuels (portrait, trollé, capturé), **✨ OUVRIR CHATGPT**, et joins personnellement ta photo dans ChatGPT. Enregistre les trois images distinctes sur ton téléphone, puis utilise **📥 IMPORTER** sous chaque vignette. Lorsque les trois fichiers sont prêts, choisis **✅ VALIDER MON PERSONNAGE**. Le statut « validé » reste **privé** : aucune publication automatique et aucune intégration automatique dans les combats actuels.

Aucune clé d'API OpenAI n'est utilisée par cette interface. Chaque agent utilise son propre compte ChatGPT et ses limites d'usage. L'hébergement et le stockage Supabase demeurent distincts, avec leurs éventuels quotas et coûts.

Les images et photos sont privées dans les buckets Supabase. Les chemins sont restreints par RLS et les fonctions de validation vérifient que le personnage appartient bien au compte connecté. Ne jamais placer les clés secrètes Supabase ni OpenAI dans le dépôt.
