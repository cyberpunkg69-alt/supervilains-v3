# MANU aux enchères — cabaret de l'impossible 🎭

Mini-site humoristique public, isolé dans le dossier \`enchere-manu/\` pour ne pas modifier le jeu SUPERVILAINS.

## Le jeu
- Mise à prix : **1 € fictif**.
- Tous les visiteurs peuvent proposer un pseudo, enchérir et voir la meilleure offre.
- Les propositions sont enregistrées sur le serveur Supabase et affichées par actualisation automatique toutes les 3 secondes.
- Historique des 12 dernières offres et nombre de participants uniques (par session).
- Aucun compte, aucun paiement, aucune valeur monétaire. **Personne n'est réellement à vendre.**
- Le serveur verrouille la ligne d'enchère lors de chaque proposition pour garantir qu'une seule meilleure offre soit acceptée à la fois.
- Délai de 3 secondes par session, plafond de +1 000 € fictifs par offre ; maximum global 99 999 € fictifs.

## Architecture
- Interface : GitHub Pages, fichiers HTML/CSS/JS statiques.
- API publique : Supabase Edge Function \`manu-encheres\`.
- Tables dédiées : \`public.manu_auction_state\` et \`public.manu_auction_bids\`.
- Fonction PostgreSQL : \`public.manu_auction_place_bid\`, appelée uniquement avec rôle serveur.
- Aucune clé privée dans le navigateur. Les empreintes des sessions d'enchère sont hachées côté serveur.
- Protection de base contre les surenchères concurrentes et le clic répété. Ce jeu anonyme reste vulnérable aux abus déterminés ; ce n'est pas une plateforme financière ni un système de loterie.

## Administration (depuis l'éditeur SQL Supabase du propriétaire)

Fermer les enchères :
\`\`\`sql
update public.manu_auction_state set status = 'closed' where id = 1;
\`\`\`

Rouvrir :
\`\`\`sql
update public.manu_auction_state set status = 'open' where id = 1;
\`\`\`

Remettre à zéro (efface toutes les anciennes offres) :
\`\`\`sql
begin;
delete from public.manu_auction_bids;
update public.manu_auction_state
  set current_bid = 0, leader = null, bid_count = 0, participant_count = 0,
      updated_at = now(), status = 'open'
  where id = 1;
commit;
\`\`\`

## Hébergement
Le dossier est servi sur GitHub Pages à l'adresse :
https://cyberpunkg69-alt.github.io/supervilains-v3/enchere-manu/

Note : le site réalise une **vente fictive et comique entre amis**. Aucun achat, paiement, réservation ni transfert de personne.
