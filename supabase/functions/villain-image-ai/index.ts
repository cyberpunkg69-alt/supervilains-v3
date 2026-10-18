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
  if(m==="provider_quota_exhausted")return "Crédits ou limite de dépenses de l’API IA atteints. Vérifie Facturation et Limites sur platform.openai.com : réessayer immédiatement ne résoudra pas ce blocage.";
  if(m==="provider_verification_required")return "Le compte API doit être vérifié pour utiliser ce modèle d’images. Vérifie l’organisation sur platform.openai.com.";
  if(m==="provider_rate_limited")return "Limite de débit temporaire de l’API d’images. Attends quelques minutes avant un nouvel essai.";
  if(m==="provider_429_unknown")return "L’API d’images a répondu 429. Vérifie d’abord les crédits, limites de dépenses et limites de débit sur platform.openai.com avant de réessayer.";
  if(m==="provider_unauthorized")return "La clé IA ne permet pas d’accéder au modèle. Vérifie la clé et les autorisations dans Supabase.";
  if(m==="provider_invalid_request")return "La configuration de génération d’images n’est pas acceptée par l’API. L’administrateur doit vérifier le modèle et ses paramètres.";
  if(m==="provider_unavailable")return "L’API d’images est temporairement indisponible. Réessaie plus tard.";
  if(/rate limit|429/i.test(m))return "L’API d’images a refusé la demande. Vérifie ses limites et sa facturation avant de réessayer.";
  if(/billing|credit|insufficient_quota/i.test(m))return "Crédits IA insuffisants. Vérifie la facturation de l’API.";
  if(/401|invalid_api_key/i.test(m))return "Clé IA invalide : vérifie les secrets Supabase.";
  if(/content policy|safety|moderation/i.test(m))return "Le fournisseur IA a refusé cette image. Essaie une autre photo.";
  if(/timeout|abort/i.test(m))return "Temps de génération dépassé. Tu peux réessayer.";
  return "La génération de cette image a échoué. Réessaie plus tard.";
}
// Classify provider failures from structured code/type BEFORE using HTTP status.
// A 429 can represent insufficient credits or a spend cap, not just traffic.
function classifyProviderError(httpStatus, rawBody){
  let details={};
  try{
    const body=JSON.parse(rawBody);
    if(body&&typeof body.error==="object"&&body.error)details=body.error;
  }catch(_){}
  const code=String(details.code||"").toLowerCase().slice(0,100);
  const type=String(details.type||"").toLowerCase().slice(0,100);
  const message=String(details.message||"").toLowerCase().slice(0,500);
  const combined=code+" "+type+" "+message;
  let reason;
  if(/insufficient_quota|credit_balance_exhausted|organization_usage_limit_exceeded|organization_spend_limit_exceeded|project_spend_limit_exceeded|billing_hard_limit_reached|billing_not_active|out.of.credit|credit balance|billing|spend limit|exceeded your current quota|quota exceeded/i.test(combined)){
    reason="provider_quota_exhausted";
  }else if(/organization verification|verify your organization|must be verified|verification required/i.test(combined)){
    reason="provider_verification_required";
  }else if(httpStatus===401||httpStatus===403){
    reason="provider_unauthorized";
  }else if(httpStatus===429){
    reason=/rate.limit|too many requests|requests per minute|tokens per minute|images per minute|ipm|rpm/i.test(combined)
      ?"provider_rate_limited":"provider_429_unknown";
  }else if(httpStatus===400||httpStatus===404||httpStatus===422){
    reason="provider_invalid_request";
  }else if(httpStatus>=500){
    reason="provider_unavailable";
  }else{
    reason="provider_unavailable";
  }
  // Only operational metadata. Never log raw body, uploaded images or API keys.
  console.error("SUPERVILAINS_IMAGE_PROVIDER_REJECTED",{
    status:httpStatus,provider_code:code,provider_type:type,reason
  });
  return new Error(reason);
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
  throw classifyProviderError(response.status,body);
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
 if(body.action==="status"){
  // A key alone is not enough: validate the service_role database grants too.
  const {error:accessError}=await admin.from("custom_villains")
    .select("id",{head:true,count:"exact"}).eq("owner_user_id",info.user.id).limit(1);
  const ready=enabled&&!accessError;
  return send({configured:ready,
    info:accessError
      ?"Le serveur IA n'a pas accès aux fiches. Vérifier les droits SQL du service_role."
      :ready
        ?"Moteur IA prêt : 9 images maximum par joueur sur 24 h."
        :"Ajoute OPENAI_API_KEY dans les secrets Supabase pour activer les images."});
 }
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
 if(loadError){
  console.error("custom_villains service_role SELECT failed:",loadError.code||"db_error");
  return send({error:"Le serveur IA ne peut pas lire les fiches. Autorisations SQL à vérifier."},503);
 }
 if(!v)return send({error:"Super-vilain introuvable dans le compte actuellement connecté"},404);
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
