// The ODM rig in three dimensions: two hip units, each a scabbard box with its blades
// sticking out and a gas canister clamped on top, on a leather strap. One offscreen renderer
// paints every open rig into its own 2D canvas, so a sheet costs no WebGL context of its own.
// Nothing moves until the player touches it: hover tilts the rig, a click or a drag pulls.
import {animate,createTimeline,effect,lavish} from './fx.mjs';
import {loadThree,gpuAllowed} from './fx-layer.mjs';

let shared=null;
async function context() {
 if(shared)return shared;
 const THREE=await loadThree();
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
 renderer.setClearColor(0x000000,0);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(1);
 const pmrem=new THREE.PMREMGenerator(renderer);
 shared={THREE,renderer,env:pmrem.fromScene(studio(THREE),.03).texture,tex:textures(THREE),w:0,h:0};
 pmrem.dispose();
 return shared;
}

// A small photographic studio for the metal to reflect: a warm softbox above, a warm key to one
// side, a cool rim behind, and a bright horizon strip that becomes the blades' edge highlight.
function studio(THREE) {
 const scene=new THREE.Scene();
 scene.add(new THREE.Mesh(new THREE.BoxGeometry(24,14,24),new THREE.MeshBasicMaterial({color:new THREE.Color(.22,.18,.15),side:THREE.BackSide})));
 const panel=(w,h,rgb,position,rotation)=>{
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(...rgb),side:THREE.DoubleSide}));
  mesh.position.set(...position);mesh.rotation.set(...rotation);scene.add(mesh);
 };
 panel(10,4,[5,4.6,4],[0,6.5,1],[Math.PI/2,0,0]);
 panel(4,7,[3.6,2.9,2.2],[-11,1.5,3],[0,Math.PI/2,0]);
 panel(3,6,[1.3,1.7,2.3],[11,.5,-4],[0,-Math.PI/2,0]);
 panel(20,1.2,[2.6,2.6,2.6],[0,-.5,-11],[0,0,0]);
 panel(20,2,[1.4,1.2,1],[0,-.5,11],[0,Math.PI,0]);
 return scene;
}

function canvasTexture(THREE,w,h,draw,{srgb=true,repeat=[1,1]}={}) {
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);
 const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(...repeat);texture.anisotropy=4;
 if(srgb)texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
function brush(ctx,w,h,lines,base) {
 ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
 for(let i=0;i<lines;i++){const y=Math.random()*h,g=Math.floor(120+Math.random()*120);ctx.strokeStyle=`rgba(${g},${g},${g},${.05+Math.random()*.12})`;ctx.lineWidth=Math.random()<.2?1.4:.7;ctx.beginPath();ctx.moveTo(Math.random()*w*.3,y);ctx.lineTo(w*(.6+Math.random()*.4),y+Math.random()*1.2-.6);ctx.stroke();}
}
function textures(THREE) {
 return {
  brushed:canvasTexture(THREE,256,256,(c,w,h)=>brush(c,w,h,1400,'#c3c8cc'),{repeat:[2,1]}),
  // The blade: brushed steel, a bright ground edge along its back, snap-off score lines across it.
  blade:canvasTexture(THREE,1024,96,(c,w,h)=>{
   const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#f6f9fb');g.addColorStop(.18,'#dfe4e8');g.addColorStop(.6,'#b5bcc1');g.addColorStop(1,'#8c9399');
   c.fillStyle=g;c.fillRect(0,0,w,h);
   for(let i=0;i<900;i++){const y=Math.random()*h;c.strokeStyle=`rgba(255,255,255,${Math.random()*.12})`;c.beginPath();c.moveTo(Math.random()*w,y);c.lineTo(Math.random()*w,y);c.stroke();}
   for(let x=110;x<w-60;x+=118){c.strokeStyle='rgba(58,64,70,.85)';c.lineWidth=2;c.beginPath();c.moveTo(x,h);c.lineTo(x+34,0);c.stroke();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1;c.beginPath();c.moveTo(x+2.5,h);c.lineTo(x+36.5,0);c.stroke();}
   c.fillStyle='rgba(255,255,255,.7)';c.fillRect(0,0,w,3);
  }),
  bladeRough:canvasTexture(THREE,1024,96,(c,w,h)=>{
   c.fillStyle='#3a3a3a';c.fillRect(0,0,w,h);
   for(let x=110;x<w-60;x+=118){c.strokeStyle='#b0b0b0';c.lineWidth=3;c.beginPath();c.moveTo(x,h);c.lineTo(x+34,0);c.stroke();}
  },{srgb:false}),
  dial:canvasTexture(THREE,128,128,(c,w)=>{
   const r=w/2;c.translate(r,r);
   c.fillStyle='#efe7d4';c.beginPath();c.arc(0,0,r-4,0,Math.PI*2);c.fill();
   c.strokeStyle='#1f2226';c.lineWidth=7;c.beginPath();c.arc(0,0,r-4,0,Math.PI*2);c.stroke();
   c.strokeStyle='#8e2323';c.lineWidth=8;c.beginPath();c.arc(0,0,r-20,Math.PI*.75,Math.PI*1.05);c.stroke();
   c.strokeStyle='#241f1b';c.lineWidth=2;
   for(let i=0;i<=10;i++){const a=Math.PI*.75+i*Math.PI*1.5/10;c.beginPath();c.moveTo(Math.cos(a)*(r-16),Math.sin(a)*(r-16));c.lineTo(Math.cos(a)*(r-26),Math.sin(a)*(r-26));c.stroke();}
   c.rotate(Math.PI*2.1);c.strokeStyle='#8e2323';c.lineWidth=4;c.beginPath();c.moveTo(-6,0);c.lineTo(r-26,0);c.stroke();
   c.fillStyle='#241f1b';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();
  }),
  shadow:canvasTexture(THREE,128,128,(c,w)=>{const g=c.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);g.addColorStop(0,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,w,w);},{srgb:false})
 };
}

const roundedRect=(THREE,w,h,r)=>{
 const s=new THREE.Shape();
 s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
 s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;
};

const BLADE_LENGTH=3.6,BOX_LENGTH=1.75;
// Tall panels stack the hips one above the other with every blade pointing the same way; wide
// panels mirror them either side of the belt. `half` is the content's half extent for framing.
const LAYOUTS={
 stacked:{half:[3.25,2.4],units:[{x:-1.25,y:1.05,dir:1},{x:-1.25,y:-1.25,dir:1}],spare:[2.75,-.05,.35,Math.PI/2],strap:[.62,4.6,-1.25,-.1],shadow:[6.5,-2.05]},
 wide:{half:[5.6,1.75],units:[{x:-2.075,y:0,dir:-1},{x:2.075,y:0,dir:1}],spare:[0,-.02,.62,0],strap:[12.5,.62,0,-.2],shadow:[12,-1.05]}
};

class RigView {
 constructor(ctx,canvas,data,handlers) {
  Object.assign(this,{ctx,canvas,data,handlers,disposables:[],pickables:[],raf:0});
  this.paint=canvas.getContext('2d');
  const aspect=(canvas.clientWidth||400)/(canvas.clientHeight||200);
  this.layout=LAYOUTS[aspect<1.75?'stacked':'wide'];
  this.build();
  this.bind();
  this.render();
 }
 track(thing){this.disposables.push(thing);return thing;}
 material(options){return this.track(new this.ctx.THREE.MeshStandardMaterial(options));}
 build() {
  const {THREE,env,tex}=this.ctx,layout=this.layout;
  const scene=this.scene=new THREE.Scene();
  scene.environment=env;scene.environmentIntensity=1;
  this.camera=new THREE.PerspectiveCamera(24,2,.1,80);
  scene.add(new THREE.HemisphereLight(0xfff2dc,0x2b1c12,.7));
  const key=new THREE.DirectionalLight(0xffe4bc,2.6);key.position.set(-3.5,5,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xa9c2ff,1.5);rim.position.set(4,2.5,-5);scene.add(rim);
  const rig=this.rig=new THREE.Group();rig.rotation.x=.14;scene.add(rig);
  this.baseTilt=.14;

  const mats=this.mats={
   box:this.material({color:0x7c848b,metalness:.72,roughness:.36,map:tex.brushed}),
   dark:this.material({color:0x2a2d31,metalness:.65,roughness:.45}),
   leather:this.material({color:0x4a3120,metalness:0,roughness:.78}),
   brass:this.material({color:0xd0a85e,metalness:1,roughness:.28}),
   paint:this.material({color:0x7a1c1c,metalness:.25,roughness:.5}),
   dial:this.material({map:tex.dial,metalness:0,roughness:.65}),
   hole:this.track(new THREE.MeshBasicMaterial({color:0x050404})),
   hit:this.track(new THREE.MeshBasicMaterial({visible:false}))
  };
  const [sw,sh,sx,sy]=layout.strap;
  const strap=new THREE.Mesh(this.track(new THREE.BoxGeometry(sw,sh,.14)),mats.leather);strap.position.set(sx,sy,-.5);rig.add(strap);
  const [shadowWidth,shadowY]=layout.shadow;
  const shade=new THREE.Mesh(this.track(new THREE.PlaneGeometry(shadowWidth,2.4)),this.track(new THREE.MeshBasicMaterial({map:tex.shadow,transparent:true,depthWrite:false,opacity:.55})));
  shade.rotation.x=-Math.PI/2;shade.position.set(0,shadowY,.2);rig.add(shade);

  const boxGeo=this.track(new THREE.ExtrudeGeometry(roundedRect(THREE,BOX_LENGTH,1.24,.14),{depth:.62,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:3}));
  boxGeo.center();
  for(const unit of layout.units) {
   const box=new THREE.Mesh(boxGeo,mats.box);box.position.set(unit.x,unit.y,0);rig.add(box);
   const band=new THREE.Mesh(this.track(new THREE.BoxGeometry(.3,1.36,.74)),mats.leather);band.position.set(unit.x,unit.y,0);rig.add(band);
   const buckle=new THREE.Mesh(this.track(new THREE.BoxGeometry(.2,.26,.06)),mats.brass);buckle.position.set(unit.x,unit.y-.1,.4);rig.add(buckle);
   const plate=new THREE.Mesh(this.track(new THREE.BoxGeometry(.06,1.1,.5)),mats.dark);plate.position.set(unit.x+unit.dir*(BOX_LENGTH/2+.03),unit.y,0);rig.add(plate);
   for(const offset of [-.55,.55]) {
    const clamp=new THREE.Mesh(this.track(new THREE.TorusGeometry(.36,.035,8,32)),mats.dark);
    clamp.rotation.y=Math.PI/2;clamp.position.set(unit.x+offset,unit.y+.98,0);rig.add(clamp);
   }
  }

  const bladeShape=new THREE.Shape();
  bladeShape.moveTo(0,-.17);bladeShape.lineTo(BLADE_LENGTH-.34,-.17);bladeShape.lineTo(BLADE_LENGTH,.17);bladeShape.lineTo(0,.17);bladeShape.closePath();
  const bladeGeo=this.track(new THREE.ExtrudeGeometry(bladeShape,{depth:.03,bevelEnabled:true,bevelThickness:.012,bevelSize:.018,bevelSegments:2}));
  bladeGeo.translate(0,0,-.015);
  const bladeMap=this.track(tex.blade.clone());bladeMap.repeat.set(1/BLADE_LENGTH,1/.34);bladeMap.offset.set(0,.5);bladeMap.needsUpdate=true;
  const roughMap=this.track(tex.bladeRough.clone());roughMap.repeat.copy(bladeMap.repeat);roughMap.offset.copy(bladeMap.offset);roughMap.needsUpdate=true;

  const profile=[[0,-1.22],[.18,-1.21],[.29,-1.15],[.33,-1.02],[.33,1.0],[.3,1.12],[.2,1.19],[.09,1.22],[0,1.22]].map(([x,y])=>new THREE.Vector2(x,y));
  const canGeo=this.track(new THREE.LatheGeometry(profile,48));canGeo.rotateZ(Math.PI/2);
  const bandGeo=this.track(new THREE.CylinderGeometry(.338,.338,.14,48,1,true));bandGeo.rotateZ(Math.PI/2);
  const valveGeo=this.track(new THREE.CylinderGeometry(.1,.12,.3,20));valveGeo.rotateZ(Math.PI/2);
  const dialGeo=this.track(new THREE.CylinderGeometry(.15,.15,.05,32));dialGeo.rotateX(Math.PI/2);

  const bladeSlots=[],canisterSlots=[];
  for(const container of this.data) {
   const list=container.object==='blade'?bladeSlots:canisterSlots;
   container.slots.forEach((filled,index)=>list.push({itemId:container.id,index,filled}));
  }
  bladeSlots.slice(0,6).forEach((slot,i)=>{
   const unit=layout.units[i%2],row=Math.floor(i/2),dir=unit.dir;
   const group=new THREE.Group();
   // The blade's base sits deep in the box; the rest of it runs out through the open end.
   group.position.set(unit.x-dir*(BOX_LENGTH/2-.25),unit.y+.36-row*.36,.08-row*.08);
   group.rotation.y=dir<0?Math.PI:0;
   const material=this.material({color:0xffffff,map:bladeMap,roughnessMap:roughMap,metalness:1,roughness:.9,transparent:true});
   const blade=new THREE.Mesh(bladeGeo,material);group.add(blade);
   const hole=new THREE.Mesh(this.track(new THREE.PlaneGeometry(.34,.08)),mats.hole);
   hole.rotation.y=Math.PI/2;hole.position.set(BOX_LENGTH-.19,0,0);group.add(hole);
   const hit=new THREE.Mesh(this.track(new THREE.BoxGeometry(2.3,.32,.3)),mats.hit);hit.position.set(BOX_LENGTH+1.0,0,0);group.add(hit);
   blade.visible=slot.filled;
   Object.assign(group.userData,{...slot,kind:'blade',side:dir,rest:group.position.clone(),restRotation:group.rotation.clone(),material,mesh:blade});
   hit.userData.slot=group;blade.userData.slot=group;
   rig.add(group);this.pickables.push(hit,blade);
  });
  const places=[...layout.units.map(u=>[u.x,u.y+.98,0,0,1]),[...layout.spare,.82]];
  canisterSlots.slice(0,3).forEach((slot,i)=>{
   const [x,y,z,turn,scale]=places[i];
   const group=new THREE.Group();group.position.set(x,y,z);group.rotation.z=turn;group.scale.setScalar(scale);
   const material=this.material({color:0xdde2e6,metalness:.95,roughness:.22,map:tex.brushed,transparent:true});
   const body=new THREE.Mesh(canGeo,material);group.add(body);
   const band=new THREE.Mesh(bandGeo,mats.paint);band.position.x=-.45;group.add(band);
   const valve=new THREE.Mesh(valveGeo,mats.brass);valve.position.x=1.34;group.add(valve);
   const dial=new THREE.Mesh(dialGeo,mats.dial);dial.position.set(.35,0,.34);group.add(dial);
   const hit=new THREE.Mesh(this.track(new THREE.BoxGeometry(2.6,.75,.75)),mats.hit);group.add(hit);
   for(const part of [body,band,valve,dial])part.visible=slot.filled;
   Object.assign(group.userData,{...slot,kind:'canister',rest:group.position.clone(),restRotation:group.rotation.clone(),material,parts:[body,band,valve,dial],mesh:body});
   hit.userData.slot=group;body.userData.slot=group;
   rig.add(group);this.pickables.push(hit,body);
  });
  this.slots=[...new Set(this.pickables.map(p=>p.userData.slot))];
 }

 bind() {
  const {THREE}=this.ctx,canvas=this.canvas;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
  const pick=event=>{
   const r=canvas.getBoundingClientRect();
   this.pointer.set(((event.clientX-r.left)/r.width)*2-1,-((event.clientY-r.top)/r.height)*2+1);
   this.raycaster.setFromCamera(this.pointer,this.camera);
   const hit=this.raycaster.intersectObjects(this.pickables,false)[0];
   return {slot:hit?.object.userData.slot??null,nx:this.pointer.x,ny:this.pointer.y};
  };
  this.listeners={
   move:event=>{
    if(this.drag){this.dragTo(event);return;}
    const {slot,nx,ny}=pick(event);
    this.hover(slot);
    animate(this.rig.rotation,{y:nx*.16,x:this.baseTilt-ny*.07,duration:420,ease:'outQuad',onUpdate:()=>this.invalidate()});
   },
   leave:()=>{if(this.drag)return;this.hover(null);animate(this.rig.rotation,{y:0,x:this.baseTilt,duration:700,ease:'outElastic(1,.6)',onUpdate:()=>this.invalidate()});},
   down:event=>{
    const {slot}=pick(event);if(!slot||event.button!==0)return;
    this.drag={slot,x:event.clientX,y:event.clientY,moved:false,pull:0};canvas.setPointerCapture(event.pointerId);
   },
   up:()=>{
    const drag=this.drag;this.drag=null;if(!drag)return;
    const data=drag.slot.userData;
    if(!data.filled){this.handlers.restore?.(data.itemId);return;}
    if(!drag.moved){this.handlers.spend?.(data.itemId);return;}
    // A pull that went far enough keeps going; a short one slides back into the box.
    if(drag.pull>1.1)this.pull(drag.slot,{already:true}).then(()=>this.handlers.spend?.(data.itemId,{played:true}));
    else this.settle(drag.slot);
   }
  };
  canvas.addEventListener('pointermove',this.listeners.move);
  canvas.addEventListener('pointerleave',this.listeners.leave);
  canvas.addEventListener('pointerdown',this.listeners.down);
  canvas.addEventListener('pointerup',this.listeners.up);
 }
 hover(slot) {
  if(this.hovered===slot)return;
  const glow=(target,on)=>target?.userData.material?.emissive?.setHex(on?0x3a2a12:0x000000);
  glow(this.hovered,false);glow(slot,true);this.hovered=slot;
  const data=slot?.userData;
  this.canvas.style.cursor=!data?'':data.filled?'grab':'copy';
  this.canvas.title=!data?'':data.kind==='blade'?(data.filled?'Draw a blade — click, or pull it out':'Sheathe a blade'):(data.filled?'Swap out the canister':'Fit a full canister');
  this.invalidate();
 }
 dragTo(event) {
  const drag=this.drag,data=drag.slot.userData;
  if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6)drag.moved=true;
  if(!data.filled||!drag.moved)return;
  const width=this.canvas.getBoundingClientRect().width,scale=this.layout.half[0]*2/width;
  if(data.kind==='blade') {
   drag.pull=Math.max(0,(event.clientX-drag.x)*data.side*scale);
   drag.slot.position.x=data.rest.x+data.side*Math.min(drag.pull,2.2);
  } else {
   drag.pull=Math.max(0,(drag.y-event.clientY)*scale);
   drag.slot.position.y=data.rest.y+Math.min(drag.pull,1.6);
   drag.slot.rotation.x=drag.pull*2;
  }
  this.invalidate();
 }
 settle(slot) {
  const data=slot.userData;
  animate(slot.position,{x:data.rest.x,y:data.rest.y,z:data.rest.z,duration:380,ease:'outBack(2)',onUpdate:()=>this.invalidate()});
  animate(slot.rotation,{x:data.restRotation.x,duration:380,ease:'outQuad'});
 }
 screen(object,local) {
  const {THREE}=this.ctx,r=this.canvas.getBoundingClientRect();
  const v=object.localToWorld(new THREE.Vector3(...local)).project(this.camera);
  return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};
 }
 /** Takes the object out of its slot: blades slide free and lift away, canisters unscrew. */
 pull(slot,{already=false}={}) {
  const data=slot.userData;
  return new Promise(resolve=>{
   const tl=createTimeline({onUpdate:()=>this.invalidate(),onComplete:()=>{for(const part of data.parts??[data.mesh])part.visible=false;this.invalidate();resolve();}});
   if(data.kind==='blade') {
    const lift=already?0:240;
    if(!already)tl.add(slot.position,{x:data.rest.x+data.side*2.3,duration:lavish()?300:160,ease:'inOutQuad'},0);
    tl.call(()=>effect('glint',this.screen(data.mesh,[BLADE_LENGTH,0,0])),already?0:150);
    tl.add(slot.position,{y:data.rest.y+1.9,z:data.rest.z+1.4,duration:420,ease:'outQuad'},lift);
    tl.add(slot.rotation,{z:.8*data.side,x:.5,duration:420,ease:'outQuad'},lift);
    tl.add(data.material,{opacity:0,duration:240,ease:'inQuad'},lift+180);
   } else {
    tl.add(slot.rotation,{x:Math.PI*4,duration:460,ease:'inQuad'},0);
    tl.add(slot.position,{y:data.rest.y+1.5,z:data.rest.z+.6,duration:360,ease:'inQuad'},120);
    tl.call(()=>effect('puff',this.screen(slot,[1.4,0,0]),{count:18}),160);
    tl.add(data.material,{opacity:0,duration:220},340);
   }
  });
 }
 has(itemId){return this.slots.some(slot=>slot.userData.itemId===itemId);}
 play(itemId,mode='spend') {
  if(mode!=='spend')return Promise.resolve();
  const slot=this.slots.filter(s=>s.userData.itemId===itemId&&s.userData.filled).sort((a,b)=>b.userData.index-a.userData.index)[0];
  return slot?this.pull(slot):Promise.resolve();
 }
 /** Objects that have just been restocked arrive: blades slide home, canisters drop into their clamps. */
 arrive(itemId=null,from=0) {
  const fresh=this.slots.filter(s=>s.userData.filled&&(!itemId||(s.userData.itemId===itemId&&s.userData.index>=from)));
  fresh.forEach((slot,i)=>{
   const data=slot.userData;
   if(data.kind==='blade')slot.position.x=data.rest.x+data.side*2.4;else slot.position.y=data.rest.y+1.6;
   data.material.opacity=0;
   animate(data.material,{opacity:1,duration:200,delay:i*70});
   animate(slot.position,{x:data.rest.x,y:data.rest.y,duration:520,delay:i*70,ease:data.kind==='blade'?'outQuart':'outBounce',onUpdate:()=>this.invalidate()});
  });
 }
 invalidate() {
  if(this.raf||this.dead)return;
  this.raf=requestAnimationFrame(()=>{this.raf=0;this.render();});
 }
 render() {
  if(this.dead||!this.canvas.isConnected)return;
  const {renderer}=this.ctx,dpr=Math.min(2,devicePixelRatio||1);
  const w=Math.max(1,Math.round(this.canvas.clientWidth*dpr)),h=Math.max(1,Math.round(this.canvas.clientHeight*dpr));
  if(this.ctx.w!==w||this.ctx.h!==h){renderer.setSize(w,h,false);this.ctx.w=w;this.ctx.h=h;}
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  // Frame the whole rig whatever shape the panel is.
  const [hw,hh]=this.layout.half,t=Math.tan(this.camera.fov*Math.PI/360),aspect=w/h;
  const distance=Math.max(hh/t,hw/(t*aspect))*1.06;
  this.camera.aspect=aspect;this.camera.position.set(0,distance*.13,distance);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();
  renderer.render(this.scene,this.camera);
  this.paint.clearRect(0,0,w,h);this.paint.drawImage(renderer.domElement,0,0);
 }
 /** Copies the last frame onto the canvas that replaces this one, so a re-render never blinks. */
 handOver(canvas) {
  if(!this.canvas.width)return;
  canvas.width=this.canvas.width;canvas.height=this.canvas.height;
  canvas.getContext('2d').drawImage(this.canvas,0,0);
 }
 destroy() {
  this.dead=true;cancelAnimationFrame(this.raf);
  const c=this.canvas,l=this.listeners;
  if(l){c.removeEventListener('pointermove',l.move);c.removeEventListener('pointerleave',l.leave);c.removeEventListener('pointerdown',l.down);c.removeEventListener('pointerup',l.up);}
  for(const thing of this.disposables)thing.dispose?.();
 }
}

/** Mounts a rig into a canvas, or resolves null when WebGL is off and the drawn fallback stays. */
export async function mountRig(canvas,data,handlers={}) {
 if(!canvas||!data?.length||!gpuAllowed())return null;
 try {return new RigView(await context(),canvas,data,handlers);}
 catch(error) {console.warn('Titan World | 3D rig unavailable',error);return null;}
}
