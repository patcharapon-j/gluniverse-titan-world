// One transparent WebGL layer shared by every sheet and chat card, so an effect can leave
// the element that caused it without each window holding its own GL context (Chromium
// allows only a handful). three.js loads on the first effect, not at startup.
import {gpuMode} from './settings.mjs';

let loading=null,layer=null,slow=false,three=null;
const allowed=()=>{const mode=gpuMode();return mode==='on'||(mode==='auto'&&!slow);};
export const gpuAllowed=allowed;
/** three.js, loaded once for the effects layer and the rig alike. */
export const loadThree=()=>three??=import('../lib/three/three.module.min.js');
function load() {
 loading??=loadThree().then(THREE=>{
  try {layer=new Layer(THREE);} catch(error) {console.warn('Titan World | WebGL effects unavailable',error);slow=true;}
  return layer;
 },error=>{console.warn('Titan World | three.js failed to load',error);slow=true;return null;});
 return loading;
}
/** Plays an effect on the layer; resolves false when the caller should use a page fallback. */
export async function play(kind,at,options={}) {
 if(!allowed()||!PRESETS[kind])return false;
 const target=await load();
 if(!target||!allowed())return false;
 PRESETS[kind](target,at,options);
 target.start();
 return true;
}

const VERT=`uniform float uDpr;attribute float aSize;attribute float aAlpha;attribute vec3 aTint;
varying float vAlpha;varying vec3 vTint;
void main(){vAlpha=aAlpha;vTint=aTint;gl_PointSize=max(1.0,aSize*uDpr);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
// Premultiplied output throughout: additive glows stack into light, ink and smoke cover.
const GLOW=`varying float vAlpha;varying vec3 vTint;
void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;float a=smoothstep(1.0,0.0,d);a*=a*vAlpha;gl_FragColor=vec4(vTint*a,a);}`;
const INK=`varying float vAlpha;varying vec3 vTint;
void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;float a=smoothstep(1.0,0.7,d)*vAlpha;gl_FragColor=vec4(vTint*a,a);}`;
const SMOKE=`varying float vAlpha;varying vec3 vTint;
void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;float a=pow(smoothstep(1.0,0.0,d),1.7)*vAlpha;gl_FragColor=vec4(vTint*a,a);}`;

const rgb=hex=>{const n=parseInt(String(hex).replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=list=>list[Math.floor(Math.random()*list.length)];
const particle=o=>({x:o.x,y:o.y,vx:o.vx??0,vy:o.vy??0,g:o.g??0,drag:o.drag??0,life:o.life??1,age:-(o.delay??0),
 s0:o.s0??4,s1:o.s1??o.s0??4,a:o.a??1,c:rgb(o.color??'#ffffff'),fade:o.fade??'out',wobble:o.wobble??0,wamp:o.wamp??0,seed:Math.random()*10});

class Pool {
 constructor(THREE,cap,blending,fragment,dpr) {
  this.cap=cap;this.parts=[];
  this.pos=new Float32Array(cap*3);this.tint=new Float32Array(cap*3);this.alpha=new Float32Array(cap);this.size=new Float32Array(cap);
  const geometry=new THREE.BufferGeometry();
  const attribute=(array,width)=>{const a=new THREE.BufferAttribute(array,width);a.setUsage(THREE.DynamicDrawUsage);return a;};
  geometry.setAttribute('position',attribute(this.pos,3));geometry.setAttribute('aTint',attribute(this.tint,3));
  geometry.setAttribute('aAlpha',attribute(this.alpha,1));geometry.setAttribute('aSize',attribute(this.size,1));
  geometry.setDrawRange(0,0);
  this.material=new THREE.ShaderMaterial({uniforms:{uDpr:{value:dpr}},vertexShader:VERT,fragmentShader:fragment,
   transparent:true,depthTest:false,depthWrite:false,blending,premultipliedAlpha:true});
  this.geometry=geometry;this.points=new THREE.Points(geometry,this.material);this.points.frustumCulled=false;
 }
 add(p) {if(this.parts.length>=this.cap)this.parts.shift();this.parts.push(p);}
 step(dt) {
  let n=0;const keep=[];
  for(const p of this.parts) {
   p.age+=dt;if(p.age>=p.life)continue;keep.push(p);if(p.age<0)continue;
   const damp=Math.exp(-p.drag*dt);p.vx*=damp;p.vy*=damp;p.vy+=p.g*dt;
   if(p.wobble)p.vx+=Math.sin((p.age+p.seed)*p.wobble)*p.wamp*dt;
   p.x+=p.vx*dt;p.y+=p.vy*dt;
   const t=p.age/p.life;
   const fade=p.fade==='inout'?Math.sin(Math.PI*t):p.fade==='late'?(t<.65?1:1-(t-.65)/.35):Math.pow(1-t,1.4);
   this.pos[n*3]=p.x;this.pos[n*3+1]=-p.y;this.pos[n*3+2]=0;
   this.tint[n*3]=p.c[0];this.tint[n*3+1]=p.c[1];this.tint[n*3+2]=p.c[2];
   this.alpha[n]=p.a*fade;this.size[n]=p.s0+(p.s1-p.s0)*t;n++;
  }
  this.parts=keep;this.geometry.setDrawRange(0,n);
  for(const key of ['position','aTint','aAlpha','aSize'])this.geometry.getAttribute(key).needsUpdate=true;
  return keep.length;
 }
}

class Layer {
 constructor(THREE) {
  const canvas=document.createElement('canvas');
  canvas.id='tw-fx-layer';canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:9000;display:none';
  document.body.append(canvas);this.canvas=canvas;
  this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});
  this.renderer.setClearColor(0x000000,0);
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,1,0,-1,-10,10);
  const dpr=Math.min(2,devicePixelRatio||1);
  this.smoke=new Pool(THREE,900,THREE.NormalBlending,SMOKE,dpr);
  this.ink=new Pool(THREE,1800,THREE.NormalBlending,INK,dpr);
  this.glow=new Pool(THREE,3000,THREE.AdditiveBlending,GLOW,dpr);
  this.scene.add(this.smoke.points,this.ink.points,this.glow.points);
  this.tasks=[];this.running=false;this.samples=[];this.tick=this.tick.bind(this);
  this.resize();addEventListener('resize',()=>this.resize());
 }
 resize() {
  const dpr=Math.min(2,devicePixelRatio||1);
  this.renderer.setPixelRatio(dpr);this.renderer.setSize(innerWidth,innerHeight,false);
  Object.assign(this.camera,{left:0,right:innerWidth,top:0,bottom:-innerHeight});this.camera.updateProjectionMatrix();
  for(const pool of [this.smoke,this.ink,this.glow])pool.material.uniforms.uDpr.value=dpr;
 }
 task(fn) {this.tasks.push({fn,t:0});}
 start() {
  if(this.running)return;
  // Above every window, below Dice So Nice's own canvas when it sits over the interface.
  const dice=document.getElementById('dice-box-canvas'),z=dice?Number(getComputedStyle(dice).zIndex):NaN;
  this.canvas.style.zIndex=String(Number.isFinite(z)&&z>200?Math.min(9000,z-1):9000);
  this.canvas.style.display='block';this.running=true;this.last=performance.now();
  requestAnimationFrame(this.tick);
 }
 tick(now) {
  const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
  if(gpuMode()==='auto') {
   this.samples.push(dt);
   if(this.samples.length>45) {
    this.samples.shift();
    if(this.samples.reduce((a,b)=>a+b,0)/this.samples.length>.045&&!slow){slow=true;console.info('Titan World | frame time too high, effects fall back to the page layer');}
   }
  }
  this.tasks=this.tasks.filter(task=>{task.t+=dt;return task.fn(dt,task.t)!==false;});
  const alive=this.smoke.step(dt)+this.ink.step(dt)+this.glow.step(dt);
  this.renderer.render(this.scene,this.camera);
  if(alive||this.tasks.length)requestAnimationFrame(this.tick);
  else {this.running=false;this.samples=[];this.renderer.clear();this.canvas.style.display='none';}
 }
}

// Midpoint displacement: a jagged path that still lands where it was aimed.
function bolt(x0,y0,x1,y1,depth) {
 let points=[[x0,y0],[x1,y1]],offset=Math.hypot(x1-x0,y1-y0)*.2;
 for(let d=0;d<depth;d++) {
  const next=[points[0]];
  for(let i=0;i<points.length-1;i++) {
   const [ax,ay]=points[i],[bx,by]=points[i+1],nx=-(by-ay),ny=bx-ax,len=Math.hypot(nx,ny)||1,o=rand(-offset,offset);
   next.push([(ax+bx)/2+nx/len*o,(ay+by)/2+ny/len*o],[bx,by]);
  }
  points=next;offset*=.52;
 }
 return points;
}
function trace(l,points,{delay=0,core='#fff7d6',halo='#ffe39a',width=1}={}) {
 let carry=0;
 for(let i=0;i<points.length-1;i++) {
  const [ax,ay]=points[i],[bx,by]=points[i+1],len=Math.hypot(bx-ax,by-ay);
  for(let s=0;s<len;s+=4) {
   const x=ax+(bx-ax)*s/len,y=ay+(by-ay)*s/len;
   l.glow.add(particle({x,y,delay,life:rand(.16,.3),s0:rand(5,10)*width,s1:2,color:core}));
   carry+=4;if(carry>36){carry=0;l.glow.add(particle({x,y,delay,life:rand(.22,.4),s0:rand(50,90)*width,s1:30,a:.2,color:halo}));}
  }
 }
}

const PRESETS={
 sparks(l,at,{color='#ffd27a'}={}) {
  for(let i=0;i<130;i++){const th=Math.random()*Math.PI*2,sp=rand(160,660);
   l.glow.add(particle({x:at.x,y:at.y,vx:Math.cos(th)*sp,vy:Math.sin(th)*sp-rand(60,220),g:950,drag:1.8,life:rand(.5,1.3),s0:rand(3,7.5),s1:1,color:pick([color,'#fff1c4','#ffb347'])}));}
  for(let i=0;i<14;i++)l.glow.add(particle({x:at.x+rand(-20,20),y:at.y+rand(-12,12),vx:rand(-40,40),vy:rand(-40,40),drag:2,life:rand(.35,.7),s0:rand(70,170),s1:rand(20,40),a:.26,color:'#ffcc66'}));
  l.glow.add(particle({x:at.x,y:at.y,life:.32,s0:460,s1:160,a:.32,color:'#fff4d0'}));
 },
 shock(l,at,{color='#f4ecd8',radius=1}={}) {
  for(let i=0;i<48;i++){const th=i/48*Math.PI*2;l.glow.add(particle({x:at.x,y:at.y,vx:Math.cos(th)*440*radius,vy:Math.sin(th)*440*radius,drag:7.5,life:.42,s0:5,s1:1,a:.75,color}));}
 },
 embers(l,at,{color='#ff5a3a'}={}) {
  for(let i=0;i<48;i++)l.glow.add(particle({x:at.x+rand(-14,14),y:at.y+rand(-8,8),vx:rand(-90,90),vy:rand(-170,-20),g:-30,drag:1.2,life:rand(.7,1.4),s0:rand(2,4.5),s1:.5,color:pick([color,'#ffb070']),wobble:7,wamp:60}));
  for(let i=0;i<22;i++)l.ink.add(particle({x:at.x+rand(-10,10),y:at.y,vx:rand(-40,40),vy:rand(-80,-10),drag:.8,life:rand(.9,1.6),s0:rand(2,4),s1:1,a:.7,color:'#2b1d1a',fade:'inout'}));
 },
 spatter(l,at,{dir=-Math.PI/2,count=80,spread=1.35}={}) {
  const reds=['#4a0505','#6c0c0c','#8e1414','#3a0303'];
  for(let i=0;i<count;i++){const th=dir+rand(-spread,spread),sp=rand(110,580);
   l.ink.add(particle({x:at.x+rand(-6,6),y:at.y+rand(-6,6),vx:Math.cos(th)*sp,vy:Math.sin(th)*sp,g:1500,drag:.7,life:rand(.4,.95),s0:rand(3,11),s1:rand(2,4),a:.95,color:pick(reds),fade:'late'}));}
  for(let i=0;i<10;i++)l.smoke.add(particle({x:at.x,y:at.y,vx:rand(-60,60),vy:rand(-60,20),drag:2,life:rand(.5,.9),s0:rand(20,40),s1:rand(50,90),a:.16,color:'#5a0808',fade:'inout'}));
 },
 flare(l,at,{color='#4fbf5a'}={}) {
  const tx=at.x+rand(-90,90),ty=Math.max(40,innerHeight*.12),duration=.85;
  let px=at.x,py=at.y;
  l.task((_dt,t)=>{
   const k=Math.min(1,t/duration),e=1-Math.pow(1-k,3);
   const x=at.x+(tx-at.x)*e+Math.sin(k*10)*7*(1-k),y=at.y+(ty-at.y)*e;
   const steps=Math.max(1,Math.ceil(Math.hypot(x-px,y-py)/6));
   for(let s=0;s<steps;s++) {
    const ix=px+(x-px)*s/steps,iy=py+(y-py)*s/steps;
    l.glow.add(particle({x:ix,y:iy,vx:rand(-20,20),vy:rand(-10,30),g:50,drag:1.5,life:rand(.35,.8),s0:rand(5,11),s1:1,color:pick([color,'#fff3c8'])}));
    if(Math.random()<.35)l.smoke.add(particle({x:ix,y:iy,vx:rand(-10,10),vy:rand(-10,10),drag:.8,life:rand(1,1.9),s0:rand(8,14),s1:rand(30,54),a:.2,color:'#cfc8bc',fade:'inout'}));
   }
   l.glow.add(particle({x,y,life:.08,s0:38,s1:30,a:.9,color:'#ffffff'}));
   px=x;py=y;
   if(k<1)return true;
   for(let i=0;i<220;i++){const th=Math.random()*Math.PI*2,sp=rand(40,430);
    l.glow.add(particle({x,y,vx:Math.cos(th)*sp,vy:Math.sin(th)*sp,g:140,drag:1.3,life:rand(1.1,2.4),s0:rand(3,7),s1:1,color:pick([color,color,'#fff3c8'])}));}
   for(let i=0;i<22;i++)l.glow.add(particle({x:x+rand(-30,30),y:y+rand(-30,30),vx:rand(-30,30),vy:rand(-30,30),drag:1,life:rand(.5,1),s0:rand(120,280),s1:rand(60,120),a:.2,color}));
   for(let i=0;i<40;i++)l.smoke.add(particle({x:x+rand(-40,40),y:y+rand(-40,40),vx:rand(-40,40),vy:rand(-30,30),g:-8,drag:.5,life:rand(1.8,3.2),s0:rand(20,40),s1:rand(70,130),a:.18,color:'#bdb6aa',fade:'inout'}));
   return false;
  });
 },
 ash(l,at,{w=200,h=200}={}) {
  for(let i=0;i<180;i++)l.ink.add(particle({x:at.x+rand(-w/2,w/2),y:at.y+rand(-h/2,h/2),vx:rand(-20,20),vy:rand(-70,-10),g:-6,drag:.3,life:rand(2,3.6),s0:rand(2,5),s1:rand(1,3),a:.75,color:pick(['#2a2623','#4a433d','#6b625a']),fade:'inout',wobble:3,wamp:40,delay:rand(0,.8)}));
  for(let i=0;i<26;i++)l.glow.add(particle({x:at.x+rand(-w/2,w/2),y:at.y+rand(-h/3,h/2),vx:rand(-15,15),vy:rand(-60,-20),drag:.4,life:rand(1.2,2.2),s0:rand(2,3.5),s1:.5,color:'#ff8a4a',delay:rand(0,.6),wobble:4,wamp:30}));
 },
 steam(l,at,{w=140,h=80,count=54}={}) {
  for(let i=0;i<count;i++)l.smoke.add(particle({x:at.x+rand(-w/2,w/2),y:at.y+rand(-h/2,h/2),vx:rand(-30,30),vy:rand(-140,-40),drag:.5,life:rand(1.3,2.7),s0:rand(24,46),s1:rand(90,160),a:.32,color:pick(['#f1ede6','#d9d3ca']),fade:'inout',delay:rand(0,.5)}));
 },
 lightning(l,at) {
  for(const [delay,spread,width] of [[0,240,1.2],[.16,160,.9],[.42,120,1]]) {
   const path=bolt(at.x+rand(-spread,spread),-20,at.x,at.y,7);
   trace(l,path,{delay,width});
   for(let b=0;b<2;b++){const [sx,sy]=pick(path.slice(8,-8));trace(l,bolt(sx,sy,sx+rand(-140,140),sy+rand(40,160),5),{delay,width:.55});}
   l.glow.add(particle({x:at.x,y:at.y,delay,life:.3,s0:520,s1:220,a:.35,color:'#fff4c8'}));
  }
 },
 glint(l,at) {
  for(let i=0;i<26;i++){const th=rand(-Math.PI,0),sp=rand(80,320);l.glow.add(particle({x:at.x,y:at.y,vx:Math.cos(th)*sp,vy:Math.sin(th)*sp,g:600,drag:2,life:rand(.22,.5),s0:rand(2,4),s1:.5,color:pick(['#eaf6ff','#ffffff','#ffe9b0'])}));}
  l.glow.add(particle({x:at.x,y:at.y,life:.2,s0:60,s1:10,a:.6,color:'#ffffff'}));
 },
 puff(l,at,{count=20}={}) {
  for(let i=0;i<count;i++)l.smoke.add(particle({x:at.x,y:at.y,vx:rand(-90,90),vy:rand(-70,20),drag:2.2,life:rand(.6,1.1),s0:rand(10,18),s1:rand(40,70),a:.42,color:'#f3efe8',fade:'inout'}));
 },
 dust(l,at,{w=160}={}) {
  for(let i=0;i<60;i++)l.smoke.add(particle({x:at.x+rand(-w/2,w/2),y:at.y+rand(-6,6),vx:rand(-50,50),vy:rand(-90,-10),drag:1.6,life:rand(.6,1.3),s0:rand(6,12),s1:rand(20,40),a:.35,color:pick(['#8a7050','#a58d6a']),fade:'inout'}));
 }
};
