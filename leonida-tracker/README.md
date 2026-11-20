# LEONIDA TRACKER V2.3 — 20 novembre 2026

Compagnon GTA VI pour mobile et PC, déployé sur Render. Application non officielle.

## Améliorations

- Traduction française à l'ouverture d'une fiche depuis les descriptions publiques FullSweep. Exemple Raccoon → Raton laveur, avec traduction interne. Traductions supplémentaires via API MyMemory, mises en cache dans le navigateur. Si le service est indisponible ou atteint sa limite de requêtes, le texte source est affiché explicitement.
- « Localiser sur ma carte » : centrage sur le marqueur choisi, halo turquoise pulsant trois fois pendant environ 3 secondes, passage au-dessus des autres marqueurs.
- Conversion de coordonnées : compare les positions des repères communautaires FullSweep (pixel 3344×4820) à celles des repères homonymes GTADB (coordonnées de carte GTADB), puis ajuste une transformation affine par moindres carrés et rejette les observations aberrantes.
- Validation de sécurité : minimum 12 repères correspondants, plus de 55 % d'accords et erreur médiane inférieure à 170 unités GTADB. Sinon le fond « Plan/Atlas » n'affiche pas de marqueurs plutôt que des positions fictives. Le mode « Grille » conserve les positions FullSweep d'origine.
- Les positions, même recalées, restent des indications communautaires : les lieux particuliers doivent être confirmés par jeu.
- Les cases « trouvé », notes et export JSON conservent la même clé localStorage que les versions précédentes.

## Fonctionnement

La calibration télécharge au premier accès les repères publics de FullSweep (API CORS) et GTADB (JSON du dépôt GitHub) et enregistre seulement les coefficients calculés pendant 7 jours. Les réponses externes et leur ordre peuvent changer ; si la calibration échoue, un avertissement s'affiche avec le lien vers FullSweep. Une nouvelle ouverture/actualisation de la page relance l'essai.

La traduction des descriptions publiques utilise https://api.mymemory.translated.net/get, sans envoyer les notes privées des joueurs. Le service de traduction peut être limité, indisponible et ne garantit pas l'exactitude.

## Crédits

- Données et suivi FullSweep (CC BY 4.0) : https://fullsweepmap.com/developers/
- Repères et carte GTADB, YANIS V15 et contributeurs (CC BY 4.0) : https://map.gtadb.org et https://github.com/rolux/gtadb.org
- Licence CC BY 4.0 : https://creativecommons.org/licenses/by/4.0/

Non affilié à Rockstar Games ou Take-Two Interactive. Aucun accès aux sauvegardes Xbox / PlayStation.
