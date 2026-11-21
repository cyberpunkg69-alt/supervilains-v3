# LEONIDA TRACKER V2.4 — 21 novembre 2026

Carte interactive gratuite GTA VI avec sauvegarde de progression et flux de nouveautés.

## Nouveau : LEONIDA LIVE INTEL

- Nouveau panneau « Nouvelles découvertes » sur la page principale, avec filtres Argent, Trafic (jeu), Secrets, Véhicules, Actualités.
- Le bouton « Actualiser les découvertes » appelle une nouvelle API Render gratuite, qui lit des flux publics RSS/Atom de GTA BOOM, Rockstar INTEL, IGN, GTA6.how et de communautés Reddit dédiées.
- Le serveur conserve un cache de 15 minutes en mémoire pour limiter la charge et fonctionne uniquement quand il est sollicité ; les services Render gratuits peuvent dormir après 15 minutes d'inactivité. Leur réveil peut ralentir le premier chargement. Aucun coût supplémentaire n'a été choisi pour cette API (plan free).
- Une liste de guides sélectionnés issus de GTABase, PowerPyx, PC Gamer et de signalements Reddit reste accessible hors ligne ou en cas de blocage des flux. L'application n'annonce jamais que les flux ont été actualisés si le serveur ne répond pas.
- Les articles de médias sont étiquetés **guide externe**, les publications Reddit **signalement à confirmer**. Aucun titre ne devient un marqueur GPS automatiquement, et les méthodes pour gagner de l'argent peuvent dépendre de la version et du chapitre.
- Le bouton « Signaler un spot » prépare un lien de nouvelle issue GitHub (compte GitHub requis) avec nom, zone, catégorie, description et lien de preuve. L'utilisateur doit valider l'envoi ; ce système ne publie aucun contenu sans validation.
- Les nouvelles favorites sont incluses dans la sauvegarde existante (export/import JSON), clé locale \`leonida-tracker-state-v1\`.

## Backend

\`news_api.py\` utilise uniquement la bibliothèque standard Python, et propose :
- \`GET /health\`
- \`GET /api/discoveries\`
- \`GET /api/refresh\` (cache serveur commun de 15 min, limité sans authentification).

Service Render : https://leonida-tracker-news.onrender.com
Frontend : https://leonida-tracker-gta6.onrender.com

## Notes

Ce sont les actualités des sites et les signalements communautaires, pas un catalogue exhaustif de coordonnées vérifiées. Les emplacements cartographiques restent séparés et gardent le système de calibration V2.3.1. Les traductions des descriptions FullSweep sont conservées. L'application n'est pas affiliée à Rockstar Games.
