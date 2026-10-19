/* SUPERVILAINS V4.9 — Roster privé partagé entre le SOLO et l'ARÈNE.
   Un compte ne peut voir que ses propres personnages VALIDÉS.
   Aucune photo ni donnée personnelle n'est mise en cache public. */
(()=>{"use strict";
let previousUser=null,run=0,loading=false,lastFetch=0;
const validUUID=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||""));
const sendToGames=roster=>{
  window.SUPERVILAINS_SET_SOLO_CUSTOMS?.(roster);
  window.SUPERVILAINS_SET_ARENA_CUSTOMS?.(roster);
};
async function urlFor(db,path){
  if(!path||typeof path!=="string")return null;
  const {data,error}=await db.storage.from("villain-generated").createSignedUrl(path,3600);
  return error?null:data?.signedUrl||null;
}
async function refresh(force=false){
  const db=window.SUPERVILAINS_GET_ARENA_CLIENT?.();
  if(!db||loading)return;
  const current=++run;loading=true;
  try{
    const {data:auth,error:authError}=await db.auth.getUser();
    if(authError)throw authError;
    const userId=auth?.user?.id||null;
    if(!userId){
      previousUser=null;lastFetch=0;sendToGames([]);return;
    }
    if(!force&&userId===previousUser&&Date.now()-lastFetch<5*60*1000)return;
    const {data,error}=await db.from("custom_villains")
      .select("id,name,alias,description,weakness_label,weakness_object,danger_level,district,wanted_reason,voice_type,intro_line,taunt_line,capture_line,portrait_path,troll_path,capture_path,status")
      .eq("status","ready")
      .order("created_at",{ascending:false}).limit(10);
    if(error)throw error;
    const entries=Array.isArray(data)?data:[];
    // Les URL privées expirent après 1h et sont régénérées à chaque synchronisation.
    const roster=await Promise.all(entries.filter(row=>validUUID(row.id)).map(async row=>{
      if(!row.portrait_path||!row.troll_path||!row.capture_path)return null;
      const [portrait,troll,capture]=await Promise.all([
        urlFor(db,row.portrait_path),urlFor(db,row.troll_path),urlFor(db,row.capture_path)
      ]);
      if(!portrait||!troll||!capture)return null;
      return {
        id:row.id,name:String(row.name||"SUPER-VILAIN").slice(0,60),
        alias:String(row.alias||"").slice(0,80),
        description:String(row.description||"").slice(0,900),
        weakness_label:String(row.weakness_label||"Faille ultime").slice(0,120),
        weakness_object:String(row.weakness_object||"").slice(0,120),
        wanted_reason:String(row.wanted_reason||"").slice(0,350),
        danger_level:Math.max(1,Math.min(5,Number(row.danger_level)||2)),
        voice_type:String(row.voice_type||"comique"),
        intro_line:String(row.intro_line||"").slice(0,350),
        taunt_line:String(row.taunt_line||"").slice(0,350),
        capture_line:String(row.capture_line||"").slice(0,350),
        portrait,troll,capture
      };
    }));
    if(run!==current)return;
    previousUser=userId;lastFetch=Date.now();
    sendToGames(roster.filter(Boolean));
  }catch(err){
    // Une panne réseau ne doit pas effacer les captures SOLO ni forcer un logout.
    console.warn("SUPERVILAINS : personnages privés non synchronisés",err?.code||err?.message||"réseau");
  }finally{loading=false}
}
function start(){
  window.SUPERVILAINS_REFRESH_CUSTOMS=()=>refresh(true);
  window.addEventListener("supervilains:identity",()=>refresh(true));
  window.addEventListener("supervilains:custom-ready",()=>refresh(true));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh(true)});
  // Arena.js est chargé avant ce module, mais son auth peut être encore en cours.
  refresh(true);setTimeout(()=>refresh(true),1700);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();