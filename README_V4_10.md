# SUPERVILAINS V4.10 — Portraits officiels et carte des méchants personnels

## ARÈNE : les six portraits officiels
Les rencontres de l'ARÈNE affichent désormais les photos des six personnages officiels :
- MANU : `assets/manu.jpg`
- LÉA : `assets/lea.png`
- NATSU : `assets/natsu.jpg`
- AMÉLIE : `assets/amelie.jpg`
- LUDO : `assets/ludo.jpg`
- ERIC : `assets/eric.jpg`

La photo apparaît au début de la rencontre ; l'animation Troller s'affiche brièvement après une attaque, puis revient au portrait. Un visuel accompagne également le résultat de capture ou de fuite. Les personnages privés (par exemple Morgane makeup) conservent leurs propres images Portrait / Troller / Capturé.

## CARTE SOLO : personnages personnalisés
- Encadré **MES MÉCHANTS SUR LA CARTE** avec portrait, nom, secteur, difficulté et bouton **📡 TRAQUER**.
- Bouton **↻** pour resynchroniser les personnages avec le compte ARÈNE si l'identité tarde à être chargée.
- Mini-portraits des personnages personnels dans leurs quartiers sur la carte.
- Un personnage personnel ne s'affiche que s'il est **VALIDÉ** et possède ses 3 images dans le stockage privé Supabase.
- La carte utilise les URL temporaires signées générées pour **le propriétaire seulement**. Les images ne deviennent pas publiques.
- Les quartiers non débloqués conservent la restriction de niveau.
- Les joueurs peuvent également continuer de rencontrer les personnages personnels lors des patrouilles ordinaires dans leurs quartiers.
- Le compteur historique des 6 méchants et les succès Xbox restent inchangés.

## Compatibilité
- Sauvegarde solo historique `supervilains_operation_minuit_v3_meme` conservée.
- Six héros officiels, leurs GIF, leurs voix, leurs missions et les classements préservés.
- Aucun appel OpenAI API nécessaire. La génération d'images personnalisées continue de fonctionner par ChatGPT, importée depuis le téléphone.
- PWA : `supervilains-v4-10-portraits-arena-solo-map`. Les six images d'origine sont préchargées pour l'écran ARÈNE.

## Tests développeur
- Validité de la syntaxe de l'interface principale, des scripts Arena et Custom Play, et du service worker.
- Simulations de la carte SOLO avec une cible privée : portrait visible sur le quartier, cible visible dans la liste, bouton de traque opérationnel, filtrage de niveau et échappement des noms.
- Simulation de l'affichage ARÈNE : six portraits officiels existants, portrait personnalisé, réaction Troller et retour au portrait.
- Déploiement GitHub Actions : à vérifier pour le dernier commit.

**Note :** ces tests simulés ne remplacent pas un essai de jeu réel sur le téléphone.
