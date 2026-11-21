/* LEONIDA TRACKER V3 — MONEY FINDER + GPS DE CHASSE
 * Guides d'argent : liens externes, aucun rendement inventé.
 * GPS : parcours indicatif en lignes droites entre repères communautaires,
 * sans prétendre être un guidage routier ou une preuve d'exactitude.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const safeUrl=u=>{try{const x=new URL(u);return ['http:','https:'].includes(x.protocol)?x.href:''}catch{return ''}};
const MONEY_GUIDES=[
 {id:'fast',cat:'general',label:'Méthodes et progression',title:"Comment gagner rapidement de l'argent dans GTA 6",desc:"Panorama des moyens de gagner de l'argent dans le jeu, selon l'avancement de l'histoire.",site:'PowerPyx',url:'https://www.powerpyx.com/gta-6-money-guide-how-to-get-money-fast/',verified:'guide'},
 {id:'banks',cat:'banques',label:'22 opérations bancaires',title:'Banques, petits braquages et coffres-forts',desc:'22 opérations bancaires recensées : 14 petites banques et 8 grandes banques avec coffre. Les conditions varient selon le chapitre.',site:'PowerPyx',url:'https://www.powerpyx.com/gta-6-all-bank-jobs-locations-bank-vaults/',verified:'guide'},
 {id:'fences',cat:'receleurs',label:'7 receleurs répertoriés',title:'Où revendre les objets volés dans GTA 6',desc:'Trouver les receleurs et comprendre quels objets de butin ils acceptent.',site:'PowerPyx',url:'https://www.powerpyx.com/gta-6-all-fence-locations-how-to-fence-stolen-goods/',verified:'guide'},
 {id:'fenceGTABase',cat:'receleurs',label:'Comparatif des receleurs',title:'Les 7 receleurs et leurs spécialités',desc:'Guide complémentaire pour choisir le lieu adapté au butin récupéré.',site:'GTABase',url:'https://www.gtabase.com/gta-6/articles/gta-6-fence-locations-all-fences-what-they-buy',verified:'guide'},
 {id:'gangs',cat:'gangs',label:'39 opérations signalées',title:'Cachettes, opérations de gangs et butin',desc:'Repérer les activités de gangs, certains coffres, objets rares et butins de contrebande. Liste encore incomplète côté guide.',site:'PowerPyx',url:'https://www.powerpyx.com/gta-6-all-illegal-gang-operations-locations/',verified:'guide'},
 {id:'gtabase',cat:'general',label:'Guide des revenus',title:"Vols, revendeurs, activités et progression",desc:"Méthodes pour accumuler de l'argent et convertir du butin en argent utilisable.",site:'GTABase',url:'https://www.gtabase.com/articles/gta-6/how-to-make-money-in-gta-6-full-money-making-guide',verified:'guide'},
 {id:'narcotics',cat:'gangs',label:'Objets de contrebande du jeu',title:'Flamants et caches liées à la cocaïne',desc:'Guide de collection et emplacements liés aux objets de contrebande dans GTA 6. À vérifier avant de suivre un itinéraire.',site:'PowerPyx',url:'https://www.powerpyx.com/gta-6-all-cocaine-flamingo-locations/',verified:'guide'}
];
const CATS={all:'Tout',general:'Astuces',banques:'Banques',receleurs:'Receleurs',gangs:'Gangs & butin',carte:'Sur la carte',communaute:'Communauté'};
const KEY='leonida-gps-tour-v1';
let moneyCat='all',moneyQuery='',routeIds=[],tourOnlyMissing=true,showTourResults=true;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved))routeIds=saved.filter(x=>typeof x==='string').slice(0,12)}catch{}
function saveRoute(){try{localStorage.setItem(KEY,JSON.stringify(routeIds))}catch{}}
function items(){try{return allItems()}catch{return []}}
function item(id){try{return getItem(id)}catch{return null}}
function label(i){try{return localTitle(i)}catch{return i.title}}
function hasXY(i){try{return validMapXY(i)}catch{return false}}
function projected(i){try{return projectItem(i)}catch{return null}}
function sourceMoney(){const feed=(typeof newsItems!=='undefined'&&Array.isArray(newsItems))?newsItems:[];return feed.filter(x=>['argent','stups'].includes(x.category)).slice(0,36)}
function catalogCandidates(){
 const pattern=/\b(bank|banks|vault|cash|money|atm|safe|robbery|heist|fence|pawn|gang|payday|loot|cocaine|drug|narcotic|stolen|braquage|banque|coffre|argent|butin|receleur|gang|drogue)\b/i;
 return items().filter(i=>hasXY(i)&&pattern.test([i.title,i.cat,i.desc].join(' '))).slice(0,85);
}
function moneyCard(c){
 const source=safeUrl(c.url),sourceText=c.site||'Communauté';
 return '<article class="hunterEntry"><div class="hunterEntryHead"><span class="hunterCategory">'+esc(c.label||'Opportunité')+'</span><span class="hunterSource">'+esc(sourceText)+'</span></div><h3>'+esc(c.title)+'</h3><p>'+esc(c.desc)+'</p>'+
 '<div class="hunterActions">'+(source?'<a class="btn main" target="_blank" rel="noopener noreferrer" href="'+esc(source)+'">Consulter le guide ↗</a>':'')+
 '<span class="tourBadge">'+(c.verified==='community'?'⚠ À confirmer':'🔎 Guide externe')+'</span></div></article>';
}
function catalogCard(i){
 const canSee=!!projected(i);
 const cat=String(i.cat||'').replace(/[_-]/g,' ').slice(0,48);
 return '<article class="hunterEntry"><div class="hunterEntryHead"><span class="hunterCategory">📍 Répertorié dans le catalogue</span><span class="hunterSource">'+esc(i.region||'Leonida')+'</span></div><h3>'+esc(label(i))+'</h3>'+
 '<p>'+esc(cat)+' — Position issue de données communautaires : vérification individuelle nécessaire.</p><div class="hunterActions">'+
 '<button class="btn main" type="button" data-hunt-open="'+esc(i.id)+'">Voir la fiche</button>'+
 '<button class="btn" type="button" data-tour-add="'+esc(i.id)+'">'+(routeIds.includes(i.id)?'✓ Dans ma tournée':'＋ Dans le GPS')+'</button>'+
 '</div></article>';
}
function renderMoney(){
 const root=$('moneyResults');if(!root)return;
 document.querySelectorAll('[data-money-cat]').forEach(b=>b.classList.toggle('active',b.dataset.moneyCat===moneyCat));
 const q=clean(moneyQuery);
 const match=c=>!q||clean([c.title,c.desc,c.label,c.site].join(' ')).includes(q);
 const guide=MONEY_GUIDES.filter(g=>(moneyCat==='all'||g.cat===moneyCat)&&match(g));
 const feed=sourceMoney().filter(x=>(moneyCat==='all'||moneyCat==='communaute'||moneyCat==='general'||moneyCat==='gangs')&&
 (moneyCat!=='communaute'||x.kind==='community')&&(!q||clean([x.title,x.noteFr,x.source].join(' ')).includes(q))).map(x=>({
 id:x.id,cat:x.category,label:x.kind==='community'?'Signalement de joueur':'Nouvelle piste',title:x.title,
 desc:x.noteFr||'Astuce externe à confirmer dans le jeu.',site:x.source,url:x.link,verified:x.kind==='community'?'community':'guide'
 })).slice(0,18);
 const matchingCatalog=catalogCandidates().filter(i=>(moneyCat==='all'||moneyCat==='carte')&&
 (!q||clean([label(i),i.region,i.cat,i.desc].join(' ')).includes(q))).slice(0,moneyCat==='carte'?30:8);
 let html='';
 if(moneyCat!=='carte'){html+=guide.map(moneyCard).join('');html+=feed.map(moneyCard).join('')}
 if(moneyCat==='carte'||moneyCat==='all')html+=matchingCatalog.map(catalogCard).join('');
 root.innerHTML=html||'<div class="tourEmpty">Aucun résultat pour cette recherche. Essaie un autre filtre.</div>';
 const footer=$('moneyCount');if(footer)footer.textContent=
 (guide.length+feed.length)+' pistes et guides • '+matchingCatalog.length+' repères de notre catalogue. Aucune récompense ou position exacte n’est inventée.';
}
function push(id){
 const i=item(id);
 if(!i||!hasXY(i)){notify('Ce lieu n’a pas de coordonnées disponibles.');return}
 if(routeIds.includes(id)){notify('Ce lieu est déjà dans la tournée.');return}
 if(routeIds.length>=12){notify('Maximum 12 étapes par tournée.');return}
 routeIds.push(id);saveRoute();renderTour();paintRoute();
 notify('Étape ajoutée au GPS : '+label(i));
}
function drop(id){
 routeIds=routeIds.filter(x=>x!==id);saveRoute();renderTour();paintRoute();
}
function notify(msg){if(typeof toast==='function')toast(msg);else if($('tourStatus'))$('tourStatus').textContent=msg}
function searchTour(){
 const root=$('tourMatches');if(!root)return;
 const q=clean(($('tourSearch')?.value||'').trim());
 const a=items().filter(i=>hasXY(i)&&!routeIds.includes(i.id)&&
 (!tourOnlyMissing||!state.found[i.id])&&(!q||clean([label(i),i.cat,i.region,i.desc].join(' ')).includes(q)));
 a.sort((x,y)=>(Number(!!state.found[x.id])-Number(!!state.found[y.id]))||label(x).localeCompare(label(y),'fr'));
 const take=a.slice(0,7);
 root.innerHTML=take.length?take.map(i=>'<div class="tourChoice"><div class="tourName">'+esc(label(i))+
 '<span class="tourMeta">'+esc(i.region||'Leonida')+' • '+(state.found[i.id]?'Déjà trouvé':'À découvrir')+'</span></div>'+
 '<button type="button" class="btn main" data-tour-add="'+esc(i.id)+'">＋ Ajouter</button></div>').join(''):
 '<div class="tourEmpty">'+(a.length?'Commence à écrire pour filtrer les lieux.':'Aucun lieu disponible avec ces filtres.')+'</div>';
 const info=$('tourSearchCount');if(info)info.textContent=a.length+' lieux disponibles dans la base • maximum 12 étapes.';
}
function stops(){
 const resolved=routeIds.map(id=>item(id)).filter(i=>i&&hasXY(i));
 if(resolved.length!==routeIds.length){routeIds=resolved.map(i=>i.id);saveRoute()}
 return resolved;
}
function lengthRoute(points){
 let d=0;for(let i=1;i<points.length;i++)d+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
 return d;
}
function optimize(){
 const all=stops();
 if(all.length<3){notify('Ajoute au moins 3 lieux pour optimiser la tournée.');return}
 // Order approximated from source-map distances, not road or travel-time distances.
 const sorted=[all[0]],rest=all.slice(1);
 while(rest.length){
  const last=sorted[sorted.length-1];
  let best=0,bestDist=Infinity;
  rest.forEach((v,i)=>{const d=Math.hypot(v.x-last.x,v.y-last.y);if(d<bestDist){bestDist=d;best=i}});
  sorted.push(rest.splice(best,1)[0]);
 }
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 for(let pass=0;pass<5;pass++){
  let improved=false;
  for(let a=1;a<sorted.length-2;a++)for(let b=a+1;b<sorted.length;b++){
   const oldDist=dist(sorted[a-1],sorted[a])+(b+1<sorted.length?dist(sorted[b],sorted[b+1]):0);
   const newDist=dist(sorted[a-1],sorted[b])+(b+1<sorted.length?dist(sorted[a],sorted[b+1]):0);
   if(newDist+1e-6<oldDist){sorted.splice(a,b-a+1,...sorted.slice(a,b+1).reverse());improved=true}
  }
  if(!improved)break;
 }
 routeIds=sorted.map(i=>i.id);saveRoute();renderTour();paintRoute();
 notify('Ordre optimisé sur la carte. Ce n’est pas un trajet routier.');
}
function renderTour(){
 const root=$('tourStops');if(!root)return;
 const a=stops();
 root.innerHTML=a.length?a.map((i,index)=>{
  const found=!!state.found[i.id];
  return '<div class="tourStop"><span class="stopNumber">'+(index+1)+'</span><div class="tourStopTitle">'+esc(label(i))+
  '<small>'+esc(i.region||'Leonida')+' • '+(found?'✓ Trouvé':'○ À trouver')+'</small></div>'+
  '<button class="btn" title="Afficher sur la carte" type="button" data-hunt-focus="'+esc(i.id)+'">⌖</button>'+
  '<button class="btn" title="Retirer cette étape" type="button" data-tour-remove="'+esc(i.id)+'">✕</button></div>';
 }).join(''):'<div class="tourEmpty">Aucune étape sélectionnée. Cherche un lieu ci-dessus ou ouvre une fiche de la carte, puis appuie sur « Ajouter au GPS ».</div>';
 const count=$('tourStopCount');if(count)count.textContent=a.length+'/12 étapes enregistrées';
 const status=$('tourStatus');
 if(status){
  if(!a.length)status.textContent='Choisis ton premier arrêt pour préparer ton parcours.';
  else if(baseMode!=='grid'&&!mapCalibration)status.textContent='⚠ Le fond réel n’est pas calibré. La tournée est sauvegardée, mais son tracé ne s’affiche pas tant que les positions ne sont pas validées. Le mode Grille permet un tracé indicatif.';
  else status.textContent='✓ Tournée prête • '+a.length+' étapes. Ligne indicative à vol d’oiseau : ce GPS ne connaît pas les routes ni les temps de trajet.';
 }
 const badge=$('tourDistance');
 if(badge){
  if(a.length<2)badge.textContent='Ajoute 2 étapes ou plus pour calculer un ordre de visite.';
  else{
   const km=lengthRoute(a.map(i=>({x:i.x,y:i.y})));
   badge.textContent='Écart cumulé indicatif : '+Math.round(km)+' unités de la carte source (pas des km).';
  }
 }
 searchTour();
}
let tourLayer=null;
function paintRoute(){
 const svg=$('mapSvg');if(!svg)return;
 if(!tourLayer||!svg.contains(tourLayer)){
  tourLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
  tourLayer.id='tourLayer';tourLayer.setAttribute('aria-hidden','true');
  svg.insertBefore(tourLayer,$('mapPins'));
 }
 tourLayer.replaceChildren();
 const chosen=stops();
 if(chosen.length<1)return;
 if(baseMode!=='grid'&&!mapCalibration)return;
 const pts=chosen.map(i=>projected(i));
 if(pts.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>MAP_W||p.y<0||p.y>MAP_H))return;
 const ns='http://www.w3.org/2000/svg';
 if(pts.length>1){
  const path=document.createElementNS(ns,'polyline');path.setAttribute('class','tourRouteLine');
  path.setAttribute('points',pts.map(p=>p.x.toFixed(3)+','+p.y.toFixed(3)).join(' '));
  tourLayer.appendChild(path);
 }
 const sizing=(typeof markerSizing==='function')?markerSizing():{pixelsPerUnit:1};
 const unit=Math.max(.0001,sizing.pixelsPerUnit),radius=10.8/unit;
 pts.forEach((p,i)=>{
  const group=document.createElementNS(ns,'g');
  group.setAttribute('transform','translate('+p.x.toFixed(3)+','+p.y.toFixed(3)+')');
  const circle=document.createElementNS(ns,'circle');circle.setAttribute('class','tourRouteStop');circle.setAttribute('r',String(radius));
  const text=document.createElementNS(ns,'text');text.setAttribute('font-size',String(12/unit));
  text.setAttribute('y',String(.5/unit));text.textContent=String(i+1);
  group.append(circle,text);tourLayer.appendChild(group);
 });
}
function focus(id){
 const i=item(id);if(!i)return;
 if(!projected(i)&&baseMode!=='grid'){notify('Impossible de localiser cet arrêt : calibration de carte indisponible. Active la Grille.');return}
 focusItemOnMap(id);
 $('mapSection')?.scrollIntoView({behavior:'smooth',block:'start'});
 paintRoute();
}
function clear(){
 if(!routeIds.length)return;
 if(!confirm('Effacer les étapes de ta tournée ? Tes découvertes cochées seront conservées.'))return;
 routeIds=[];saveRoute();renderTour();paintRoute();
}
function refresh(){renderMoney();renderTour();paintRoute()}
function init(){
 document.querySelectorAll('[data-money-cat]').forEach(b=>b.addEventListener('click',()=>{
  moneyCat=b.dataset.moneyCat;renderMoney();
 }));
 $('moneySearch')?.addEventListener('input',e=>{moneyQuery=e.target.value;renderMoney()});
 $('tourSearch')?.addEventListener('input',searchTour);
 $('tourOnlyMissing')?.addEventListener('change',e=>{tourOnlyMissing=e.target.checked;searchTour()});
 $('tourOptimize')?.addEventListener('click',optimize);
 $('tourReset')?.addEventListener('click',clear);
 $('tourShow')?.addEventListener('click',()=>{
  $('mapSection')?.scrollIntoView({behavior:'smooth',block:'start'});paintRoute();
 });
 document.addEventListener('click',e=>{
  const add=e.target.closest('[data-tour-add]');
  if(add){push(add.getAttribute('data-tour-add'));return}
  const del=e.target.closest('[data-tour-remove]');
  if(del){drop(del.getAttribute('data-tour-remove'));return}
  const focused=e.target.closest('[data-hunt-focus]');
  if(focused){focus(focused.getAttribute('data-hunt-focus'));return}
  const opened=e.target.closest('[data-hunt-open]');
  if(opened){openItem(opened.getAttribute('data-hunt-open'));return}
 });
 refresh();
}
window.LEONIDA_HUNTER={refresh,paintRoute,renderMoney,add:push,focus,route:()=>[...routeIds],optimize};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();