# SUPERVILAINS V4.5 — CREER UN SUPER-VILAIN

## Dans le jeu
- Ouvrir le **COFFRE**, puis **➕ CRÉER MON SUPER-VILAIN**.
- Utiliser son compte Supabase de l’**ARÈNE** (aucun compte supplémentaire).
- Renseigner nom, alias, description, faille ultime, objet, danger (1–5), quartier, motif de recherche, phrases et type de voix synthétique.
- Choisir une photo et confirmer disposer de l'autorisation de l'utiliser.
- L’application convertit la photo en JPEG de 1 400 pixels maximum et la sauvegarde dans un bucket privé.
- Les fiches apparaissent dans **MES SUPER-VILAINS** et peuvent être modifiées ou supprimées tant qu'elles restent des brouillons.
- L'aperçu de voix utilise le synthétiseur vocal local du téléphone : **il ne crée pas encore d'audio IA**.

## Supabase
- Tables : `custom_villains`, `custom_villain_jobs`, `custom_villain_audio` (migration 002).
- RPC : `custom_villain_create`, `custom_villain_update`, `custom_villain_attach_photo` (migration 002), `custom_villain_delete_draft` (migration 003).
- Politiques RLS privées et buckets `villain-source`, `villain-generated`, `villain-audio`.
- Stockage photo unique et remplaçable : `<auth.uid>/<villain.id>/source.jpg` (migration 004), sans fichiers temporaires accumulés.
- Toutes les opérations sont liées à l'identité Supabase du joueur ; les images générées et les statuts de génération restent modifiables uniquement par un futur service serveur.
- Maximum 10 fiches par joueur ; l'interface et le serveur appliquent des contrôles de taille et de types de photos.

## ÉTAPE SUIVANTE — Génération IA réelle
Le créateur **ne génère pas encore** d'images ni de voix serveur. Cette phase exige un fournisseur IA, une clé privée stockée côté serveur et un mécanisme de facturation / quota. Les visuels prévus sont :
1. **Portrait** au même style que les six personnages officiels.
2. **Troller** avec langue tirée et expression moqueuse.
3. **Capturé** en tenue de prisonnier et menottes, inscription « CAPTURÉ ! » en bas.

La génération sera effectuée par le backend pour éviter d'exposer les clés IA dans le jeu GitHub Pages. L'intégration des personnages personnalisés dans le radar et les combats est prévue dans une étape ultérieure.

## Compatibilité
- Aucune modification des personnages d'origine, des photos/GIFs, des voix officielles ou des 50 missions.
- Clé de sauvegarde solo `supervilains_operation_minuit_v3_meme` inchangée.
- Classement et duels Supabase de l’ARÈNE inchangés.
- Cache PWA renouvelé : `supervilains-v4-5-createur-photo-privee`.

## Tests
- Syntaxe JS du module et du jeu de base contrôlée.
- Simulation de la création, de l’upload, de la relecture, de l'édition, du remplacement d'une photo et de la suppression (un seul fichier source par fiche).
- Droits d’exécution RPC vérifiés côté Supabase : `anon` bloqué, `authenticated` autorisé.
- Il reste à vérifier une opération réelle de photo depuis un appareil connecté, car aucun compte d'essai et aucune photo privée de joueur n'ont été utilisés pour les tests.
