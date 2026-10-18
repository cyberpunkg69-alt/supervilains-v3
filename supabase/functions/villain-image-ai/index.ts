// SUPERVILAINS 4.6 — One private, real GPT image edit per request.
// OPENAI_API_KEY belongs ONLY in Supabase Edge Function Secrets, never the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGIN="https://cyberpunkg69-alt.github.io";
const CORS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"};
const send=(payload,code=200)=>new Response(JSON.stringify(payload),{status:code,headers:CORS});
const MODEL="gpt-image-1.5";
function publicError(e){
  const m=String(e?.message||"Generation indisponible");
  if(/Quota de 9|Quota global|3 regenerations|deja en cours|deja creee|Photo source|Personnage introuvable|non autorise/i.test(m))return m;
  if(/rate limit|429/i.test(m))return "Trop de demandes IA. Réessaie dans quelques minutes.";
  if(/billing|credit|insufficient_quota/i.test(m))return "Crédits IA insuffisants. L'administrateur doit recharger le fournisseur.";
  if(/401|invalid_api_key/i.test(m))return "Clé IA invalide : vérifie les secrets Supabase.";
  if(/content policy|safety|moderation/i.test(m))return "Le fournisseur IA a refusé cette image. Essaie une autre photo.";
  if(/timeout|abort/i.test(m))return "Temps de génération dépassé. Tu peux réessayer.";
  return "La génération de cette image a échoué. Réessaie plus tard.";
}
function prompt(v,kind){
 const fixed=[
  "Image editing from attached photo. PRESERVE the SAME recognizable person's exact facial identity,",
  "glasses, hair, age, proportions, skin and clothing cues where relevant.",
  "This is a comedic FICTIONAL supervillain in SUPERVILAINS, a humorous cartoon videogame.",
  "Consistent high-end 3D animated game caricature, stylized and slightly exaggerated,",
  "cinematic studio lighting, dark navy background, glowing neon turquoise/fuchsia edges,",
  "clean bold composition, extremely sharp details, centered square 1:1 framing.",
  "One character only, no watermark, no real violence, no second person.",
  "Preserve exactly the same art direction in portrait, tongue-out and prisoner images.",
  "The character's game name is "+JSON.stringify(v.name.slice(0,60))+".",
  "Their alias is "+JSON.stringify((v.alias||"").slice(0,80))+"."
 ].join(" ");
 if(kind==="portrait")
  return fixed+" PORTRAIT: charismatic absurd comic supervillain, lively confident expression, face and shoulders, playful villain costume, crisp details. Absolutely no writing on the image.";
 if(kind==="troll")
  return fixed+" TROLLER: the SAME character and SAME identifiable face, close framing, exaggerated funny grimace, mouth wide open with TONGUE STICKING OUT FAR toward the viewer, the tongue MUST be clearly visible. Mischievous cartoon reaction, no text.";
 return fixed+" CAPTURE: the SAME unmistakable person dressed in a bright ORANGE STRIPED PRISONER JUMPSUIT, wrists up in front wearing clearly visible theatrical handcuffs, comically defeated and tearful expression, playful cartoon sadness. Both handcuffs and face visible. At the VERY BOTTOM add a big bold legible French badge with the EXACT TEXT: CAPTURÉ ! (accent on É, exclamation mark). No other text, no injury, no violence.";
}
function b64bytes(b64){
 if(typeof b64!=="string"||b64.length>24000000)throw Error("Réponse IA invalide");
 const raw=atob(b64),arr=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);
 const ascii=i=>String.fromCharCode(...arr.slice(i,i+4));
 if(arr.length<16||ascii(0)!=="RIFF"||ascii(8)!=="WEBP"||arr.length>16*1024*1024)
  throw Error("Image IA au format incorrect");
 return arr;
}
async function edit(key,blob,v,kind){
 const form=new FormData();
 form.append("model",MODEL);
 const filename=blob.type==="image/png"?"photo.png":blob.type==="image/webp"?"photo.webp":"photo.jpg";
 form.append("image[]",blob,filename);
 form.append("prompt",prompt(v,kind));
 form.append("size","1024x1024");
 form.append("quality","medium");
 form.append("output_format","webp");
 form.append("input_fidelity","high");
 form.append("n","1");
 const response=await fetch("https://api.openai.com/v1/images/edits",{
  method:"POST",headers:{"Authorization":"Bearer "+key},
  body:form,signal:AbortSignal.timeout(110000)
 });
 if(!response.ok){
  const body=await response.text();
  if(response.status===429)throw Error("429 rate limit");
  if(response.status===401||response.status===403)throw Error("401 invalid_api_key");
  if(/billing|insufficient_quota|balance|credit/i.test(body))throw Error("insufficient_quota");
  if(/policy|moderation|safety|not allowed/i.test(body))throw Error("content policy");
  throw Error("Provider HTTP "+response.status);
 }
 const body=await response.json();
 if(!body?.data?.[0]?.b64_json)throw Error("Réponse IA sans image");
 return b64bytes(body.data[0].b64_json);
}
Deno.serve(async request=>{
 if(request.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(request.method!=="POST")return send({error:"Méthode non autorisée"},405);
 const origin=request.headers.get("Origin");
 if(origin&&origin!==ORIGIN)return send({error:"Origine non autorisée"},403);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return send({error:"Configuration Supabase manquante"},503);
 const jwt=request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!jwt)return send({error:"Connexion ARÈNE requise"},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:info,error:authError}=await admin.auth.getUser(jwt);
 if(authError||!info?.user?.id)return send({error:"Session ARÈNE invalide"},401);
 let body;
 try{body=await request.json();}catch(_){return send({error:"JSON invalide"},400);}
 const key=Deno.env.get("OPENAI_API_KEY");
 const enabled=!!key&&Deno.env.get("AI_IMAGE_GENERATION_DISABLED")!=="true";
 if(body.action==="status")return send({configured:enabled,
  info:enabled?"Moteur IA prêt, limite de 9 images sur 24 h par joueur.":"Ajoute OPENAI_API_KEY dans Edge Function Secrets de Supabase."});
 if(body.action!=="generate")return send({error:"Action invalide"},400);
 if(!enabled)return send({error:"Moteur IA non encore activé : renseigne OPENAI_API_KEY dans Supabase > Edge Functions > Secrets."},503);
 const id=body.villain_id,kind=body.kind;
 if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ||!["portrait","troll","capture"].includes(kind)
  ||(body.regenerate!==undefined&&typeof body.regenerate!=="boolean"))
   return send({error:"Paramètres invalides"},400);
 const uid=info.user.id;
 const {data:v,error:loadError}=await admin.from("custom_villains")
  .select("id,owner_user_id,name,alias,source_photo_path,photo_permission_confirmed_at,portrait_path,troll_path,capture_path,regenerations_used")
  .eq("owner_user_id",uid).eq("id",id).maybeSingle();
 if(loadError||!v)return send({error:"Super-vilain introuvable"},404);
 if(!v.source_photo_path||!v.photo_permission_confirmed_at)return send({error:"Enregistre la photo originale avant la génération"},400);
 const {data:job,error:reserve}=await admin.rpc("custom_villain_begin_image_job",{
   p_user_id:uid,p_villain_id:id,p_kind:kind,p_regenerate:body.regenerate===true
 });
 if(reserve||!job)return send({error:publicError(reserve||Error("Réservation indisponible"))},409);
 try{
  const {data:photo,error:sourceError}=await admin.storage.from("villain-source").download(v.source_photo_path);
  if(sourceError||!photo||photo.size>8*1024*1024)throw Error("Photo source introuvable");
  const image=await edit(key,photo,v,kind);
  const path=uid+"/"+id+"/"+kind+".webp";
  const {error:storageError}=await admin.storage.from("villain-generated")
    .upload(path,image,{contentType:"image/webp",upsert:true,cacheControl:"60"});
  if(storageError)throw Error("Stockage IA indisponible");
  const {data:ok,error:finishError}=await admin.rpc("custom_villain_finish_image_job",{
    p_job_id:job,p_success:true,p_path:path
  });
  if(finishError||ok!==true)throw Error("Finalisation de l'image impossible");
  return send({ok:true,kind,image_path:path,villain_id:id});
 }catch(e){
  const message=publicError(e);
  try{await admin.rpc("custom_villain_finish_image_job",{
    p_job_id:job,p_success:false,p_error:message
  })}catch(_){}
  return send({error:message,kind},502);
 }
});
