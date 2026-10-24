"use strict";
(() => {
  const root=document.getElementById("manu-flash-info");
  if(!root)return;
  const headline=document.getElementById("flash-headline");
  const meta=document.getElementById("flash-meta");
  const tag=document.getElementById("flash-type");
  const mute=document.getElementById("flash-sound");
  const pause=document.getElementById("flash-pause");
  const next=document.getElementById("flash-next");
  const stage=document.getElementById("flash-stage");
  const seenKey="manu-flash-seen-v1",muteKey="manu-flash-sound-v1",pauseKey="manu-flash-pause-v1";
  const templates=[
  {
    "id": "studio-01",
    "kind": "studio",
    "text": "🚨 INTERRUPTION DES PROGRAMMES : MANU vient d'entrer sur scène. La régie cherche le bouton « retour arrière »."
  },
  {
    "id": "studio-02",
    "kind": "studio",
    "text": "📡 FLASH SPÉCIAL : le cabaret confirme que MANU n'était pas prévu au programme. Le programme présente ses excuses."
  },
  {
    "id": "studio-03",
    "kind": "studio",
    "text": "🎬 DIRECT STUDIO : un projecteur refuse d'éclairer MANU. Il demande une prime de risque."
  },
  {
    "id": "studio-04",
    "kind": "studio",
    "text": "🎙️ MICRO OUVERT : MANU réclame une standing ovation. Le public a demandé des chaises."
  },
  {
    "id": "studio-05",
    "kind": "studio",
    "text": "📢 URGENT : la rédaction tente de vérifier si MANU existe vraiment. Nos experts réclament une pause."
  },
  {
    "id": "studio-06",
    "kind": "studio",
    "text": "📰 JOURNAL DE 20 H : l'actualité est calme. MANU a donc décidé de la compliquer."
  },
  {
    "id": "studio-07",
    "kind": "studio",
    "text": "🎥 ÉDITION SPÉCIALE : toutes les caméras sont braquées sur MANU. Trois demandent un droit de retrait."
  },
  {
    "id": "studio-08",
    "kind": "studio",
    "text": "📻 ALERTE ANTENNE : un bruit étrange provient des coulisses. MANU affirme qu'il répétait son entrée."
  },
  {
    "id": "studio-09",
    "kind": "studio",
    "text": "🛑 FLASH : un incident technique interrompt le spectacle. Non, c'est juste MANU qui danse."
  },
  {
    "id": "studio-10",
    "kind": "studio",
    "text": "🔴 EN DIRECT : le présentateur garde son sérieux devant MANU. C'est désormais un exploit homologué."
  },
  {
    "id": "fashion-01",
    "kind": "fashion",
    "text": "👑 MODE : MANU lance une nouvelle collection. La dignité n'est pas vendue avec."
  },
  {
    "id": "fashion-02",
    "kind": "fashion",
    "text": "💄 BEAUTÉ : le miroir de MANU vient de déposer une demande de congés."
  },
  {
    "id": "fashion-03",
    "kind": "fashion",
    "text": "👠 DÉFILÉ : MANU réclame un tapis rouge. La moquette négocie une prime."
  },
  {
    "id": "fashion-04",
    "kind": "fashion",
    "text": "🪮 COIFFURE : la perruque de MANU souhaite être créditée comme artiste principale."
  },
  {
    "id": "fashion-05",
    "kind": "fashion",
    "text": "✨ PAILLETTES : le cabaret annonce un risque élevé d'éblouissement et de mauvais goût."
  },
  {
    "id": "fashion-06",
    "kind": "fashion",
    "text": "🕶️ LOOK : MANU porte des lunettes de star. Les stars demandent une enquête."
  },
  {
    "id": "fashion-07",
    "kind": "fashion",
    "text": "👗 HAUTE COUTURE : la nouvelle tenue de MANU provoque une réunion de crise chez les stylistes."
  },
  {
    "id": "fashion-08",
    "kind": "fashion",
    "text": "💅 MANUCURE : les ongles de MANU réclament leur propre agent artistique."
  },
  {
    "id": "fashion-09",
    "kind": "fashion",
    "text": "🎀 ACCESSOIRES : MANU a perdu son nœud papillon. Le nœud refuse de revenir."
  },
  {
    "id": "fashion-10",
    "kind": "fashion",
    "text": "💋 MAQUILLAGE : le rouge à lèvres de MANU a été aperçu à la frontière. Il fuit."
  },
  {
    "id": "enquete-01",
    "kind": "enquete",
    "text": "🕵️ ENQUÊTE : qui a autorisé MANU à monter sur scène ? Aucun témoin ne veut témoigner."
  },
  {
    "id": "enquete-02",
    "kind": "enquete",
    "text": "📂 DOSSIER MANU : la police du bon goût annonce une surveillance renforcée du cabaret."
  },
  {
    "id": "enquete-03",
    "kind": "enquete",
    "text": "🔎 RÉVÉLATION : derrière le rideau se cache un secret. C'est encore MANU."
  },
  {
    "id": "enquete-04",
    "kind": "enquete",
    "text": "🚔 ALERTE : une perruque a été retrouvée sans propriétaire. Elle nie connaître MANU."
  },
  {
    "id": "enquete-05",
    "kind": "enquete",
    "text": "📜 PROCÈS-VERBAL : MANU est soupçonné d'abus de poses dramatiques."
  },
  {
    "id": "enquete-06",
    "kind": "enquete",
    "text": "🧾 PREUVES : les paillettes retrouvées sur place auraient tenté de prendre la fuite."
  },
  {
    "id": "enquete-07",
    "kind": "enquete",
    "text": "🧑‍⚖️ VERDICT : le tribunal du cabaret condamne MANU à une deuxième entrée sur scène."
  },
  {
    "id": "enquete-08",
    "kind": "enquete",
    "text": "🔐 CONFIDENTIEL : le coffre de MANU ne contient qu'un miroir et de l'optimisme."
  },
  {
    "id": "enquete-09",
    "kind": "enquete",
    "text": "🧭 INVESTIGATION : les experts recherchent le sens de l'orientation de MANU. Il a pris la scène pour une piste de danse."
  },
  {
    "id": "enquete-10",
    "kind": "enquete",
    "text": "🚨 AVIS AU PUBLIC : signalement d'un excès de glamour non déclaré dans le secteur."
  },
  {
    "id": "science-01",
    "kind": "science",
    "text": "🔬 SCIENCE : les chercheurs confirment que MANU génère davantage de paillettes que de réponses."
  },
  {
    "id": "science-02",
    "kind": "science",
    "text": "🧪 LABORATOIRE : une expérience sur le charisme de MANU vient de produire un nuage de fumée."
  },
  {
    "id": "science-03",
    "kind": "science",
    "text": "📊 STATISTIQUES : 9 spectateurs sur 10 ont une question. Le dixième s'est enfui."
  },
  {
    "id": "science-04",
    "kind": "science",
    "text": "🛰️ MÉTÉO SPATIALE : la couronne de MANU a été repérée depuis l'orbite."
  },
  {
    "id": "science-05",
    "kind": "science",
    "text": "🌡️ ALERTE CANICULE : la température monte dans le cabaret. MANU a encore activé le ventilateur à cheveux."
  },
  {
    "id": "science-06",
    "kind": "science",
    "text": "🧠 ÉTUDE : le cerveau de MANU pense déjà au rappel. Le spectacle n'a pas commencé."
  },
  {
    "id": "science-07",
    "kind": "science",
    "text": "⚗️ RECHERCHE : mélange de strass et de mauvais goût détecté à proximité de la scène."
  },
  {
    "id": "science-08",
    "kind": "science",
    "text": "📡 OBSERVATOIRE : un objet brillant approche à grande vitesse. Il s'agit du sac à main de MANU."
  },
  {
    "id": "science-09",
    "kind": "science",
    "text": "🧬 DÉCOUVERTE : les scientifiques isolent le gène de la diva. MANU demande les droits d'auteur."
  },
  {
    "id": "science-10",
    "kind": "science",
    "text": "🌪️ VIGILANCE : rafales de paillettes attendues. Rentrez les perruques et les plantes fragiles."
  },
  {
    "id": "culture-01",
    "kind": "culture",
    "text": "🎭 CRITIQUE : la performance de MANU est qualifiée d'inoubliable. Pas forcément dans le bon sens."
  },
  {
    "id": "culture-02",
    "kind": "culture",
    "text": "🎶 MUSIQUE : MANU prépare un album solo. Les instruments demandent un délai de réflexion."
  },
  {
    "id": "culture-03",
    "kind": "culture",
    "text": "🎨 ART MODERNE : une photo de MANU a été confondue avec une performance conceptuelle."
  },
  {
    "id": "culture-04",
    "kind": "culture",
    "text": "🎟️ BILLETTERIE : un spectateur a acheté deux places pour vérifier qu'il n'avait pas rêvé."
  },
  {
    "id": "culture-05",
    "kind": "culture",
    "text": "🩰 DANSE : MANU invente un nouveau pas. Les chorégraphes demandent un plan d'évacuation."
  },
  {
    "id": "culture-06",
    "kind": "culture",
    "text": "🏆 PALMARÈS : MANU remporte le prix du regard le plus dramatique dans une pièce vide."
  },
  {
    "id": "culture-07",
    "kind": "culture",
    "text": "🎹 CONSERVATOIRE : le piano du cabaret veut être accordé à quelqu'un d'autre."
  },
  {
    "id": "culture-08",
    "kind": "culture",
    "text": "🎤 CHANT : le micro a survécu au dernier solo de MANU. Un hommage est prévu."
  },
  {
    "id": "culture-09",
    "kind": "culture",
    "text": "🎞️ CINÉMA : MANU exige son gros plan. Le réalisateur propose plutôt un plan très large."
  },
  {
    "id": "culture-10",
    "kind": "culture",
    "text": "🪩 DISCO : la boule à facettes démissionne. MANU lui faisait trop de concurrence."
  },
  {
    "id": "bid-01",
    "kind": "bid",
    "text": "💰 ÉDITION SPÉCIALE : {name} propulse MANU à {amount}. Le marché cherche une explication."
  },
  {
    "id": "bid-02",
    "kind": "bid",
    "text": "🔨 DERNIÈRE MINUTE : {name} vient d'offrir {amount}. Les experts parlent d'un geste inexpliqué."
  },
  {
    "id": "bid-03",
    "kind": "bid",
    "text": "📈 ALERTE BOURSE : MANU grimpe à {amount}. Aucun économiste n'ose commenter."
  },
  {
    "id": "bid-04",
    "kind": "bid",
    "text": "🏦 FINANCE : après l'offre de {name}, la valeur de MANU atteint {amount}. Même la banque rit."
  },
  {
    "id": "bid-05",
    "kind": "bid",
    "text": "⚠️ VIGILANCE ENCHÈRES : {name} a misé {amount}. Le bon sens reste introuvable."
  },
  {
    "id": "bid-06",
    "kind": "bid",
    "text": "🎙️ CONFÉRENCE DE PRESSE : {name} assume son offre de {amount}. La salle retient son souffle."
  },
  {
    "id": "bid-07",
    "kind": "bid",
    "text": "🧮 CALCUL : {amount} pour MANU. Nos comptables réclament une seconde vérification."
  },
  {
    "id": "bid-08",
    "kind": "bid",
    "text": "📊 BAROMÈTRE : l'audace de {name} vient de franchir un nouveau seuil à {amount}."
  },
  {
    "id": "bid-09",
    "kind": "bid",
    "text": "🚨 SURENCHÈRE : {name} frappe fort avec {amount}. La perruque de MANU applaudit."
  },
  {
    "id": "bid-10",
    "kind": "bid",
    "text": "🎬 REBONDISSEMENT : la meilleure offre atteint {amount}. MANU prépare déjà son discours."
  },
  {
    "id": "crowd-01",
    "kind": "crowd",
    "text": "📣 LE PUBLIC S'EMBALLE : {name} mène actuellement la danse avec {amount}."
  },
  {
    "id": "crowd-02",
    "kind": "crowd",
    "text": "👥 MOBILISATION : {players} participant(s) suivent la vente. Aucun ne semble prêt à sauver MANU."
  },
  {
    "id": "crowd-03",
    "kind": "crowd",
    "text": "📻 RADIO CABARET : {count} offre(s) au compteur. MANU demande une édition collector de lui-même."
  },
  {
    "id": "crowd-04",
    "kind": "crowd",
    "text": "🥁 SUSPENSE : {name} est devant. La concurrence prépare-t-elle un retour spectaculaire ?"
  },
  {
    "id": "crowd-05",
    "kind": "crowd",
    "text": "🧑‍💼 ANALYSE : {players} curieux réunis pour une pièce unique. L'expression « pièce unique » est confirmée."
  },
  {
    "id": "crowd-06",
    "kind": "crowd",
    "text": "🏁 COURSE EN TÊTE : {name} possède provisoirement l'offre de {amount}."
  },
  {
    "id": "crowd-07",
    "kind": "crowd",
    "text": "🗞️ TITRE DU JOUR : {count} mise(s) et toujours aucune livraison de MANU prévue."
  },
  {
    "id": "crowd-08",
    "kind": "crowd",
    "text": "🎉 AMBIANCE : le chat s'active pendant que {name} tient la meilleure offre."
  },
  {
    "id": "crowd-09",
    "kind": "crowd",
    "text": "🔔 LE CABARET RETIENT SON SOUFFLE : la dernière offre est de {amount}."
  },
  {
    "id": "crowd-10",
    "kind": "crowd",
    "text": "🎯 OBJECTIF FOU : battre l'offre de {name} sans perdre son sens de l'humour."
  },
  {
    "id": "first-01",
    "kind": "first",
    "text": "🥱 ALERTE CALME PLAT : zéro offre pour MANU. Même le marteau du commissaire dort."
  },
  {
    "id": "first-02",
    "kind": "first",
    "text": "📉 MARCHÉ À L'ARRÊT : MANU attend sa première enchère. Le suspense est presque insoutenable."
  },
  {
    "id": "first-03",
    "kind": "first",
    "text": "📰 EN UNE : personne n'a encore osé miser sur MANU. La rédaction comprend pourquoi."
  },
  {
    "id": "first-04",
    "kind": "first",
    "text": "🎟️ URGENT : première offre recherchée. Récompense : la gloire et des confettis."
  },
  {
    "id": "first-05",
    "kind": "first",
    "text": "🕰️ COMPTE À REBOURS : MANU répète déjà son discours de victoire, sans aucun candidat."
  },
  {
    "id": "first-06",
    "kind": "first",
    "text": "📣 APPEL AU PEUPLE : un euro suffirait à lancer l'aventure. MANU se recoiffe."
  },
  {
    "id": "first-07",
    "kind": "first",
    "text": "🚨 LA SALLE EST SILENCIEUSE : la couronne de MANU entendrait presque les mouches voler."
  },
  {
    "id": "first-08",
    "kind": "first",
    "text": "🎭 DERNIÈRE MINUTE : l'absence d'offre devient elle-même une attraction du cabaret."
  },
  {
    "id": "first-09",
    "kind": "first",
    "text": "📻 RADIO MANU : aucune enchère au programme. Nous diffusons le bruit du vent."
  },
  {
    "id": "first-10",
    "kind": "first",
    "text": "🏷️ MISE À PRIX : MANU commence à 1 €. Personne ne vérifie ses poches."
  },
  {
    "id": "pause-01",
    "kind": "pause",
    "text": "⏳ ÉDITION PATIENCE : les enchères font une pause. MANU en profite pour refaire sa coiffure."
  },
  {
    "id": "pause-02",
    "kind": "pause",
    "text": "🧘 FLASH DÉTENTE : le cabaret respire entre deux offres. Même les paillettes se reposent."
  },
  {
    "id": "pause-03",
    "kind": "pause",
    "text": "🥁 SILENCE RADIO : le commissaire-priseur attend le prochain coup de théâtre."
  },
  {
    "id": "pause-04",
    "kind": "pause",
    "text": "☕ PAUSE CAFÉ : le marché de MANU observe une mystérieuse accalmie."
  },
  {
    "id": "pause-05",
    "kind": "pause",
    "text": "📰 POINT DE SITUATION : pas de nouvelle offre récemment. MANU vérifie sa popularité."
  },
  {
    "id": "pause-06",
    "kind": "pause",
    "text": "🚦 CIRCULATION FLUIDE : aucun embouteillage au guichet des enchères."
  },
  {
    "id": "pause-07",
    "kind": "pause",
    "text": "🎼 INTERMÈDE : l'orchestre joue pendant que les enchérisseurs affûtent leurs arguments."
  },
  {
    "id": "pause-08",
    "kind": "pause",
    "text": "📡 ÉMISSION SPÉCIALE : la salle attend. MANU reste persuadé qu'on négocie en coulisses."
  },
  {
    "id": "pause-09",
    "kind": "pause",
    "text": "🕯️ SUSPENSE TOTAL : même le micro hésite à faire du bruit avant la prochaine mise."
  },
  {
    "id": "pause-10",
    "kind": "pause",
    "text": "🪞 DERNIER FLASH : MANU consulte son miroir. Le miroir refuse toute projection."
  },
  {
    "id": "milestone-01",
    "kind": "milestone",
    "text": "💎 SEUIL SYMBOLIQUE : {amount} ! MANU exige désormais une loge avec baignoire à paillettes."
  },
  {
    "id": "milestone-02",
    "kind": "milestone",
    "text": "📈 RECORD DU CABARET : {amount}. La direction demande si l'on peut assurer une perruque."
  },
  {
    "id": "milestone-03",
    "kind": "milestone",
    "text": "🛑 ALERTE VALEUR : MANU atteint {amount}. Le service comptable appelle sa mère."
  },
  {
    "id": "milestone-04",
    "kind": "milestone",
    "text": "🏆 PALIER FRANCHI : {name} porte la légende de MANU jusqu'à {amount}."
  },
  {
    "id": "milestone-05",
    "kind": "milestone",
    "text": "🚀 DÉCOLLAGE : la cote de MANU grimpe à {amount}. Houston, nous avons un problème de glamour."
  },
  {
    "id": "milestone-06",
    "kind": "milestone",
    "text": "👑 NIVEAU DIVA SUPÉRIEUR : à {amount}, MANU réclame une couronne plus grande."
  },
  {
    "id": "milestone-07",
    "kind": "milestone",
    "text": "🎯 OBJECTIF DÉPASSÉ : {amount} pour une star qui n'était même pas sur le catalogue."
  },
  {
    "id": "milestone-08",
    "kind": "milestone",
    "text": "💄 BUDGET MAQUILLAGE : MANU réclame une augmentation après avoir découvert l'offre de {amount}."
  },
  {
    "id": "milestone-09",
    "kind": "milestone",
    "text": "📰 DERNIÈRE MINUTE : {name} met {amount}. Le trône de MANU demande une expertise."
  },
  {
    "id": "milestone-10",
    "kind": "milestone",
    "text": "🎺 FANFARE : le seuil de {amount} déclenche une ovation complètement injustifiée."
  }
];
  const safeGet=(key)=>{try{return localStorage.getItem(key)}catch{return null}};
  const safeSet=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
  const availableKinds=new Set(["studio","fashion","enquete","science","culture"]);
  let lastIds=[],current=null,previousAmount=null,lastBidCount=0,lastDate=0;
  let currentState={amount:0,leader:"",participants:0,count:0,status:"open"};
  let lastFlash=0,timerId=null;
  let soundOn=safeGet(muteKey)==="yes";
  let paused=safeGet(pauseKey)==="yes";
  const loadHistory=()=>{
    try {
      const data=JSON.parse(safeGet(seenKey)||"[]");
      if(Array.isArray(data))lastIds=data.filter(v=>typeof v==="string").slice(-90);
    }catch{lastIds=[]}
  };
  loadHistory();
  const fmt=new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0});
  const escapeLabel=value=>String(value||"Un participant").slice(0,24);
  const dateText=()=>new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  const context=()=>{
    const n=Number.isFinite(currentState.amount)?currentState.amount:0;
    return {
      name:escapeLabel(currentState.leader),
      amount:fmt.format(n)+" €",
      players:fmt.format(currentState.participants||0),
      count:fmt.format(currentState.count||0)
    };
  };
  const activeKinds=()=>{
    const kinds=new Set(availableKinds);
    if(currentState.count===0||currentState.amount===0)kinds.add("first");
    if(currentState.amount>0) {
      kinds.add("bid");
      kinds.add("crowd");
      if(currentState.amount>=25)kinds.add("milestone");
      if(lastDate>0 && Date.now()-lastDate>180000)kinds.add("pause");
    }
    return kinds;
  };
  const pick=(preferred)=>{
    const allowed=activeKinds();
    const pool=templates.filter(x=>allowed.has(x.kind));
    // Jamais deux fois la même annonce tant que l'historique dispose d'alternatives.
    const recent=new Set(lastIds.slice(-85));
    const unused=pool.filter(x=>!recent.has(x.id));
    const priority=unused.filter(x=>preferred.includes(x.kind));
    const candidates=priority.length?priority:unused.length?unused:
      pool.sort((a,b)=>lastIds.indexOf(a.id)-lastIds.indexOf(b.id)).slice(0,10);
    return candidates[Math.floor(Math.random()*candidates.length)];
  };
  const playSting=()=>{
    if(!soundOn||document.visibilityState!=="visible")return;
    try {
      const AudioEngine=window.AudioContext||window.webkitAudioContext;
      if(!AudioEngine)return;
      const ac=new AudioEngine();
      if(ac.state==="suspended")ac.resume().catch(()=>{});
      const now=ac.currentTime;
      [440,554.37,659.25].forEach((hz,i)=>{
        const oscillator=ac.createOscillator(),gain=ac.createGain();
        oscillator.type="sine";oscillator.frequency.value=hz;
        gain.gain.setValueAtTime(0.0001,now+i*.14);
        gain.gain.exponentialRampToValueAtTime(.025,now+i*.14+.018);
        gain.gain.exponentialRampToValueAtTime(.0001,now+i*.14+.13);
        oscillator.connect(gain);gain.connect(ac.destination);
        oscillator.start(now+i*.14);oscillator.stop(now+i*.14+.14);
      });
      setTimeout(()=>ac.close().catch(()=>{}),850);
    }catch{}
  };
  const flash=(preferred=[],force=false)=>{
    if(paused||document.visibilityState!=="visible")return;
    if(!force&&Date.now()-lastFlash<20000)return;
    const choice=pick(preferred);
    if(!choice)return;
    const values=context();
    const line=choice.text.replace(/\{(name|amount|players|count)\}/g,(_,key)=>values[key]);
    headline.textContent=line;
    meta.textContent="ÉDITION SPÉCIALE · "+dateText();
    tag.textContent=preferred.includes("bid")?"🔨 SURENCHÈRE":preferred.includes("milestone")?"💎 RECORD":"🔴 FLASH INFO";
    current=choice;
    lastIds.push(choice.id);lastIds=lastIds.slice(-90);
    safeSet(seenKey,JSON.stringify(lastIds));
    lastFlash=Date.now();
    root.classList.remove("flash-pop");void root.offsetWidth;root.classList.add("flash-pop");
    playSting();
    schedule();
  };
  function schedule(){
    if(timerId)clearTimeout(timerId);
    const delay=105000+Math.floor(Math.random()*55000);
    timerId=setTimeout(()=>flash(),delay);
  }
  const milestoneLines=[
    name => "🚨 FLASH INFO : la vanne de "+name+" atteint 5 réactions ! MANU convoque une réunion d'urgence.",
    name => "😂 ALERTE CABARET : 5 réactions pour "+name+" ! Le service de communication de MANU est en panique.",
    name => "👑 ÉDITION SPÉCIALE : "+name+" déclenche 5 réactions. MANU exige le droit de réponse.",
    name => "📺 COUP DE THÉÂTRE : 5 personnes réagissent à "+name+" ! MANU consulte ses avocats du rire.",
    name => "🎙️ FLASH : le commentaire de "+name+" passe le cap des 5 réactions. La couronne de MANU vacille.",
    name => "📰 INFO EXCLUSIVE : "+name+" atteint 5 réactions. MANU réfute les accusations de mauvais goût.",
    name => "💥 TROLL ALERT : 5 réactions pour "+name+" ! Une équipe cherche MANU derrière les rideaux.",
    name => "🔴 DERNIÈRE MINUTE : "+name+" décroche 5 réactions. MANU réclame une pause coiffure."
  ];
  window.addEventListener("manu:chat-reaction-milestone",event=>{
    if(paused||document.visibilityState!=="visible")return;
    const data=event.detail||{};
    const name=String(data.nickname||"un troll").slice(0,24);
    const choice=milestoneLines[Math.floor(Math.random()*milestoneLines.length)];
    headline.textContent=choice(name);
    meta.textContent="ÉDITION SPÉCIALE · "+dateText();
    tag.textContent="😂 TROLL ALERT · 5 RÉACTIONS";
    lastFlash=Date.now();
    root.classList.remove("flash-pop");void root.offsetWidth;root.classList.add("flash-pop");
    playSting();schedule();
  });
  const paintButtons=()=>{
    mute.textContent=soundOn?"🔊 Son activé":"🔇 Son coupé";
    mute.setAttribute("aria-pressed",String(soundOn));
    pause.textContent=paused?"▶️ Reprendre":"⏸️ Pause";
    pause.setAttribute("aria-pressed",String(paused));
    stage.textContent=paused?"FLASH INFO EN PAUSE":"ANTENNE DU CABARET · EN DIRECT";
  };
  const applyUpdate=(data)=>{
    const amount=Number(data.current_bid)||0,count=Number(data.bid_count)||0;
    const isFirst=previousAmount===null;
    const rise=!isFirst&&amount>previousAmount;
    const change=!isFirst&&count>lastBidCount;
    const nextDate=Date.parse(data.updated_at||"");
    if(Number.isFinite(nextDate))lastDate=nextDate;
    currentState={
      amount,
      leader:String(data.leader||""),
      participants:Number(data.participant_count)||0,
      count,
      status:String(data.status||"open")
    };
    previousAmount=amount;lastBidCount=count;
    if(isFirst){flash(["studio","first"],true);return}
    if(rise||change){
      // L'annonce liée à l'offre respecte une fréquence minimale.
      const groups=amount>=25&&count%5===0?["milestone","bid"]:["bid","crowd"];
      flash(groups);
    }
  };
  window.addEventListener("manu:auction-update",event=>{
    if(event.detail&&typeof event.detail==="object")applyUpdate(event.detail);
  });
  mute.addEventListener("click",()=>{
    soundOn=!soundOn;safeSet(muteKey,soundOn?"yes":"no");
    paintButtons();
    // Geste utilisateur pour débloquer le contexte audio dans Safari/Chrome.
    if(soundOn)playSting();
  });
  pause.addEventListener("click",()=>{
    paused=!paused;safeSet(pauseKey,paused?"yes":"no");paintButtons();
    if(!paused)flash([],true);
    else if(timerId){clearTimeout(timerId);timerId=null}
  });
  next.addEventListener("click",()=>flash([],true));
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"&&!paused){
      if(Date.now()-lastFlash>120000)flash([],true);
      else schedule();
    }else if(timerId){clearTimeout(timerId);timerId=null}
  });
  window.addEventListener("storage",e=>{
    if(e.key===seenKey)loadHistory();
  });
  paintButtons();
  // Afficher une annonce locale même si la salle d'enchères n'est pas connectée.
  setTimeout(()=>{if(!current&&!paused)flash(["studio","first"],true)},1500);
})();
