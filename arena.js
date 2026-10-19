/* SUPERVILAINS V3 — Arène connectée à Supabase (scores validés par PostgreSQL). */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const vis=(id,yes)=>{const n=$(id);if(n)n.hidden=!yes;};
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Portraits officiels réels : ne plus afficher seulement l'objet de capture.
const HEROES=[
 ["MANU","🪥",1,"assets/manu.jpg","assets/reactions/manu_troller.gif","assets/reactions/manu_capture.gif"],
 ["LÉA","👓",2,"assets/lea.png","assets/reactions/lea_troller.gif","assets/reactions/lea_capture.gif"],
 ["NATSU","🍗",2,"assets/natsu.jpg","assets/reactions/natsu_troller.gif","assets/reactions/natsu_capture.gif"],
 ["AMÉLIE","🎤",3,"assets/amelie.jpg","assets/reactions/amelie_troller.gif","assets/reactions/amelie_capture.gif"],
 ["LUDO","📘",4,"assets/ludo.jpg","assets/reactions/ludo_troller.gif","assets/reactions/ludo_capture.gif"],
 ["ERIC","🧴",5,"assets/eric.jpg","assets/reactions/eric_troller.gif","assets/reactions/eric_capture.gif"]
];
let db=null,user=null,active=null,period="week",profile=null,loading=false,lastRefresh=0,refreshing=false;
let createdDuelCode="",inviteDuelCode=null,shareDuelCode="";
// Le créateur réutilise l'authentification existante au lieu de créer une seconde session.
window.SUPERVILAINS_GET_ARENA_CLIENT=()=>db;
const personalTargets=new Map();
window.SUPERVILAINS_SET_ARENA_CUSTOMS=roster=>{
  personalTargets.clear();
  for(const row of Array.isArray(roster)?roster:[]){
    if(row?.id&&row.portrait&&row.troll&&row.capture)personalTargets.set(String(row.id),row);
  }
  const label=$("arena-custom-roster");
  if(label)label.textContent=personalTargets.size
    ?"🦹 "+personalTargets.size+" méchant"+(personalTargets.size>1?"s":"")+" personnel"+(personalTargets.size>1?"s":"")+" jouable"+(personalTargets.size>1?"s":"")+" · 45 % de rencontres perso"
    :"🦹 Valide les trois portraits d'un méchant pour le rencontrer dans l'ARÈNE.";
  if(!personalTargets.size){
    vis("arena-custom-result",false);
    $("arena-custom-result-image")?.removeAttribute("src");
  }
  renderEncounter();
};
const personalTarget=id=>id?personalTargets.get(String(id)):null;
function arenaPersonalVoice(row,scene){
  if(row)window.SUPERVILAINS_SPEAK_CUSTOM?.(row,scene);
}
const duelCodePattern=/^[A-F0-9]{10}$/;
const gameLink=()=>new URL("./",location.href).href;
const validDuelCode=v=>duelCodePattern.test(String(v||"").toUpperCase())?String(v).toUpperCase():null;
try{
  const urlCode=validDuelCode(new URL(location.href).searchParams.get("duel"));
  const saved=JSON.parse(localStorage.getItem("supervilains_pending_duel_v41")||"null");
  const localCode=saved&&Number.isFinite(saved.ts)&&Date.now()-saved.ts<24*60*60*1000?validDuelCode(saved.code):null;
  inviteDuelCode=urlCode||localCode||validDuelCode(sessionStorage.getItem("supervilains_pending_duel"));
  if(inviteDuelCode){
    sessionStorage.setItem("supervilains_pending_duel",inviteDuelCode);
    localStorage.setItem("supervilains_pending_duel_v41",JSON.stringify({code:inviteDuelCode,ts:Date.now()}));
  }
}catch(e){}
function inviteUrl(code=null){const u=new URL(gameLink());if(code)u.searchParams.set("duel",code);return u.href;}
function inviteText(code=null){
  const who=profile?.handle?"Mon pseudo d’agent : "+profile.handle+". ":"";
  return code?"⚔️ Je te défie sur SUPERVILAINS ! "+who+"Rejoins notre duel privé de 24 h avec le code "+code+". 🎮\n"+inviteUrl(code):
    "🦹 Viens chasser les super-méchants avec moi sur SUPERVILAINS ! 🎮 Jeu gratuit, missions, captures et arène en ligne.\n"+inviteUrl();
}
function inviteFeedback(msg){const n=$("arena-share-feedback");if(n)n.textContent=msg;}
function openInvitation(code=null){
  shareDuelCode=validDuelCode(code)||"";
  vis("arena-invite-options",true);
  $("arena-invite-context").textContent=shareDuelCode?
    "⚔️ Invitation à ton duel privé : code "+shareDuelCode+". Ton ami pourra rejoindre l'ARÈNE grâce à ce lien.":
    "🎮 Invitation pour rejoindre SUPERVILAINS : ton ami pourra ouvrir le jeu gratuitement.";
  $("arena-invite-link").value=inviteUrl(shareDuelCode);
  inviteFeedback("Choisis WhatsApp, Messenger, SMS ou copie l’invitation.");
  $("arena-invite-options").scrollIntoView({behavior:"smooth",block:"nearest"});
}
async function copyInvitation(){
  const message=inviteText(shareDuelCode);
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);return true}}catch(e){}
  const area=document.createElement("textarea");area.value=message;area.setAttribute("readonly","");
  area.style.cssText="position:fixed;left:-9999px;top:0";document.body.appendChild(area);
  area.select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}area.remove();return ok;
}
async function shareNativeInvitation(){
  if(!navigator.share){inviteFeedback("Le menu de partage n’est pas disponible ici. Choisis WhatsApp, SMS, Messenger ou Copier.");return;}
  try{await navigator.share({title:"SUPERVILAINS — OPÉRATION MINUIT",text:inviteText(shareDuelCode)});inviteFeedback("Menu de partage ouvert. Choisis un destinataire.");}
  catch(e){if(e?.name!=="AbortError")inviteFeedback("Partage indisponible : utilise les boutons WhatsApp, SMS ou Copier.");}
}
const isMessengerBrowser=()=>/FBAN|FBAV|Messenger|FB_IAB/i.test(navigator.userAgent||"");
function renderIncomingDuel(){
  if(!inviteDuelCode)return;
  const status=$("arena-incoming-status");
  if(!status)return;
  const ready=!!(db&&user&&profile?.registered);
  vis("arena-accept-invite",ready);
  vis("arena-open-browser",!user);
  $("arena-open-browser").href=inviteUrl(inviteDuelCode);
  if(!db){status.textContent="Vérification de ta session…";return;}
  if(ready){status.textContent="✅ Connecté comme "+profile.handle+". Accepte le défi directement, sans e-mail !";return;}
  if(user){status.textContent="✅ Session retrouvée. Choisis ton pseudo d'agent, puis accepte le défi.";return;}
  status.textContent=isMessengerBrowser()?
    "📱 Messenger utilise un navigateur séparé : ton compte Chrome n'y est pas reconnu. Ouvre le lien dans Chrome via le menu ⋮ de Messenger, sans redemander d'e-mail.":
    "🔐 Aucun compte connecté dans ce navigateur. Ouvre ce lien dans ton navigateur habituel pour retrouver ta session.";
}
function setupIncomingDuel(){
  if(!inviteDuelCode)return;
  $("arena-code").value=inviteDuelCode;
  $("arena-incoming-text").textContent="Code du défi : "+inviteDuelCode+" · Accepte pour rejoindre le duel.";
  vis("arena-incoming-invite",true);
  renderIncomingDuel();
  document.querySelector('[data-view="arena"]')?.click();
}
function clearIncomingDuel(){
  inviteDuelCode=null;
  vis("arena-incoming-invite",false);
  vis("arena-accept-invite",false);
  vis("arena-open-browser",false);
  try{
    sessionStorage.removeItem("supervilains_pending_duel");
    localStorage.removeItem("supervilains_pending_duel_v41");
    const u=new URL(location.href);u.searchParams.delete("duel");history.replaceState(history.state,"",u.pathname+u.search+u.hash);
  }catch(e){}
}

const showMessage=(s,t="")=>{const n=$("arena-message");n.className="arena-status"+(t?" "+t:"");n.textContent=s;};
const messageError=e=>String(e&&e.message||"Erreur du serveur. Réessaie.");
const RPC=async(fn,args={})=>{if(!db)throw Error("Arène non configurée");const {data,error}=await db.rpc(fn,args);if(error)throw error;return data;};
function working(yes){loading=yes;["arena-send-link","arena-register-btn","arena-hunt","arena-attack","arena-capture","arena-flee","arena-create-duel","arena-join-duel","arena-accept-invite","arena-refresh"].forEach(id=>{if($(id))$(id).disabled=yes;});if(!yes)renderEncounter();}
async function action(fn){if(loading)return;working(true);try{await fn();}catch(e){showMessage("⚠️ "+messageError(e),"warn");}finally{working(false);}}
const officialWeaknesses=[
  ["🪥","Brosse à dents"],["👓","Lunettes"],["🍗","Magret de canard"],
  ["🎤","Micro"],["📘","Bescherelle"],["🧴","Déodorant"]
];
const weaknessIcon=name=>{
  const str=String(name||"").toLocaleLowerCase("fr");
  if(/rouge.{0,8}l[eè]vres|lipstick|maquill/.test(str))return "💄";
  if(/lunett/.test(str))return "👓";
  if(/brosse.*dent|dentifrice/.test(str))return "🪥";
  if(/magret|canard|poulet/.test(str))return "🍗";
  if(/micro|chant/.test(str))return "🎤";
  if(/bescherelle|livre|dictionnaire/.test(str))return "📘";
  if(/d[eé]odorant|parfum/.test(str))return "🧴";
  if(/cafe|caf[eé]|the|th[eé]/.test(str))return "☕";
  return "🎴";
};
function renderArenaWeakness(){
  const root=$("arena-weakness-grid"),hint=$("arena-ultimate-hint"),info=$("arena-weakness-status");
  if(!root||!active)return;
  const custom=personalTarget(active.custom_villain_id);
  const target=custom?.weakness_object||custom?.weakness_label||officialWeaknesses[Number(active.villain_id)]?.[1]||"Objet mystère";
  const mark=custom?weaknessIcon(target):officialWeaknesses[Number(active.villain_id)]?.[0]||"🎴";
  hint.textContent=mark+" Objet à découvrir : "+target+" · Il est caché parmi les 6 cartes.";
  const used=active.weakness_used===true;
  const chosen=Number.isInteger(active.weakness_selected)?active.weakness_selected:-1;
  info.textContent=used
    ?(chosen>=0?"❌ Carte "+(chosen+1)+" incorrecte. Continue avec AFFAIBLIR ou CAPTURER.":"🎴 Tentative déjà utilisée. Continue le combat.")
    :"🎲 1 seule tentative : une bonne carte déclenche immédiatement la capture.";
  root.replaceChildren();
  for(let i=0;i<6;i++){
    const card=document.createElement("button");
    card.type="button";card.className="arena-weakness-card";
    if(used&&i===chosen)card.classList.add("wrong");
    card.disabled=used||loading;
    card.dataset.weakSlot=String(i);
    const symbol=document.createElement("span");symbol.className="symbol";
    symbol.textContent=used&&i===chosen?"❌":"❔";
    const label=document.createElement("span");label.textContent="CARTE "+(i+1);
    card.append(symbol,label);root.appendChild(card);
  }
}
function renderEncounter(){
  vis("arena-encounter",!!active);if(!active)return;
  const base=HEROES[Number(active.villain_id)]||["CIBLE","👾",1,null,null,null];
  const custom=personalTarget(active.custom_villain_id);
  const hits=Number(active.hits)||0, danger=Number(active.danger)||base[2];
  const name=custom?.name||base[0],fallbackIcon=base[1];
  $("arena-villain-name").textContent=name;
  const art=$("arena-villain-icon");art.replaceChildren();
  // Une vraie image, officielle OU personnelle, dès le début du combat.
  const portrait=custom?.portrait||base[3];
  if(portrait){
    const img=document.createElement("img");
    img.className="arena-custom-face";
    img.alt="Portrait de "+name;
    img.src=portrait;
    img.onerror=()=>{if(art.contains(img))art.textContent=fallbackIcon;};
    art.appendChild(img);
  }else art.textContent=fallbackIcon;
  $("arena-villain-sub").textContent=custom
    ?"🦹 CIBLE PERSONNELLE · Danger "+danger+"/5 · 5 minutes · points équilibrés"
    :"Danger "+danger+"/5 · 5 minutes pour le capturer";
  $("arena-hits").textContent=hits+" / 3";$("arena-stunbar").style.width=(hits/3*100)+"%";
  $("arena-chance").textContent="Chance de capture : "+Math.max(22,Math.min(92,53-danger*5+hits*18))+" % (calcul serveur)";
  $("arena-attack").disabled=loading||hits>=3;$("arena-capture").disabled=loading;
  $("arena-hunt").textContent="🔁 REPRENDRE LA PATROUILLE";
  renderArenaWeakness();
}
function arenaTrollReaction(){
  if(!active)return;
  const id=active.id,base=HEROES[Number(active.villain_id)],custom=personalTarget(active.custom_villain_id);
  const reaction=custom?.troll||base?.[4];
  if(!reaction)return;
  const box=$("arena-villain-icon"),img=box.querySelector("img");
  if(!img)return;
  img.src=reaction;img.alt="Grimace de "+(custom?.name||base?.[0]||"la cible");
  setTimeout(()=>{
    if(active?.id!==id||!box.contains(img))return;
    img.src=custom?.portrait||base?.[3]||reaction;
    img.alt="Portrait de "+(custom?.name||base?.[0]||"la cible");
  },1500);
}
function boardRender(rows){const el=$("arena-board");if(!rows||!rows.length){el.textContent="Aucun classement pour le moment.";return;}
el.innerHTML=rows.map(r=>{const my=r.player_id===user?.id,rank=Number(r.pos);
return '<div class="arena-rankrow '+(my?"me":"")+'"><span>'+(rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":rank)+'</span><b>'+escapeHtml(r.handle)+(my?" ⭐":"")+'</b><span class="points">'+Number(r.score).toLocaleString("fr-FR")+'</span><span class="captures">'+Number(r.captures)+'</span></div>';}).join("");
}
function feedRender(rows){
  const el=$("arena-feed");
  if(!rows||!rows.length){el.textContent="Aucune capture en ligne pour le moment.";return;}
  el.innerHTML=rows.map(r=>{
    const custom=Number(r.villain_id)===-1;
    const hero=HEROES[Number(r.villain_id)]||["CIBLE","🦹",1,null];
    const name=custom?"un super-vilain personnel":hero[0];
    const date=new Date(r.captured_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    // Aucune photo, aucun nom privé ne sort dans le fil public.
    const photo=!custom&&hero[3]
      ?'<img class="arena-feed-avatar" src="'+escapeHtml(hero[3])+'" loading="lazy" alt="'+escapeHtml(hero[0])+'">'
      :'<span class="arena-feed-avatar arena-feed-privacy" aria-hidden="true">🦹</span>';
    return '<div class="arena-feedline">'+photo+
      ' <span><b>'+escapeHtml(r.handle)+'</b> a capturé '+escapeHtml(name)+
      ' <span class="arena-positive">+'+Number(r.points)+' pts</span> · '+escapeHtml(date)+'</span></div>';
  }).join("");
}
function duelsRender(rows){const el=$("arena-duels");if(!rows||!rows.length){el.textContent="Aucun défi pour le moment.";return;}
el.innerHTML=rows.map(r=>{const state=({waiting:"📩 En attente",active:"⚔️ En cours",finished:"🏁 Terminé",expired:"⌛ Expiré"})[r.state]||r.state;
const details=r.state==="waiting"?"En attente d'un adversaire":escapeHtml(r.challenger)+" vs "+escapeHtml(r.opponent||"Agent");
const scores=r.state==="waiting"||r.state==="expired"?"":'<small>Toi : <b>'+Number(r.my_score)+'</b> pts · Rival : <b>'+Number(r.rival_score)+'</b> pts</small>';
const canInvite=r.state==="waiting"&&validDuelCode(r.code);
return '<div class="arena-vs"><div class="row-between"><b>'+escapeHtml(state)+'</b><b style="color:var(--cyan)">'+escapeHtml(r.code)+'</b></div><small>'+details+'</small>'+scores+(canInvite?'<button class="arena-mini" type="button" data-share-duel="'+escapeHtml(r.code)+'" style="margin-top:10px;width:100%">📨 INVITER UN AMI À CE DÉFI</button>':"")+'</div>';}).join("");
}
async function refresh(){if(!db||!user||refreshing||document.hidden)return;refreshing=true;try{
profile=await RPC("arena_my_stats");vis("arena-register",!profile.registered);vis("arena-home",!!profile.registered);renderIncomingDuel();
if(!profile.registered){showMessage("Choisis ton pseudo pour rejoindre l'arène.");return;}
$("arena-username").textContent=profile.handle;$("arena-total").textContent=profile.captures;
$("arena-weekpoints").textContent=Number(profile.score_week).toLocaleString("fr-FR");
$("arena-tickets").textContent=profile.remaining_today+" / 30";
const [board,duels,feed]=await Promise.all([RPC("arena_leaderboard",{p_period:period}),RPC("arena_my_duels"),RPC("arena_feed")]);
boardRender(board);duelsRender(duels);feedRender(feed);lastRefresh=Date.now();showMessage("✅ Arène connectée : classement à jour !","good");
}catch(e){showMessage("⚠️ "+messageError(e),"warn");}finally{refreshing=false;}}
function publishVoiceIdentity(){try{window.dispatchEvent(new CustomEvent('supervilains:identity',{detail:{id:user?.id||null}}))}catch(e){}}
async function authView(){publishVoiceIdentity();renderIncomingDuel();vis("arena-auth",!!db&&!user);vis("arena-register",false);vis("arena-home",false);if(!user){showMessage("Connecte-toi par e-mail pour rejoindre les compétitions.");return;}await refresh();}
async function connect(){const cfg=window.SUPERVILAINS_ONLINE||{};
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||"")||!/^(sb_publishable_[a-zA-Z0-9_-]+|eyJ[a-zA-Z0-9._-]+)$/.test(cfg.publishableKey||"")){
vis("arena-setup",true);showMessage("🌙 Le mode solo est disponible. Active Supabase pour les classements en ligne.");return;}
if(!window.supabase?.createClient){vis("arena-setup",true);showMessage("⚠️ Chargement Supabase indisponible.","warn");return;}
try{db=window.supabase.createClient(cfg.url.replace(/\/$/,""),cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
db.auth.onAuthStateChange((_event,s)=>{const next=s?.user||null;if((user?.id||null)!==(next?.id||null)){user=next;active=null;setTimeout(authView,0);}});
const {data,error}=await db.auth.getSession();if(error)throw error;user=data.session?.user||null;await authView();
}catch(e){showMessage("⚠️ "+messageError(e),"warn");}}
function on(id,fn){const x=$(id);if(x)x.addEventListener("click",fn);}
on("arena-send-link",()=>action(async()=>{const email=$("arena-email").value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("Adresse e-mail invalide.");
// L'URL de retour doit correspondre exactement à la liste autorisée dans Supabase.
const callbackUrl=location.origin+location.pathname;
const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:callbackUrl,shouldCreateUser:true}});if(error)throw error;showMessage("📩 Lien envoyé. Consulte ta boîte mail !","good");}));
on("arena-register-btn",()=>action(async()=>{const handle=$("arena-handle").value.trim();if(!/^[A-Za-z0-9_]{3,18}$/.test(handle))throw Error("Pseudo : 3 à 18 caractères, lettres, chiffres et _.");await RPC("arena_register",{p_handle:handle});await refresh();}));
on("arena-logout",()=>action(async()=>{const {error}=await db.auth.signOut();if(error)throw error;user=null;active=null;await authView();}));
on("arena-hunt",()=>action(async()=>{
  active=await RPC("arena_start");renderEncounter();
  vis("arena-last-result",false);vis("arena-custom-result",false);
  arenaPersonalVoice(personalTarget(active.custom_villain_id),"intro");
  showMessage(active.custom_villain_id?"🦹 Méchant personnel détecté ! Capture-le pour gagner les mêmes points que les autres.":"📡 Signal détecté. Capture le super-méchant !","good");
}));
on("arena-attack",()=>action(async()=>{
  if(!active)return;
  const data=await RPC("arena_attack",{p_encounter:active.id});
  active={...active,...data};renderEncounter();arenaTrollReaction();
  arenaPersonalVoice(personalTarget(active.custom_villain_id),"taunt");
  showMessage("⚡ Neutralisation "+active.hits+"/3","good");
}));
function completeArenaEncounter(result,before){
  const hero=HEROES[Number(result.villain_id)]||["CIBLE","👾"];
  const custom=personalTarget(result.custom_villain_id||before?.custom_villain_id);
  const name=custom?.name||hero[0];
  active=null;
  const text=result.success
    ? "🏆 "+name+" CAPTURÉ ! +"+result.points+" points"+(result.ultimate?" · 🎴 FAILLE ULTIME !":"")
    :result.expired?"⌛ Patrouille expirée !":"💨 "+name+" s'est échappé !";
  $("arena-last-result").textContent=text;
  $("arena-last-result").className="arena-status "+(result.success?"good":"warn");
  vis("arena-last-result",true);
  const image=custom?(result.success?custom.capture:custom.troll):
    (result.success?hero[5]:hero[3]);
  vis("arena-custom-result",!!image);
  if(image){
    const pic=$("arena-custom-result-image");pic.src=image;
    pic.alt=(result.success?"Capturé : ":"En fuite : ")+name;
    const object=String(result.weakness_object||custom?.weakness_object||custom?.weakness_label||"").slice(0,120);
    $("arena-custom-result-label").textContent=result.ultimate
      ?"🎴 "+name+" : faille ultime découverte ! "+weaknessIcon(object)+" "+object+" · capture immédiate."
      :result.success?name+" a été capturé !":"💨 "+name+" s'est échappé : nouvelle patrouille possible.";
  }
  if(custom)arenaPersonalVoice(custom,result.success?"capture":"taunt");
  $("arena-hunt").textContent="📡 LANCER UNE PATROUILLE EN LIGNE";
}
on("arena-capture",()=>action(async()=>{
  if(!active)return;
  const previous=active,result=await RPC("arena_capture",{p_encounter:active.id});
  completeArenaEncounter(result,previous);
  await refresh();
}));
on("arena-weakness-grid",event=>action(async()=>{
  const button=event.target.closest?.("button[data-weak-slot]");
  if(!button||!active||active.weakness_used)return;
  const slot=Number(button.dataset.weakSlot);
  if(!Number.isInteger(slot)||slot<0||slot>5)return;
  const previous=active;
  const result=await RPC("arena_guess_weakness",{p_encounter:active.id,p_slot:slot});
  if(result.resolved){
    completeArenaEncounter(result,previous);
    if(result.ultimate){
      showMessage("🎴 CARTE "+(slot+1)+" ! "+weaknessIcon(result.weakness_object)+" "+String(result.weakness_object||"Faille ultime")+" : capture immédiate !","good");
    }
    await refresh();
  }else{
    active={...active,weakness_used:true,weakness_selected:slot};
    renderEncounter();
    showMessage("❌ Carte "+(slot+1)+" incorrecte. Tu peux toujours affaiblir et capturer cette cible.","warn");
  }
}));
on("arena-flee",()=>action(async()=>{if(!active)return;await RPC("arena_flee",{p_encounter:active.id});active=null;vis("arena-custom-result",false);$("arena-hunt").textContent="📡 LANCER UNE PATROUILLE EN LIGNE";await refresh();}));
on("arena-refresh",()=>action(async()=>{await refresh();}));
on("arena-create-duel",()=>action(async()=>{
  const code=validDuelCode(await RPC("arena_create_duel"));if(!code)throw Error("Code reçu invalide.");
  createdDuelCode=code;$("arena-code").value=code;vis("arena-share-duel",true);
  await refresh();showMessage("⚔️ Défi créé ! Appuie sur PARTAGER MON DÉFI pour inviter un ami.","good");
  openInvitation(code);
}));
on("arena-join-duel",()=>action(async()=>{const code=$("arena-code").value.trim().toUpperCase();if(!duelCodePattern.test(code))throw Error("Code de défi invalide.");await RPC("arena_join_duel",{p_code:code});if(code===inviteDuelCode)clearIncomingDuel();await refresh();showMessage("⚔️ Défi accepté : 24 h pour battre ton adversaire !","good");}));
document.querySelectorAll("[data-period]").forEach(btn=>btn.addEventListener("click",()=>{period=btn.dataset.period;document.querySelectorAll("[data-period]").forEach(b=>b.classList.toggle("active",b.dataset.period===period));$("arena-period-label").textContent=period==="week"?"Classement hebdomadaire (UTC)":period==="month"?"Classement mensuel (UTC)":"Classement général";refresh();}));
on("arena-accept-invite",()=>{if(inviteDuelCode&&user&&profile?.registered)$("arena-join-duel").click()});
on("arena-invite-open",()=>{
  if(!$("arena-invite-options").hidden){vis("arena-invite-options",false);return;}
  openInvitation();
});
on("arena-share-duel",()=>{if(createdDuelCode)openInvitation(createdDuelCode);});
$("arena-duels")?.addEventListener("click",e=>{const btn=e.target.closest("[data-share-duel]");if(btn)openInvitation(btn.dataset.shareDuel)});
on("arena-share-copy",async()=>{const ok=await copyInvitation();inviteFeedback(ok?"✅ Invitation complète copiée ! Colle-la dans ta conversation.":"Sélectionne le lien ci-dessus pour le copier manuellement.");});
on("arena-share-native",shareNativeInvitation);
on("arena-share-whatsapp",()=>{window.open("https://wa.me/?text="+encodeURIComponent(inviteText(shareDuelCode)),"_blank","noopener,noreferrer");inviteFeedback("WhatsApp ouvert : choisis ton ami et envoie l'invitation.");});
on("arena-share-sms",()=>{location.href="sms:?body="+encodeURIComponent(inviteText(shareDuelCode));inviteFeedback("Choisis un contact dans ton application SMS.");});
on("arena-share-messenger",()=>{
  window.open("https://www.messenger.com/","_blank","noopener,noreferrer");
  copyInvitation().then(ok=>inviteFeedback(ok?"✅ Invitation copiée ! Ouvre la conversation Messenger et colle le texte.":"Ouvre Messenger et copie le lien dans le champ au-dessus."));
});
$("arena-invite-link")?.addEventListener("focus",e=>e.target.select());
setupIncomingDuel();
on("arena-username",()=>{});
document.querySelector('[data-view="arena"]')?.addEventListener("click",()=>{if(db&&user)refresh();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&user)refresh();});
setInterval(()=>{if(db&&user&&document.querySelector("#view-arena.active")&&Date.now()-lastRefresh>30000)refresh();},10000);
connect();
})();