/* SUPERVILAINS V4.3 — Installation et sauvegarde locale transportable. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const saveKey='supervilains_operation_minuit_v3_meme';
const maxBytes=200000;
const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')||navigator.userAgentData?.mobile===true;
const apple=/iPhone|iPad|iPod/i.test(navigator.userAgent||'');
const inApp=/FBAN|FBAV|FB_IAB|Messenger|Instagram|WhatsApp|Line\//i.test(navigator.userAgent||'');
const standalone=()=>window.matchMedia?.('(display-mode: standalone)')?.matches||window.matchMedia?.('(display-mode: fullscreen)')?.matches||navigator.standalone===true;
let installPrompt=null;
const status=(id,msg)=>{const e=$(id);if(e)e.textContent=msg;};
const safeLink=()=>{
 const u=new URL('./',location.href);
 const code=new URL(location.href).searchParams.get('duel');
 if(code&&/^[a-fA-F0-9]{10}$/.test(code))u.searchParams.set('duel',code.toUpperCase());
 return u.href;
};
const readSave=()=>{
 try{const s=localStorage.getItem(saveKey);return s?JSON.parse(s):null}catch(e){return null}
};
const hasProgress=g=>!!(g&&(g.started||Number(g.level)>1||Number(g.captured)>0||Number(g.patrols)>0||(Array.isArray(g.claimed)&&g.claimed.length)));
const makeBackup=()=>{
 const game=readSave();
 if(!game||![1,3].includes(Number(game.version)))throw Error("Aucune sauvegarde de partie valide n'a été trouvée.");
 return JSON.stringify({format:'supervilains-solo-v1',exportedAt:new Date().toISOString(),save:game});
};
async function copyText(value){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(value);return true}catch(e){}}
 const area=$('sv-backup-json');const shade=$('sv-backup-dialog');
 if(area&&shade){shade.hidden=false;area.value=value;area.focus();area.select();return false}
 return false;
}
async function exportSave(){
 try{const ok=await copyText(makeBackup());const msg=ok?"✅ Sauvegarde copiée ! Colle-la dans l'application installée, menu AGENT → IMPORTER.":"Sélectionne le texte et copie-le, puis colle-le dans l'application installée.";
 status('sv-install-status',msg);status('sv-agent-backup-status',msg);status('sv-backup-status',msg)}
 catch(e){status('sv-install-status',e.message);status('sv-agent-backup-status',e.message)}
}
function downloadSave(){
 try{
  const data=new Blob([makeBackup()],{type:'application/json'});
  const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;
  link.download='SUPERVILAINS-sauvegarde-solo.json';document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
  status('sv-install-status',"💾 Fichier créé. Conserve-le dans Téléchargements et ouvre-le avec l'application installée depuis AGENT → IMPORTER.");
 }catch(e){status('sv-install-status',e.message)}
}
function showRestore(){
 const d=$('sv-backup-dialog');if(!d)return;d.hidden=false;
 status('sv-backup-status','Colle ta sauvegarde ou sélectionne un fichier JSON.');
 $('sv-backup-json')?.focus();
}
function closeRestore(){$('sv-backup-dialog').hidden=true}
async function importSave(){
 try{
  let raw=$('sv-backup-json').value.trim();
  const file=$('sv-backup-file').files?.[0];
  if(!raw&&file){if(file.size>maxBytes)throw Error('Ce fichier est trop volumineux.');raw=await file.text();}
  if(!raw)throw Error('Colle la sauvegarde ou choisis le fichier JSON.');
  if(raw.length>maxBytes)throw Error('Sauvegarde trop volumineuse.');
  const payload=JSON.parse(raw);
  const game=payload?.format==='supervilains-solo-v1'?payload.save:payload;
  if(!game||typeof game!=='object'||![1,3].includes(Number(game.version)))throw Error("Ce fichier n'est pas une sauvegarde SUPERVILAINS compatible.");
  if(!Number.isSafeInteger(game.level)||game.level<1||game.level>1000)throw Error('Niveau de la sauvegarde invalide.');
  for(const k of ['owned','visited','ultimateByVillain','achievements']){
    if(game[k]!==undefined&&(typeof game[k]!=='object'||game[k]===null||Array.isArray(game[k])))throw Error('Sauvegarde invalide : '+k);
  }
  if(game.claimed!==undefined&&!Array.isArray(game.claimed))throw Error('Liste des missions invalide.');
  const old=readSave();
  if(hasProgress(old)&&!confirm('Remplacer la partie solo actuelle par celle de cette sauvegarde ? Une copie de secours de la partie précédente sera conservée.'))return;
  if(old)localStorage.setItem('supervilains_pre_restore_backup_v43',JSON.stringify(old));
  localStorage.setItem(saveKey,JSON.stringify(game));
  status('sv-backup-status','✅ Partie restaurée ! Redémarrage…');
  location.reload();
 }catch(e){status('sv-backup-status','⚠️ '+(e?.message||'Sauvegarde illisible'))}
}
function renderGate(){
 const gate=$('sv-install-gate');if(!gate)return;
 const visible=mobile&&!standalone();
 gate.hidden=!visible;
 if(!visible)return;
 const instructions=$('sv-install-instructions');
 if(inApp){
  instructions.textContent='1. Dans Messenger, appuie sur ⋮ puis « Ouvrir dans le navigateur » (Chrome sur Android, Safari sur iPhone). 2. Dans ce navigateur, ouvre son menu et choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ». 3. Lance SUPERVILAINS depuis son icône.';
 }else if(apple){
  instructions.textContent='Dans Safari : appuie sur Partager (carré avec flèche) → « Sur l’écran d’accueil » → Ajouter. Puis ouvre le jeu depuis cette icône.';
 }else{
  instructions.textContent='Dans Chrome : appuie sur ⋮ → « Installer l’application » (ou « Ajouter à l’écran d’accueil »), puis ouvre SUPERVILAINS depuis son icône.';
 }
 $('sv-install-external').hidden=!inApp;
 const btn=$('sv-install-prompt');btn.hidden=!installPrompt;
 $('sv-install-old-save').hidden=!hasProgress(readSave());
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;renderGate()});
window.addEventListener('appinstalled',()=>{installPrompt=null;status('sv-install-status',"✅ Jeu installé ! Ferme ce navigateur et lance l'application depuis l'écran d'accueil.");renderGate()});
window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',renderGate);
function start(){
 const gate=$('sv-install-gate');if(!gate)return;
 const external=$('sv-install-external');external.href=safeLink();
 $('sv-install-prompt')?.addEventListener('click',async()=>{
  if(!installPrompt)return;
  const prompt=installPrompt;installPrompt=null;await prompt.prompt();
  const result=await prompt.userChoice;
  status('sv-install-status',result?.outcome==='accepted'?"✅ Installation demandée ! Lance l'application depuis ton écran d'accueil.":"Installation annulée. Le jeu sera disponible après installation.");
  renderGate();
 });
 $('sv-install-copy-link')?.addEventListener('click',async()=>{
  const ok=await copyText(safeLink());
  status('sv-install-status',ok?'🔗 Lien copié ! Colle-le dans Chrome ou Safari.':'Copie le lien affiché dans la fenêtre puis ouvre-le dans Chrome ou Safari.');
 });
 $('sv-install-export')?.addEventListener('click',exportSave);
 $('sv-install-download')?.addEventListener('click',downloadSave);
 $('sv-agent-export')?.addEventListener('click',exportSave);
 $('sv-agent-import')?.addEventListener('click',showRestore);
 $('sv-tutorial-import')?.addEventListener('click',showRestore);
 $('sv-backup-cancel')?.addEventListener('click',closeRestore);
 $('sv-backup-confirm')?.addEventListener('click',importSave);
 $('sv-backup-file')?.addEventListener('change',()=>{
  const file=$('sv-backup-file').files?.[0];
  status('sv-backup-status',file?'Fichier sélectionné : '+file.name:'');
 });
 renderGate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.SUPERVILAINS_INSTALL={isStandalone:standalone,showRestore,hasProgress:()=>hasProgress(readSave()),renderGate};
})();