/* SUPERVILAINS V4.16 — Portraits privés rapides sur l'appareil.
   Cache IndexedDB limité au compte connecté, dérivés WebP, aucun stockage
   dans le Service Worker public, suppression à la déconnexion.
   Les originaux restent uniquement dans les buckets privés Supabase. */
(()=>{"use strict";
let previousUser=null,activeUser=null,run=0,loading=false,lastFetch=0,queued=false;
let warming=false;
const localUrls=new Map(),signedUrls=new Map();
const DB_NAME="supervilains-private-portraits-v1",TABLE="pictures";
const validUUID=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||""));
const sendToGames=roster=>{
  window.SUPERVILAINS_SET_SOLO_CUSTOMS?.(roster);
  window.SUPERVILAINS_SET_ARENA_CUSTOMS?.(roster);
};
function openCache(){
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window))return reject(Error("Stockage local indisponible"));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(TABLE)){
        const store=db.createObjectStore(TABLE,{keyPath:"key"});
        store.createIndex("owner","owner",{unique:false});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||Error("IndexedDB"));
    request.onblocked=()=>reject(Error("IndexedDB occupée"));
  });
}
async function cachedBlob(key){
  const db=await openCache();
  return new Promise(resolve=>{
    let result=null;
    try{
      const tx=db.transaction(TABLE,"readonly");
      const req=tx.objectStore(TABLE).get(key);
      req.onsuccess=()=>{result=req.result?.blob||null;};
      tx.oncomplete=()=>{db.close();resolve(result);};
      tx.onerror=()=>{db.close();resolve(null);};
      tx.onabort=()=>{db.close();resolve(null);};
    }catch(e){db.close();resolve(null);}
  });
}
async function saveBlob(key,owner,blob){
  const db=await openCache();
  return new Promise(resolve=>{
    try{
      const tx=db.transaction(TABLE,"readwrite");
      tx.objectStore(TABLE).put({key,owner,blob,storedAt:Date.now()});
      tx.oncomplete=()=>{db.close();resolve(true);};
      tx.onerror=()=>{db.close();resolve(false);};
      tx.onabort=()=>{db.close();resolve(false);};
    }catch(e){db.close();resolve(false);}
  });
}
async function clearPrivateCache(owner){
  if(!owner)return;
  try{
    const db=await openCache();
    await new Promise(resolve=>{
      try{
        const tx=db.transaction(TABLE,"readwrite"),store=tx.objectStore(TABLE);
        const request=store.index("owner").getAllKeys(owner);
        request.onsuccess=()=>{for(const key of request.result||[])store.delete(key);};
        tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;
      }catch(e){resolve();}
    });
    db.close();
  }catch(e){}
}
function releaseMemory(){
  for(const url of localUrls.values())URL.revokeObjectURL(url);
  localUrls.clear();signedUrls.clear();
}
function invalidateAccount(){
  const old=activeUser||previousUser;
  activeUser=null;previousUser=null;lastFetch=0;++run;
  releaseMemory();sendToGames([]);
  // L'appareil peut être partagé : ne pas conserver les portraits après déconnexion.
  if(old)clearPrivateCache(old);
}
function pictureKey(uid,row,kind){
  const path=String(row[kind+"_path"]||"");
  return uid+":"+row.id+":"+kind+":"+path+":"+String(row.updated_at||"");
}
function localUrl(key,blob){
  if(localUrls.has(key))return localUrls.get(key);
  const url=URL.createObjectURL(blob);
  localUrls.set(key,url);
  return url;
}
async function signedUrl(db,path,key){
  const existing=signedUrls.get(key);
  if(existing?.expiry>Date.now()+120000)return existing.url;
  try{
    const {data,error}=await db.storage.from("villain-generated").createSignedUrl(path,3600);
    if(!error&&data?.signedUrl){
      signedUrls.set(key,{url:data.signedUrl,expiry:Date.now()+50*60*1000});
      return data.signedUrl;
    }
  }catch(e){}
  return null;
}
// La copie appareil est plafonnée en taille, sans changer l'original Supabase.
async function optimize(blob,kind){
  if(!blob||!blob.size||!blob.type.startsWith("image/"))return null;
  if(!("createImageBitmap" in window))return blob.size<=2*1024*1024?blob:null;
  let image;
  try{
    image=await createImageBitmap(blob);
    const maxSize=kind==="portrait"?640:800;
    const factor=Math.min(1,maxSize/Math.max(image.width,image.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(image.width*factor));
    canvas.height=Math.max(1,Math.round(image.height*factor));
    const ctx=canvas.getContext("2d",{alpha:false});
    if(!ctx)return null;
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const optimized=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",.84));
    // Certains anciens navigateurs n'acceptent pas WebP en sortie.
    if(optimized?.size&&optimized.type==="image/webp"&&optimized.size<=3*1024*1024)return optimized;
    return blob.size<=2*1024*1024?blob:null;
  }catch(e){
    return blob.size<=2*1024*1024?blob:null;
  }finally{try{image?.close();}catch(e){}}
}
async function prewarm(db,uid,jobs){
  if(warming||!jobs.length)return;
  warming=true;let index=0,saved=0;
  const worker=async()=>{
    while(index<jobs.length&&activeUser===uid){
      const job=jobs[index++];
      try{
        // Les téléchargements passent par l'authentification Supabase et ses règles RLS.
        const {data,error}=await db.storage.from("villain-generated").download(job.path);
        if(error||!data||activeUser!==uid)continue;
        const compressed=await optimize(data,job.kind);
        if(!compressed||activeUser!==uid)continue;
        if(await saveBlob(job.key,uid,compressed))saved++;
      }catch(e){/* URL signée utilisable, essai au prochain rafraîchissement */}
    }
  };
  try{await Promise.all([worker(),worker()]);}
  finally{
    warming=false;
    if(activeUser!==uid){await clearPrivateCache(uid);return;}
    // Recharge les objets locaux, une fois le lot terminé et sans recharger la page.
    if(saved)refresh(true);
  }
}
async function refresh(force=false){
  const db=window.SUPERVILAINS_GET_ARENA_CLIENT?.();
  if(!db)return;
  if(loading){queued=true;return;}
  const current=++run;loading=true;
  let warmJobs=[];
  try{
    const {data:auth,error:authError}=await db.auth.getUser();
    if(authError)throw authError;
    const uid=auth?.user?.id||null;
    if(!uid){invalidateAccount();return;}
    if(activeUser&&activeUser!==uid)invalidateAccount();
    activeUser=uid;
    if(!force&&uid===previousUser&&Date.now()-lastFetch<5*60*1000)return;
    const {data,error}=await db.from("custom_villains")
      .select("id,name,alias,description,weakness_label,weakness_object,danger_level,district,wanted_reason,voice_type,intro_line,taunt_line,capture_line,portrait_path,troll_path,capture_path,status,updated_at")
      .eq("status","ready").order("created_at",{ascending:false}).limit(10);
    if(error)throw error;
    const entries=(Array.isArray(data)?data:[]).filter(row=>validUUID(row.id));
    const roster=await Promise.all(entries.map(async row=>{
      if(!row.portrait_path||!row.troll_path||!row.capture_path)return null;
      const urls=await Promise.all(["portrait","troll","capture"].map(async kind=>{
        const key=pictureKey(uid,row,kind),path=row[kind+"_path"];
        let blob=null;
        try{blob=await cachedBlob(key);}catch(e){}
        if(blob)return localUrl(key,blob);
        const remote=await signedUrl(db,path,key);
        if(remote)warmJobs.push({key,path,kind});
        return remote;
      }));
      if(urls.some(u=>!u))return null;
      return {
        id:row.id,name:String(row.name||"SUPER-VILAIN").slice(0,60),
        alias:String(row.alias||"").slice(0,80),
        district:String(row.district||"").trim().slice(0,80),
        description:String(row.description||"").slice(0,900),
        weakness_label:String(row.weakness_label||"Faille ultime").slice(0,120),
        weakness_object:String(row.weakness_object||"").slice(0,120),
        wanted_reason:String(row.wanted_reason||"").slice(0,350),
        danger_level:Math.max(1,Math.min(5,Number(row.danger_level)||2)),
        voice_type:String(row.voice_type||"comique"),
        intro_line:String(row.intro_line||"").slice(0,350),
        taunt_line:String(row.taunt_line||"").slice(0,350),
        capture_line:String(row.capture_line||"").slice(0,350),
        portrait:urls[0],troll:urls[1],capture:urls[2]
      };
    }));
    if(run!==current||activeUser!==uid)return;
    previousUser=uid;lastFetch=Date.now();
    sendToGames(roster.filter(Boolean));
    // Nettoyage des URLs devenues inutiles (image remplacée / création supprimée).
    const keys=new Set(entries.flatMap(row=>["portrait","troll","capture"].map(kind=>pictureKey(uid,row,kind))));
    for(const [key,url] of localUrls)if(!keys.has(key)){URL.revokeObjectURL(url);localUrls.delete(key);}
    for(const key of signedUrls.keys())if(!keys.has(key))signedUrls.delete(key);
  }catch(err){
    // Réseau interrompu : ne pas effacer la progression ni les portraits visibles.
    console.warn("SUPERVILAINS : synchronisation des portraits",err?.code||err?.message||"réseau");
  }finally{
    loading=false;
    if(queued){queued=false;setTimeout(()=>refresh(true),0);}
  }
  if(activeUser&&warmJobs.length&&!warming)prewarm(db,activeUser,warmJobs);
}
function start(){
  window.SUPERVILAINS_REFRESH_CUSTOMS=()=>refresh(true);
  window.addEventListener("supervilains:identity",event=>{
    if(!event.detail?.id)invalidateAccount();
    refresh(true);
  });
  window.addEventListener("supervilains:custom-ready",()=>refresh(true));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh(true);});
  refresh(true);setTimeout(()=>refresh(true),1700);
  // Les copies locales ne dépendent plus du renouvellement d'URLs signées.
  setInterval(()=>{if(!document.hidden)refresh(true);},25*60*1000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();
