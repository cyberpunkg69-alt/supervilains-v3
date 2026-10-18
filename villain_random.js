/* SUPERVILAINS V4.6 — Générateur de fiches 100 % local, sans coût IA.
   La photo, les sauvegardes et la case de consentement restent intactes. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const pick=items=>items[Math.floor(Math.random()*items.length)];
const names=["GASTON","BRIGITTE","KÉVIN","MONIQUE","PATRICK","JOSIANE","RAYMOND","MIREILLE","JÉRÔME","CHANTAL","BERNARD","NADINE","MARCEL","COLETTE","GILBERT","CÉLINE","JEAN-MICHEL","MARIE-LOUISE","PASCAL","MARTINE","ROGER","SOPHIE","ROLAND","CORINNE","DIDIER","VÉRONIQUE","THIERRY","ODILE","FABIEN","BERNADETTE"];
const twists=[
  "Ses plans échouent toujours à cause d'un détail parfaitement ridicule.",
  "Il prétend diriger une organisation secrète depuis son canapé.",
  "Son dossier est classé « dangereux pour les nerfs » par le commissariat.",
  "Il collectionne les trophées dont personne ne veut.",
  "Il a juré de devenir célèbre pour les pires raisons possibles.",
  "Son rire maléfique ressemble étrangement au bruit d'une bouilloire.",
  "Il se proclame génie du mal, mais son entourage n'est pas convaincu.",
  "Même les autres super-vilains refusent de participer à ses réunions."
];
const themes=[
 {alias:"Le Baron des Chaussettes",weakness:"Une paire de chaussettes parfaitement assorties",object:"Chaussettes rayées",district:"Buanderie Interdite",description:"Fait disparaître les chaussettes gauches pour semer le désespoir chez les habitants.",wanted:"A organisé une contrebande de chaussettes orphelines dans une laverie automatique.",intro:"Aucune chaussette ne m'échappera !",taunt:"Tu n'es même pas capable de retrouver ton autre chaussette !",capture:"Non ! Pas les chaussettes assorties !",voice:"comique",danger:2},
 {alias:"La Terreur du Wi-Fi",weakness:"Un câble Ethernet qui fonctionne du premier coup",object:"Câble Ethernet",district:"Réseau Fantôme",description:"Désactive le Wi-Fi exactement au moment crucial des parties en ligne.",wanted:"A remplacé tous les mots de passe Wi-Fi du quartier par « motdepasse123 ».",intro:"Le réseau est à moi ! Vous allez tous perdre une barre !",taunt:"Tu captes moins bien que mon grille-pain !",capture:"Laissez-moi au moins finir mon téléchargement !",voice:"autoritaire",danger:4},
 {alias:"Le Dictateur du Réveil",weakness:"Une grasse matinée sans alarme",object:"Réveil cassé",district:"Rue du Grand Sommeil",description:"Programme des alarmes à cinq heures du matin et se croit maître du temps.",wanted:"A avancé tous les réveils municipaux de trois heures avant un lundi férié.",intro:"Debout, bande de dormeurs ! Je contrôle les horaires !",taunt:"Tu te bats comme quelqu'un qui a raté son réveil !",capture:"Encore cinq minutes, je vous en supplie !",voice:"grave",danger:3},
 {alias:"La Reine des Fautes",weakness:"Une page du Bescherelle",object:"Bescherelle",district:"Impasse de l'Orthographe",description:"Réécrit toutes les pancartes de la ville en faisant dix fautes par ligne.",wanted:"A supprimé les accents et remplacé les virgules par des emojis.",intro:"Je sui le méyeur méchan de la vile !",taunt:"Ta défète sera historik !",capture:"Je reconnais mes ereurs... enfin peut-être !",voice:"comique",danger:3},
 {alias:"Le Seigneur du Fromage",weakness:"Un morceau de fromage sans odeur",object:"Fromage frais",district:"Cave des Mille Odeurs",description:"Collectionne des fromages douteux et prétend que ce sont des armes secrètes.",wanted:"A déclenché trois évacuations avec une raclette clandestine.",intro:"Mon empire sent la victoire !",taunt:"Tu vas fondre comme du camembert au soleil !",capture:"Non ! Ils ont confisqué ma raclette !",voice:"grave",danger:4},
 {alias:"La Tornade du Karaoké",weakness:"Un microphone débranché",object:"Microphone muet",district:"Scène du Désastre",description:"Transforme les chansons populaires en sirènes d'alerte grâce à ses fausses notes.",wanted:"A terrorisé vingt-six voisins avec une reprise de karaoké à quatre heures du matin.",intro:"Vous allez entendre mon plus grand tube !",taunt:"Même mes fausses notes te font trembler !",capture:"Laissez-moi chanter le dernier refrain !",voice:"theatral",danger:3},
 {alias:"Le Fantôme des Frites",weakness:"Une salade verte sans sauce",object:"Salade verte",district:"Fast-Food Hanté",description:"Surgit derrière les clients pour voler une seule frite dans chaque barquette.",wanted:"A dévalisé les sauces ketchup de tous les restaurants de Néo-City.",intro:"Les frites sont mon trésor !",taunt:"Tu es aussi mou qu'une frite froide !",capture:"Pas la salade ! Je préfère la prison !",voice:"comique",danger:2},
 {alias:"Le Prince des Télécommandes",weakness:"Une télécommande sans piles",object:"Piles usées",district:"Salon de la Panique",description:"Change de chaîne en plein suspense et fait disparaître les télécommandes.",wanted:"A programmé toutes les télévisions de la ville sur une chaîne de téléachat.",intro:"Je choisis ce que vous regardez !",taunt:"Tu as raté le meilleur passage, dommage !",capture:"Rendez-moi la télécommande universelle !",voice:"autoritaire",danger:3},
 {alias:"La Diva du Selfie",weakness:"Un appareil photo sans filtre",object:"Miroir grossissant",district:"Boulevard des Filtres",description:"Fait poser ses victimes pendant des heures pour obtenir l'angle parfait.",wanted:"A bloqué un carrefour entier pour prendre trois cents selfies identiques.",intro:"Silence, c'est mon meilleur profil !",taunt:"Même ton mode portrait te refuse !",capture:"Attendez, je ne suis pas photogénique avec les menottes !",voice:"theatral",danger:2},
 {alias:"Le Trafiquant de Croissants",weakness:"Un pain au chocolat trop croustillant",object:"Pain au chocolat",district:"Boulangerie Clandestine",description:"Installe des pièges à miettes et rêve de gouverner toutes les boulangeries.",wanted:"A caché une carte du trésor dans la dernière baguette du village.",intro:"À moi la dernière viennoiserie !",taunt:"Je vais te rouler dans la farine !",capture:"Non ! Mes croissants ne survivront pas sans moi !",voice:"diabolique",danger:4},
 {alias:"Le Pirate des Notifications",weakness:"Le mode avion activé",object:"Téléphone en mode avion",district:"Avenue des Écrans",description:"Envoie des alertes inutiles toutes les neuf secondes pour déconcentrer ses ennemis.",wanted:"A envoyé le message « coucou » à toute la ville mille fois de suite.",intro:"Ding ! Nouvelle notification maléfique !",taunt:"Je viens encore d'envahir ton écran !",capture:"Qui va envoyer les rappels maintenant ?!",voice:"froid",danger:4},
 {alias:"Le Maître du Parapluie",weakness:"Une journée de grand soleil",object:"Parasol",district:"Place de l'Averse",description:"Ouvre un parapluie à l'intérieur et annonce de faux orages chaque matin.",wanted:"A provoqué une panique météo en annonçant de la pluie dans un sous-sol.",intro:"Mon nuage personnel va tous vous tremper !",taunt:"Même la météo ne veut pas de toi !",capture:"Non ! Je vais devoir sortir sans parapluie !",voice:"grave",danger:2},
 {alias:"La Sorcière du Chargeur",weakness:"Une batterie chargée à 100 %",object:"Batterie externe",district:"Laboratoire Débranché",description:"Débranche les téléphones à 99 % pour provoquer des disputes interminables.",wanted:"A mélangé tous les câbles USB-C d'un magasin d'électronique.",intro:"Plus que un pour cent... et vous êtes à moi !",taunt:"Tu as moins d'énergie qu'un vieux téléphone !",capture:"Une prise ! Je demande juste une prise !",voice:"diabolique",danger:4},
 {alias:"Le Gardien de la Dernière Part",weakness:"Une pizza coupée en huit parts égales",object:"Roulette à pizza",district:"Pizzeria Interdite",description:"Surveille la dernière part de pizza et refuse de partager avec quiconque.",wanted:"A organisé un faux tirage au sort pour garder tout le fromage fondu.",intro:"La dernière part m'appartient !",taunt:"Tu vas repartir avec la croûte !",capture:"Au moins donnez-moi la dernière part !",voice:"autoritaire",danger:3},
 {alias:"L'Empereur du Canapé",weakness:"Un canapé sans coussin",object:"Coussin dégonflé",district:"Palais de la Flemme",description:"Refuse de se lever et dirige ses opérations secrètes sous une couverture.",wanted:"A proclamé une grève générale contre l'obligation de se lever le dimanche.",intro:"Approchez-vous, je ne me déplacerai pas !",taunt:"Tu dépenses trop d'énergie, prends exemple sur moi !",capture:"Vous allez devoir porter le canapé aussi !",voice:"grave",danger:2},
 {alias:"Le Démon des Embouteillages",weakness:"Un feu vert permanent",object:"Feu vert miniature",district:"Rond-Point Infernal",description:"Ajoute des ronds-points invisibles et rallonge les trajets de vingt minutes.",wanted:"A remplacé tous les GPS par des instructions pour aller chercher du pain.",intro:"Tournez à gauche... non, l'autre gauche !",taunt:"Tu vas rater la sortie encore une fois !",capture:"Attendez, j'ai pris la mauvaise direction !",voice:"diabolique",danger:5},
 {alias:"La Reine des Émojis",weakness:"Un message sans aucun emoji",object:"Clavier sans emojis",district:"Réseaux du Chaos",description:"Remplace chaque phrase sérieuse par une cascade d'emojis mystérieux.",wanted:"A envoyé une lettre de démission entièrement composée de petites aubergines.",intro:"Je parle toutes les langues, surtout les emojis !",taunt:"Même ton clavier t'a abandonné !",capture:"Sans emojis, je ne peux pas exprimer ma douleur !",voice:"theatral",danger:2},
 {alias:"Le Saboteur de Lacets",weakness:"Des chaussures à scratch",object:"Chaussures à scratch",district:"Allée des Chaussures",description:"Défait les lacets juste avant le départ des sportifs amateurs.",wanted:"A noué ensemble les lacets de dix paires de baskets dans un vestiaire.",intro:"Un seul nœud et vous êtes tous perdus !",taunt:"Tu ne sais même pas faire tes lacets !",capture:"Mes lacets ! Ils me trahissent !",voice:"comique",danger:3},
 {alias:"Le Grand Voleur de Couvertures",weakness:"Une couette trop petite",object:"Petite couverture",district:"Chambre Glaciale",description:"S'empare de toute la couette pendant que ses ennemis grelottent.",wanted:"A remplacé les édredons des hôtels par des serviettes de table.",intro:"Cette couverture est mon royaume !",taunt:"Tu vas passer la nuit les pieds à l'air !",capture:"Je réclame une cellule avec une couette !",voice:"froid",danger:3},
 {alias:"La Mystérieuse du Frigo",weakness:"Un réfrigérateur parfaitement rangé",object:"Boîte hermétique",district:"Cuisine des Secrets",description:"Mange la dernière portion puis accuse un fantôme imaginaire.",wanted:"A étiqueté tous les desserts « réservé au chef maléfique ».",intro:"Personne ne touche à mon dessert !",taunt:"Tu ne sauras jamais qui a mangé le gâteau !",capture:"Mais qui va terminer les restes maintenant ?!",voice:"theatral",danger:3},
 {alias:"Le Bandit des Caddies",weakness:"Une pièce de caddie",object:"Jeton de chariot",district:"Supermarché Maudit",description:"Cache les caddies en haut des rayons et monopolise toutes les caisses rapides.",wanted:"A déclenché une course-poursuite en volant uniquement les jetons de chariot.",intro:"Ce magasin est mon terrain de jeu !",taunt:"Tu vas faire la queue jusqu'à demain !",capture:"D'accord, je rends les jetons !",voice:"autoritaire",danger:3},
 {alias:"Le Collectionneur de Moustiques",weakness:"Une moustiquaire sans trou",object:"Moustiquaire",district:"Marais des Bourdonnements",description:"Entraîne une armée de moustiques à bourdonner aux oreilles des dormeurs.",wanted:"A lâché dix-sept moustiques pendant une réunion silencieuse.",intro:"Écoutez la symphonie de mes moustiques !",taunt:"Bzzzz ! Tu ne dormiras jamais !",capture:"Ils m'ont abandonné ! Mes moustiques !",voice:"diabolique",danger:4},
 {alias:"L'Inspectrice des Biscuits",weakness:"Un paquet de biscuits vide",object:"Boîte à biscuits",district:"Atelier du Goûter",description:"Contrôle tous les goûters et prélève une taxe de trois biscuits par paquet.",wanted:"A caché les biscuits au chocolat pour ne laisser que ceux à l'avoine.",intro:"Présentez-moi vos biscuits pour inspection !",taunt:"Tu ne recevras même pas une miette !",capture:"C'est un complot contre le goûter !",voice:"autoritaire",danger:2},
 {alias:"Le Sorcier des Onglets",weakness:"Un navigateur avec un seul onglet",object:"Souris d'ordinateur",district:"Bureau des Mille Pages",description:"Ouvre deux cents onglets à chaque clic et fait disparaître les favoris.",wanted:"A remplacé tous les moteurs de recherche par une page qui dit « cherche encore ».",intro:"Une fenêtre s'ouvre, puis cent autres !",taunt:"Ton navigateur va exploser de honte !",capture:"Attendez, j'ai oublié dans quel onglet je suis !",voice:"froid",danger:4}
];
let lastKey="";
const variants=["Sans jamais demander pardon.","Avec une mauvaise foi légendaire.","Et tout ça pour impressionner ses trois abonnés.","Son seul vrai talent : compliquer ce qui est simple.","Son plan est absurde, mais il y croit à fond."];
function makeRandomProfile(){
  let theme,name,key;
  for(let tries=0;tries<12;tries++){
    theme=pick(themes);name=pick(names);key=name+"|"+theme.alias;
    if(key!==lastKey)break;
  }
  lastKey=key;
  const level=Math.max(1,Math.min(5,theme.danger+pick([-1,0,0,1])));
  const intro=theme.intro;
  const taunt=theme.taunt;
  const capture=theme.capture;
  return {
    name,alias:theme.alias,
    description:name+", alias « "+theme.alias+" », "+theme.description.charAt(0).toLowerCase()+theme.description.slice(1)+" "+pick(twists),
    weakness_label:theme.weakness,weakness_object:theme.object,
    danger_level:String(level),district:theme.district,
    wanted_reason:theme.wanted+" "+pick(variants),
    intro_line:intro,taunt_line:taunt,capture_line:capture,
    voice_type:pick([theme.voice,theme.voice,"comique","grave","theatral","froid","autoritaire","diabolique"])
  };
}
const fields={
  name:"creator-name",alias:"creator-alias",description:"creator-description",
  weakness_label:"creator-weakness",weakness_object:"creator-weakness-object",
  danger_level:"creator-danger",district:"creator-district",
  wanted_reason:"creator-wanted",voice_type:"creator-voice",
  intro_line:"creator-intro",taunt_line:"creator-taunt",capture_line:"creator-capture"
};
function randomlyFill(){
  const button=$("creator-random");
  if(!button||button.disabled)return;
  const isEditing=$("creator-save")?.textContent.includes("MODIFICATIONS");
  if(isEditing&&!window.confirm("🎲 Remplacer les textes de ce brouillon par une proposition aléatoire ? La photo et ton autorisation resteront inchangées. Rien ne sera enregistré tant que tu n'auras pas cliqué sur Enregistrer."))return;
  const profile=makeRandomProfile();
  for(const [key,id] of Object.entries(fields)){
    const input=$(id);
    if(input)input.value=profile[key];
  }
  // Ne jamais toucher au fichier, au brouillon en cours, ni au consentement.
  button.textContent="🎲 UNE AUTRE IDÉE !";
  const note=$("creator-save-status");
  if(note)note.textContent="🎲 Nouvelle fiche inventée ! Tu peux tout personnaliser. Ta photo et la case d'autorisation n'ont pas changé. Clique sur ENREGISTRER pour la sauvegarder.";
  const info=$("creator-alert");
  if(info){info.className="creator-alert good";info.textContent="✨ "+profile.name+" — "+profile.alias+" : proposition générée localement. Elle n'est pas encore enregistrée.";}
}
function start(){$("creator-random")?.addEventListener("click",randomlyFill);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();