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
const downloadedPhotoUrls=new Set();
function rememberPhotoUrl(url){downloadedPhotoUrls.add(url);return url}
function revokeDownloadedPhotos(){
  for(const url of downloadedPhotoUrls){try{URL.revokeObjectURL(url)}catch(e){}}
  downloadedPhotoUrls.clear();
}
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
  const storage=db.storage.from("villain-source");
  // L'URL signée se charge comme une image native (pas de Blob révoqué
  // prématurément lors des actualisations rapides de la galerie).
  // Chaque rechargement produit un nouveau jeton temporaire.
  try{
    const {data,error}=await storage.createSignedUrl(path,300);
    if(!error&&data?.signedUrl)return data.signedUrl;
  }catch(e){}
  // Certains navigateurs PWA gèrent mieux un Blob chargé avec leur session.
  try{
    const {data,error}=await storage.download(path);
    if(!error&&data?.size>0)return rememberPhotoUrl(URL.createObjectURL(data));
  }catch(e){}
  return null;
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
    status("✅ Ton super-vilain est enregistré dans ton espace privé. Utilise ChatGPT pour créer les trois portraits, puis importe-les ci-dessous.","good");
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

/* V4.8 — Créations ChatGPT manuelles : aucun appel à une API d'images.
   L'agent copie une consigne, utilise son ChatGPT, puis importe 3 fichiers privés. */
let manualBusyId=null;
const IMAGE_VARIANTS=[
  {key:"portrait",field:"portrait_path",title:"PORTRAIT",emoji:"🦹",detail:"Portrait normal"},
  {key:"troll",field:"troll_path",title:"TROLLER",emoji:"😝",detail:"Langue tirée"},
  {key:"capture",field:"capture_path",title:"CAPTURÉ",emoji:"⛓️",detail:"Prisonnier + menottes"},
];
function aiNotice(message){
  const el=$("creator-ai-status");if(el)el.textContent=message;
}
async function aiSignedImage(path){
  if(!path||!db)return null;
  const {data,error}=await db.storage.from("villain-generated").createSignedUrl(path,300);
  return error?null:data?.signedUrl||null;
}
function imagePrompt(row,variant){
  const brief=[
    "SUPERVILAINS — CRÉATION D'UN PORTRAIT DE JEU VIDÉO.",
    "Utilise la PHOTO QUE JE JOINS dans ChatGPT comme référence du visage. Je confirme disposer de l'autorisation de la personne photographiée.",
    "Créer UN SEUL FICHIER IMAGE carré et net, une caricature amusante, volontairement grotesque mais reconnaissable, visuel de jeu mobile, rendu illustré haut de gamme, couleurs vives, fond dramatique, sans éléments de véritable violence.",
    "Conserver exactement le même visage, coiffure et style graphique pour les trois situations.",
    "Personnage : "+row.name+". Alias : "+(row.alias||"aucun")+".",
    "Personnalité : "+(row.description||"super-vilain humoristique")+".",
    "Faille ultime : "+row.weakness_label+". Objet de capture : "+(row.weakness_object||row.weakness_label)+".",
  ];
  if(variant.key==="portrait")brief.push("IMAGE À CRÉER : portrait NORMAL de super-vilain, air malicieux et sûr de lui. Aucun texte.");
  if(variant.key==="troll")brief.push("IMAGE À CRÉER : personnage TROLLÉ faisant une grimace exagérée et TIRANT CLAIREMENT LA LANGUE. Aucun texte.");
  if(variant.key==="capture")brief.push("IMAGE À CRÉER : personnage CAPTURÉ, triste ou en pleurs, en tenue de prisonnier avec MENOTTES visibles, sans scène violente. Inscrire « CAPTURÉ ! » en bas, de façon lisible.");
  brief.push("Produis uniquement l'image de cette situation. Pas de triptyque, pas de collage, pas de personnage supplémentaire. Enregistre ensuite l'image sur mon téléphone pour l'importer dans SUPERVILAINS.");
  return brief.join("\n");
}
async function copyPrompt(row,variant){
  const content=imagePrompt(row,variant);
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(content);
    else{
      const el=document.createElement("textarea");el.value=content;el.style.position="fixed";el.style.left="-9999px";document.body.appendChild(el);el.select();
      if(!document.execCommand("copy"))throw Error("Copie indisponible");el.remove();
    }
    status("📋 Consigne « "+variant.title+" » copiée ! Ouvre ChatGPT, colle le texte et JOINS LA PHOTO avant de générer.","good");
  }catch(e){window.prompt("Copie cette consigne pour ChatGPT :",content);}
}
async function downloadSourcePhoto(row){
  if(!row.source_photo_path)return;
  try{
    const {data,error}=await db.storage.from("villain-source").download(row.source_photo_path);
    if(error||!data)throw error||Error("Photo introuvable");
    const link=document.createElement("a"),url=URL.createObjectURL(data);
    link.href=url;link.download=(row.name||"supervilain").replace(/[^a-z0-9_-]/gi,"_")+"_source.jpg";
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    status("📸 Photo source téléchargée. Il faudra la joindre manuellement dans ChatGPT.","good");
  }catch(e){status("⚠️ Téléchargement impossible : "+errorMessage(e),"warn")}
}
async function uploadManualImage(row,variant,file){
  if(manualBusyId)return;
  try{
    if(!db||!user)throw Error("Connecte-toi à l'ARÈNE.");
    if(!row.source_photo_path)throw Error("Enregistre d'abord la photo originale.");
    if(!file) return;
    if(!["draft","failed"].includes(row.status))throw Error("Rouvre d'abord ce personnage pour modifier ses images.");
    if(!["image/png","image/jpeg","image/webp"].includes(file.type.toLowerCase()))
      throw Error("Utilise une image PNG, JPEG ou WebP téléchargée depuis ChatGPT.");
    if(file.size>25*1024*1024)throw Error("Image trop grande : 25 Mo maximum.");
    manualBusyId=row.id;aiNotice("⏳ Importation de « "+variant.title+" »…");
    const image=await preparePhoto(file);
    const path=user.id+"/"+row.id+"/"+variant.key+"."+image.ext;
    const {error}=await db.storage.from("villain-generated").upload(path,image.blob,{
      contentType:image.type,cacheControl:"0",upsert:true
    });
    if(error)throw Error("Stockage : "+errorMessage(error));
    const saved=await rpc("custom_villain_attach_manual_image",{
      p_villain_id:row.id,p_kind:variant.key,p_object_path:path
    });
    if(saved!==true)throw Error("Image envoyée mais non associée à la fiche. Réessaie.");
    const oldPath=row[variant.field];
    if(oldPath&&oldPath!==path){
      await db.storage.from("villain-generated").remove([oldPath]).catch(()=>{});
    }
    aiNotice("✅ Image « "+variant.title+" » enregistrée sans API payante !");
    status("✅ Portrait importé et sauvegardé dans Supabase. Les images sont privées.","good");
  }catch(e){
    aiNotice("⚠️ "+errorMessage(e));status("⚠️ "+errorMessage(e),"warn");
  }finally{
    manualBusyId=null;
    try{await refreshList()}catch(e){status("⚠️ Actualisation : "+errorMessage(e),"warn")}
  }
}
async function finalizeManual(row){
  if(manualBusyId)return;
  if(!IMAGE_VARIANTS.every(v=>!!row[v.field])){status("⚠️ Importe les trois portraits avant de valider.","warn");return;}
  if(!confirm("Valider les trois portraits de « "+row.name+" » ? La fiche restera PRIVÉE et ne sera pas publiée automatiquement."))return;
  manualBusyId=row.id;
  try{
    const ok=await rpc("custom_villain_finalize_manual",{p_villain_id:row.id});
    if(ok!==true)throw Error("Validation impossible : vérifie les trois images.");
    status("✅ Personnage validé ! Les trois portraits restent privés tant que tu ne décides pas de les publier.","good");
    aiNotice("✅ Trois portraits validés et sauvegardés dans ton compte.");
  }catch(e){status("⚠️ "+errorMessage(e),"warn")}
  finally{manualBusyId=null;await refreshList().catch(()=>{})}
}
async function reopenManual(row){
  if(manualBusyId)return;
  manualBusyId=row.id;
  try{
    const ok=await rpc("custom_villain_reopen_manual",{p_villain_id:row.id});
    if(ok!==true)throw Error("Ce personnage ne peut pas être rouvert.");
    status("✏️ Personnage rouvert : tu peux corriger sa fiche et remplacer les images.","good");
  }catch(e){status("⚠️ "+errorMessage(e),"warn")}
  finally{manualBusyId=null;await refreshList().catch(()=>{})}
}
function appendGeneratedArt(row,card){
  const section=createText("section","creator-ai-section");
  section.appendChild(createText("div","creator-ai-title","🎨 3 PORTRAITS AVEC TON CHATGPT — SANS API"));
  section.appendChild(createText("p","creator-ai-help",
    "1. Copie la consigne d'une image. 2. Ouvre ChatGPT et joins ta photo originale. 3. Enregistre le résultat sur ton téléphone. 4. Importe-le ici."));
  const actions=createText("div","creator-manual-actions");
  const download=createText("button","creator-ai-remake","📸 RÉCUPÉRER MA PHOTO");
  download.type="button";download.disabled=!row.source_photo_path||!!manualBusyId;
  download.addEventListener("click",()=>downloadSourcePhoto(row));
  const open=createText("a","creator-chatgpt-link","✨ OUVRIR CHATGPT ↗");
  open.href="https://chatgpt.com/";open.target="_blank";open.rel="noopener noreferrer";
  actions.append(download,open);section.appendChild(actions);
  const grid=createText("div","creator-ai-gallery");
  let count=0;
  for(const variant of IMAGE_VARIANTS){
    const panel=createText("div","creator-ai-tile");
    const frame=createText("div","creator-ai-picture");
    frame.appendChild(createText("span","creator-ai-placeholder",variant.emoji));
    const path=row[variant.field];
    if(path){
      count++;
      aiSignedImage(path).then(url=>{
        if(!url||!frame.isConnected)return;
        const img=createText("img","creator-ai-generated");
        img.src=url;img.alt=variant.title+" — "+row.name;img.loading="lazy";
        frame.replaceChildren(img);
        if(variant.key==="capture")frame.appendChild(createText("span","creator-ai-captured-label","CAPTURÉ !"));
      }).catch(()=>{});
    }
    panel.appendChild(frame);
    panel.appendChild(createText("b","creator-ai-label",variant.title));
    panel.appendChild(createText("small","",path?"✅ Importée":variant.detail));
    const copy=createText("button","creator-ai-remake","📋 CONSIGNE");
    copy.type="button";copy.addEventListener("click",()=>copyPrompt(row,variant));
    panel.appendChild(copy);
    const upload=createText("button","creator-ai-remake",path?"🔁 REMPLACER":"📥 IMPORTER");
    upload.type="button";upload.disabled=!!manualBusyId||!row.source_photo_path||!["draft","failed"].includes(row.status);
    const picker=createText("input");
    picker.type="file";picker.accept="image/png,image/jpeg,image/webp";picker.hidden=true;
    picker.setAttribute("aria-label","Importer l'image "+variant.title);
    picker.addEventListener("change",()=>{
      const file=picker.files?.[0];if(file)uploadManualImage(row,variant,file);
      picker.value="";
    });
    upload.addEventListener("click",()=>picker.click());
    panel.append(upload,picker);grid.appendChild(panel);
  }
  section.appendChild(grid);
  section.appendChild(createText("p","creator-ai-help","Portraits enregistrés : "+count+" / 3. ChatGPT est ouvert séparément avec le compte du joueur. Aucune clé OpenAI dans SUPERVILAINS."));
  if(row.status==="ready"){
    const done=createText("button","creator-ai-generate","✅ PERSONNAGE VALIDÉ — PRIVÉ");
    done.type="button";done.disabled=true;section.appendChild(done);
  }else{
    const ready=createText("button","creator-ai-generate",count===3?"✅ VALIDER MON PERSONNAGE":"📥 ENCORE "+(3-count)+" PORTRAIT"+(3-count>1?"S":"")+" À IMPORTER");
    ready.type="button";ready.disabled=count!==3||!!manualBusyId;
    ready.addEventListener("click",()=>finalizeManual(row));
    section.appendChild(ready);
  }
  card.appendChild(section);
}
function appendRow(row,url){
  const card=createText("article","creator-list-card");
  const header=createText("div","creator-list-head");
  if(url){
    const img=createText("img");
    img.alt="Photo privée de "+row.name;img.loading="lazy";
    let retriedPhoto=false;
    img.addEventListener("error",async()=>{
      if(!retriedPhoto&&row.source_photo_path){
        retriedPhoto=true;
        try{
          const {data,error}=await db.storage.from("villain-source").download(row.source_photo_path);
          if(!error&&data?.size>0){
            const retryUrl=rememberPhotoUrl(URL.createObjectURL(data));
            img.src=retryUrl;
            return;
          }
        }catch(e){}
      }
      img.hidden=true;
      header.prepend(createText("div","creator-list-placeholder","📷"));
      info.appendChild(createText("p","creator-photo-warning","Impossible d'afficher la photo. Clique sur ACTUALISER ou vérifie la photo depuis MODIFIER."));
    });
    img.addEventListener("load",()=>{
      // Une photo véritablement blanche dans Storage ne doit pas être confondue
      // avec une erreur de permission ou de chargement.
      try{
        const c=document.createElement("canvas");c.width=20;c.height=20;
        const ctx=c.getContext("2d",{willReadFrequently:true});
        if(!ctx||!img.naturalWidth||!img.naturalHeight)return;
        ctx.drawImage(img,0,0,20,20);
        const d=ctx.getImageData(0,0,20,20).data;
        let almostWhite=0;
        for(let i=0;i<d.length;i+=4)if(d[i]>=245&&d[i+1]>=245&&d[i+2]>=245)almostWhite++;
        if(almostWhite>=392){
          img.hidden=true;
          header.prepend(createText("div","creator-list-placeholder","📷"));
          info.appendChild(createText("p","creator-photo-warning","Photo enregistrée entièrement blanche. Clique sur MODIFIER, re-sélectionne ta photo puis enregistre : la nouvelle version la conservera intacte."));
        }
      }catch(e){/* Les anciennes URL externes peuvent interdire la lecture canvas. */}
    });
    img.src=url;header.appendChild(img);
  }else header.appendChild(createText("div","creator-list-placeholder","🦹"));
  const info=createText("div","creator-list-info");
  info.appendChild(createText("h4","",row.name+(row.alias?" · "+row.alias:"")));
  info.appendChild(createText("p","",row.weakness_label?"🎴 Faille : "+row.weakness_label:"Fiche en préparation"));
  info.appendChild(createText("div","creator-list-status",
    row.status==="ready"?"✅ VALIDÉ · PRIVÉ":row.status==="generating"?"🎨 ANCIEN TRAITEMENT":row.status==="failed"?"⚠️ À REPRENDRE":"📝 BROUILLON PRIVÉ"));
  header.appendChild(info);card.appendChild(header);
  const controls=createText("div","creator-list-controls");
  const edit=createText("button","","✏️ MODIFIER");
  edit.type="button";edit.disabled=!["draft","failed"].includes(row.status);
  edit.addEventListener("click",()=>editRow(row));
  if(row.status==="ready"){const reopen=createText("button","","🔓 ROUVRIR");reopen.type="button";reopen.addEventListener("click",()=>reopenManual(row));controls.appendChild(reopen);}
  const del=createText("button","","🗑️ SUPPRIMER");
  del.type="button";del.disabled=!["draft","failed"].includes(row.status);
  del.addEventListener("click",()=>deleteRow(row));
  controls.append(edit,del);card.appendChild(controls);
  appendGeneratedArt(row,card);
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
  const list=$("creator-list");list.replaceChildren();revokeDownloadedPhotos();
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
    const images=[row.portrait_path,row.troll_path,row.capture_path].filter(Boolean);
    if(images.length)await db.storage.from("villain-generated").remove(images).catch(()=>{});
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
    aiNotice("✨ Génère tes portraits dans ChatGPT avec ton propre compte, puis importe-les ici. Aucune API payante.");
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