// The sheet's physical feedback: numbers count and flash in the direction they moved,
// steppers answer the mouse wheel, tabs turn like pages, and document events (a wound
// landing, a death, a transformation) play once on every open sheet of that actor.
import {animate,stagger,utils,moving,lavish,jolt,vignette,liveChange,effect,flash,readNum,stamp,pulse} from './fx.mjs';
import {goreLevel} from './settings.mjs';
import {mountRig} from './kit-3d.mjs';

const impacts=new Map();
export function queueImpact(actorId,impact) {
 if(!actorId)return;
 if(!impacts.has(actorId))impacts.set(actorId,[]);
 impacts.get(actorId).push({...impact,at:performance.now()});
}

export function wireSheet(app,el,{tabChanged=false}={}) {
 const body=el.querySelector('.sheet-body');
 if(tabChanged&&body&&moving())animate(body,{opacity:[.3,1],translateY:[8,0],duration:lavish()?280:140,ease:'outQuart'});
 wheel(el);
 dragOut(app,el);
 rig(app,el);
 trackLive(app,el,tabChanged);
 const id=app.document?.id,queue=impacts.get(id);
 if(queue?.length) {
  impacts.delete(id);
  const fresh=queue.filter(impact=>performance.now()-impact.at<5000);
  requestAnimationFrame(()=>fresh.forEach(impact=>IMPACTS[impact.kind]?.(app,el,impact)));
 }
}

/** The physical motion of taking an object out; resolves once it has left, so the update follows it. */
export function kitMotion(app,target,mode='spend') {
 if(!moving())return Promise.resolve();
 const rig=app._twRig;
 if(rig?.has?.(target.dataset.itemId))return rig.play(target.dataset.itemId,mode);
 const kind=target.closest('[data-kit-id]')?.className.match(/\bk-(\w+)/)?.[1],art=target.querySelector('svg')??target;
 if(kind==='blade')effect('glint',target);
 if(kind==='canister')effect('puff',target,{count:14});
 return new Promise(resolve=>animate(art,{translateY:[0,-26],rotate:[0,utils.random(-30,30)],scale:[1,1.22],opacity:[1,0],duration:lavish()?320:170,ease:'inQuad',onComplete:resolve}));
}

// The 3D rig outlives nothing: each render mounts a fresh view, handed the last frame first.
function rig(app,el) {
 const host=el.querySelector('.rig[data-rig]'),previous=app._twRig;
 app._twRig=null;
 if(!host){previous?.destroy();return;}
 const canvas=host.querySelector('.rig-3d');
 if(previous){host.classList.add('has-3d');previous.handOver(canvas);previous.destroy();}
 let data;try{data=JSON.parse(host.dataset.rig);}catch{return;}
 const token=app._twRigToken=(app._twRigToken??0)+1;
 const target=(itemId,state)=>[...el.querySelectorAll(`[data-kit-id="${itemId}"] .kobj.${state}`)];
 mountRig(canvas,data,{
  spend:(itemId,{played=false}={})=>{const button=target(itemId,'on').at(-1);if(!button)return;if(played)button.dataset.played='1';app.options.actions.kitSpend?.call(app,new PointerEvent('click'),button);},
  restore:itemId=>{const button=target(itemId,'off')[0];if(button)app.options.actions.kitRestore?.call(app,new PointerEvent('click'),button);}
 }).then(view=>{
  if(!view){host.classList.remove('has-3d');return;}
  if(token!==app._twRigToken||!canvas.isConnected){view.destroy();return;}
  host.classList.add('has-3d');app._twRig=view;
  for(const args of app._twRigQueue??[])view.arrive(...args);
  app._twRigQueue=[];
 });
}
const rigArrive=(app,...args)=>{if(app._twRig)app._twRig.arrive(...args);else (app._twRigQueue??=[]).push(args);};

// Objects can be pulled out of their slot as well as clicked; a short drag snaps back.
function dragOut(app,el) {
 el.querySelectorAll('.kobj.on:not(:disabled)').forEach(obj=>{
  obj.addEventListener('pointerdown',down=>{
   if(down.button!==0)return;
   let dragging=false;
   const finish=up=>{
    obj.removeEventListener('pointermove',move);obj.removeEventListener('pointerup',finish);obj.removeEventListener('pointercancel',finish);
    if(!dragging)return;
    obj.dataset.dragged='1';obj.classList.remove('dragging');
    if(Math.hypot(up.clientX-down.clientX,up.clientY-down.clientY)>34) {
     obj.dataset.played='1';
     animate(obj,{opacity:[1,0],scale:[1,.5],duration:180,ease:'inQuad',onComplete:()=>app.options.actions.kitSpend?.call(app,up,obj)});
    } else animate(obj,{translateX:0,translateY:0,duration:260,ease:'outBack(2)',onComplete:()=>{obj.style.transform='';}});
   };
   const move=event=>{
    const dx=event.clientX-down.clientX,dy=event.clientY-down.clientY;
    if(!dragging&&Math.hypot(dx,dy)>7){dragging=true;obj.setPointerCapture(down.pointerId);obj.classList.add('dragging');}
    if(dragging)utils.set(obj,{translateX:dx,translateY:dy});
   };
   obj.addEventListener('pointermove',move);obj.addEventListener('pointerup',finish);obj.addEventListener('pointercancel',finish);
  });
  // A drag ends in a click on the same element; swallow it before the sheet sees it.
  obj.addEventListener('click',event=>{if(obj.dataset.dragged){delete obj.dataset.dragged;event.stopImmediatePropagation();event.preventDefault();}},{capture:true});
 });
}

// Trackpads fire dozens of wheel events per gesture; one step per 140ms feels deliberate.
function wheel(el) {
 const bind=(group,choose)=>{
  if(group.dataset.twWheel)return;group.dataset.twWheel='1';let last=0;
  group.addEventListener('wheel',event=>{
   const target=choose(event.deltaY<0);if(!target)return;
   event.preventDefault();const now=performance.now();if(now-last<140)return;last=now;
   if(!target.disabled)target.click();
  },{passive:false});
 };
 el.querySelectorAll('.num').forEach(group=>{
  const buttons=[...group.querySelectorAll(':scope>button')];if(buttons.length<2)return;
  const vertical=group.classList.contains('vert');
  bind(group,up=>vertical?(up?buttons[0]:buttons.at(-1)):(up?buttons.at(-1):buttons[0]));
 });
 // span.strap: the body figure draws its own leg straps as <path class="strap">.
 el.querySelectorAll('span.strap,.btrack').forEach(group=>bind(group,up=>{
  const steps=[...group.querySelectorAll('button[data-value]')],on=steps.filter(b=>b.classList.contains('on')).length;
  return up?steps[on]:steps[on-1];
 }));
}

function trackLive(app,el,tabChanged) {
 const values=new Map(),previous=app._twLive;
 el.querySelectorAll('[data-live]').forEach(node=>{
  const key=node.dataset.live,value=node.textContent.trim();values.set(key,value);
  if(tabChanged||!previous?.has(key)||previous.get(key)===value)return;
  // Carried and in use are stamped rather than counted.
  if(/^(carry|power)-/.test(key))thump(node);else liveChange(node,previous.get(key),value);
 });
 if(previous&&!tabChanged&&moving()) {
  const moved=key=>previous.has(key)&&values.has(key)&&previous.get(key)!==values.get(key);
  if(moved('consciousness'))consciousness(el,readNum(previous.get('consciousness')),readNum(values.get('consciousness')));
  for(const key of ['party-luck','pool'])if(moved(key))tokens(el,readNum(previous.get(key)),readNum(values.get(key)));
  if(moved('form')) {
   const lever=el.querySelector('.lever'),arm=lever?.querySelector('.lever-arm'),engaged=lever?.classList.contains('engaged');
   arm?.animate([{rotate:engaged?'-28deg':'208deg'},{rotate:engaged?'208deg':'-28deg'}],{duration:lavish()?620:300,easing:'cubic-bezier(.3,1.5,.5,1)'});
  }
  if(moved('fatigue'))strap(el,readNum(previous.get('fatigue')),readNum(values.get('fatigue')));
  if(moved('bites'))bites(el,readNum(previous.get('bites')),readNum(values.get('bites')));
  if(moved('fear'))stamp(el.querySelector('.fseg .on'),{rotate:0});
 }
 app._twLive=values;
}
// A Gear "Carried" box or a power card's seal: whichever mark now shows is pressed onto the page.
function thump(node) {
 const card=node.closest('.pcard'),mark=card?card.querySelector('.pc-stamp')??card.querySelector('.pseal'):node;
 if(!mark)return;
 const rotate=mark.classList.contains('pc-stamp')?-7:mark.closest('.carry.on')?-5:0;
 stamp(mark,{rotate,onComplete:()=>{mark.style.removeProperty('transform');mark.style.removeProperty('opacity');}});
 effect('dust',mark,{count:8});
}

function consciousness(el,from,to) {
 const cons=el.querySelector('.hdr .cons'),boxes=[...el.querySelectorAll('.hdr .cons .track:not(.under) .cbox')];
 if(!cons||!Number.isFinite(from)||!Number.isFinite(to))return;
 if(to<from) {
  jolt(cons,{strength:5,duration:400});
  const struck=boxes.slice(Math.max(0,to),Math.max(0,from));
  if(struck.length)animate(struck,{scale:[1.6,1],rotate:()=>[utils.random(-24,24),0],duration:440,delay:stagger(70),ease:'outBack(2.2)'});
  const under=[...el.querySelectorAll('.hdr .cons .track.under .cbox')];
  if(under.length&&to<0)animate(under.slice(Math.max(0,-from),-to),{scale:[0,1],duration:380,delay:stagger(60),ease:'outBack(2)'});
 } else {
  const lit=boxes.slice(Math.max(0,from),Math.max(0,to));
  if(lit.length)animate(lit,{scale:[.2,1],opacity:[.2,1],duration:520,delay:stagger(80),ease:'outElastic(1,.55)'});
 }
}
function tokens(el,from,to) {
 const coins=[...el.querySelectorAll('.pips.luck .pip')];
 const changed=coins.slice(Math.min(from,to),Math.max(from,to));
 if(changed.length)animate(changed,{rotateY:[to<from?-540:540,0],scale:[1.35,1],duration:lavish()?720:360,delay:stagger(90),ease:'outQuart'});
}
function strap(el,from,to) {
 const band=el.querySelector('span.strap');if(!band)return;
 animate(band,{scaleX:[to>from?.94:1.04,1],duration:360,ease:'outElastic(1,.6)'});
 const notch=[...band.querySelectorAll('.notch.on')].at(-1);
 if(notch&&to>from)animate(notch,{scale:[1.8,1],duration:420,ease:'outBack(2.5)'});
}
function bites(el,from,to) {
 const holes=[...el.querySelectorAll('.btrack .bb')];
 if(to>from) {
  const fresh=holes.slice(from,to);
  if(fresh.length)animate(fresh,{scale:[2.2,1],rotate:()=>[utils.random(-30,30),0],duration:460,delay:stagger(80),ease:'outBack(2.6)'});
  jolt(el.querySelector('.btrack'),{strength:4,duration:320});
 }
}

// A small blot of blood that soaks into the paper where the wound landed, then dries away.
function splat(page,target,heavy) {
 if(!page||!target)return;
 const p=page.getBoundingClientRect(),t=target.getBoundingClientRect(),blot=document.createElement('i');
 blot.className=`tw-splat${heavy?' heavy':''}`;
 blot.style.left=`${t.left-p.left+t.width/2}px`;blot.style.top=`${t.top-p.top+t.height/2}px`;
 blot.style.setProperty('--r',`${utils.random(0,360)}deg`);
 page.append(blot);
 animate(blot,{scale:[.15,1],opacity:[0,.9],duration:520,ease:'outExpo'});
 animate(blot,{opacity:0,delay:5200,duration:1800,ease:'inQuad',onComplete:()=>blot.remove()});
}

const visible=node=>!!node&&node.getBoundingClientRect().width>0;
const done=fn=>animation=>animation.finished.then(fn,fn);
// A stroke drawing itself on, the way a pen line or a bandage edge would.
function draw(path,{duration=400,delay=0}={}) {
 path.setAttribute('pathLength','1');path.style.strokeDasharray='1';
 done(()=>{path.removeAttribute('pathLength');path.style.strokeDasharray='';})(path.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration,delay,easing:'cubic-bezier(.5,0,.3,1)',fill:'backwards'}));
}
// The wound a document event names: its own drawing when the figure carries it, else all of that region's.
function woundAt(el,{region,itemId}) {
 const fig=el.querySelector('.bodyfig .fig');if(!fig)return {wounds:[]};
 const own=itemId&&fig.querySelector(`.wound[data-wound-id="${CSS.escape(itemId)}"]`);
 return {fig,part:fig.querySelector(`[data-region="${region}"]`),stump:fig.querySelector(`[data-stump="${region}"]`),
  wounds:own?[own]:[...fig.querySelectorAll(`[data-wounds="${region}"] .wound`)]};
}
const ledgerRow=(el,{itemId})=>itemId?el.querySelector(`[data-wound="${CSS.escape(itemId)}"]`):null;
// Iron scraps thrown off a breaking plate: they kick up, tumble and fall off the page.
function shatter(page,target) {
 if(!page||!target)return;
 const p=page.getBoundingClientRect(),t=target.getBoundingClientRect();
 for(let i=0;i<10;i++) {
  const shard=document.createElement('i'),dx=utils.random(-120,120),up=utils.random(-80,-26),down=utils.random(70,170),spin=utils.random(-620,620);
  shard.className=`tw-shard s${i%3}`;
  shard.style.left=`${t.left-p.left+t.width*utils.random(15,85)/100}px`;shard.style.top=`${t.top-p.top+t.height*utils.random(30,70)/100}px`;
  page.append(shard);
  done(()=>shard.remove())(shard.animate([{translate:'0 0',rotate:'0deg',opacity:1},{translate:`${dx*.5}px ${up}px`,rotate:`${spin*.4}deg`,opacity:1,offset:.32},{translate:`${dx}px ${down}px`,rotate:`${spin}deg`,opacity:0}],
   {duration:utils.random(720,1150),easing:'cubic-bezier(.3,.55,.55,1)'}));
 }
}

const IMPACTS={
 // First aid: gauze winds on across the wound, its folds are drawn after it, the stain seeps back through.
 treat(app,el,impact) {
  if(!moving())return;
  const {fig,part,stump,wounds}=woundAt(el,impact),full=lavish(),card=el.querySelector(`.loc[data-region="${impact.region}"]`);
  stamp(ledgerRow(el,impact)?.querySelector('.tg.ok'),{rotate:-4});
  if(card)pulse(card,false);
  if(!fig){if(visible(card))effect('puff',card,{count:8});return;}
  const dressings=[...wounds.filter(w=>w.classList.contains('treated')),...(stump?.classList.contains('dressed')?[stump]:[])];
  if(goreLevel()!=='clinical')dressings.forEach((group,i)=>{
   const lag=i*(full?140:60),gauze=group.querySelectorAll('.dressing,.splint'),seep=group.querySelectorAll('.seep');
   if(gauze.length)animate(gauze,{scaleX:[0,1],opacity:[0,1],duration:full?520:220,delay:stagger(full?120:40,{start:lag}),ease:'outQuart'});
   group.querySelectorAll('.dressing-line,.tie').forEach(line=>draw(line,{duration:full?380:160,delay:lag+(full?340:120)}));
   if(seep.length)animate(seep,{opacity:[0,.58],scale:[.2,1],duration:full?1400:500,delay:lag+(full?640:240),ease:'outQuad'});
  });
  if(part)animate(part,{scale:[1.05,1],duration:full?640:300,ease:'outElastic(1,.6)'});
  const anchor=[dressings[0],part].find(visible);
  if(anchor)effect('puff',anchor,{count:12});
 },
 // Healed: the wound's colour washes out of the drawing, a scar is scored in and stitched, and it catches the light.
 heal(app,el,impact) {
  if(!moving())return;
  const {fig,part,stump,wounds}=woundAt(el,impact),full=lavish(),card=el.querySelector(`.loc[data-region="${impact.region}"]`);
  stamp(ledgerRow(el,impact)?.querySelector('.tg.done'),{rotate:3});
  if(card)pulse(card,false);
  if(!fig){if(visible(card))effect('glint',card);return;}
  const scars=wounds.filter(w=>w.classList.contains('healed'));
  if(goreLevel()!=='clinical') {
   scars.forEach((group,i)=>{
    const lag=i*(full?160:60),wash=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
    wash.setAttribute('class','tw-wash');wash.setAttribute('rx','15');wash.setAttribute('ry','12');group.prepend(wash);
    animate(wash,{opacity:[.85,0],scale:[.8,2],duration:full?1100:420,delay:lag,ease:'outQuad',onComplete:()=>wash.remove()});
    group.querySelectorAll('.scar').forEach(scar=>draw(scar,{duration:full?520:200,delay:lag+(full?380:140)}));
    group.querySelectorAll('.stitch').forEach(stitch=>draw(stitch,{duration:full?420:160,delay:lag+(full?780:280)}));
   });
   if(stump?.classList.contains('healed'))animate(stump,{opacity:[0,1],duration:full?900:300,ease:'outQuad'});
  }
  if(part)part.animate([{filter:'brightness(1.35) saturate(.4)'},{filter:'none'}],{duration:full?1000:420,easing:'ease-out'});
  // Titan flesh regrows: a severed limb pushes back out of its stump.
  const lower=impact.titan&&impact.severity==='crippling'&&part?.querySelector('.part.lower:not(.lost)');
  if(lower)animate(lower,{scaleY:[0,1],duration:full?900:360,ease:'outElastic(1,.7)'});
  const anchor=[scars[0],part].find(visible);
  if(anchor){effect('glint',anchor);if(impact.titan)effect('steam',anchor,{w:70,h:50,count:26});}
 },
 // The Armoured Titan's plating gives: a shockwave, sparks off the iron, dust, and the plates burst and fall back cracked.
 armour(app,el) {
  const full=lavish(),plate=el.querySelector('[data-armour]'),figs=[...el.querySelectorAll('.fig .armour')];
  const anchor=[plate,...figs,el.querySelector('.portrait')].find(visible);
  jolt(app.element,{strength:16,duration:720});
  if(anchor) {
   const r=anchor.getBoundingClientRect();
   effect('shock',anchor,{color:'#dfe4e6',radius:1.5});
   effect('sparks',anchor,{color:'#e9eef0'});
   setTimeout(()=>effect('dust',{x:r.left+r.width/2,y:r.bottom},{w:Math.max(120,r.width*1.6)}),140);
  }
  if(!moving())return;
  for(const fig of figs) {
   const plates=[...fig.querySelectorAll('path:not(.crackline)')];
   if(plates.length)animate(plates,{translateX:()=>[utils.random(-14,14),0],translateY:()=>[utils.random(-16,-4),0],rotate:()=>[utils.random(-40,40),0],opacity:[.35,1],duration:full?760:300,delay:stagger(30),ease:'outBounce'});
   fig.querySelectorAll('.crackline').forEach(line=>draw(line,{duration:full?240:120,delay:full?140:0}));
  }
  if(plate) {
   plate.animate([{scale:'1.14',rotate:'-3deg',filter:'brightness(1.9)'},{scale:'1',rotate:'0deg',filter:'none'}],{duration:full?560:240,easing:'cubic-bezier(.2,1.5,.4,1)'});
   plate.querySelectorAll('.ap-crack path').forEach(line=>draw(line,{duration:full?260:120,delay:full?90:0}));
   if(full)shatter(el.querySelector('.dossier-page'),plate);
  }
 },
 wound(app,el,{severity,region}) {
  const heavy=severity!=='minor',gore=goreLevel(),page=el.querySelector('.dossier-page');
  jolt(app.element,{strength:severity==='crippling'?13:heavy?8:4});
  if(gore!=='clinical')vignette(page,{strength:heavy?1:.55});
  const target=el.querySelector(`.bodyfig [data-region="${region}"]`)??el.querySelector(`[data-region="${region}"]`);
  if(target&&gore!=='clinical')effect('spatter',target,{count:gore==='graphic'?(heavy?120:55):24});
  if(target&&gore==='graphic')splat(page,target,heavy);
  if(target)animate(target,{scale:[1.08,1],duration:420,ease:'outElastic(1,.5)'});
 },
 death(app,el) {
  const page=el.querySelector('.dossier-page'),portrait=el.querySelector('.portrait');
  if(page&&moving())animate(page,{filter:['grayscale(0) brightness(1.15)','grayscale(.85) brightness(1)'],duration:1800,ease:'inOutQuad'});
  jolt(app.element,{strength:5,duration:600});
  // The Wounds tab's file is closed with its own plate: the band is laid across, the clerk stamps it.
  const plate=el.querySelector('.wplate');
  if(plate&&moving()){animate(plate.querySelector('.wband'),{scaleX:[0,1],duration:lavish()?560:220,ease:'outExpo'});stamp(plate.querySelector('.ws'),{rotate:-12});}
  if(portrait) {
   stamp(portrait.querySelector('.kia'),{rotate:-14});
   const r=portrait.getBoundingClientRect();
   effect('ash',{x:r.left+r.width/2,y:r.top+r.height/2},{w:r.width*1.6,h:r.height});
  }
 },
 shift(app,el) {
  const anchor=el.querySelector('.portrait')??el;
  flash('#fff4c0',{duration:800});
  effect('lightning',anchor);
  setTimeout(()=>effect('steam',anchor,{w:320,h:140,count:80}),420);
  jolt(app.element,{strength:12,duration:620});
 },
 unpack(app,el) {
  const objects=[...el.querySelectorAll('.kobj.on svg')];
  if(objects.length)animate(objects,{translateY:[-40,0],rotate:()=>[utils.random(-30,30),0],opacity:[0,1],duration:620,delay:stagger(35),ease:'outBounce'});
  const rack=el.querySelector('.bag,.kit');
  if(rack)effect('dust',rack,{w:rack.getBoundingClientRect().width});
  rigArrive(app);
 },
 restock(app,el,{itemId,from=0}) {
  const fresh=[...el.querySelectorAll(`[data-kit-id="${itemId}"] .kobj.on svg`)].slice(from);
  if(fresh.length)animate(fresh,{translateY:[-28,0],rotate:()=>[utils.random(-24,24),0],opacity:[0,1],duration:540,delay:stagger(70),ease:'outBounce'});
  rigArrive(app,itemId,from);
 }
};
