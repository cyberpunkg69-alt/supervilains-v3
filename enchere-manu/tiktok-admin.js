"use strict";
(() => {
 const api="https://nhmraocljiugwlgflhfn.supabase.co/functions/v1/manu-tiktok-live";
 const list=document.getElementById("admin-tiktok-accounts");
 const code=document.getElementById("admin-tiktok-code");
 const note=document.getElementById("admin-tiktok-feedback");
 const rotateBtn=document.getElementById("admin-tiktok-rotate");
 const codeBox=document.getElementById("admin-tiktok-new-code-box");
 const generatedCode=document.getElementById("admin-tiktok-new-code");
 const copyBtn=document.getElementById("admin-tiktok-copy-code");
 const handles=["le.monde.du.cabar","miss.jazz.artiste","lemondeducabaret","sullypapillon1"];
 let accounts=[],busy=false;
 const notice=(s,err=false)=>{note.textContent=s;note.className="tiktok-admin-note"+(err?" is-error":"")};
 async function request(method,body){
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
  try{
   const r=await fetch(api,{method,cache:"no-store",signal:ctrl.signal,
    headers:body?{"Content-Type":"application/json"}:undefined,
    body:body?JSON.stringify(body):undefined});
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.message||"Service indisponible");
   return data;
  }finally{clearTimeout(timeout)}
 }
 function draw(){
  list.replaceChildren();
  for(const id of handles){
   const account=accounts.find(x=>x.username===id)||{username:id,live:false};
   const row=document.createElement("div");row.className="tiktok-admin-item";
   const label=document.createElement("div");
   const username=document.createElement("strong");username.textContent="@"+id;
   const status=document.createElement("small");
   status.className=account.live?"is-online":"";
   status.textContent=account.live?"🔴 EN LIVE":"⚫ Pas de LIVE confirmé";
   label.append(username,status);
   const link=document.createElement("a");link.href="https://www.tiktok.com/@"+id+"/live";
   link.target="_blank";link.rel="noopener noreferrer";link.textContent="Voir ↗";
   const button=document.createElement("button");button.type="button";button.disabled=busy;
   button.textContent=account.live?"⏹️ Terminer":"🔴 Annoncer le LIVE";
   button.addEventListener("click",()=>change(id,!account.live));
   row.append(label,link,button);list.append(row);
  }
 }
 async function refresh(){
  try{
   const result=await request("GET");
   accounts=result.accounts||[];
   draw();
  }catch(e){notice("Impossible de charger les statuts : "+e.message,true)}
 }
 async function change(username,live){
  const secret=code.value.trim();
  if(secret.length<18){notice("Entre d'abord le code privé de MANU.",true);code.focus();return}
  if(!confirm((live?"Annoncer le LIVE de @":"Terminer le LIVE de @")+username+" ?"))return;
  busy=true;draw();
  try{
   const result=await request("POST",{action:"set_live",username,live,code:secret});
   accounts=result.accounts||accounts;
   notice(result.changed?(live?
     "✅ LIVE annoncé ! Bandeau actif. Notification demandée pour les abonnés.":"✅ LIVE terminé : le bandeau est retiré."):
     "ℹ️ Ce compte possède déjà ce statut.");
  }catch(e){notice("Commande refusée : "+e.message,true)}
  finally{busy=false;draw()}
 }
 rotateBtn.addEventListener("click",async()=>{
  const previous=code.value.trim();
  if(previous.length<18){
   notice("Saisis d'abord ton code privé actuel dans le champ au-dessus.",true);
   code.focus();return;
  }
  if(!confirm("Remplacer immédiatement ton code privé actuel ? L'ancien cessera de fonctionner. Le nouveau sera affiché une seule fois."))return;
  busy=true;rotateBtn.disabled=true;draw();
  try{
   const result=await request("POST",{action:"rotate_code",code:previous});
   if(typeof result.new_code!=="string"||!/^[a-f0-9]{64}$/.test(result.new_code))
    throw Error("Réponse du serveur inattendue : vérifie les commandes privées.");
   generatedCode.value=result.new_code;
   code.value=result.new_code;
   codeBox.hidden=false;
   notice("✅ Nouveau code activé ! Copie-le et sauvegarde-le maintenant. L'ancien est désactivé.");
   generatedCode.focus();generatedCode.select();
  }catch(e){
   notice("Changement du code impossible : "+e.message,true);
  }finally{busy=false;rotateBtn.disabled=false;draw()}
 });
 copyBtn.addEventListener("click",async()=>{
  if(!generatedCode.value)return;
  try{
   if(!navigator.clipboard||!window.isSecureContext)throw Error("no-clipboard");
   await navigator.clipboard.writeText(generatedCode.value);
   notice("✅ Nouveau code copié ! Sauvegarde-le dans un gestionnaire de mots de passe.");
  }catch{
   generatedCode.focus();generatedCode.select();
   notice("Sélectionne le texte du code et utilise Copier pour le conserver.");
  }
 });
 document.getElementById("admin-tiktok-refresh").addEventListener("click",refresh);
 setInterval(()=>{if(!busy&&document.visibilityState==="visible")refresh()},30000);
 refresh();
})();