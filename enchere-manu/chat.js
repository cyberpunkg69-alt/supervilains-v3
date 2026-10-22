"use strict";
(()=>{
 const API="https://nhmraocljiugwlgflhfn.supabase.co/functions/v1/manu-chat";
 const $=id=>document.getElementById(id);
 const wall=$("chat-feed"),form=$("chat-form");if(!wall||!form)return;
 const nick=$("chat-nickname"),body=$("chat-text"),file=$("chat-photo"),feedback=$("chat-feedback");
 const send=$("chat-submit"),picker=$("chat-emoji-picker"),toggle=$("chat-emoji-toggle");
 const preview=$("chat-photo-preview"),picture=$("chat-preview-image"),older=$("chat-older"),jump=$("chat-unread");
 const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
 const set=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
 let token=get("manu-auction-token");
 if(!token||!/^[A-Za-z0-9_-]{16,80}$/.test(token)){
   token=crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(20)),n=>n.toString(16).padStart(2,"0")).join("");
   set("manu-auction-token",token);
 }
 nick.value=get("manu-chat-nickname")||get("manu-auction-pseudo")||"";
 nick.addEventListener("change",()=>set("manu-chat-nickname",nick.value.trim()));
 body.addEventListener("input",()=>{$("chat-count").textContent=String(Array.from(body.value).length)});
 const emojis=["😂","🤣","😭","👑","🔨","💸","🔥","❤️","😘","🤡","😱","🤪","🥳","🙈","💩","🚽","🍾","💃","😈","👏","💀","🎉","🥂","🤯"];
 emojis.forEach(em=>{
  const b=document.createElement("button");b.type="button";b.textContent=em;b.title="Ajouter "+em;
  b.addEventListener("click",()=>{
   const i=body.selectionStart||0,j=body.selectionEnd||0;
   if(Array.from(body.value.slice(0,i)+em+body.value.slice(j)).length>500)return;
   body.value=body.value.slice(0,i)+em+body.value.slice(j);body.focus();
   body.setSelectionRange(i+em.length,i+em.length);body.dispatchEvent(new Event("input"));
  });picker.append(b);
 });
 toggle.addEventListener("click",()=>{picker.hidden=!picker.hidden;toggle.setAttribute("aria-expanded",String(!picker.hidden))});
 let imagePreview=null,processing=false,reading=false,loadingOlder=false,messages=[],signature=null,canGoBack=false;
 const note=(t,type="")=>{feedback.textContent=t;feedback.className="chat-feedback "+type};
 function clearPhoto(){
  if(imagePreview)URL.revokeObjectURL(imagePreview);
  imagePreview=null;file.value="";picture.removeAttribute("src");preview.hidden=true;
 }
 file.addEventListener("change",()=>{
  if(imagePreview)URL.revokeObjectURL(imagePreview);imagePreview=null;
  const f=file.files?.[0];if(!f){preview.hidden=true;return}
  if(!f.type.startsWith("image/")||f.size>15e6){note("Choisis une photo de moins de 15 Mo.","error");clearPhoto();return}
  imagePreview=URL.createObjectURL(f);picture.src=imagePreview;preview.hidden=false;
 });
 $("chat-remove-photo").addEventListener("click",clearPhoto);
 async function compress(f){
  if(f.size>15e6)throw Error("Photo trop lourde, 15 Mo maximum.");
  const u=URL.createObjectURL(f);
  try{
   const img=new Image();img.src=u;await img.decode();
   const scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   if(canvas.width*canvas.height>2400000)throw Error();
   const ctx=canvas.getContext("2d");if(!ctx)throw Error();
   ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   for(const q of [.8,.68,.55]){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",q));
    if(blob&&blob.size<2097152)return new File([blob],"photo.jpg",{type:"image/jpeg"});
   }throw Error();
  }catch{throw Error("Cette photo n'a pas pu être compressée. Essaie en JPG ou PNG.")}
  finally{URL.revokeObjectURL(u)}
 }
 async function api(method,payload,query=""){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),22000);
  try{
   const opts={method,signal:ctrl.signal,cache:"no-store"};
   if(payload instanceof FormData)opts.body=payload;
   else if(payload){opts.headers={"Content-Type":"application/json"};opts.body=JSON.stringify(payload)}
   const res=await fetch(API+query,opts),j=await res.json();
   if(!res.ok||!j.ok)throw Error(j.message||"Connexion au chat impossible.");
   return j;
  }finally{clearTimeout(timer)}
 }
 const nearEnd=()=>wall.scrollHeight-wall.scrollTop-wall.clientHeight<140;
 function photoUrl(str){
  if(typeof str!=="string")return null;
  try{
   const u=new URL(str);return u.protocol==="https:"&&u.hostname==="nhmraocljiugwlgflhfn.supabase.co"&&
     u.pathname.startsWith("/storage/v1/object/public/manu-chat-photos/photos/")?u.href:null;
  }catch{return null}
 }
 function line(m){
  const box=document.createElement("article");box.className="chat-message";
  const avatar=document.createElement("div");avatar.className="chat-avatar";avatar.textContent=String(m.nickname||"?").charAt(0).toUpperCase();
  const pane=document.createElement("div");pane.className="chat-bubble";
  const top=document.createElement("div");top.className="chat-meta";
  const name=document.createElement("strong");name.className="chat-author";name.textContent=m.nickname;
  const time=document.createElement("time");time.className="chat-time";
  const date=new Date(m.created_at);time.textContent=isNaN(date.getTime())?"":date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  top.append(name,time);
  const report=document.createElement("button");report.type="button";report.className="chat-report";report.textContent="Signaler";
  report.addEventListener("click",async()=>{
   if(!confirm("Signaler ce message comme inapproprié ?"))return;
   report.disabled=true;
   try{const result=await api("POST",{action:"report",token,message_id:m.id});
     note(result.hidden?"Message masqué après plusieurs signalements.":"Signalement reçu, merci.","success");
     if(result.hidden)refresh(true);
   }catch(e){note(e.message,"error")}finally{report.disabled=false}
  });top.append(report);pane.append(top);
  if(m.text){const p=document.createElement("p");p.className="chat-body";p.textContent=m.text;pane.append(p)}
  const url=photoUrl(m.photo_url);
  if(url){
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";
   a.className="chat-image-link";a.title="Agrandir la photo";
   const image=document.createElement("img");image.src=url;image.loading="lazy";image.className="chat-image";
   image.alt="Photo envoyée par "+m.nickname;a.append(image);pane.append(a);
  }
  box.append(avatar,pane);return box;
 }
 function render(force=false,keepTop=false){
  const s=messages.map(m=>m.id).join(",");
  if(s===signature&&!force)return;
  const wasBottom=nearEnd(),oldHeight=wall.scrollHeight,oldTop=wall.scrollTop;
  const initial=!signature;signature=s;
  wall.replaceChildren();
  if(messages.length){for(const m of messages)wall.append(line(m))}
  else{const p=document.createElement("p");p.className="chat-empty";p.textContent="🎤 Aucun message… Qui va chambrer MANU en premier ? 😂";wall.append(p)}
  older.hidden=!canGoBack;
  if(keepTop){wall.scrollTop=wall.scrollHeight-oldHeight+oldTop;}
  else if(initial||wasBottom){wall.scrollTop=wall.scrollHeight;jump.hidden=true;}
  else jump.hidden=false;
 }
 jump.addEventListener("click",()=>{wall.scrollTo({top:wall.scrollHeight,behavior:"smooth"});jump.hidden=true});
 async function refresh(force=false){
  if(processing||reading||(document.visibilityState==="hidden"&&!force))return;
  reading=true;
  try{
   const j=await api("GET"),latest=Array.isArray(j.messages)?j.messages:[];
   canGoBack=canGoBack||latest.length>=60;
   const map=new Map(messages.map(m=>[m.id,m]));
   for(const m of latest)map.set(m.id,m);
   const first=latest[0]?.id,last=latest[latest.length-1]?.id;
   if(first!==undefined){
    const live=new Set(latest.map(m=>m.id));
    for(const id of map.keys())if(id>=first&&id<=last&&!live.has(id))map.delete(id);
   }else map.clear();
   messages=[...map.values()].sort((a,b)=>a.id-b.id).slice(-180);render(force);
  }catch(e){if(!messages.length)note("Impossible de charger le chat : "+e.message,"error")}
  finally{reading=false}
 }
 older.addEventListener("click",async()=>{
  if(loadingOlder||!messages.length)return;
  loadingOlder=true;older.disabled=true;
  try{
   const j=await api("GET",null,"?before="+messages[0].id);
   const earlier=j.messages||[];
   if(!earlier.length){canGoBack=false;older.hidden=true;return}
   const map=new Map([...earlier,...messages].map(m=>[m.id,m]));
   messages=[...map.values()].sort((a,b)=>a.id-b.id).slice(-240);
   canGoBack=earlier.length===60;render(true,true);
  }catch(e){note("Impossible de charger les anciens messages.","error")}
  finally{older.disabled=false;loadingOlder=false}
 });
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(processing)return;
  const n=nick.value.trim(),t=body.value.trim(),f=file.files?.[0];
  if(!/^[\p{L}\p{N} _.-]{2,24}$/u.test(n)){note("Pseudo invalide : 2 à 24 caractères.","error");nick.focus();return}
  if(Array.from(t).length>500||(!t&&!f)){note("Écris un message ou sélectionne une photo.","error");return}
  processing=true;send.disabled=true;send.textContent="⏳ ENVOI…";
  try{
   const data=new FormData();data.set("nickname",n);data.set("text",t);data.set("token",token);
   if(f){note("Compression et envoi de la photo…");data.set("photo",await compress(f))}
   const result=await api("POST",data);set("manu-chat-nickname",n);set("manu-auction-pseudo",n);
   const other=$("nickname");if(other&&!other.value.trim())other.value=n;
   body.value="";body.dispatchEvent(new Event("input"));clearPhoto();
   messages=Array.isArray(result.messages)?result.messages:messages;canGoBack=messages.length>=60;
   render(true);wall.scrollTop=wall.scrollHeight;jump.hidden=true;
   note("✅ Envoyé ! MANU va adorer 😂","success");
  }catch(err){note(err.message||"Envoi impossible.","error")}
  finally{processing=false;send.disabled=false;send.textContent="🚀 ENVOYER AU CABARET"}
 });
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh()});
 window.addEventListener("online",()=>refresh());
 setInterval(refresh,5000);refresh();
})();