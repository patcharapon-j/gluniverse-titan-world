// Motion for the dossier: anime.js for choreography, the Web Animations API for small
// presses, and the shared WebGL layer for anything that has to leave its element. Every
// entry point reads the per-user Motion setting first.
import {animate,createTimeline,stagger,utils} from '../lib/anime/anime.esm.min.js';
import {motionLevel} from './settings.mjs';
import {play} from './fx-layer.mjs';
export {animate,createTimeline,stagger,utils};

export const moving=()=>motionLevel()!=='off';
export const lavish=()=>motionLevel()==='full';

const NUMBER=/[−-]?\d+(?:\.\d+)?/;
export const readNum=text=>{const m=String(text??'').match(NUMBER);return m?Number(m[0].replace('−','-')):NaN;};

export function centerOf(target) {
 if(!target)return {x:innerWidth/2,y:innerHeight/2,w:0,h:0};
 if(!(target instanceof Element))return {w:0,h:0,...target};
 const r=target.getBoundingClientRect();
 return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,left:r.left,top:r.top};
}

/** A physical knock: the element is shoved and settles, composed with its own transform. */
export function jolt(el,{strength=6,duration=460}={}) {
 if(!el||!moving())return;
 const s=lavish()?strength:strength*.4;
 el.animate([{translate:'0 0'},{translate:`${-s}px ${s*.35}px`},{translate:`${s*.8}px ${-s*.3}px`},{translate:`${-s*.45}px ${s*.2}px`},{translate:`${s*.2}px 0`},{translate:'0 0'}],
  {duration,easing:'cubic-bezier(.3,.7,.4,1)'});
}
export function vignette(host,{strength=1}={}) {
 if(!host||!moving())return;
 const v=document.createElement('i');v.className='tw-vignette';v.style.setProperty('--vs',strength);host.append(v);
 v.animate([{opacity:0},{opacity:1,offset:.16},{opacity:0}],{duration:lavish()?950:500,easing:'ease-out'}).finished.finally(()=>v.remove());
}
export function flash(color='#fffbe8',{duration=560,peak=.85}={}) {
 if(!lavish())return;
 const f=document.createElement('i');f.className='tw-screen-flash';f.style.background=color;document.body.append(f);
 f.animate([{opacity:peak},{opacity:0}],{duration,easing:'ease-out'}).finished.finally(()=>f.remove());
}
/** Loss reads as a red jolt, recovery as a cool wash. */
export function pulse(node,worse) {
 if(!node||!moving())return;
 node.animate(worse
  ?[{backgroundColor:'rgba(168,48,48,.45)',color:'#a01d1d'},{backgroundColor:'rgba(168,48,48,0)'}]
  :[{backgroundColor:'rgba(62,95,138,.34)',color:'#2f4a6e'},{backgroundColor:'rgba(62,95,138,0)'}],
  {duration:lavish()?720:380,easing:'ease-out'});
}
/** Counts the first number inside a node from one value to another, keeping its surrounding text. */
export function countNode(node,from,to,final) {
 const text=[...node.childNodes].find(n=>n.nodeType===3&&NUMBER.test(n.nodeValue));
 if(!text||!moving()||from===to)return;
 const template=text.nodeValue,state={v:from};
 const write=v=>{text.nodeValue=template.replace(NUMBER,v<0?`−${Math.abs(v)}`:String(v));};
 write(from);
 animate(state,{v:to,duration:Math.min(760,200+Math.abs(to-from)*110),ease:'outExpo',
  onUpdate:()=>write(Math.round(state.v)),onComplete:()=>{text.nodeValue=final??template;}});
}
export function liveChange(node,before,after) {
 if(!moving())return;
 const a=readNum(before),b=readNum(after);
 if(!Number.isFinite(a)||!Number.isFinite(b)) {node.animate([{backgroundColor:'rgba(185,146,74,.4)'},{backgroundColor:'rgba(185,146,74,0)'}],{duration:520});return;}
 const worse=node.dataset.liveBad==='up'?b>a:b<a;
 const text=[...node.childNodes].find(n=>n.nodeType===3&&NUMBER.test(n.nodeValue));
 countNode(node,a,b,text?.nodeValue);
 pulse(node,worse);
}
/** Presses a stamp onto the page: overshoots, lands, settles. */
export function stamp(el,{rotate=-6,onComplete}={}) {
 if(!el||!moving())return;
 animate(el,{scale:[1.9,1],rotate:[rotate*2.2,rotate],opacity:[0,1],duration:lavish()?380:200,ease:'outBack(2.4)',onComplete});
}

/** A dialog lands like a slip of paper put down on the table, and its keys settle after it. */
export function dialogIntro(el) {
 if(!el||!moving())return;
 const full=lavish();
 animate(el,{translateY:[-16,0],rotate:[-1.1,0],opacity:[0,1],duration:full?320:160,ease:'outBack(1.6)'});
 const keys=el.querySelectorAll('.rk');
 if(keys.length&&full)animate(keys,{translateY:[-8,0],opacity:[0,1],delay:stagger(28,{start:90}),duration:260,ease:'outBack(2)'});
}

// Page-layer fallbacks when WebGL is off or too slow: fewer, larger particles.
const FALLBACK={
 sparks:{count:28,colors:['#ffe29a','#ffc85a','#fff4d6'],spread:190,fall:120,size:[3,6],glow:true},
 shock:{count:16,colors:['#f4ecd8'],spread:80,size:[3,4],ring:true,glow:true},
 embers:{count:16,colors:['#ff6a3a','#b8301c'],spread:60,fall:-70,size:[2,4],glow:true},
 flare:{count:34,spread:170,fall:90,size:[3,7],glow:true},
 spatter:{count:30,colors:['#6e0b0b','#8e1414','#4a0606'],spread:120,fall:170,size:[3,9]},
 ash:{count:34,colors:['#3a3430','#5a524c'],spread:100,fall:-90,size:[2,5]},
 steam:{count:16,colors:['#ece6dc'],spread:80,fall:-130,size:[16,36],soft:true},
 glint:{count:12,colors:['#eaf6ff','#ffffff'],spread:70,fall:30,size:[2,3],glow:true},
 puff:{count:10,colors:['#f0ece4'],spread:44,fall:-30,size:[8,22],soft:true},
 dust:{count:18,colors:['#8a7050','#a58d6a'],spread:70,fall:-30,size:[3,9],soft:true}
};
function pageBurst(kind,at,{color}={}) {
 const cfg=FALLBACK[kind];if(!cfg)return;
 const box=document.createElement('div');box.className='tw-dom-fx';box.style.transform=`translate(${at.x}px,${at.y}px)`;document.body.append(box);
 const dots=Array.from({length:cfg.count},()=>{
  const d=document.createElement('i'),s=utils.random(cfg.size[0],cfg.size[1]),c=color??cfg.colors[Math.floor(Math.random()*cfg.colors.length)];
  d.style.cssText=`width:${s}px;height:${s}px;margin:${-s/2}px 0 0 ${-s/2}px;background:${c};${cfg.soft?'filter:blur(4px);opacity:.6;':''}${cfg.glow?`box-shadow:0 0 8px ${c};`:''}`;
  box.append(d);return d;
 });
 animate(dots,{
  translateX:(_el,i)=>cfg.ring?Math.cos(i/cfg.count*Math.PI*2)*cfg.spread:utils.random(-cfg.spread,cfg.spread),
  translateY:(_el,i)=>cfg.ring?Math.sin(i/cfg.count*Math.PI*2)*cfg.spread:utils.random(-cfg.spread,cfg.spread*.3)+(cfg.fall??0),
  scale:[1,.25],opacity:[1,0],duration:()=>utils.random(520,1100),ease:'outCubic',onComplete:()=>box.remove()
 });
}
/** Runs a named effect at an element or point: WebGL when allowed, the page layer otherwise. */
export async function effect(kind,target,options={}) {
 if(!lavish())return false;
 const at=centerOf(target);
 if(kind==='lightning')flash('#fff6c8',{duration:700});
 try {if(await play(kind,at,options))return true;} catch(error) {console.warn('Titan World | effect failed',error);}
 pageBurst(kind,at,options);
 return false;
}
