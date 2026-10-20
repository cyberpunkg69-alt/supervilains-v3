/* SUPERVILAINS V4.22 — LA GRANDE EVASION
   Course arcade en perspective 2.5D, autonome, sans API ni dependance externe.
   Le SOLO reste autoritaire sur l'attribution des recompenses et des captures.
*/
(() => {
  'use strict';
  let ui=null,ctx=null,canvas=null,renderer3d=null,raf=0,game=null,portrait=null,last=0;
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const random=(a,b)=>a+Math.random()*(b-a);
  const rounded=(c,x,y,w,h,r)=>{
    const rad=Math.min(r,w/2,h/2);
    c.beginPath();c.moveTo(x+rad,y);c.arcTo(x+w,y,x+w,y+h,rad);
    c.arcTo(x+w,y+h,x,y+h,rad);c.arcTo(x,y+h,x,y,rad);
    c.arcTo(x,y,x+w,y,rad);c.closePath();
  };
  function build(){
    if(ui)return;
    ui=document.createElement('div');ui.id='sv-runner-overlay';ui.className='sv-runner-shade';
    ui.setAttribute('role','dialog');ui.setAttribute('aria-modal','true');
    ui.setAttribute('aria-label','Poursuite du super-vilain');ui.hidden=true;
    ui.innerHTML='<section class="sv-runner-panel">'+
      '<div class="sv-runner-head"><div><div class="sv-runner-title">🚓 LA GRANDE ÉVASION</div>'+
      '<div class="sv-runner-sub" id="sv-runner-target">Le méchant prend la fuite !</div></div>'+
      '<button type="button" class="sv-runner-exit" id="sv-runner-exit">✕ ABANDONNER</button></div>'+
      '<div class="sv-runner-hud"><span id="sv-runner-life">🛡️🛡️🛡️</span>'+
      '<div class="sv-runner-meter"><div class="sv-runner-fill" id="sv-runner-fill"></div></div>'+
      '<span id="sv-runner-progress">0 %</span></div>'+
      '<div class="sv-runner-canvas-box"><canvas id="sv-runner-canvas" aria-label="Parcours de poursuite à trois voies"></canvas>'+
      '<div class="sv-runner-toast" id="sv-runner-toast" aria-live="polite"></div>'+
      '<div class="sv-runner-pause" id="sv-runner-pause" hidden>⏸️ PAUSE</div></div>'+
      '<div class="sv-runner-help">Glisse pour changer de voie, sauter ou te baisser. Évite 3 collisions !</div>'+
      '<div class="sv-runner-controls"><button type="button" data-pursuit="left" aria-label="Aller à gauche">⬅️</button>'+
      '<button type="button" data-pursuit="jump" aria-label="Sauter">⬆️</button>'+
      '<button type="button" data-pursuit="slide" aria-label="Glisser sous un obstacle">⬇️</button>'+
      '<button type="button" data-pursuit="right" aria-label="Aller à droite">➡️</button></div></section>';
    document.body.append(ui);canvas=$('sv-runner-canvas');ctx=canvas.getContext('2d',{alpha:false});
    try{renderer3d=window.SUPERVILAINS_PURSUIT_3D?.create(canvas)||null}catch(e){console.warn('Repli poursuite 2D :',e)}
    $('sv-runner-exit').addEventListener('click',()=>finish(false,'abandon'));
    ui.querySelectorAll('[data-pursuit]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.pursuit)));
    let touch=null;
    canvas.addEventListener('pointerdown',e=>{if(!game||!game.active)return;touch={x:e.clientX,y:e.clientY};},{passive:true});
    canvas.addEventListener('pointerup',e=>{
      if(!touch||!game||!game.active)return;
      const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;
      if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
      act(Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'jump':'slide'));
    },{passive:true});
    canvas.addEventListener('pointercancel',()=>{touch=null});
    document.addEventListener('keydown',e=>{
      if(!game||!game.active)return;
      const action=({ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',ArrowDown:'slide',a:'left',d:'right',w:'jump',s:'slide'})[e.key];
      if(action){e.preventDefault();e.stopImmediatePropagation();act(action)}
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(false,'abandon')}
    },true);
    document.addEventListener('visibilitychange',()=>{
      if(!game||!game.active)return;
      game.paused=document.hidden;
      $('sv-runner-pause').hidden=!game.paused;
      last=0;
    });
    window.addEventListener('resize',resize);
  }
  function resize(){
    if(!canvas||!ctx)return;
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(240,Math.round(rect.width)),h=Math.max(180,Math.round(rect.height));
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    renderer3d?.resize();
  }
  function notice(s){
    if(!ui)return;
    const el=$('sv-runner-toast');el.textContent=s;el.classList.add('visible');
    if(game)game.notice=1.0;
  }
  function act(action){
    if(!game||!game.active||game.paused||game.winning>0)return;
    if(action==='left')game.lane=Math.max(-1,game.lane-1);
    if(action==='right')game.lane=Math.min(1,game.lane+1);
    if(action==='jump'&&game.slide<=0)game.jump=0.88;
    if(action==='slide'&&game.jump<=0)game.slide=0.85;
  }
  function spawn(){
    if(!game)return;
    const lane=Math.floor(random(0,3))-1;
    const types=['hurdle','bar','block'];
    const type=types[Math.floor(random(0,types.length))];
    game.obstacles.push({lane,type,z:1.34,hit:false});
    // 1 obstacle par ligne, jamais de situation bloquant les trois voies.
  }
  function tick(t){
    if(!game||!game.active)return;
    if(!last)last=t;
    const dt=Math.min(.05,Math.max(0,(t-last)/1000));last=t;
    if(!game.paused){
      // Petit temps de celebration avant la jauge finale, sans collision ni progression.
      if(game.winning>0){
        game.winning-=dt;
        game.notice=Math.max(0,game.notice-dt);
        $('sv-runner-toast').classList.toggle('visible',game.notice>0);
        if(game.winning<=0){finish(true,'rattrape');return}
        draw();raf=requestAnimationFrame(tick);return;
      }
      game.elapsed+=dt;
      game.jump=Math.max(0,game.jump-dt);game.slide=Math.max(0,game.slide-dt);
      game.invincible=Math.max(0,game.invincible-dt);
      game.notice=Math.max(0,game.notice-dt);
      $('sv-runner-toast').classList.toggle('visible',game.notice>0);
      game.smoothLane+=(game.lane-game.smoothLane)*Math.min(1,dt*13);
      const speed=0.34+Math.min(.2,game.elapsed*.005)+game.danger*.012;
      game.distance+=dt*(10.8+Math.min(4.4,game.elapsed*.15));
      game.spawnClock-=dt;
      if(game.spawnClock<=0){spawn();game.spawnClock=random(.78,1.33)-Math.min(.2,game.elapsed*.004)}
      for(const o of game.obstacles){
        o.z-=dt*speed;
        if(!o.hit&&o.z<.095){
          o.hit=true;
          if(o.lane===game.lane&&game.invincible<=0){
            const avoided=(o.type==='hurdle'&&game.jump>.16)||(o.type==='bar'&&game.slide>.13);
            if(!avoided){
              game.life--;game.invincible=1.25;game.distance=Math.max(0,game.distance-22);
              notice('💥 AÏE ! -1 BOUCLIER');$('sv-runner-life').textContent='🛡️'.repeat(game.life)+'💥'.repeat(3-game.life);
              if(navigator.vibrate)navigator.vibrate(80);
              if(game.life<=0){finish(false,'collision');return}
            }
          }
        }
      }
      game.obstacles=game.obstacles.filter(o=>o.z>-.20);
      const pct=Math.round(clamp(100*game.distance/game.goal,0,100));
      $('sv-runner-fill').style.width=pct+'%';
      $('sv-runner-progress').textContent=pct+' %';
      if(game.distance>=game.goal){
        game.distance=game.goal;game.winning=1.3;
        notice('🚓 FUGITIF RATTRAPÉ !');
        if(navigator.vibrate)navigator.vibrate([40,50,80]);
      }
    }
    draw();
    raf=requestAnimationFrame(tick);
  }
  function draw(){
    if(!ctx||!canvas||!game)return;
    if(renderer3d?.draw(game))return;
    const w=canvas.clientWidth,h=canvas.clientHeight,vanish=h*.30;
    if(w<=0||h<=0)return;
    // Horizon et ciel ne demandent aucun chargement externe.
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#12224c');sky.addColorStop(.6,'#745078');sky.addColorStop(1,'#13233b');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f4ddbb';ctx.beginPath();ctx.arc(w*.81,h*.13,Math.max(9,w*.035),0,Math.PI*2);ctx.fill();
    const shift=(game.elapsed*27)%120;
    for(let side=0;side<2;side++){
      for(let i=0;i<9;i++){
        const bw=w*.18,bh=h*(.19+.07*((i*7+side*3)%4));
        const bx=side===0?i*bw-w*.4-shift*.5:w-i*bw+shift*.5;
        ctx.fillStyle=i%2?'#192b48':'#223554';
        ctx.fillRect(bx,vanish-bh,bw+2,bh+12);
        ctx.fillStyle='#f4d382';
        for(let yy=vanish-bh+10;yy<vanish-5;yy+=13){
          for(let xx=bx+10;xx<bx+bw-5;xx+=15){
            if((Math.floor(xx+yy)+i)%3)ctx.fillRect(xx,yy,3,5);
          }
        }
      }
    }
    // Route en perspective. Les bordures et voies sont animées par le mouvement.
    ctx.beginPath();ctx.moveTo(w*.46,vanish);ctx.lineTo(w*.54,vanish);
    ctx.lineTo(w*1.1,h);ctx.lineTo(-w*.1,h);ctx.closePath();
    ctx.fillStyle='#1c2839';ctx.fill();
    for(const sign of [-1,1]){
      ctx.strokeStyle='#76e6ec';ctx.lineWidth=4;ctx.beginPath();
      ctx.moveTo(w*.5+sign*w*.04,vanish);ctx.lineTo(w*.5+sign*w*.60,h);ctx.stroke();
    }
    for(let road=0;road<2;road++){
      for(let j=0;j<12;j++){
        const z=((j/12+game.elapsed*.32)%1);
        const p=z*z,yy=vanish+(h-vanish)*p;
        const delta=w*(.05+.50*p),x=w*.5+delta*(road===0?-1/3:1/3);
        ctx.fillStyle='#b9cde0';ctx.globalAlpha=.25+.65*p;
        ctx.fillRect(x-2,yy,Math.max(2,3*p+1),Math.max(4,21*p));
      }
    }
    ctx.globalAlpha=1;
    // Les obstacles lointains sont dessines en premier.
    const sorted=[...game.obstacles].sort((a,b)=>b.z-a.z);
    for(const o of sorted){
      const depth=clamp(1-o.z/1.35,0,1),p=depth*depth;
      if(p<=0||o.z<-.15)continue;
      const y=vanish+(h-vanish)*p;
      const x=w*.5+o.lane*w*(.035+.285*p);
      const size=8+70*p;
      ctx.save();ctx.globalAlpha=.30+.70*depth;
      if(o.type==='bar'){
        ctx.fillStyle='#fa9b42';
        ctx.fillRect(x-size*.52,y-size*1.7,size*.13,size*1.8);
        ctx.fillRect(x+size*.4,y-size*1.7,size*.13,size*1.8);
        ctx.fillStyle='#f6d673';ctx.fillRect(x-size*.55,y-size*1.7,size*1.1,size*.27);
        ctx.fillStyle='#3d2442';ctx.fillRect(x-size*.18,y-size*1.72,size*.35,size*.3);
      }else if(o.type==='hurdle'){
        ctx.fillStyle='#ffc75f';rounded(ctx,x-size*.56,y-size*.72,size*1.12,size*.72,size*.08);ctx.fill();
        ctx.fillStyle='#b23e59';
        for(let i=0;i<3;i++)ctx.fillRect(x-size*.46+i*size*.36,y-size*.65,size*.15,size*.54);
      }else{
        ctx.fillStyle='#c95578';rounded(ctx,x-size*.52,y-size*1.05,size*1.04,size*1.05,size*.13);ctx.fill();
        ctx.fillStyle='#f5c6e3';ctx.fillRect(x-size*.25,y-size*.8,size*.5,size*.15);
        ctx.font=Math.max(9,Math.round(size*.45))+'px sans-serif';ctx.textAlign='center';ctx.fillText('⛔',x,y-size*.25);
      }
      ctx.restore();
    }
    // Fugitif au loin, le portrait utilise les images deja presentes en cache.
    const progress=clamp(game.distance/game.goal,0,1);
    const fugitiveY=vanish+(h-vanish)*(.065+.14*progress);
    const fugitiveSize=clamp(w*(.095+.095*progress),32,94);
    ctx.save();
    ctx.fillStyle='#101e38';ctx.beginPath();ctx.ellipse(w*.5,fugitiveY+fugitiveSize*.5,fugitiveSize*.48,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1b2647';rounded(ctx,w*.5-fugitiveSize*.32,fugitiveY,fugitiveSize*.64,fugitiveSize*.8,10);ctx.fill();
    if(portrait&&portrait.complete&&portrait.naturalWidth){
      ctx.save();ctx.beginPath();ctx.arc(w*.5,fugitiveY-fugitiveSize*.20,fugitiveSize*.38,0,Math.PI*2);ctx.clip();
      const side=Math.min(portrait.naturalWidth,portrait.naturalHeight);
      ctx.drawImage(portrait,(portrait.naturalWidth-side)/2,(portrait.naturalHeight-side)/2,side,side,w*.5-fugitiveSize*.38,fugitiveY-fugitiveSize*.58,fugitiveSize*.76,fugitiveSize*.76);
      ctx.restore();
    }else{
      ctx.font=Math.round(fugitiveSize*.58)+'px sans-serif';ctx.textAlign='center';
      ctx.fillText(game.icon||'😈',w*.5,fugitiveY);
    }
    ctx.fillStyle='#f0fcff';ctx.font='bold 11px Arial';ctx.textAlign='center';
    ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText(game.name,w*.5,fugitiveY-fugitiveSize*.71);ctx.shadowBlur=0;ctx.restore();
    // Agent de police anime au premier plan, trois voies.
    const px=w*.5+game.smoothLane*w*.29,run=Math.sin(game.elapsed*17),jy=game.jump>0?Math.sin((.88-game.jump)/.88*Math.PI)*h*.13:0;
    const py=h*.83-jy+(game.slide>0?h*.085:0),size=clamp(w*.13,43,77);
    ctx.save();if(game.invincible>0&&Math.floor(game.elapsed*13)%2)ctx.globalAlpha=.45;
    ctx.fillStyle='#05102375';ctx.beginPath();ctx.ellipse(px,h*.93,size*.65,8,0,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=size*.19;ctx.strokeStyle='#11182a';ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(px-size*.12,py+size*.5);ctx.lineTo(px-size*.16+run*8,py+size*1.1);
    ctx.moveTo(px+size*.12,py+size*.5);ctx.lineTo(px+size*.16-run*8,py+size*1.1);ctx.stroke();
    ctx.fillStyle='#244c86';rounded(ctx,px-size*.36,py-size*.15,size*.72,size*.8,size*.15);ctx.fill();
    ctx.strokeStyle='#f6ebcc';ctx.lineWidth=size*.1;ctx.beginPath();
    ctx.moveTo(px-size*.36,py+size*.05);ctx.lineTo(px-size*.52-run*7,py+size*.50);
    ctx.moveTo(px+size*.36,py+size*.05);ctx.lineTo(px+size*.52+run*7,py+size*.50);ctx.stroke();
    ctx.fillStyle='#e6bd94';ctx.beginPath();ctx.arc(px,py-size*.38,size*.31,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#132f5e';rounded(ctx,px-size*.37,py-size*.7,size*.74,size*.22,5);ctx.fill();
    ctx.fillRect(px-size*.48,py-size*.52,size*.96,size*.09);
    ctx.fillStyle='#ffdb68';ctx.fillRect(px-size*.07,py-size*.66,size*.14,size*.14);
    ctx.fillStyle='#ffeb7a';ctx.fillRect(px+size*.14,py+size*.12,size*.11,size*.17);
    ctx.restore();
    if(game.slide>0){
      ctx.fillStyle='#8de9ff77';ctx.fillRect(px-size*.7,h*.95,size*1.5,3);
    }
  }
  function finish(caught,reason){
    if(!game||!game.active)return;
    const current=game;game.active=false;
    renderer3d?.end();
    cancelAnimationFrame(raf);raf=0;last=0;
    ui.hidden=true;document.documentElement.classList.remove('sv-runner-open');
    $('sv-runner-pause').hidden=true;
    game=null;portrait=null;
    if(caught)current.handlers.caught();
    else current.handlers.escaped(reason);
  }
  function start(v,handlers){
    if(!v||typeof handlers?.caught!=='function'||typeof handlers?.escaped!=='function')return false;
    build();
    if(!ctx)return false;
    if(game&&game.active)return false;
    const goal=330+Math.min(60,Math.max(0,(Number(v.danger)||1)-1)*10);
    game={active:true,paused:false,lane:0,smoothLane:0,jump:0,slide:0,invincible:0,notice:0,
      life:3,elapsed:0,spawnClock:1.5,obstacles:[],distance:0,goal,winning:0,
      danger:clamp(Number(v.danger)||1,1,5),icon:String(v.icon||'😈'),
      name:String(v.name||'SUSPECT').slice(0,42),handlers};
    portrait=null;
    if(typeof v.portrait==='string'&&v.portrait){
      const img=new Image();img.decoding='async';
      img.onload=()=>{if(game&&game.active)portrait=img};
      img.src=v.portrait;
    }
    $('sv-runner-target').textContent=game.name+' s’enfuit ! Rattrape cette cible avant qu’elle ne disparaisse.';
    $('sv-runner-life').textContent='🛡️🛡️🛡️';
    $('sv-runner-fill').style.width='0%';$('sv-runner-progress').textContent='0 %';
    $('sv-runner-toast').classList.remove('visible');
    ui.hidden=false;document.documentElement.classList.add('sv-runner-open');
    renderer3d?.begin({portrait:v.portrait,color:v.color,name:v.name});
    resize();draw();last=0;raf=requestAnimationFrame(tick);
    $('sv-runner-exit').focus({preventScroll:true});
    return true;
  }
  window.SUPERVILAINS_PURSUIT={start,isRunning:()=>!!(game&&game.active)};
})();