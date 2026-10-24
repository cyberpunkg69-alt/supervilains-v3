"use strict";
(() => {
 const root=document.getElementById("manu-tiktok-live");
 if(!root)return;
 const entries=document.getElementById("manu-tiktok-links");
 const intro=document.getElementById("manu-tiktok-intro");
 const api="https://nhmraocljiugwlgflhfn.supabase.co/functions/v1/manu-tiktok-live";
 const handles=new Set(["le.monde.du.cabar","miss.jazz.artiste","lemondeducabaret","sullypapillon1"]);
 const announced=new Set();
 let busy=false,hadResponse=false;
 const display=accounts=>{
  const current=Array.isArray(accounts)?accounts.filter(x=>x&&x.live&&handles.has(x.username)):[];
  root.hidden=current.length===0;
  if(!current.length){entries.replaceChildren();return}
  intro.textContent=current.length===1?"👑 MANU EST EN LIVE SUR TIKTOK !":"👑 MANU EST EN LIVE SUR "+current.length+" COMPTES TIKTOK !";
  entries.replaceChildren();
  for(const account of current){
   const id=account.username;
   const link=document.createElement("a");
   link.className="tiktok-live-link";
   link.href="https://www.tiktok.com/@"+id+"/live";
   link.target="_blank";link.rel="noopener noreferrer";
   link.textContent="🔴 Rejoindre @"+id+" ↗";
   link.setAttribute("aria-label","Rejoindre le LIVE TikTok de "+id);
   entries.append(link);
   const key=id+"|"+String(account.since||"");
   if(!announced.has(key)){
    announced.add(key);
    // Ne jamais annoncer un statut qui n'a pas été confirmé par le serveur.
    window.dispatchEvent(new CustomEvent("manu:tiktok-live-start",{
     detail:{username:id,since:String(account.since||"")}
    }));
   }
  }
  hadResponse=true;
 };
 async function refresh(){
  if(busy||document.visibilityState==="hidden")return;
  busy=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch(api,{cache:"no-store",signal:controller.signal});
   if(!response.ok)throw Error("Live indisponible");
   const data=await response.json();
   if(!data.ok||!Array.isArray(data.accounts))throw Error("Statut invalide");
   display(data.accounts);
  }catch{
   // Impossible de confirmer le LIVE : ne pas garder un faux voyant rouge.
   root.hidden=true;
  }finally{clearTimeout(timeout);busy=false}
 }
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh()});
 window.addEventListener("online",refresh);
 setInterval(refresh,20000);
 refresh();
})();