/* LEONIDA CHAT v2.5 — anonymous public chat / views / presence. */
(function(){
'use strict';
const API='https://leonida-tracker-news.onrender.com/api/community';
const $=id=>document.getElementById(id);
const SID_KEY='leonida-chat-session-v1',NICK_KEY='leonida-chat-nickname-v1',HISTORY_KEY='leonida-chat-local-archive-v1';
function token(){
 if(window.crypto?.randomUUID)return crypto.randomUUID().replace(/-/g,'');
 const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
let sid='';
try{sid=localStorage.getItem(SID_KEY)||'';if(!/^[a-zA-Z0-9_-]{16,100}$/.test(sid)){sid=token();localStorage.setItem(SID_KEY,sid)}}catch{sid=token()}
const page=token();
let localHistory=null;
try{localHistory=JSON.parse(localStorage.getItem(HISTORY_KEY)||'null')}catch{}

let connected=false,busy=false,lastRender='',instance='',lastFailure='',active=true;
function notify(message){
 if(typeof window.toast==='function')window.toast(message);
 else{const node=$('chatConnection');if(node)node.textContent=message}
}
async function post(endpoint,data={},keepalive=false){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14000);
 try{
  const r=await fetch(API+endpoint,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({sid,...data}),signal:ctrl.signal,keepalive,cache:'no-store'
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(body.error||'Erreur HTTP '+r.status);
  return body;
 }finally{clearTimeout(timer)}
}
async function readState(){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14000);
 try{
  const r=await fetch(API+'/state',{cache:'no-store',signal:ctrl.signal});
  if(!r.ok)throw Error('HTTP '+r.status);
  return await r.json();
 }finally{clearTimeout(timer)}
}
function counters(state){
 if(!state)return;
 $('siteViews').textContent=Number(state.views).toLocaleString('fr-FR');
 $('siteOnline').textContent=Number(state.online).toLocaleString('fr-FR');
 $('communityCountsNote').textContent=state.mode==='persistent'?
 'Visiteurs uniques par identifiant de navigateur, enregistrés en base de données (sans adresse MAC). La base Render gratuite expire après 30 jours. Présence active : 65 secondes.':
 'Visiteurs uniques par navigateur, sans compter les rechargements. Historique partagé et compteur temporaires : liaison à la base PostgreSQL en attente.';
}
function status(message,error=false){
 const n=$('chatConnection');if(!n)return;
 n.textContent=message;n.classList.toggle('bad',error);
 $('chatSend').disabled=error||!connected;
}

function trustedMediaUrl(value){
 const raw=String(value||'');
 if(/^\/api\/community\/media\/[a-zA-Z0-9_-]{15,60}$/.test(raw))
  return API.replace('/api/community','')+raw;
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:')return '';
  const allowed=['www.youtube.com','youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com','twitch.tv','www.twitch.tv','clips.twitch.tv','tiktok.com','www.tiktok.com','i.imgur.com','i.redd.it','images.unsplash.com'];
  return allowed.includes(u.hostname.toLowerCase())?u.href:'';
 }catch{return ''}
}
function appendMessage(host,m,archive=false){
 if(!m||typeof m!=='object')return;
 const card=document.createElement('div');card.className='chatMessage';
 const head=document.createElement('div');head.className='chatMsgTop';
 const author=document.createElement('span');author.className='chatNick';author.textContent=String(m.nickname||'Joueur').slice(0,22);
 const time=document.createElement('span');time.className='chatTimestamp';
 const date=new Date(m.date);time.textContent=Number.isNaN(date.getTime())?'':date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 head.append(author,time);card.append(head);
 const content=document.createElement('p');
 content.textContent=m.hidden?'⛔ Message masqué après signalements.':String(m.text||'');
 card.append(content);
 if(!m.hidden&&!archive){
  const url=trustedMediaUrl(m.mediaUrl),kind=String(m.mediaKind||'');
  if(url&&['image','video'].includes(kind)){
   const local=url.startsWith(API.replace('/api/community','')+'/api/community/media/');
   if(kind==='image'){
    const img=document.createElement('img');
    img.className='chatMediaImage';img.src=url;img.alt='Image partagée par '+author.textContent;
    img.loading='lazy';img.referrerPolicy='no-referrer';
    card.append(img);
   }
   if(kind==='video'&&local){
    const vid=document.createElement('video');vid.className='chatMediaVideo';
    vid.src=url;vid.controls=true;vid.preload='metadata';vid.playsInline=true;vid.setAttribute('aria-label','Vidéo partagée par '+author.textContent);card.append(vid);
   }
   const a=document.createElement('a');a.className='chatMediaLink';a.href=url;
   a.target='_blank';a.rel='noopener noreferrer nofollow';a.referrerPolicy='no-referrer';
   a.textContent=kind==='video'?'▶ Ouvrir la vidéo':'🖼 Ouvrir l’image';
   card.append(a);
  }
 }
 if(!m.hidden&&!archive){
  const report=document.createElement('button');report.className='chatReport';report.type='button';
  report.textContent='⚑ Signaler';report.setAttribute('aria-label','Signaler le message de '+author.textContent);
  report.onclick=()=>reportMessage(m.id);
  card.append(report);
 }
 host.append(card);
}
function render(messages){
 if(!Array.isArray(messages))return;
 const host=$('chatMessages'),old=localHistory&&typeof localHistory==='object'?localHistory:null;
 let archive=Array.isArray(old?.archive)?old.archive:[];
 if(old?.instance&&instance&&old.instance!==instance&&Array.isArray(old.messages))
  archive=[...archive,...old.messages].slice(-35).filter(x=>x&&!x.hidden);
 if(archive.length>35)archive=archive.slice(-35);
 const snapshot=JSON.stringify({live:messages.map(m=>[m.id,m.hidden,m.nickname,m.text,m.mediaUrl,m.mediaKind]),archive:archive.map(m=>m.id)});
 if(snapshot===lastRender)return;
 lastRender=snapshot;
 const atBottom=host.scrollHeight-host.clientHeight-host.scrollTop<105;
 host.replaceChildren();
 if(archive.length){
  const p=document.createElement('div');p.className='chatArchiveNote';
  p.textContent='📚 Archive locale : anciens messages enregistrés sur cet appareil, non visibles par les autres joueurs après un redémarrage du serveur.';
  host.append(p);
  for(const m of archive)appendMessage(host,m,true);
 }
 if(!messages.length&&!archive.length){
  const p=document.createElement('p');p.className='chatPlaceholder';
  p.textContent='Bienvenue dans le salon ! Partage tes astuces GTA 6 avec les autres joueurs.';
  host.append(p);
 }else{
  if(archive.length){
   const p=document.createElement('div');p.className='chatArchiveNote';
   p.textContent='🟢 Messages actuellement partagés';host.append(p);
  }
  for(const m of messages)appendMessage(host,m,false);
 }
 localHistory={instance,messages:messages.slice(-60),archive};
 try{localStorage.setItem(HISTORY_KEY,JSON.stringify(localHistory))}catch{}
 if(atBottom)host.scrollTop=host.scrollHeight;
}
async function reportMessage(id){
 if(!confirm('Signaler ce message comme abusif ? Plusieurs signalements peuvent le masquer.'))return;
 try{await post('/report',{messageId:Number(id)});notify('Message signalé. Merci.');await refresh()}
 catch(e){notify(e.message)}
}
async function refresh(){
 if(busy||document.visibilityState==='hidden')return;
 busy=true;
 try{
  const payload=await readState();
  if(instance&&payload.instance!==instance)lastRender='';
  instance=payload.instance||'';
  counters(payload);render(payload.messages);
  connected=true;lastFailure='';
  status('🟢 Salon actif • '+payload.online+' joueur(s) présents • actualisation toutes les 6 s');
 }catch(e){
  lastFailure=e.message||'Service indisponible';connected=false;
  $('siteOnline').textContent='—';
  status('Connexion interrompue : '+lastFailure+' • nouvelle tentative automatique.',true);
 }finally{busy=false}
}
async function join(){
 if(document.visibilityState==='hidden')return;
 try{const r=await post('/join',{page});counters(r);connected=true;await refresh()}
 catch(e){connected=false;status('Le chat ne répond pas pour le moment : '+e.message,true)}
}
async function heartbeat(){
 if(document.visibilityState==='hidden')return;
 try{const r=await post('/heartbeat');counters(r)}
 catch{connected=false;join()}
}
function toggle(open){
 const dock=$('chatDock'),launcher=$('chatLauncher');
 dock.hidden=!open;launcher.hidden=open;launcher.setAttribute('aria-expanded',String(open));
 if(open){refresh();setTimeout(()=>$('chatText').focus({preventScroll:true}),30)}
}
function init(){
 const nickname=$('chatNickname');let name='';
 try{name=localStorage.getItem(NICK_KEY)||''}catch{}
 nickname.value=name||('Joueur_'+sid.slice(0,5));
 nickname.addEventListener('change',()=>{try{localStorage.setItem(NICK_KEY,nickname.value.trim())}catch{}});
 $('chatFile').addEventListener('change',()=>{$('chatMediaStatus').textContent=$('chatFile').files?.[0]?.name||'';});
 $('openChatTop').onclick=()=>toggle(true);
 $('chatLauncher').onclick=()=>toggle(true);
 $('chatClose').onclick=()=>toggle(false);
 $('chatForm').onsubmit=async e=>{
  e.preventDefault();
  if(!connected){notify('Chat momentanément indisponible. Réessaie.');return}
  const nick=nickname.value.trim(),text=$('chatText').value.trim();
  const link=$('chatMediaUrl').value.trim(),file=$('chatFile').files?.[0];
  if(!text&&!link&&!file){notify('Écris un message ou joins une photo/vidéo.');return;}
  if(link&&file){notify('Choisis un lien OU un fichier, pas les deux.');return;}
  $('chatSend').disabled=true;
  $('chatMediaStatus').classList.remove('error');
  try{
   let mediaId='';
   if(file){
    if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type))throw Error('Format de média non autorisé.');
    const max=file.type.startsWith('image/')?1_000_000:2_500_000;
    if(file.size>max)throw Error(file.type.startsWith('image/')?'Image trop lourde (max. 1 Mo).':'Vidéo trop lourde (max. 2,5 Mo).');
    $('chatMediaStatus').textContent='Téléversement sécurisé en cours…';
    const binary=await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');
     reader.onerror=()=>reject(new Error('Impossible de lire le fichier.'));
     reader.readAsDataURL(file);
    });
    const upload=await post('/upload',{mime:file.type,contents:binary});
    mediaId=upload.mediaId;
    $('chatMediaStatus').textContent=upload.temporary?'Fichier temporaire sur Render : il pourra disparaître après redémarrage.':'Fichier stocké dans la base de données.';
   }
   await post('/send',{nickname:nick,text,mediaUrl:link,mediaId});
   try{localStorage.setItem(NICK_KEY,nick)}catch{}
   $('chatText').value='';$('chatMediaUrl').value='';$('chatFile').value='';
   $('chatMediaStatus').textContent='';
   lastRender='';
   await refresh();
   $('chatMessages').scrollTop=$('chatMessages').scrollHeight;
  }catch(err){
   $('chatMediaStatus').classList.add('error');
   $('chatMediaStatus').textContent=err.message;
   notify(err.message);
  }finally{$('chatSend').disabled=!connected}
 };
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){join();refresh()}
  else post('/leave',{},true).catch(()=>{});
 });
 window.addEventListener('pagehide',()=>{
  try{navigator.sendBeacon?.(API+'/leave',new Blob([JSON.stringify({sid})],{type:'application/json'}))}catch{}
 });
 join();
 setInterval(refresh,6000);
 setInterval(heartbeat,25000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();