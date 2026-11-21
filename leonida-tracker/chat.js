/* LEONIDA CHAT v2.5 — anonymous public chat / views / presence. */
(function(){
'use strict';
const API='https://leonida-tracker-news.onrender.com/api/community';
const $=id=>document.getElementById(id);
const SID_KEY='leonida-chat-session-v1',NICK_KEY='leonida-chat-nickname-v1';
function token(){
 if(window.crypto?.randomUUID)return crypto.randomUUID().replace(/-/g,'');
 const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
let sid='';
try{sid=localStorage.getItem(SID_KEY)||'';if(!/^[a-zA-Z0-9_-]{16,100}$/.test(sid)){sid=token();localStorage.setItem(SID_KEY,sid)}}catch{sid=token()}
const page=token();
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
 $('communityCountsNote').textContent='Compteurs du site depuis le dernier démarrage du serveur. Présents = joueurs actifs durant les 65 dernières secondes. Les chiffres peuvent se réinitialiser sur Render gratuit.';
}
function status(message,error=false){
 const n=$('chatConnection');if(!n)return;
 n.textContent=message;n.classList.toggle('bad',error);
 $('chatSend').disabled=error||!connected;
}
function render(messages){
 if(!Array.isArray(messages))return;
 const host=$('chatMessages');
 const fingerprint=JSON.stringify(messages.map(m=>[m.id,m.hidden,m.nickname,m.text]));
 if(fingerprint===lastRender)return;
 lastRender=fingerprint;
 const atBottom=host.scrollHeight-host.clientHeight-host.scrollTop<105;
 host.replaceChildren();
 if(!messages.length){
  const p=document.createElement('p');p.className='chatPlaceholder';
  p.textContent='Bienvenue dans le salon ! Partage tes astuces GTA 6 avec les autres joueurs.';
  host.appendChild(p);return;
 }
 for(const m of messages){
  if(!m||typeof m!=='object')continue;
  const card=document.createElement('div');card.className='chatMessage';
  const head=document.createElement('div');head.className='chatMsgTop';
  const author=document.createElement('span');author.className='chatNick';author.textContent=String(m.nickname||'Joueur').slice(0,22);
  const time=document.createElement('span');time.className='chatTimestamp';
  const date=new Date(m.date);time.textContent=Number.isNaN(date.getTime())?'':date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  head.append(author,time);card.appendChild(head);
  const content=document.createElement('p');content.textContent=m.hidden?'⛔ Message masqué après signalements.':String(m.text||'');
  card.appendChild(content);
  if(!m.hidden){
   const report=document.createElement('button');report.className='chatReport';report.type='button';
   report.textContent='⚑ Signaler';report.setAttribute('aria-label','Signaler le message de '+author.textContent);
   report.onclick=()=>reportMessage(m.id);
   card.appendChild(report);
  }
  host.appendChild(card);
 }
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
 $('openChatTop').onclick=()=>toggle(true);
 $('chatLauncher').onclick=()=>toggle(true);
 $('chatClose').onclick=()=>toggle(false);
 $('chatForm').onsubmit=async e=>{
  e.preventDefault();
  if(!connected){notify('Chat momentanément indisponible. Réessaie.');return}
  const nick=nickname.value.trim(),text=$('chatText').value.trim();
  if(text.length<2)return;
  $('chatSend').disabled=true;
  try{
   await post('/send',{nickname:nick,text});
   try{localStorage.setItem(NICK_KEY,nick)}catch{}
   $('chatText').value='';
   lastRender='';
   await refresh();
   $('chatMessages').scrollTop=$('chatMessages').scrollHeight;
  }catch(err){notify(err.message)}
  finally{$('chatSend').disabled=!connected}
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