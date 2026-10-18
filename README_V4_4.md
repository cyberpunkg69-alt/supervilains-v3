# SUPERVILAINS V4.4 — ATELIER D'AMÉLIORATIONS

La boutique SOLO est devenue un atelier avec quatre équipements permanents, en plus des deux consommables existants.

## Équipements

| Équipement | Progression | Effet réel | Coût du prochain niveau |
| --- | --- | --- | --- |
| Réacteur évolutif | 0 à 33 améliorations, de 35 à 200 ⚡ | +5 capacité par achat ; recharge de 45 s à 36 s (100 ⚡), 29 s (150 ⚡), puis 22,5 s (200 ⚡) | 190 + 100 × améliorations achetées |
| Scanner radar | 0 à 3, déblocage agent niv. 2 | Écarte 1 à 3 fausses pistes avant une recherche sans modifier les 5 essais ; ne révèle jamais la cible | 360 + 250 × niveau scanner |
| Filets renforcés | 0 à 5, déblocage agent niv. 3 | +3 points de probabilité de capture par niveau, plafond 97 % | 330 + 260 × niveau filets |
| Bouclier d'agent | 0 à 5, déblocage agent niv. 4 | Réduit de 1 point par niveau les dégâts à ton bouclier lors des contre-attaques | 390 + 260 × niveau bouclier |

Les améliorations permanentes coûtent des pièces du mode solo. Les packs de 3 filets (90 pièces) et de 20 énergies (55 pièces) sont inchangés.

## Sauvegardes et compatibilité

- Clé locale originale conservée : `supervilains_operation_minuit_v3_meme`.
- Sauvegardes version 1 et version 3 acceptées.
- Nouveau champ `equipment` ajouté sans réinitialiser le reste (missions, captures, succès, pièces, failles, équipement préexistant).
- Les huit améliorations anciennes de la batterie sont conservées ; l'ancien plafond de 75 ⚡ est supprimé.
- Images et voix approuvées des six personnages conservées.
- L'ARÈNE et Supabase restent indépendants : aucun bonus SOLO ne modifie les scores compétitifs.

## Tests effectués

Vérification de la syntaxe JavaScript, des éléments de l'interface, des achats à tous niveaux, des niveaux maximums, des faux signaux filtrés (0 à 3), du plafond des 5 essais, des bonus de capture et de bouclier, ainsi que de la récupération d'une sauvegarde ancienne.
