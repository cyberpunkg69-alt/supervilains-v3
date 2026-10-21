/* SUPERVILAINS V5.5 — orientation et foulee corrigees des humains GLB pour La Grande Evasion.
 * Three.js r180 + GLTFLoader : modeles humains skinnes et animations GLB.
 * Les regles de collision, la progression et la capture restent gerees par pursuit.js.
 * Un repli 2D/ancien WebGL reste disponible si la 3D moderne ne se charge pas.
 * Soldier.glb : modele d'exemple Three.js / personnage Vanguard de Mixamo.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const URL_SOLDIER='https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/models/gltf/Soldier.glb';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,t)=>a+(b-a)*clamp(t,0,1);
let modelPromise=null;
function loadSoldier(){
  if(!modelPromise)modelPromise=new Promise((resolve,reject)=>{
    new GLTFLoader().load(URL_SOLDIER,resolve,undefined,reject);
  }).catch(error=>{ modelPromise=null;throw error; });
  return modelPromise;
}
function texture(kind){
  const cv=document.createElement('canvas');cv.width=cv.height=256;
  const c=cv.getContext('2d');if(!c)return null;
  c.fillStyle=kind==='asphalt'?'#353c43':kind==='concrete'?'#98949b':'#606879';
  c.fillRect(0,0,256,256);
  // Grain dessine une fois au demarrage : aucune allocation pendant la course.
  let seed=kind==='asphalt'?27:59;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<5000;i++){
    const x=rnd()*256,y=rnd()*256,size=.4+rnd()*1.7;
    c.fillStyle=rnd()>.5?'rgba(255,255,255,.058)':'rgba(0,0,0,.11)';
    c.fillRect(x,y,size,size);
  }
  if(kind==='concrete'){
    c.strokeStyle='rgba(45,48,65,.25)';c.lineWidth=2;
    for(let i=0;i<256;i+=64){c.beginPath();c.moveTo(i,0);c.lineTo(i,256);c.stroke();}
  }
  const tex=new THREE.CanvasTexture(cv);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=2;
  return tex;
}
function create(source){
  if(!source||!source.parentElement)return null;
  const parent=source.parentElement;
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({
      antialias:true,alpha:false,stencil:false,powerPreference:'low-power'
    });
  }catch(error){ console.warn('[SUPERVILAINS 5.0] WebGL indisponible',error);return null; }
  renderer.domElement.className='sv-runner-real3d';
  renderer.domElement.style.cssText='display:none;position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
  parent.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.23;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#8b8b9c');
  scene.fog=new THREE.FogExp2('#928a9d',.014);
  const camera=new THREE.PerspectiveCamera(62,1,.1,160);
  scene.add(new THREE.HemisphereLight('#dbeaff','#654e50',2.0));
  const sun=new THREE.DirectionalLight('#ffe7c0',2.5);
  sun.position.set(-7,14,-9);sun.castShadow=true;
  sun.shadow.mapSize.set(512,512);
  sun.shadow.camera.left=-12;sun.shadow.camera.right=12;
  sun.shadow.camera.top=16;sun.shadow.camera.bottom=-12;
  sun.shadow.camera.near=1;sun.shadow.camera.far=48;
  sun.shadow.bias=-.0004;
  scene.add(sun);

  const mat=(color,roughness=.84,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const roadMat=mat('#aab0ba',.96),sideMat=mat('#c2bdc0',.98),
    stripeMat=mat('#eee9cf',.7),kerbMat=mat('#ddd1c5',.91),
    poleMat=mat('#596979',.45,.42),leaves=[mat('#39705b'),mat('#47775d'),mat('#5c8064')],
    trunk=mat('#66514c'),glass=mat('#263b51',.19,.12),windowLit=new THREE.MeshStandardMaterial({
      color:'#d0a777',emissive:'#ffd4a1',emissiveIntensity:.55,roughness:.34
    });
  const roadTexture=texture('asphalt'),concreteTexture=texture('concrete');
  if(roadTexture){roadTexture.repeat.set(2.8,45);roadMat.map=roadTexture;roadMat.needsUpdate=true;}
  if(concreteTexture){concreteTexture.repeat.set(1.2,32);sideMat.map=concreteTexture;sideMat.needsUpdate=true;}

  const boxGeo=new THREE.BoxGeometry(1,1,1);
  const ballGeo=new THREE.SphereGeometry(1,12,9);
  const coneGeo=new THREE.ConeGeometry(1,1,9);
  const cylGeo=new THREE.CylinderGeometry(1,1,1,10);
  function outfitCar(parent,paint,rubber){
    const body=new THREE.Mesh(ballGeo,paint);
    body.position.set(0,.58,0);body.scale.set(.88,.32,1.52);parent.add(body);
    const cabin=new THREE.Mesh(ballGeo,paint);
    cabin.position.set(0,.91,-.12);cabin.scale.set(.72,.40,.82);parent.add(cabin);
    for(const x of [-.71,.71])for(const z of [-.93,.96]){
      const tyre=new THREE.Mesh(cylGeo,rubber);
      tyre.rotation.z=Math.PI*.5;tyre.position.set(x,.34,z);
      tyre.scale.set(.26,.105,.26);parent.add(tyre);
    }
  }
  const road=new THREE.Mesh(new THREE.PlaneGeometry(9.65,150),roadMat);
  road.rotation.x=-Math.PI/2;road.position.set(0,0,-57);
  road.receiveShadow=true;scene.add(road);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(140,160),mat('#71717c'));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,-.10,-58);ground.receiveShadow=true;scene.add(ground);

  function cube(group,x,y,z,w,h,d,material){
    const o=new THREE.Mesh(boxGeo,material);
    o.position.set(x,y,z);o.scale.set(w,h,d);
    o.castShadow=false;o.receiveShadow=true;
    group.add(o);return o;
  }
  for(const side of [-1,1]){
    const sidewalk=new THREE.Mesh(new THREE.PlaneGeometry(2.4,150),sideMat);
    sidewalk.rotation.x=-Math.PI/2;sidewalk.position.set(side*6.02,.16,-57);
    sidewalk.receiveShadow=true;scene.add(sidewalk);
    cube(scene,side*4.82,.10,-57,.17,.24,150,kerbMat);
  }
  const laneDashes=[];
  for(let i=0;i<36;i++)for(const side of [-1,1]){
    laneDashes.push({mesh:cube(scene,side*1.55,.018,0,.075,.02,3.0,stripeMat),slot:i});
  }
  const buildings=[],buildingPal=['#7b7180','#6d7787','#816f72','#596e79','#746977','#8e8180'];
  const roofMat=mat('#444657'),frameMat=mat('#777d86'),awningMat=mat('#8b5264'),soilMat=mat('#5a6776');
  const landGeo=new THREE.PlaneGeometry(1,1);
  // 14 groupes se deplacent en boucle, avec hauteurs, auvents et vitres.
  for(let i=0;i<7;i++)for(const side of [-1,1]){
    const group=new THREE.Group();
    const height=8+((i*7+(side+1)*3)%5)*1.7;
    const facade=mat(buildingPal[(i*3+(side+1))%buildingPal.length],.91);
    cube(group,0,height*.5,0,6.3,height,12,facade);
    cube(group,0,height+.18,0,6.7,.35,12.4,roofMat);
    cube(group,0,.65,0,6.4,1.3,12.1,soilMat);
    const toward=-side*3.19;
    for(let floor=0;floor<4;floor++)for(let j=-1;j<=1;j++){
      const y=2.25+floor*1.75,z=j*3.1;
      const panel=cube(group,toward,y,z,.07,1.02,1.3,(i+j+floor)%4===0?windowLit:glass);
      cube(group,toward-side*.06,y-0.56,z,.15,.095,1.53,frameMat);
      cube(group,toward-side*.07,y+.56,z,.14,.055,1.4,frameMat);
      cube(group,toward-side*.08,y,z,.12,1.15,.058,frameMat);
      panel.receiveShadow=false;
    }
    if(i%3===0){
      cube(group,toward-side*.52,2.52,0,1.2,.15,3.45,awningMat);
      cube(group,toward-side*.58,2.41,0,1,.06,3.1,kerbMat);
    }
    // Quelques voitures garees HORS des voies jouables pour casser la repetition.
    // Geometries partagees et carrosserie arrondie pour ne pas ajouter trop de draw calls.
    if(i===2||i===5){
      const car=new THREE.Group();
      car.position.set(-side*4.48,0,(i===2?2.9:-2.7));
      const paint=mat(i===2?'#485b6b':'#876970',.57,.15),rubber=mat('#232730',.99);
      outfitCar(car,paint,rubber);
      group.add(car);
    }
    // Un arbre avec feuillage non cubique et pied cylindrique.
    if(i%2===0){
      const tree=new THREE.Group();tree.position.set(-side*3.8,0,3.9);
      const stem=new THREE.Mesh(cylGeo,trunk);stem.position.y=.92;stem.scale.set(.17,1.84,.17);
      tree.add(stem);
      for(const [cx,cy,cz,sc] of [[0,2.06,0,.72],[-.36,2.32,-.2,.55],[.33,2.17,.22,.51]]){
        const crown=new THREE.Mesh(ballGeo,leaves[(i+Math.round(cx*3)+3)%3]);
        crown.position.set(cx,cy,cz);crown.scale.set(sc,sc*.89,sc*.85);tree.add(crown);
      }
      group.add(tree);
    }
    // Lampadaire conique pour plus de naturel, lumiere emissive discretement.
    const lightGroup=new THREE.Group();lightGroup.position.set(-side*4.9,0,4.4);
    const shaft=new THREE.Mesh(cylGeo,poleMat);shaft.position.y=2.4;shaft.scale.set(.09,4.8,.09);
    lightGroup.add(shaft);
    cube(lightGroup,-side*.45,4.75,0,.9,.12,.16,poleMat);
    const bulb=new THREE.Mesh(ballGeo,new THREE.MeshStandardMaterial({
      color:'#ffe7ae',emissive:'#ffc679',emissiveIntensity:1.0
    }));
    bulb.position.set(-side*.87,4.65,0);bulb.scale.set(.2,.085,.18);lightGroup.add(bulb);
    group.add(lightGroup);
    group.position.set(side*(10.1+(i%2)*.8),0,0);
    scene.add(group);buildings.push({group,i,side});
  }

  // Objets de collision VISUELS : toutes les decisions restent dans pursuit.js.
  const hazardMats={hurdle:mat('#eabb52'),bar:mat('#f0bb61'),block:mat('#945566'),
    red:mat('#e65b59'),metal:mat('#6d7786')};
  const obstacles=[];
  function makeObstacle(type){
    const group=new THREE.Group();
    if(type==='hurdle'){
      cube(group,0,.65,0,1.9,1.28,.25,hazardMats.hurdle);
      for(const side of [-1,1])cube(group,side*.83,.72,.18,.17,1.45,.15,hazardMats.red);
      for(let i=-1;i<=1;i++)cube(group,i*.53,.7,.16,.13,.9,.06,hazardMats.red);
    }else if(type==='bar'){
      for(const side of [-1,1])cube(group,side*.87,1.2,0,.16,2.4,.22,hazardMats.metal);
      cube(group,0,2.37,0,2,.32,.3,hazardMats.bar);
    }else{
      cube(group,0,1.06,0,1.92,2.1,1.08,hazardMats.block);
      cube(group,0,1.65,.55,1.55,.20,.1,hazardMats.bar);
    }
    group.visible=false;scene.add(group);return group;
  }
  const pools={hurdle:[],bar:[],block:[]};
  for(const type of Object.keys(pools))for(let i=0;i<8;i++)pools[type].push(makeObstacle(type));

  const tag=document.createElement('div');
  tag.className='sv-real3d-suspect-tag';
  tag.style.cssText='display:none;position:absolute;z-index:3;pointer-events:none;max-width:155px;transform:translate(-50%,-50%);border:1px solid #f2c886;border-radius:10px;background:#231e34cc;color:#fff4df;padding:4px 8px;font:800 11px Arial;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  parent.appendChild(tag);
  const photo=document.createElement('img');
  photo.alt='Portrait du fugitif';photo.className='sv-real3d-portrait';
  photo.style.cssText='display:none;position:absolute;z-index:3;pointer-events:none;transform:translate(-50%,-50%);width:42px;height:42px;object-fit:cover;border-radius:50%;border:2px solid #ffe2a4;box-shadow:0 2px 12px #0009;';
  photo.addEventListener('error',()=>photo.style.display='none');
  parent.appendChild(photo);
  const mark=document.createElement('div');
  mark.textContent='● 3D V5.5 BÊTA';
  mark.style.cssText='display:none;position:absolute;z-index:4;pointer-events:none;top:9px;left:9px;border-radius:9px;border:1px solid #a9dfe0;background:#132636dc;color:#d4fcff;padding:5px 8px;font:900 10px Arial;';
  parent.appendChild(mark);

  let active=false,ready=false,failed=false,loading=false,agent=null,villain=null;
  let lastTime=0,villainInfo={},w=0,h=0,renderReady=true;
  const actorSources={sam:null,harper:null,soldier:null};
  let villainModelKey=null;
  renderer.domElement.addEventListener('webglcontextlost',e=>{
    e.preventDefault();renderReady=false;hide();
  });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{renderReady=false;hide();});
  function hide(){
    renderer.domElement.style.display='none';
    tag.style.display='none';photo.style.display='none';mark.style.display='none';
  }
  function resize(){
    if(!active)return;
    const width=Math.max(240,source.clientWidth),height=Math.max(180,source.clientHeight);
    if(width===w&&height===h)return;
    w=width;h=height;renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function actorFrom(gltf,color,natural=false){
    const model=cloneSkeleton(gltf.scene);
    // Taille reelle GLB mesuree, puis normalization a environ 3 metres du jeu.
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    const scale=2.75/Math.max(.3,size.y);
    model.scale.multiplyScalar(scale);
    if(natural){
      // Les modeles MakeHuman ont un repere et une hauteur differents de Soldier.
      model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model);
      const center=box.getCenter(new THREE.Vector3());
      model.position.x-=center.x;
      model.position.y-=box.min.y;
      model.position.z-=center.z;
    }
    // Les civils MakeHuman et le soldat Three.js n'utilisent pas
    // le meme axe avant. Sur la video V5.4, Sam et Harper couraient
    // face au spectateur : retourner uniquement les GLB civils.
    // Le soldat historique garde son orientation validee en V5.1.
    model.rotation.y=natural?Math.PI:0;
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=true;o.receiveShadow=true;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      const next=mats.map(m=>{
        const copy=m.clone();
        if(color&&copy.color)copy.color.multiply(new THREE.Color(color));
        copy.roughness=typeof copy.roughness==='number'?Math.max(.55,copy.roughness):.8;
        return copy;
      });
      o.material=Array.isArray(o.material)?next:next[0];
    });
    const root=new THREE.Group();root.add(model);scene.add(root);
    const mixer=new THREE.AnimationMixer(model);
    const clip=gltf.animations.find(a=>/^run$/i.test(a.name))||gltf.animations.find(a=>/run/i.test(a.name));
    if(!clip)throw Error('Animation de course absente du modele');
    const action=mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
    // Ces articulations sont presentes dans les deux GLB civils.
    // On les memorise une seule fois pour ne pas chercher les os
    // a chaque image sur un smartphone.
    const runnerLegs=natural?['thigh_l','thigh_r','foot_l','foot_r']
      .map(name=>model.getObjectByName(name))
      .filter(Boolean):[];
    return {root,model,mixer,action,natural,runnerLegs};
  }

  // Corrige l'ecartement exagere des jambes du clip Run des civils :
  // uniquement les translations horizontales des articulations,
  // pas les rotations de hanche/genou (pour eviter la deformation).
  // A appeler APRES AnimationMixer.update, qui remet la pose d'origine.
  function narrowStride(actor){
    if(!actor?.natural)return;
    for(const bone of actor.runnerLegs){
      // Les clips animent la translation X de ces quatre os.
      // 0,82 = 18 % de moins en largeur, sans briser l'alternance.
      bone.position.x*=.82;
    }
  }

  // Des accessoires WebGL legers distinguent les roles sans remplacer
  // les squelettes ni telecharger les portraits personnels en 3D.
  function labelTexture(title){
    const cv=document.createElement('canvas');cv.width=512;cv.height=160;
    const c=cv.getContext('2d');
    c.clearRect(0,0,512,160);
    c.fillStyle='#12283e';c.fillRect(6,8,500,144);
    c.strokeStyle='#e4faff';c.lineWidth=9;c.strokeRect(10,12,492,136);
    c.fillStyle='#ffffff';c.font='bold 96px Arial, sans-serif';
    c.textBaseline='middle';c.textAlign='center';c.fillText(title,256,83,475);
    const tex=new THREE.CanvasTexture(cv);
    tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }
  const policeLetterTexture=labelTexture('POLICE');
  function outfitPart(parent,geo,material,x,y,z,sx,sy,sz){
    const mesh=new THREE.Mesh(geo,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    parent.add(mesh);
    return mesh;
  }
  function outfitForPolice(actor){
    if(actor.cosmetics)return;
    const outfit=new THREE.Group();
    const uniform=mat('#183d71',.91),reflective=mat('#a9e6e5',.62);
    outfitPart(outfit,ballGeo,uniform,0,1.72,.44,.49,.48,.14);
    outfitPart(outfit,boxGeo,reflective,0,1.40,.586,.83,.06,.034);
    outfitPart(outfit,boxGeo,reflective,0,2.00,.58,.74,.052,.03);
    const patch=new THREE.Mesh(new THREE.PlaneGeometry(.80,.24),new THREE.MeshBasicMaterial({
      map:policeLetterTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false
    }));
    patch.position.set(0,1.74,.592);
    outfit.add(patch);
    // Liseres souples sur les manches, lisibles en vue arriere.
    outfitPart(outfit,ballGeo,reflective,-.56,1.87,.08,.105,.06,.17);
    outfitPart(outfit,ballGeo,reflective,.56,1.87,.08,.105,.06,.17);
    actor.root.add(outfit);actor.cosmetics=outfit;
  }
  const villainLooks={
    morgane:['#e44b9b','#562947'],manu:['#50b99d','#243f48'],
    lea:['#ab82e8','#473053'],natsu:['#dd9650','#58413b'],
    amelie:['#efa8a6','#703c57'],ludo:['#75b8df','#304959'],
    eric:['#6bd1ca','#334a57']
  };
  function applyVillainOutfit(actor,info){
    if(!actor)return;
    if(actor.cosmetics){
      actor.root.remove(actor.cosmetics);
      // La tenue change uniquement entre deux poursuites, jamais pendant la course.
      actor.cosmetics.traverse(o=>{
        if(o.isMesh){ // Geometries partagees avec la ville et le policier : ne jamais les detruire.
          if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());
          else o.material?.dispose?.();
        }
      });
    }
    const name=String(info?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const key=Object.keys(villainLooks).find(k=>name.includes(k));
    const [bright,dark]=villainLooks[key]||['#be5d98','#453151'];
    const group=new THREE.Group();
    const coat=mat(bright,.96),trim=mat(dark,.90),gold=mat('#d8b67a',.49,.15);
    // Conserver la texture et les vetements des vrais GLB civils.
    // Sur le vieux soldat uniquement, simuler une veste avec un volume additionnel.
    if(!actor.natural)outfitPart(group,ballGeo,coat,0,1.68,.46,.43,.47,.12);
    outfitPart(group,boxGeo,trim,0,1.33,.55,.73,.095,.09);
    const flaps=[];
    for(const side of [-1,1]){
      const flap=outfitPart(group,boxGeo,coat,side*.27,1.12,.48,.20,actor.natural?.29:.53,.09);
      flaps.push(flap);
    }
    // Sacoche de ville plutot qu'un second equipement militaire.
    const handbag=outfitPart(group,ballGeo,trim,.50,1.11,.39,.23,.24,.12);
    outfitPart(group,boxGeo,gold,.50,1.15,.52,.18,.05,.035);
    const strap=outfitPart(group,boxGeo,coat,.31,1.53,.48,.055,.75,.04);
    strap.rotation.z=-.3;
    // Accessoire specifique a Morgane Makeup : noeud rose visible derriere.
    if(key==='morgane'){
      const bow=new THREE.Group();bow.position.set(0,2.67,.27);
      const l=outfitPart(bow,ballGeo,coat,-.20,0,0,.22,.13,.11);
      const r=outfitPart(bow,ballGeo,coat,.20,0,0,.22,.13,.11);
      l.rotation.z=.28;r.rotation.z=-.28;
      outfitPart(bow,ballGeo,gold,0,0,.03,.095,.10,.11);
      group.add(bow);
    }
    actor.root.add(group);
    actor.cosmetics=group;actor.coatFlaps=flaps;
    // Conserver les textures du GLB, mais varier legerement la couleur textile.
    const dye=new THREE.Color(bright);
    actor.model.traverse(o=>{
      if(!o.isMesh)return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats){
        if(!m?.color)continue;
        if(!m.userData.baseTone)m.userData.baseTone=m.color.clone();
        m.color.copy(m.userData.baseTone).lerp(dye,actor.natural?.065:.38);
      }
    });
  }
  async function storedGltf(id){
    try{
      const item=await window.SUPERVILAINS_3D_ASSETS?.get(id);
      if(!item?.buffer)return null;
      return await new Promise((resolve,reject)=>{
        new GLTFLoader().parse(item.buffer,'',resolve,reject);
      });
    }catch(e){
      console.warn('[SUPERVILAINS V5.3] GLB local illisible :',id,e);
      return null;
    }
  }
  function femaleVillain(info){
    const n=String(info?.name||'').normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return ['lea','amelie','morgane'].some(x=>n.includes(x));
  }
  function villainSource(info){
    if(femaleVillain(info)){
      if(actorSources.harper)return ['harper',actorSources.harper];
      if(actorSources.sam)return ['sam',actorSources.sam];
    }else{
      if(actorSources.sam)return ['sam',actorSources.sam];
      if(actorSources.harper)return ['harper',actorSources.harper];
    }
    return ['soldier',actorSources.soldier];
  }
  function switchVillain(info){
    const [key,source]=villainSource(info);
    if(!source)return;
    if(villainModelKey!==key){
      if(villain){
        villain.mixer.stopAllAction();
        scene.remove(villain.root);
      }
      villain=actorFrom(source,key==='soldier'?'#e7c3dc':null,key!=='soldier');
      villainModelKey=key;
    }
    applyVillainOutfit(villain,info);
  }
  function load(){
    if(loading||ready||failed)return;
    loading=true;
    Promise.all([storedGltf('sam'),storedGltf('harper')])
      .then(async ([sam,harper])=>{
        actorSources.sam=sam;actorSources.harper=harper;
        // Si aucun modele n'a ete importe, conserver le soldat historique.
        // Charger Soldier seulement en repli, pas quand les GLB locaux existent.
        if(!sam&&!harper)actorSources.soldier=await loadSoldier();
        const source=sam||harper||actorSources.soldier;
        mark.textContent=(sam||harper)
          ?'● 3D V5.5 • GLB CIVILS'
          :'● 3D V5.5 • SOLDAT DE SECOURS';
        agent=actorFrom(source,source===actorSources.soldier?'#90b5fa':null,!!(sam||harper));
        outfitForPolice(agent);
        switchVillain(villainInfo);
        ready=true;
      }).catch(e=>{
        failed=true;hide();
        console.warn('[SUPERVILAINS V5.3] Echec du chargement des coureurs, retour 2D',e);
      }).finally(()=>{loading=false;});
  }
  async function reloadModels(){
    // Appelé uniquement après un import explicite. La poursuite est en pause
    // pendant le rechargement ; on ne touche jamais aux règles du mini-jeu.
    if(!ready||failed||!agent)return false;
    const [sam,harper]=await Promise.all([storedGltf('sam'),storedGltf('harper')]);
    if(!sam&&!harper)return false;
    const nextSource=sam||harper;
    const nextAgent=actorFrom(nextSource,null,true);
    // Préparer le nouveau modèle avant de supprimer l'ancien en cas d'erreur.
    try{
      outfitForPolice(nextAgent);
    }catch(e){
      nextAgent.mixer.stopAllAction();scene.remove(nextAgent.root);
      throw e;
    }
    const previousAgent=agent,previousVillain=villain;
    actorSources.sam=sam;actorSources.harper=harper;
    agent=nextAgent;villain=null;villainModelKey=null;
    try{
      switchVillain(villainInfo);
      if(!villain)throw Error('Le fugitif n’a pas pu être créé');
    }catch(e){
      agent=previousAgent;villain=previousVillain;
      nextAgent.mixer.stopAllAction();scene.remove(nextAgent.root);
      throw e;
    }
    previousAgent?.mixer.stopAllAction();if(previousAgent)scene.remove(previousAgent.root);
    previousVillain?.mixer.stopAllAction();if(previousVillain)scene.remove(previousVillain.root);
    mark.textContent='● 3D V5.5 • GLB CIVILS';
    return true;
  }
  function begin(info){
    active=true;lastTime=0;villainInfo=info||{};
    tag.textContent='😈 '+String(villainInfo.name||'FUGITIF').slice(0,35);
    tag.style.display='none';photo.style.display='none';
    photo.onload=null;photo.removeAttribute('src');
    if(typeof villainInfo.portrait==='string'&&villainInfo.portrait){
      photo.onload=()=>{if(active&&ready)photo.style.display='block';};
      photo.src=villainInfo.portrait;
    }
    if(ready)switchVillain(villainInfo);
    load();resize();
  }
  function end(){active=false;hide();lastTime=0;}
  function positionTag(x,y,z){
    const p=new THREE.Vector3(x,y,z).project(camera);
    if(p.z<-1||p.z>1||!isFinite(p.x))return null;
    return {x:(p.x*.5+.5)*w,y:(1-(p.y*.5+.5))*h};
  }
  function draw(g){
    if(!active||failed||!renderReady||!ready)return false;
    try{
      resize();
      const now=performance.now(),dt=lastTime?clamp((now-lastTime)/1000,0,.05):1/60;
      lastTime=now;
      const progress=clamp(g.distance/g.goal,0,1),lane=clamp(g.smoothLane||0,-1,1),finish=clamp((progress-.80)/.20,0,1);
      const copX=lane*2.72,side=lane>.25?-1:1;
      const targetX=smooth(1.2*Math.sin(g.elapsed*.58)+.28*Math.sin(g.elapsed*1.4),copX+side*1.42,finish);
      const targetZ=smooth(-13.4,1.13,Math.pow(progress,1.37));
      const jump=g.jump>0?Math.sin(clamp((.88-g.jump)/.88,0,1)*Math.PI)*1.1:0;
      agent.root.position.set(copX,jump,3.1);
      agent.root.rotation.x=g.slide>0?-.75:g.winning>0?-.14:-.07;
      agent.root.scale.set(1,g.slide>0?.68:1,1);
      villain.root.position.set(targetX,0,targetZ);
      villain.root.rotation.x=g.winning>0?-.12:-.06;
      if(villain.coatFlaps)for(let i=0;i<villain.coatFlaps.length;i++)villain.coatFlaps[i].rotation.x=.12*Math.sin(g.elapsed*12+i*2.6);
      const paused=!!g.paused;
      if(!paused){
        agent.mixer.update(dt*(g.slide>0?.52:1.13));
        villain.mixer.update(dt*(g.winning>0?.20:1.19));
        // Modifier les articulations une seule fois APRES chaque mise
        // a jour de l'animation. En pause, ne jamais multiplier les
        // translations a repetition (sinon les jambes se rapprochent).
        narrowStride(agent);
        narrowStride(villain);
      }
      // Dalles de rue en mouvement synchrone avec la logique de jeu d'origine.
      const scroll=(g.distance*1.7)%8;
      for(const dash of laneDashes)dash.mesh.position.z=-118+dash.slot*8+scroll;
      if(roadTexture)roadTexture.offset.y=(g.distance*.004)%1;
      if(concreteTexture)concreteTexture.offset.y=(g.distance*.002)%1;
      const shift=(g.distance*.92)%15;
      for(const b of buildings)b.group.position.z=-7-b.i*15+shift;
      for(const type of Object.keys(pools))for(const o of pools[type])o.visible=false;
      const used={hurdle:0,bar:0,block:0};
      if(!(g.winning>0))for(const item of g.obstacles){
        const z=3.2-45*(item.z-.095),type=item.type;
        if(z < -95||z>10||!pools[type]||used[type]>=pools[type].length)continue;
        const object=pools[type][used[type]++];
        object.visible=true;object.position.set(item.lane*2.72,0,z);
      }
      camera.position.set(lane*1.5-side*.67*finish,4.3+Math.sin(g.elapsed*15)*.035,10.8+finish*.5);
      camera.lookAt(lane*.65+side*.25*finish,1.48,-10.4+finish*2.9);
      sun.position.x=camera.position.x-6.5;
      sun.target.position.set(camera.position.x,0,-7);sun.target.updateMatrixWorld();
      renderer.render(scene,camera);
      // Portrait et nom : meme point d'ancrage, pile verticale sans
      // chevauchement. Ne pas masquer le corps du fugitif a distance.
      const portraitPoint=positionTag(targetX,3.90,targetZ);
      const portraitSize=clamp(47-Math.abs(targetZ)*.65,28,46);
      const hasPortrait=!!(portraitPoint&&photo.complete&&photo.naturalWidth);
      if(hasPortrait&&portraitPoint.y>0&&portraitPoint.y<h){
        photo.style.display='block';photo.style.left=portraitPoint.x+'px';
        photo.style.top=portraitPoint.y+'px';
        photo.style.width=portraitSize+'px';photo.style.height=portraitSize+'px';
      }else photo.style.display='none';
      if(portraitPoint&&portraitPoint.y>0&&portraitPoint.y<h){
        const tagY=hasPortrait?portraitPoint.y-portraitSize*.5-18:portraitPoint.y;
        tag.style.display=tagY>8?'block':'none';
        tag.style.left=portraitPoint.x+'px';tag.style.top=tagY+'px';
      }else tag.style.display='none';
      renderer.domElement.style.display='block';mark.style.display='block';
      return true;
    }catch(e){
      failed=true;hide();console.warn('[SUPERVILAINS 5.0] Repli 2D suite a une erreur 3D',e);
      return false;
    }
  }
  return {begin,end,draw,resize,reloadModels,isReady:()=>renderReady&&!failed};
}
window.SUPERVILAINS_PURSUIT_REAL3D={create,version:'5.5-beta'};
