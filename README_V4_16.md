# SUPERVILAINS V4.16 — Images rapides et cache privé sur l'appareil

## Pourquoi les images tardaient à s'afficher

Les six portraits historiques utilisés dans le SOLO et le COFFRE pointaient vers des PNG de ~2,6 à 3 Mo chacun. Les trois portraits des créations Supabase utilisaient à chaque synchronisation une nouvelle URL signée temporaire, ce qui empêchait la réutilisation fiable des ressources par le navigateur.

## Solution intégrée

### 1. Miniatures officielles

- Les six portraits d'interface utilisent les **JPG/WebP déjà présents dans GitHub**, sans nouvelle compression destructive des sources.
- Total des six portraits : **16 627 143 octets** auparavant, **199 965 octets** maintenant ; économie **98,8 %**.
- `arena.js` utilise aussi `assets/lea.webp`.
- Le Service Worker V4.16 **précharge les six portraits** et les **12 GIF de réaction officiels**, puis répond **d'abord depuis le cache local** pour ces assets. Les GIF portant un paramètre `?t=...` réutilisent bien la même copie.
- Les scripts et la page HTML restent **network-first** pour recevoir les corrections du jeu.
- À l'activation, seul le cache ayant le préfixe `supervilains-` est remplacé, afin de ne pas supprimer le cache des autres projets GitHub Pages du même domaine.

### 2. Portraits personnalisés privés

`custom_play.js` installe un cache **IndexedDB** local à l'origine web, utilisé uniquement lorsque l'agent est authentifié auprès de Supabase.

1. Vérification de l'identité et lecture de la liste des personnages **validés** et autorisés par Supabase RLS.
2. Pour chaque variante `portrait`, `troll`, `capture`, recherche d'une copie locale via la clé : **compte utilisateur + UUID du personnage + type + chemin Storage + `updated_at`**.
3. Si trouvée, l'image est chargée immédiatement depuis un `blob:` URL local, sans générer de nouvelle URL signée.
4. Si absente, l'application utilise l'URL signée pour l'affichage **sans bloquer la première ouverture**, puis télécharge au plus deux images à la fois avec la session Supabase pour réchauffer le cache en arrière-plan.
5. Les images sont réduites et converties en WebP qualité 0,84, dimension maximale **640 px** pour le portrait normal et **800 px** pour le trollé/capturé (afin de préserver le texte « CAPTURÉ ! »). Si conversion indisponible, l'original n'est conservé que sous un plafond de 2 Mo.
6. Le cache est rechargé lors des visites suivantes. Si une image est remplacée, son `updated_at` change et une nouvelle copie est produite. Les anciennes variantes et les personnages supprimés sont purgés.
7. À la déconnexion, les copies de l'ancien utilisateur sont effacées d'IndexedDB et les liens temporaires en mémoire sont révoqués. Un nouvel utilisateur ne réutilise jamais le cache de l'ancien.
8. Si IndexedDB est bloqué (navigation privée ou politique navigateur), l'application **continue avec les URL signées**, sans bloquer les captures.

Les photos personnelles **ne sont jamais ajoutées au cache public du Service Worker ni au dépôt GitHub**. Les photos originales demeurent dans les buckets privés de Supabase.

## Précisions et limites

- Le **premier affichage** des portraits personnels nécessite normalement Internet ; les visites suivantes profitent du cache sur le même navigateur ou la même PWA.
- Le **mode complet hors ligne n'est pas promis** : la liste de personnages, l'authentification et l'ARÈNE reposent toujours sur Supabase.
- Les images stockées en IndexedDB sont locales au profil navigateur, **non chiffrées par SUPERVILAINS**. Sur un appareil partagé, utiliser « Se déconnecter » après avoir joué et maintenir l'appareil verrouillé.
- Le navigateur peut évincer ses données de site en cas de manque d'espace ; dans ce cas, l'application recharge les images après reconnexion.
- **Ne pas effacer les données de l'application** pour forcer une mise à jour : les captures SOLO sont toujours sauvegardées séparément dans `localStorage` et pourraient être perdues. Fermer puis rouvrir l'application suffit.

## Conservation de l'existant

Aucun changement de table Supabase, de clé de sauvegarde, de points, de failles ultimes, de cartes, de scores compétitifs ou d'objets de capture. Les 30 succès officiels et les nouveaux succès personnels restent inchangés.

## Vérifications

- Syntaxe JavaScript de `index.html`, `arena.js`, `custom_play.js` et `service-worker.js` : OK.
- Les 60 fichiers du Service Worker ont été vérifiés présents dans le dépôt ; aucun chemin manquant.
- Références HTML et identifiants : pas de doublons détectés.
- **Essai sur Android à effectuer** : ouvrir l'application, afficher un méchant personnel une première fois, quitter et rouvrir ; vérifier le chargement rapide et l'affichage des trois variantes. Remplacer ensuite une photo, et vérifier que le cache actualise la nouvelle version.
