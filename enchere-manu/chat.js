"use strict";
(()=>{
 const API="https://nhmraocljiugwlgflhfn.supabase.co/functions/v1/manu-chat";
 const $=id=>document.getElementById(id);
 const wall=$("chat-feed"),form=$("chat-form");if(!wall||!form)return;
 const nick=$("chat-nickname"),body=$("chat-text"),file=$("chat-photo"),feedback=$("chat-feedback");
 const send=$("chat-submit"),picker=$("chat-emoji-picker"),toggle=$("chat-emoji-toggle");
 const preview=$("chat-photo-preview"),picture=$("chat-preview-image"),older=$("chat-older"),jump=$("chat-unread");
 const gifToggle=$("chat-gif-toggle"),gifPanel=$("chat-gif-panel"),gifSearch=$("chat-gif-search"),gifQuery=$("chat-gif-query");
 const gifResults=$("chat-gif-results"),gifUrlInput=$("chat-gif-url"),gifUseLink=$("chat-gif-use-url");
 const gifChoice=$("chat-gif-choice"),gifChoiceImage=$("chat-gif-choice-image"),gifClear=$("chat-gif-clear");
 const GIF_API="https://nhmraocljiugwlgflhfn.supabase.co/functions/v1/manu-gifs";
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
  if(!f.type.startsWith("image/")||f.size>(f.type==="image/gif"?8*1024*1024:15e6)){note("Photo : 15 Mo maximum, GIF animé : 8 Mo maximum.","error");clearPhoto();return}
  imagePreview=URL.createObjectURL(f);picture.src=imagePreview;preview.hidden=false;
 });
 $("chat-remove-photo").addEventListener("click",clearPhoto);
 async function compress(f){
  if(f.type==="image/gif"||/\.gif$/i.test(f.name)){
   if(f.size>8*1024*1024)throw Error("GIF trop volumineux (8 Mo maximum).");
   return f;
  }
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

 // GIFs : GIF animés sur l'appareil, recherche ouverte et liens GIPHY.
 function trustedGif(input){
  if(typeof input!=="string"||input.length>1400)return null;
  try{
   const raw=input.replace(/[),.!?;]+$/,"");
   const u=new URL(raw);
   if(u.protocol!=="https:"||u.username||u.password)return null;
   const h=u.hostname.toLowerCase();
   if(h==="giphy.com"||h==="www.giphy.com"){
    const m=u.pathname.match(/\/gifs\/(?:[^/]*?-)?([A-Za-z0-9]{8,40})\/?$/);
    return m?"https://media.giphy.com/media/"+m[1]+"/giphy.gif":null;
   }
   if(/^media\d*\.giphy\.com$/.test(h)){
    const m=u.pathname.match(/^\/media\/([A-Za-z0-9]{8,40})\//);
    return m?"https://media.giphy.com/media/"+m[1]+"/giphy.gif":null;
   }
   if(["upload.wikimedia.org","web.archive.org","gifcities.archive.org"].includes(h)&&
     /\.gif(?:[/?#]|$)/i.test(u.href))return u.href;
  }catch{}
  return null;
 }
 let lastGif=null,gifFetchToken=0,gifSearchTimer=null;
 const clearGifChoice=()=>{
  lastGif=null;
  gifChoice.hidden=true;
  gifChoiceImage.removeAttribute("src");
 };
 gifClear.addEventListener("click",()=>{
  if(lastGif)body.value=body.value.replace(lastGif,"").trim();
  body.dispatchEvent(new Event("input"));
  clearGifChoice();
 });
 function chooseGif(raw){
  const url=trustedGif(raw);
  if(!url){note("Lien GIF non reconnu. Choisis un GIF GIPHY, GifCities ou Wikimedia.","error");return;}
  const proposal=(body.value.trim()+" "+url).trim();
  if(Array.from(proposal).length>500){note("Trop de texte : 500 caractères maximum.","error");return;}
  if(lastGif)body.value=body.value.replace(lastGif,"").trim();
  body.value=(body.value.trim()+" "+url).trim();
  body.dispatchEvent(new Event("input"));
  lastGif=url;gifChoiceImage.src=url;gifChoice.hidden=false;
  gifPanel.hidden=true;gifToggle.setAttribute("aria-expanded","false");
  note("✅ GIF sélectionné ! Ajoute un texte si tu veux, puis envoie.","success");
 }
 gifToggle.addEventListener("click",()=>{
  gifPanel.hidden=!gifPanel.hidden;
  gifToggle.setAttribute("aria-expanded",String(!gifPanel.hidden));
  if(!gifPanel.hidden && !gifResults.dataset.loaded)searchGif("funny");
 });
 gifUseLink.addEventListener("click",()=>chooseGif(gifUrlInput.value.trim()));
 $("chat-giphy-open").addEventListener("click",()=>{
  const q=gifQuery.value.trim()||"funny";
  window.open("https://giphy.com/search/"+encodeURIComponent(q),"_blank","noopener,noreferrer");
 });
 async function searchGif(query){
  const searchId=++gifFetchToken;
  const q=query.trim().slice(0,50)||"funny";
  gifResults.dataset.loaded="1";
  gifResults.replaceChildren();
  const label=document.createElement("p");label.className="chat-gif-info";label.textContent="🔎 Recherche de GIF animés…";
  gifResults.append(label);
  try{
   const ctrl=new AbortController();
   const timeout=setTimeout(()=>ctrl.abort(),11000);
   let r;
   try{r=await fetch(GIF_API+"?q="+encodeURIComponent(q),{cache:"no-store",signal:ctrl.signal})}
   finally{clearTimeout(timeout)}
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.message||"Recherche indisponible");
   if(searchId!==gifFetchToken)return;
   gifResults.replaceChildren();
   const items=Array.isArray(data.items)?data.items:[];
   if(!items.length){
    label.textContent="Aucun résultat libre pour cette recherche. Tu peux chercher sur GIPHY et coller le lien.";
    gifResults.append(label);return;
   }
   items.forEach(item=>{
    const url=trustedGif(item.url);if(!url)return;
    const b=document.createElement("button");b.type="button";b.className="chat-gif-tile";
    b.title="Choisir ce GIF · "+String(item.source||"");
    const img=document.createElement("img");img.loading="lazy";img.src=url;
    img.alt=String(item.title||"GIF animé").slice(0,90);
    b.append(img);
    const small=document.createElement("small");small.textContent=String(item.source||"GIF");
    b.append(small);b.addEventListener("click",()=>chooseGif(url));gifResults.append(b);
   });
   if(!gifResults.childElementCount){label.textContent="Aucun GIF compatible reçu.";gifResults.append(label)}
  }catch(e){
   if(searchId!==gifFetchToken)return;
   gifResults.replaceChildren();
   label.textContent="Recherche indisponible pour le moment. Tu peux toujours coller un GIF GIPHY ou envoyer un fichier .gif.";
   gifResults.append(label);
  }
 }
 gifSearch.addEventListener("click",()=>searchGif(gifQuery.value));
 gifQuery.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchGif(gifQuery.value)}});
 gifQuery.addEventListener("input",()=>{
  if(gifSearchTimer)clearTimeout(gifSearchTimer);
  gifSearchTimer=setTimeout(()=>{if(!gifPanel.hidden)searchGif(gifQuery.value)},650);
 });


 // Messages vocaux de 15 s : Safari iPhone (MP4/AAC) et Chrome Android (WebM/Opus).
 const voiceToggle=$("chat-voice-toggle"),voicePanel=$("chat-voice-panel");
 const voiceTimer=$("chat-voice-timer"),voiceProgress=$("chat-voice-progress");
 const voiceStatus=$("chat-voice-status"),voicePreview=$("chat-voice-preview");
 const voiceDelete=$("chat-voice-delete");
 const voiceSupported=Boolean(window.isSecureContext&&navigator.mediaDevices?.getUserMedia&&window.MediaRecorder);
 let voiceRecorder=null,voiceStream=null,voiceBlob=null,voicePreviewURL=null,voiceSeconds=0;
 let voiceStarted=0,voiceInterval=null,voiceTimeout=null,voiceChunks=[],voiceDiscard=false,voiceError=false;
 const meter=seconds=>{
  const n=Math.min(15,Math.max(0,seconds));
  voiceTimer.textContent="00:"+String(Math.floor(n)).padStart(2,"0")+" / 00:15";
  voiceProgress.style.width=Math.min(100,n/15*100)+"%";
 };
 const releaseMicro=()=>{
  if(voiceInterval){clearInterval(voiceInterval);voiceInterval=null}
  if(voiceTimeout){clearTimeout(voiceTimeout);voiceTimeout=null}
  if(voiceStream){voiceStream.getTracks().forEach(t=>t.stop());voiceStream=null}
  file.disabled=false;
 };
 const discardVoice=()=>{
  if(voicePreviewURL){URL.revokeObjectURL(voicePreviewURL);voicePreviewURL=null}
  voiceBlob=null;voiceSeconds=0;
  voicePreview.pause();voicePreview.removeAttribute("src");voicePreview.load();
  voicePreview.hidden=true;meter(0);
 };
 const voiceStatusText=t=>{voiceStatus.textContent=t};
 function stopVoice(){
  if(voiceRecorder?.state!=="inactive"){
   try{voiceRecorder.stop()}catch{}
  }
 }
 function clearVoice(){
  if(voiceRecorder){voiceDiscard=true;stopVoice()}
  discardVoice();
  if(!voiceRecorder){
   voicePanel.hidden=true;voiceToggle.textContent="🎙️ Message vocal";
   voiceToggle.classList.remove("is-recording");voiceToggle.setAttribute("aria-expanded","false");
  }
 }
 if(!voiceSupported){
  voiceToggle.disabled=true;voiceToggle.title="Utilise Safari sur iPhone ou Chrome sur Android et autorise le micro.";
  voiceStatusText("Enregistrement non disponible dans ce navigateur.");
 }
 voiceToggle.addEventListener("click",async()=>{
  if(!voiceSupported||processing)return;
  if(voiceRecorder){voiceStatusText("Préparation du vocal…");stopVoice();return}
  if(file.files?.length){note("Retire d'abord la photo ou le GIF local avant d'enregistrer.","error");return}
  if(voiceBlob)discardVoice();
  let stream;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(processing){stream.getTracks().forEach(t=>t.stop());return}
   const types=["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/ogg"];
   const preferred=types.find(t=>MediaRecorder.isTypeSupported?.(t));
   const options=preferred?{mimeType:preferred,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000};
   let rec;try{rec=new MediaRecorder(stream,options)}catch{rec=new MediaRecorder(stream)}
   voiceStream=stream;voiceRecorder=rec;voiceChunks=[];voiceDiscard=false;voiceError=false;
   voicePreview.hidden=true;voicePanel.hidden=false;voiceStarted=0;meter(0);
   voiceToggle.classList.add("is-recording");voiceToggle.textContent="⏹️ Arrêter le vocal";
   voiceToggle.setAttribute("aria-expanded","true");voiceStatusText("🔴 Enregistrement… parle à MANU !");
   send.disabled=true;file.disabled=true;
   rec.ondataavailable=e=>{if(e.data?.size)voiceChunks.push(e.data)};
   rec.onerror=()=>{voiceError=true;voiceStatusText("Erreur pendant l'enregistrement.");};
   rec.onstop=()=>{
    const elapsed=voiceStarted?performance.now()-voiceStarted:0;
    const parts=voiceChunks.slice(),kind=rec.mimeType||parts[0]?.type||preferred||"";
    const mime=kind.startsWith("audio/mp4")?"audio/mp4":kind.startsWith("audio/ogg")?"audio/ogg":
      kind.startsWith("audio/webm")?"audio/webm":"";
    voiceRecorder=null;releaseMicro();
    voiceToggle.classList.remove("is-recording");voiceToggle.textContent="🎙️ Refaire un vocal";
    voiceToggle.setAttribute("aria-expanded","false");
    if(!processing)send.disabled=false;
    if(voiceDiscard||voiceError||!parts.length||!mime){
     discardVoice();
     if(voiceDiscard){voicePanel.hidden=true;voiceToggle.textContent="🎙️ Message vocal";}
     else voiceStatusText("Enregistrement impossible. Essaie Chrome ou Safari.");
     return;
    }
    const result=new Blob(parts,{type:mime});
    if(result.size<512||result.size>3*1024*1024){
     discardVoice();voiceStatusText("Vocal vide ou supérieur à 3 Mo.");return;
    }
    voiceSeconds=Math.min(15,Math.max(1,Math.ceil(elapsed/1000)));
    voiceBlob=result;voicePreviewURL=URL.createObjectURL(result);
    voicePreview.src=voicePreviewURL;voicePreview.hidden=false;
    voiceStatusText("✅ Vocal prêt ("+voiceSeconds+" s). Écoute-le avant d'envoyer !");
    meter(voiceSeconds);
   };
   rec.start();
   voiceStarted=performance.now();
   voiceInterval=setInterval(()=>meter((performance.now()-voiceStarted)/1000),200);
   voiceTimeout=setTimeout(stopVoice,15000);
  }catch(err){
   if(stream)stream.getTracks().forEach(t=>t.stop());
   releaseMicro();voiceRecorder=null;voiceToggle.classList.remove("is-recording");
   voiceToggle.setAttribute("aria-expanded","false");voiceToggle.textContent="🎙️ Message vocal";
   if(!processing)send.disabled=false;
   voicePanel.hidden=false;
   voiceStatusText("Micro refusé ou indisponible. Autorise-le dans Chrome/Safari.");
   note("Accès au micro impossible : "+(err?.name==="NotAllowedError"?"autorisation refusée.":"vérifie le navigateur."),"error");
  }
 });
 voiceDelete.addEventListener("click",()=>{clearVoice();note("Vocal annulé.","success")});
 file.addEventListener("change",()=>{if(file.files?.length&&voiceBlob)clearVoice()});

 const nearEnd=()=>wall.scrollHeight-wall.scrollTop-wall.clientHeight<140;
 function photoUrl(str){
  if(typeof str!=="string")return null;
  try{
   const u=new URL(str);return u.protocol==="https:"&&u.hostname==="nhmraocljiugwlgflhfn.supabase.co"&&
     u.pathname.startsWith("/storage/v1/object/public/manu-chat-photos/photos/")?u.href:null;
  }catch{return null}
 }
 function voiceUrl(str){
  if(typeof str!=="string")return null;
  try{
   const u=new URL(str);
   return u.protocol==="https:"&&u.hostname==="nhmraocljiugwlgflhfn.supabase.co"&&
     /^\/storage\/v1\/object\/public\/manu-chat-voices\/voices\/[a-f0-9-]{36}\.(webm|ogg|m4a)$/.test(u.pathname)
     ?u.href:null;
  }catch{return null}
 }
 function line(m){
  const box=document.createElement("article");box.className="chat-message";box.dataset.chatId=String(m.id);
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
  if(m.text){
   const matches=String(m.text).match(/https?:\/\/[^\s<>"']+/g)||[];
   let visible=String(m.text),gifLink=null;
   for(const candidate of matches){
    const url=trustedGif(candidate);
    if(url&&!gifLink){gifLink=url;visible=visible.replace(candidate,"").trim()}
   }
   if(visible){const p=document.createElement("p");p.className="chat-body";p.textContent=visible;pane.append(p)}
   if(gifLink){
    const a=document.createElement("a");a.className="chat-image-link";a.href=gifLink;
    a.target="_blank";a.rel="noopener noreferrer";
    const img=document.createElement("img");img.src=gifLink;img.loading="lazy";
    img.className="chat-image";img.alt="GIF animé partagé par "+m.nickname;
    a.append(img);pane.append(a);
    const source=document.createElement("small");source.className="chat-gif-source";
    source.textContent=gifLink.includes("giphy.com")?"GIF via GIPHY":"GIF animé · bibliothèque ouverte";
    pane.append(source);
   }
  }
  const url=photoUrl(m.photo_url);
  if(url){
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";
   a.className="chat-image-link";a.title="Agrandir la photo";
   const image=document.createElement("img");image.src=url;image.loading="lazy";image.className="chat-image";
   image.alt="Photo envoyée par "+m.nickname;a.append(image);pane.append(a);
  }
  const recording=voiceUrl(m.voice_url);
  if(recording){
   const container=document.createElement("div");container.className="chat-voice-message";
   const title=document.createElement("strong");title.textContent="🎙️ Message vocal · 15 s max";
   const player=document.createElement("audio");player.controls=true;player.preload="none";
   player.src=recording;player.setAttribute("aria-label","Écouter le vocal de "+m.nickname);
   container.append(title,player);pane.append(container);
  }
  box.append(avatar,pane);return box;
 }
 function render(force=false,keepTop=false){
  const s=messages.map(m=>m.id).join(",");
  if(s===signature&&!force)return;
  const wasBottom=nearEnd(),oldHeight=wall.scrollHeight,oldTop=wall.scrollTop;
  const initial=signature===null;signature=s;
  // Conserver les lecteurs audio existants pendant les mises à jour du chat.
  // Recréer le DOM toutes les 5 secondes interromprait la lecture d'un vocal.
  const existing=new Map([...wall.querySelectorAll("article.chat-message[data-chat-id]")]
    .map(el=>[el.dataset.chatId,el]));
  const wanted=new Set(messages.map(m=>String(m.id)));
  for(const [id,node] of existing){
   if(!wanted.has(id)){node.remove();existing.delete(id)}
  }
  if(!messages.length){
   wall.replaceChildren();
   const p=document.createElement("p");p.className="chat-empty";
   p.textContent="🎤 Aucun message… Qui va chambrer MANU en premier ? 😂";wall.append(p);
  }else{
   for(const child of [...wall.children])if(!child.classList.contains("chat-message"))child.remove();
   messages.forEach((m,i)=>{
    const id=String(m.id);
    if(existing.has(id))return;
    const next=messages.slice(i+1).map(item=>existing.get(String(item.id)))
      .find(el=>el&&el.isConnected);
    const element=line(m);
    if(next)wall.insertBefore(element,next);
    else wall.append(element);
    existing.set(id,element);
   });
  }
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
  if(voiceRecorder){note("Arrête l'enregistrement avant d'envoyer.","error");return}
  if(f&&voiceBlob){note("Choisis une photo ou un message vocal, pas les deux.","error");return}
  if(Array.from(t).length>500||(!t&&!f&&!voiceBlob)){note("Écris un texte, sélectionne une photo ou enregistre un vocal.","error");return}
  processing=true;send.disabled=true;send.textContent="⏳ ENVOI…";
  try{
   const data=new FormData();data.set("nickname",n);data.set("text",t);data.set("token",token);
   if(f){note(f.type==="image/gif"?"Envoi du GIF animé…":"Compression et envoi de la photo…");data.set("photo",await compress(f))}
   if(voiceBlob){
    const ext=voiceBlob.type==="audio/mp4"?"m4a":voiceBlob.type==="audio/ogg"?"ogg":"webm";
    data.set("voice",new File([voiceBlob],"message-vocal."+ext,{type:voiceBlob.type}));
    data.set("voice_seconds",String(voiceSeconds));
    note("Envoi de ton message vocal…");
   }
   const result=await api("POST",data);set("manu-chat-nickname",n);set("manu-auction-pseudo",n);
   const other=$("nickname");if(other&&!other.value.trim())other.value=n;
   body.value="";body.dispatchEvent(new Event("input"));clearPhoto();clearGifChoice();clearVoice();
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