/* SUPERVILAINS V4.5 — Créateur privé de super-vilains et photos Supabase.
   La génération IA portrait/troll/capture n'est PAS encore activée. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const FIELDS={
  name:"creator-name",alias:"creator-alias",description:"creator-description",
  weakness_label:"creator-weakness",weakness_object:"creator-weakness-object",
  danger_level:"creator-danger",district:"creator-district",
  wanted_reason:"creator-wanted",voice_type:"creator-voice",
  intro_line:"creator-intro",taunt_line:"creator-taunt",capture_line:"creator-capture"
};
let db=null,user=null,rows=[],editingId=null,editingRow=null,busy=false,
    photoObjectUrl=null,currentImageUrl=null,requestSequence=0;
const isCreatorVisible=()=>!!document.querySelector("#view-creator.active");
const setVisible=(id,visible)=>{const el=$(id);if(el)el.hidden=!visible;};
const status=(s,kind="")=>{
  const el=$("creator-alert");if(!el)return;
  el.className="creator-alert"+(kind?" "+kind:"");el.textContent=s;
};
const setSaveStatus=s=>{if($("creator-save-status"))$("creator-save-status").textContent=s;};
const errorMessage=e=>{
  const msg=String(e?.message||"Erreur de connexion. Réessaie.").replace(/^Error:\s*/,"");
  if(/JWT expired|invalid JWT|not authenticated|Connexion requise|refresh_token/i.test(msg))
    return "Session expirée. Reconnecte-toi à l'ARÈNE puis reviens dans le laboratoire.";
  return msg;
};
const getClient=()=>window.SUPERVILAINS_GET_ARENA_CLIENT?.()||null;
const rpc=async(fn,args)=>{
  const {data,error}=await db.rpc(fn,args);if(error)throw error;return data;
};
function setBusy(value){
  busy=value;
  ["creator-save","creator-refresh","creator-new","creator-photo","creator-consent"].forEach(id=>{
    if($(id))$(id).disabled=value;
  });
  if($("creator-save"))$("creator-save").textContent=value?"⏳ ENREGISTREMENT EN COURS…":
    editingId?"💾 ENREGISTRER LES MODIFICATIONS":"💾 ENREGISTRER MON SUPER-VILAIN";
}
function fillPreview(url){
  const img=$("creator-photo-preview"),placeholder=$("creator-photo-placeholder");
  if(!img)return;
  if(url){img.src=url;img.hidden=false;if(placeholder)placeholder.hidden=true}
  else{img.removeAttribute("src");img.hidden=true;if(placeholder)placeholder.hidden=false}
}
function forgetLocalImage(){
  if(photoObjectUrl){URL.revokeObjectURL(photoObjectUrl);photoObjectUrl=null;}
}
function resetForm(){
  forgetLocalImage();currentImageUrl=null;editingId=null;editingRow=null;
  $("creator-form").reset();$("creator-photo").value="";
  $("creator-voice").value="comique";$("creator-danger").value="2";
  $("creator-consent").checked=false;fillPreview(null);setSaveStatus("");
  setBusy(false);
}
function payloadFromForm(){
  const payload={photo_permission:true};
  for(const [field,id] of Object.entries(FIELDS))payload[field]=String($(id).value??"").trim();
  payload.danger_level=Number($("creator-danger").value);
  return payload;
}
function validateForm(){
  const form=$("creator-form");if(!form.reportValidity())return false;
  const file=$("creator-photo").files?.[0];
  if(!editingId&&!file)throw Error("Ajoute la photo du personnage avant d'enregistrer.");
  if(!file&&!editingRow?.source_photo_path)throw Error("Choisis une photo pour ce méchant.");
  if(!$("creator-consent").checked)throw Error("Confirme que tu as l'autorisation d'utiliser cette photo.");
  if(file){
    if(!(/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)||/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)))
      throw Error("Format photo non compatible. Utilise JPEG, PNG ou WebP.");
    if(file.size>25*1024*1024)throw Error("La photo est trop volumineuse (25 Mo maximum avant optimisation).");
  }
  return true;
}
// Garder le fichier original : certains navigateurs Android renvoient
// une image blanche lorsqu'on force une conversion canvas pourtant réussie.
function originalPhotoFormat(file){
  const type=String(file?.type||"").toLowerCase();
  const filename=String(file?.name||"").toLowerCase();
  if(type==="image/jpeg"||(!type&&/\.jpe?g$/.test(filename)))
    return {type:"image/jpeg",ext:"jpg"};
  if(type==="image/png"||(!type&&/\.png$/.test(filename)))
    return {type:"image/png",ext:"png"};
  if(type==="image/webp"||(!type&&/\.webp$/.test(filename)))
    return {type:"image/webp",ext:"webp"};
  return null;
}
async function jpegFromPhoto(file){
  if(!file)return null;
  let bitmap=null,objectUrl=null,image=null;
  try{
    if(typeof createImageBitmap==="function"){
      try{bitmap=await createImageBitmap(file)}catch(e){}
    }
    if(!bitmap){
      objectUrl=URL.createObjectURL(file);
      image=new Image();
      await new Promise((resolve,reject)=>{
        image.onload=resolve;
        image.onerror=()=>reject(Error("Ton téléphone ne parvient pas à ouvrir ce format. Essaie une photo JPEG."));
        image.src=objectUrl;
      });
    }
    const width=bitmap?.width||image?.naturalWidth;
    const height=bitmap?.height||image?.naturalHeight;
    if(!width||!height)throw Error("La photo est illisible.");
    const scale=Math.min(1,1400/Math.max(width,height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    const ctx=canvas.getContext("2d");
    if(!ctx)throw Error("Optimisation de la photo indisponible.");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(bitmap||image,0,0,canvas.width,canvas.height);
    // Vérifier des pixels sur plusieurs points avant d'encoder.
    // Une image intégralement blanche indique souvent un échec silencieux
    // de décodage/dessin sur certains Android.
    const count=25;let white=0;
    for(let y=1;y<=5;y++)for(let x=1;x<=5;x++){
      const px=Math.floor(canvas.width*x/6),py=Math.floor(canvas.height*y/6);
      const d=ctx.getImageData(px,py,1,1).data;
      if(d[0]>=246&&d[1]>=246&&d[2]>=246)white++;
    }
    if(white>=24)throw Error("La conversion produit une image blanche. Utilise une photo JPEG directement, sans capture d'écran.");
    let result=null;
    for(const quality of [0.86,0.7,0.55]){
      result=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(result&&result.size<=8*1024*1024)break;
    }
    if(!result||result.size>8*1024*1024)throw Error("Impossible de réduire la photo sous 8 Mo.");
    return result;
  }finally{
    bitmap?.close?.();
    if(objectUrl)URL.revokeObjectURL(objectUrl);
  }
}
async function preparePhoto(file){
  const native=originalPhotoFormat(file);
  if(native&&file.size<=8*1024*1024){
    // Photo originale inchangée : pas de recompression et pas de risque de
    // sortie canvas blanche ; le type MIME correspond aussi à l'extension.
    return {blob:file,ext:native.ext,type:native.type,converted:false};
  }
  const blob=await jpegFromPhoto(file);
  return {blob,ext:"jpg",type:"image/jpeg",converted:true};
}
async function signedPhoto(path){
  if(!path||!db)return null;
  const {data,error}=await db.storage.from("villain-source").createSignedUrl(path,180);
  return error?null:data?.signedUrl||null;
}
async function saveForm(e){
  e?.preventDefault?.();if(busy)return;
  try{if(!user||!db)throw Error("Connecte-toi à l'ARÈNE pour enregistrer ce méchant.");
    if(!validateForm())return;
    setBusy(true);setSaveStatus("Vérification de la fiche…");
    const payload=payloadFromForm(),file=$("creator-photo").files?.[0];
    let id=editingId;
    if(id){
      const updated=await rpc("custom_villain_update",{p_villain_id:id,p_payload:payload});
      if(updated!==true)throw Error("Brouillon introuvable ou non accessible.");
    }else{
      id=await rpc("custom_villain_create",{p_payload:payload});
      if(typeof id!=="string"||!/^[a-f0-9-]{36}$/i.test(id))throw Error("Le serveur n'a pas renvoyé d'identifiant valide.");
      editingId=id;editingRow={id,source_photo_path:null,status:"draft"};
    }
    if(file){
      setSaveStatus("Optimisation de la photo sur ton téléphone…");
      const photo=await preparePhoto(file);
      // Préserver le format natif (jpg/png/webp) et le MIME de la photo.
      const path=user.id+"/"+id+"/source."+photo.ext;
      setSaveStatus(photo.converted?"Envoi de la photo optimisée…":"Envoi de la photo d'origine sans modification…");
      const {error:uploadError}=await db.storage.from("villain-source").upload(path,photo.blob,{
        contentType:photo.type,cacheControl:"0",upsert:true
      });
      if(uploadError)throw Error("Photo non envoyée : "+errorMessage(uploadError)+". Le brouillon a été conservé, tu peux réessayer.");
      setSaveStatus("Association de la photo au personnage…");
      let attached=false;
      try{attached=await rpc("custom_villain_attach_photo",{p_villain_id:id,p_object_path:path})}
      catch(err){
        // Ne jamais effacer l'ancienne photo si elle a été remplacée au même chemin.
        if(editingRow?.source_photo_path!==path)
          await db.storage.from("villain-source").remove([path]).catch(()=>{});
        throw err;
      }
      if(attached!==true)throw Error("Photo non associée : vérifie ton compte et réessaie.");
      const oldPath=editingRow?.source_photo_path;
      if(oldPath&&oldPath!==path){
        // Suppression de l'ancienne photo : seulement si une autre est déjà enregistrée.
        await db.storage.from("villain-source").remove([oldPath]).catch(()=>{});
      }
      editingRow={...editingRow,id,source_photo_path:path,status:"draft"};
    }
    setSaveStatus("✅ Fiche et photo enregistrées dans ton compte !");
    status("✅ Ton super-vilain est enregistré dans ton espace privé. La génération IA viendra à l'étape suivante.","good");
    await refreshList();
    resetForm();
    setSaveStatus("✅ Sauvegarde terminée. Vérifie la photo dans « Mes super-vilains » ci-dessous.");
    $("creator-list")?.scrollIntoView({behavior:"smooth",block:"nearest"});
  }catch(err){
    const msg=errorMessage(err);setSaveStatus("⚠️ "+msg);status("⚠️ "+msg,"warn");
  }finally{setBusy(false)}
}
function createText(tag,cls,content){
  const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el;
}
function appendRow(row,url){
  const card=createText("article","creator-list-card");
  const header=createText("div","creator-list-head");
  if(url){
    const img=createText("img");img.src=url;img.alt="Photo privée de "+row.name;img.loading="lazy";header.appendChild(img);
  }else header.appendChild(createText("div","creator-list-placeholder","🦹"));
  const info=createText("div","creator-list-info");
  info.appendChild(createText("h4","",row.name+(row.alias?" · "+row.alias:"")));
  info.appendChild(createText("p","",row.weakness_label?"🎴 Faille : "+row.weakness_label:"Fiche en préparation"));
  info.appendChild(createText("div","creator-list-status",
    row.status==="ready"?"✅ PRÊT":row.status==="generating"?"🎨 EN GÉNÉRATION":row.status==="failed"?"⚠️ À REPRENDRE":"📝 BROUILLON PRIVÉ"));
  header.appendChild(info);card.appendChild(header);
  const controls=createText("div","creator-list-controls");
  const edit=createText("button","","✏️ MODIFIER");
  edit.type="button";edit.disabled=!["draft","failed"].includes(row.status);
  edit.addEventListener("click",()=>editRow(row));
  const del=createText("button","","🗑️ SUPPRIMER");
  del.type="button";del.disabled=!["draft","failed"].includes(row.status);
  del.addEventListener("click",()=>deleteRow(row));
  controls.append(edit,del);card.appendChild(controls);
  $("creator-list").appendChild(card);
}
async function refreshList(){
  if(!db||!user)return;
  const seq=++requestSequence;
  const {data,error}=await db.from("custom_villains").select("*").order("created_at",{ascending:false}).limit(10);
  if(error)throw error;
  if(seq!==requestSequence)return;
  rows=Array.isArray(data)?data:[];
  $("creator-counter").textContent=rows.length+" / 10";
  $("creator-count-summary").textContent="Mes créations personnelles : "+rows.length+" / 10";
  const list=$("creator-list");list.replaceChildren();
  if(!rows.length){list.appendChild(createText("p","creator-hint","Aucun personnage pour le moment. Crée le premier !"));return;}
  for(const row of rows){
    // Les URL signées sont temporaires : seules les photos du propriétaire sont visibles.
    const url=await signedPhoto(row.source_photo_path);
    if(seq!==requestSequence)return;
    appendRow(row,url);
  }
}
async function editRow(row){
  if(busy)return;
  editingId=row.id;editingRow=row;forgetLocalImage();$("creator-photo").value="";
  for(const [field,id] of Object.entries(FIELDS)){
    $(id).value=row[field]??(field==="danger_level"?"2":field==="voice_type"?"comique":"");
  }
  $("creator-consent").checked=true;
  currentImageUrl=await signedPhoto(row.source_photo_path);fillPreview(currentImageUrl);
  setBusy(false);setSaveStatus("✏️ Tu modifies le brouillon de "+row.name+". La photo est facultative si elle a déjà été enregistrée.");
  $("creator-form").scrollIntoView({behavior:"smooth",block:"start"});
}
async function deleteRow(row){
  if(busy||!user)return;
  if(!confirm('Supprimer définitivement le brouillon « '+row.name+' » et sa photo ?'))return;
  setBusy(true);
  try{
    if(row.source_photo_path){
      const {error}=await db.storage.from("villain-source").remove([row.source_photo_path]);
      if(error)throw Error("Suppression de la photo impossible : "+errorMessage(error));
    }
    const deleted=await rpc("custom_villain_delete_draft",{p_villain_id:row.id});
    if(deleted!==true)throw Error("Impossible de supprimer ce brouillon : il a peut-être déjà été publié ou supprimé.");
    if(editingId===row.id)resetForm();
    await refreshList();
    status("🗑️ Le brouillon a été supprimé de ton espace privé.","good");
  }catch(err){status("⚠️ "+errorMessage(err),"warn")}
  finally{setBusy(false)}
}
function voicePreview(){
  if(!("speechSynthesis" in window)||!window.SpeechSynthesisUtterance){
    status("Aucune voix de synthèse n'est disponible dans ce navigateur.","warn");return;
  }
  const voiceType=$("creator-voice").value;
  const params={
    comique:[1.19,1.23],grave:[0.85,0.72],froid:[0.88,1],theatral:[0.92,1.32],
    diabolique:[0.78,0.64],autoritaire:[1.06,0.88]
  }[voiceType]||[1,1];
  const name=$("creator-name").value.trim()||"le super-vilain";
  const text=$("creator-intro").value.trim()||"Attention, je suis "+name+" ! Personne ne m'arrêtera !";
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text.slice(0,350));u.lang="fr-FR";u.rate=params[0];u.pitch=params[1];
    const french=speechSynthesis.getVoices().find(v=>/^fr([-_]|$)/i.test(v.lang));
    if(french)u.voice=french;
    speechSynthesis.speak(u);
    setSaveStatus("🔊 Aperçu généré par les voix de ton appareil (la voix IA définitive sera ajoutée ensuite).");
  }catch(err){status("⚠️ "+errorMessage(err),"warn")}
}
async function syncAccount(){
  db=getClient();
  if(!db){
    setVisible("creator-signin",true);setVisible("creator-content",false);
    status("⏳ Connexion au serveur en cours. Patiente quelques secondes puis ouvre à nouveau le laboratoire.");
    return;
  }
  try{
    const {data,error}=await db.auth.getUser();if(error)throw error;
    user=data.user||null;
    setVisible("creator-signin",!user);setVisible("creator-content",!!user);
    if(!user){status("🔐 Connecte-toi à l'ARÈNE pour sauvegarder tes personnages entre tes appareils.");return}
    status("✅ Agent connecté : tes créations restent privées et liées à ton compte.","good");
    await refreshList();
  }catch(err){
    user=null;setVisible("creator-signin",true);setVisible("creator-content",false);
    status("⚠️ "+errorMessage(err),"warn");
  }
}
function navigate(view){
  if(typeof window.SUPERVILAINS_NAVIGATE==="function")window.SUPERVILAINS_NAVIGATE(view);
  else document.querySelector('[data-view="'+view+'"]')?.click();
}
function register(){
  $("creator-open")?.addEventListener("click",async()=>{navigate("creator");await syncAccount()});
  $("creator-back")?.addEventListener("click",()=>navigate("prison"));
  $("creator-go-arena")?.addEventListener("click",()=>navigate("arena"));
  $("creator-form")?.addEventListener("submit",saveForm);
  $("creator-refresh")?.addEventListener("click",async()=>{
    if(busy)return;try{await syncAccount()}catch(err){status("⚠️ "+errorMessage(err),"warn")}
  });
  $("creator-new")?.addEventListener("click",()=>{
    if(busy)return;resetForm();$("creator-form")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  $("creator-preview-voice")?.addEventListener("click",voicePreview);
  $("creator-photo")?.addEventListener("change",()=>{
    forgetLocalImage();const file=$("creator-photo").files?.[0];
    if(file){
      if(file.size>25*1024*1024){setSaveStatus("⚠️ La photo dépasse 25 Mo.");return;}
      photoObjectUrl=URL.createObjectURL(file);fillPreview(photoObjectUrl);
      setSaveStatus("📸 Photo choisie : "+file.name+". Elle sera optimisée lors de l'enregistrement.");
    }else fillPreview(currentImageUrl);
  });
  document.querySelector('[data-view="prison"]')?.addEventListener("click",()=>{
    // Conserve le compteur à jour au retour du labo.
    if(user&&db&&rows.length)$("creator-count-summary").textContent="Mes créations personnelles : "+rows.length+" / 10";
  });
  // La connexion Supabase est partagée avec l'ARÈNE, jamais dupliquée.
  window.addEventListener("supervilains:identity",()=>{
    if(isCreatorVisible())syncAccount();
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&isCreatorVisible())syncAccount()});
  setBusy(false);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",register,{once:true});
else register();
})();