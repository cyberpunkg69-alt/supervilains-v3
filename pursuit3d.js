/* SUPERVILAINS V4.20 — moteur WebGL 3D pour La Grande Evasion.
 * Sans CDN, sans API, avec retour transparent au Canvas 2D si WebGL est absent.
 * Les portraits des joueurs restent dans leur stockage prive, non telecharges par WebGL.
 */
(()=>{'use strict';
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),PI=Math.PI;
 const normalize=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)};
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const rgb=s=>{
   if(Array.isArray(s))return s;
   const h=String(s||'#ffffff').replace('#','');
   return h.length===6?[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255):[1,1,1];
 };
 const perspective=(fov,aspect,near,far)=>{
   const s=1/Math.tan(fov/2),q=1/(near-far);
   return [s/aspect,0,0,0, 0,s,0,0, 0,0,(far+near)*q,-1, 0,0,2*far*near*q,0];
 };
 const look=(eye,at)=>{
   const z=normalize(eye.map((v,i)=>v-at[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);
   return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
     -dot(x,eye),-dot(y,eye),-dot(z,eye),1];
 };
 const mul=(a,b)=>{const r=new Array(16).fill(0);
   for(let col=0;col<4;col++)for(let row=0;row<4;row++)
     for(let k=0;k<4;k++)r[col*4+row]+=a[k*4+row]*b[col*4+k];
   return r;
 };
 function create(sourceCanvas){
   const canvas=document.createElement('canvas');
   canvas.className='sv-runner-3d';
   canvas.setAttribute('aria-hidden','true');
   const parent=sourceCanvas.parentElement;
   canvas.style.cssText='display:none;position:absolute;inset:0;width:100%;height:100%;pointer-events:none;'+
     'background:radial-gradient(circle at 75% 19%,#ffcf95 0%,#cd8994 6%,transparent 19%),'+
     'linear-gradient(#141f49 0%,#4a4268 45%,#a46f87 70%,#343a5f 100%)';
   let gl;
   try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'low-power'})||
     canvas.getContext('experimental-webgl',{alpha:true,antialias:true,depth:true})}catch(e){return null}
   if(!gl)return null;
   const vert=[
    'attribute vec3 position,normal,color;',
    'uniform mat4 camera;',
    'varying vec3 tint;',
    'varying float fog;',
    'void main(){',
    'gl_Position=camera*vec4(position,1.0);',
    'float light=max(dot(normalize(normal),normalize(vec3(0.5,0.9,0.4))),0.0);',
    'tint=color*(0.61+0.39*light);',
    'fog=clamp((-position.z-15.0)/95.0,0.0,0.76);',
    '}'].join('\n');
   const frag=[
    'precision mediump float;',
    'varying vec3 tint;',
    'varying float fog;',
    'void main(){gl_FragColor=vec4(mix(tint,vec3(0.46,0.33,0.49),fog),1.0);}'].join('\n');
   function compile(kind,src){
     const shader=gl.createShader(kind);
     gl.shaderSource(shader,src);gl.compileShader(shader);
     if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
       throw Error(gl.getShaderInfoLog(shader));
     return shader;
   }
   let program;
   try{
     const v=compile(gl.VERTEX_SHADER,vert),f=compile(gl.FRAGMENT_SHADER,frag);
     program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);
     gl.linkProgram(program);
     gl.deleteShader(v);gl.deleteShader(f);
     if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   }catch(e){console.warn('Poursuite 3D : shader indisponible',e);return null}
   let ok=true,active=false,buffer=gl.createBuffer(),points=[],vp=null,lastFrame=0;
   const pos=gl.getAttribLocation(program,'position'),normal=gl.getAttribLocation(program,'normal'),
     color=gl.getAttribLocation(program,'color'),camera=gl.getUniformLocation(program,'camera');
   const quads=[
     [[0,0,1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
     [[0,0,-1],[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],
     [[1,0,0],[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],
     [[-1,0,0],[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],
     [[0,1,0],[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],
     [[0,-1,0],[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]
   ];
   function vertex(v,n,c){points.push(v[0],v[1],v[2],n[0],n[1],n[2],c[0],c[1],c[2])}
   function box(x,y,z,w,h,d,shade,rotateX=0){
     const c=rgb(shade),co=Math.cos(rotateX),si=Math.sin(rotateX);
     const rotate=v=>[v[0],v[1]*co-v[2]*si,v[1]*si+v[2]*co];
     for(const side of quads){
       const n=rotate(side[0]);
       const corners=side.slice(1).map(p=>{
         const v=rotate([p[0]*w*.5,p[1]*h*.5,p[2]*d*.5]);
         return [x+v[0],y+v[1],z+v[2]];
       });
       for(const k of [0,1,2,0,2,3])vertex(corners[k],n,c);
     }
   }
   function ball(x,y,z,rx,ry,rz,shade){
     const c=rgb(shade),lon=9,lat=6;
     const at=(a,b)=>{
       const u=a*PI,v=b*2*PI;
       const q=[Math.sin(u)*Math.cos(v),Math.cos(u),Math.sin(u)*Math.sin(v)];
       return {p:[x+rx*q[0],y+ry*q[1],z+rz*q[2]],n:normalize([q[0]/rx,q[1]/ry,q[2]/rz])};
     };
     for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
       const a=at(i/lat,j/lon),b=at((i+1)/lat,j/lon),
         c1=at(i/lat,(j+1)/lon),d=at((i+1)/lat,(j+1)/lon);
       for(const v of [a,b,c1,b,d,c1])vertex(v.p,v.n,c);
     }
   }
   function world(g){
     // Route, trottoirs, lignes animees et immeubles de la ville.
     box(0,-.26,-51,88,.25,132,'#273550');
     box(0,-.10,-51,9.4,.13,132,'#223043');
     for(const side of [-1,1]){
       box(side*4.78,.07,-51,.22,.36,132,'#80dee5');
       box(side*5.80,.02,-51,1.75,.32,132,'#64526d');
     }
     const scroll=g.distance*1.6%8;
     for(let z=-114+scroll;z<10;z+=8){
       for(const line of [-1,1])box(line*1.52,-.025,z,.09,.025,3.3,'#c9ebef');
       box(0,-.025,z,.3,.03,.7,'#42738f');
     }
     const shift=g.distance*.92%16;
     for(let i=0;i<8;i++)for(const side of [-1,1]){
       const z=8-16*i+shift,height=6+(i*37+(side+2)*5)%11;
       const x=side*(10.2+(i%2)*1.5);
       const palette=['#3c496f','#4c3d65','#2d4a69','#65495d','#35475e'];
       box(x,height/2,z,6.25,height,11,palette[(i*3+(side+2))%palette.length]);
       box(x,height+.17,z,6.55,.35,11.3,'#192a48');
       const front=x-side*3.16;
       for(let floor=1;floor<Math.min(6,height/2);floor++)for(let j=-1;j<=1;j++)
         box(front,1.15+floor*2,z+j*2.75,.09,.76,.98,
           (i+floor+j+side)%4===0?'#263c56':'#efb977');
       if(i%3===0){
         box(front-side*.14,1.60,z,.16,.55,3.1,'#da5190');
         box(front-side*.21,1.60,z,.09,.13,2.25,'#f4d390');
       }
       const lampX=side*6.45,lampZ=z+4.1;
       box(lampX,2.3,lampZ,.15,4.6,.14,'#414f72');
       box(lampX-side*.5,4.55,lampZ,1,.15,.2,'#64708b');
       box(lampX-side*.91,4.43,lampZ,.27,.13,.3,'#ffde96');
       if(i%2===0){
         box(side*5.60,.65,z+2.5,.36,1.2,.36,'#a15970');
         ball(side*5.60,1.62,z+2.5,.64,.75,.64,'#42af94');
       }
     }
   }
   function hazards(g){
     for(const o of g.obstacles){
       const z=3.2-45*(o.z-.095),x=o.lane*2.72;
       if(z< -100||z>10)continue;
       if(o.type==='hurdle'){
         // Barrieres a sauter, visibles en volume.
         box(x,.62,z,1.90,1.24,.27,'#f1b75c');
         for(const side of [-1,1])box(x+side*.78,.68,z+.19,.19,1.15,.15,'#b9435b');
         for(let j=0;j<3;j++)box(x-.55+j*.55,.70,z+.2,.18,.83,.06,'#c95161',-.27);
       }else if(o.type==='bar'){
         // Barre haute : l'agent doit glisser dessous.
         for(const side of [-1,1])box(x+side*.87,1.22,z,.2,2.44,.23,'#b64674');
         box(x,2.37,z,1.98,.38,.40,'#ffcc70');
         box(x,2.38,z+.23,1.67,.13,.11,'#f4678a');
       }else{
         // Gros bloc : changement de voie obligatoire.
         box(x,1.13,z,1.95,2.20,1.05,'#a04768');
         box(x,1.82,z+.55,1.50,.31,.10,'#ffd475');
         box(x,.60,z+.56,1.50,.22,.11,'#ebcadd');
         for(const side of [-1,1])box(x+side*.78,.32,z+.57,.23,.58,.17,'#f87992');
       }
     }
   }
   function character(x,z,police,g,tint){
     const t=g.elapsed*18.5,step=Math.sin(t),bob=Math.abs(step)*.085;
     const jumping=police&&g.jump>0?Math.sin((.88-g.jump)/.88*PI)*1.48:0;
     const duck=police&&g.slide>0,sy=duck?.63:1;
     const base=jumping+bob;
     const clothing=police?'#2869b3':tint||'#d95a89',pants=police?'#25305b':'#432e52';
     const skin=police?'#edbe96':'#e4b394';
     box(x,.03,z,1.05,.04,.65,'#162238');
     box(x,base+.95*sy,z,.91,.41,.50,pants);
     for(const side of [-1,1]){
       const ang=step*side*.87;
       const hip=base+.80*sy;
       box(x+side*.24,hip-.39*Math.cos(ang),z+.52*Math.sin(ang),.30,.86,.32,pants,ang);
       box(x+side*.24,Math.max(base+.12,hip-.80*Math.cos(ang)),z+.87*Math.sin(ang)+.13,
         .46,.26,.58,'#131f38',ang*.28);
     }
     box(x,base+1.67*sy,z,1.10,1.27*sy,.64,clothing);
     box(x,base+1.15*sy,z+.34,1.08,.15*sy,.12,'#142442');
     box(x,base+1.63*sy,z+.35,.72,.5*sy,.1,police?'#1c355f':'#522e54');
     if(police){
       // Le policier est vu de DOS par la camera.
       box(x,base+1.85*sy,z+.365,.93,.59*sy,.105,'#12375c');
       box(x,base+1.45*sy,z+.43,.88,.10*sy,.09,'#8fe7ef');
       box(x,base+1.23*sy,z+.41,.94,.09*sy,.09,'#8fe7ef');
       box(x-.44,base+2.02*sy,z+.40,.16,.17*sy,.1,'#ffdd86');
       box(x+.45,base+2.07*sy,z+.26,.23,.32*sy,.16,'#1a294a');
       box(x+.45,base+2.19*sy,z+.365,.12,.08*sy,.08,'#6df3e8');
       box(x-.43,base+2.25*sy,z-.2,.24,.12,.20,'#ed536c');
       box(x+.43,base+2.25*sy,z-.2,.24,.12,.20,'#66daf4');
     }else{
       box(x,base+1.79*sy,z+.4,.56,.36*sy,.11,'#52304d');
       box(x,base+1.82*sy,z+.46,.34,.15*sy,.06,'#f2d69c');
     }
     for(const side of [-1,1]){
       const a=side*step*.98,shoulder=base+2.05*sy;
       box(x+side*.69,shoulder-.42*Math.cos(a),z+.42*Math.sin(a),
         .31,.9*sy,.36,police?'#346ca2':clothing,a);
       ball(x+side*.69,shoulder-.87*Math.cos(a),z+.88*Math.sin(a),.17,.20,.17,skin);
     }
     ball(x,base+2.60*sy,z,.48,.49,.45,skin);
     if(police){
       box(x,base+3.02*sy,z,1.02,.22,.83,'#163b70');
       // Visiere orientee dans le SENS DE LA COURSE (-Z).
       box(x,base+2.96*sy,z-.30,1.14,.10,.50,'#142647');
       box(x,base+2.94*sy,z+.40,.74,.10,.14,'#31517d');
       box(x,base+3.10*sy,z-.35,.15,.14,.1,'#ffda80');
     }else{
       ball(x,base+2.91*sy,z+.12,.49,.24,.45,'#30243f');
       box(x,base+2.82*sy,z+.32,.81,.20,.16,'#30243f');
     }
     // Pas d'yeux vers la camera : les deux personnages courent vers l'horizon.
     return [x,base+2.61*sy,z+.46];
   }
   function project(vec,width,height){
     if(!vp)return null;
     const p=[...vec,1],q=[0,0,0,0];
     for(let j=0;j<4;j++)for(let k=0;k<4;k++)q[j]+=vp[k*4+j]*p[k];
     if(q[3]<=0)return null;
     return {x:(q[0]/q[3]*.5+.5)*width,y:(.5-q[1]/q[3]*.5)*height};
   }
   parent.append(canvas);
   const indicator=document.createElement('div');
   indicator.textContent='● MODE 3D';
   indicator.style.cssText='display:none;position:absolute;z-index:4;top:10px;left:10px;'+
     'font:900 10px Arial,sans-serif;letter-spacing:1px;color:#d9fff5;'+
     'background:#10283bd9;border:1px solid #5bdcc1;padding:7px 10px;'+
     'border-radius:9px;pointer-events:none;box-shadow:0 2px 12px #0006';
   parent.append(indicator);
   const agentTag=document.createElement('div');
   agentTag.textContent='POLICE';
   agentTag.style.cssText='display:none;position:absolute;z-index:3;pointer-events:none;'+
     'color:#effdff;font:900 12px Arial,sans-serif;letter-spacing:1px;'+
     'text-shadow:0 2px 3px #09162d;transform:translate(-50%,-50%);';
   parent.append(agentTag);
   const wantedTag=document.createElement('div');
   wantedTag.style.cssText='display:none;position:absolute;z-index:3;pointer-events:none;'+
     'color:#fff7ce;background:#402345e8;border:1px solid #facb77;'+
     'padding:3px 7px;border-radius:7px;text-shadow:0 1px 2px #000;'+
     'font:900 11px Arial,sans-serif;letter-spacing:.3px;'+
     'max-width:145px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'+
     'transform:translate(-50%,-50%);';
   parent.append(wantedTag);
   const frame=document.createElement('div'),photo=document.createElement('img');
   frame.className='sv-runner-3d-portrait';
   frame.style.cssText='display:none;position:absolute;z-index:3;pointer-events:none;'+
     'border-radius:50%;overflow:hidden;border:3px solid #f6c27c;'+
     'box-shadow:0 0 0 2px #5f3155,0 0 15px #f6a76a80;transform:translate(-50%,-50%);';
   photo.style.cssText='width:100%;height:100%;display:block;object-fit:cover;';
   photo.alt='Portrait du super-vilain';frame.append(photo);parent.append(frame);
   photo.addEventListener('error',()=>frame.style.display='none');
   canvas.addEventListener('webglcontextlost',e=>{
     e.preventDefault();ok=false;canvas.style.display='none';frame.style.display='none';indicator.style.display='none';agentTag.style.display='none';wantedTag.style.display='none';
   });
   canvas.addEventListener('webglcontextrestored',()=>{ok=false});
   function resize(){
     if(!ok||!active)return;
     const w=Math.max(240,sourceCanvas.clientWidth),h=Math.max(180,sourceCanvas.clientHeight);
     const ratio=Math.min(1.55,window.devicePixelRatio||1);
     const bw=Math.round(w*ratio),bh=Math.round(h*ratio);
     if(canvas.width!==bw||canvas.height!==bh){
       canvas.width=bw;canvas.height=bh;gl.viewport(0,0,bw,bh);
     }
   }
   let villain={},villainLaneX=1.35;
   function begin(v){
     if(!ok)return;
     active=true;villain=v||{};villainLaneX=1.35;wantedTag.textContent='😈 '+String(villain.name||'FUGITIF').slice(0,34);
     canvas.style.display='block';frame.style.display='none';indicator.style.display='block';agentTag.style.display='block';wantedTag.style.display='block';
     photo.onload=null;photo.removeAttribute('src');
     if(villain.portrait){
       photo.onload=()=>{if(active)frame.style.display='block'};
       photo.src=villain.portrait;
     }
     resize();
   }
   function end(){
     active=false;canvas.style.display='none';frame.style.display='none';indicator.style.display='none';agentTag.style.display='none';wantedTag.style.display='none';
     photo.onload=null;photo.removeAttribute('src');lastFrame=0;
   }
   function draw(g){
     if(!ok||!active)return false;
     try{
       const now=performance.now();
       if(now-lastFrame<18)return true;
       lastFrame=now;resize();
       const w=canvas.clientWidth,h=canvas.clientHeight;
       if(!w||!h)return true;
       points=[];
       const lane=clamp(g.smoothLane||0,-1,1),progress=clamp(g.distance/g.goal,0,1);
       const shake=g.invincible>0?Math.sin(g.elapsed*36)*.10:0;
       const eye=[lane*.19+shake,3.97+Math.sin(g.elapsed*17)*.045,10.5],
         at=[lane*.10,1.54,-11];
       vp=mul(perspective(62*PI/180,w/h,.1,150),look(eye,at));
       world(g);hazards(g);
       // Le fugitif cesse d'etre fixe au fond de la rue : il se rapproche vraiment
       // et esquive la voie de l'agent. Ses changements restent progressifs.
       const fugitiveTargetX=lane>.25?-1.25:1.25;
       villainLaneX+=(fugitiveTargetX-villainLaneX)*.065;
       const vx=villainLaneX+.24*Math.sin(g.elapsed*1.3);
       const vz=-11.8+11.0*Math.pow(progress,1.24);
       const faceAt=character(vx,vz,false,g,villain.color);
       character(lane*2.72,3.18,true,g);
       const jump=g.jump>0?Math.sin((.88-g.jump)/.88*PI)*1.48:0;
       const copBack=project([lane*2.72,1.83+jump,3.62],w,h);
       if(copBack){
         agentTag.style.display='block';agentTag.style.left=copBack.x+'px';agentTag.style.top=copBack.y+'px';
       }else agentTag.style.display='none';
       const labelAt=project([faceAt[0],faceAt[1]+1.09,faceAt[2]],w,h);
       if(labelAt){wantedTag.style.display='block';wantedTag.style.left=labelAt.x+'px';wantedTag.style.top=labelAt.y+'px'}
       else wantedTag.style.display='none';
       const data=new Float32Array(points);
       gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
       gl.disable(gl.BLEND);gl.depthFunc(gl.LEQUAL);
       gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
       gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
       gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
       for(const [p,offset] of [[pos,0],[normal,3],[color,6]]){
         gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,36,offset*4);
       }
       gl.uniformMatrix4fv(camera,false,new Float32Array(vp));
       gl.drawArrays(gl.TRIANGLES,0,data.length/9);
       if(photo.complete&&photo.naturalWidth){
         const center=project(faceAt,w,h),
           right=project([faceAt[0]+.43,faceAt[1],faceAt[2]],w,h);
         if(center&&right&&center.y>0&&center.y<h){
           const size=clamp(Math.abs(right.x-center.x)*2.55,40,94);
           frame.style.display='block';frame.style.left=center.x+'px';frame.style.top=center.y+'px';
           frame.style.width=size+'px';frame.style.height=size+'px';
         }else frame.style.display='none';
       }
       return true;
     }catch(e){
       console.warn('Poursuite 3D desactivee :',e);
       ok=false;canvas.style.display='none';frame.style.display='none';indicator.style.display='none';agentTag.style.display='none';wantedTag.style.display='none';
       return false;
     }
   }
   return {begin,end,draw,resize,isReady:()=>ok};
 }
 window.SUPERVILAINS_PURSUIT_3D={create};
})();