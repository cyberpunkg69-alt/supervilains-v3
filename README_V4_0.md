# SUPERVILAINS V4.0 — Commissaires et méchants vocaux

## 24 voix officielles MP3
- 6 personnages, deux répliques officielles par personnage (`capture` et `escape`), identiques pour tous les joueurs.
- 4 commissaires, trois répliques chacun (`radar`, `capture`, `escape`).
- Chaque joueur reçoit un commissaire stable : déterministe depuis son identifiant Supabase lorsqu’il se connecte, ou depuis une graine stockée sur le téléphone en mode invité.
- Le commissaire dispose d’une variante subtile de vitesse/timbre reproductible (ce n’est PAS une voix générée de zéro unique au monde).
- Les 24 MP3 sont stockés dans `assets/audio/v4/` ; aucun lien temporaire ni appel payant pendant une partie.

## Interactions
- Radar : commissaire annonce la recherche ; suspect trouvé : réplique du méchant.
- Capture : le commissaire félicite, puis le méchant réagit.
- Fuite : message du commissaire, et du méchant s’il était identifié.
- Fiche suspect : boutons pour écouter le motif (synthèse vocale Android, différente suivant téléphone) et écouter la voix officielle du méchant.
- Onglet AGENT : activer/désactiver les voix, écouter son commissaire, arrêter la lecture.
- Les voix sont désactivées par défaut et respectent le choix du joueur.

## Compatibilité
- La sauvegarde de la V3.8/V3.9 est préservée : 50 missions, radar 10 suspects, 30 succès 1000 G, failles, portraits et GIFs de capture inchangés.
- En mode invité, l'identité vocale suit le stockage local. En mode connecté, la même combinaison de commissaire et variante est déterminée par l'identifiant de compte sur chaque appareil.
- La génération vocale est fictive ; elle n'imite pas la voix réelle des personnes caricaturées.