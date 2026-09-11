// Roll cards arrive with a reveal: the card slides in, the dice land, the total counts up,
// the tier stamps and the outcome follows. Only messages created while this client is
// connected are revealed (never reloads or scrollback), and a Dice So Nice roll is revealed
// after its dice have finished.
import {animate,createTimeline,stagger,utils,moving,lavish,effect,flash,jolt,stamp,countNode} from './fx.mjs';
import {ID} from './ui.mjs';

const live=new Set(),pending=new Set(),totals=new Map(),luckShown=new Map();
const cardsFor=id=>[...document.querySelectorAll(`[data-message-id="${id}"] .tw.chat-card`)];

export function registerChatFx() {
 Hooks.on('createChatMessage',message=>{if(message.getFlag(ID,'roll')||message.getFlag(ID,'fx')||message.getFlag(ID,'luckRequest'))live.add(message.id);});
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  const card=html.querySelector?.('.tw.chat-card');if(!card)return;
  const total=Number(card.dataset.total),before=totals.get(message.id);
  if(Number.isFinite(total))totals.set(message.id,total);
  // A luck request stamped approved or declined while this client watches plays its own beat.
  const kind=card.dataset.fx,shown=luckShown.get(message.id);
  if(kind?.startsWith('luck'))luckShown.set(message.id,kind);
  if(shown&&kind!==shown&&FX_CARDS[kind]&&!live.has(message.id)&&moving())
   requestAnimationFrame(()=>cardsFor(message.id).forEach(c=>FX_CARDS[kind](c)));
  if(live.has(message.id)&&moving()) {
   card.classList.add('tw-pre');
   if(pending.has(message.id))return;
   pending.add(message.id);
   whenDiceSettle(message,()=>{live.delete(message.id);pending.delete(message.id);for(const c of cardsFor(message.id))revealCard(c);});
   return;
  }
  live.delete(message.id);
  if(Number.isFinite(before)&&Number.isFinite(total)&&before!==total&&moving())
   requestAnimationFrame(()=>cardsFor(message.id).forEach(c=>retally(c,before,total)));
 });
}

function whenDiceSettle(message,run) {
 const go=()=>requestAnimationFrame(run);
 if(!message._dice3danimating)return go();
 let done=false;
 const finish=()=>{if(done)return;done=true;Hooks.off('diceSoNiceRollComplete',hook);setTimeout(go,40);};
 const hook=Hooks.on('diceSoNiceRollComplete',id=>{if(id===message.id)finish();});
 setTimeout(finish,12000);
}

const bandColor=el=>getComputedStyle(el).backgroundColor||'#f4ecd8';
const toHex=color=>{const m=String(color).match(/\d+/g);return m?'#'+m.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):'#f4ecd8';};

/** The full reveal, about 900ms; double six and snake eyes add their own beat. */
export function revealCard(card) {
 card.classList.remove('tw-pre');
 if(!moving())return;
 const full=lavish(),q=s=>card.querySelector(s),qa=s=>[...card.querySelectorAll(s)];
 const total=Number(card.dataset.total),result=card.dataset.result,totalEl=q('.total'),on=q('.t.on');
 const tl=createTimeline({defaults:{ease:'outQuart'}});
 tl.add(card,{opacity:[0,1],translateX:[24,0],duration:280},0);
 const hero=qa('.hero>*');
 if(hero.length)tl.add(hero,{opacity:[0,1],translateY:[-6,0],duration:240,delay:stagger(45)},70);
 const dice=qa('.dice .die');
 if(dice.length)tl.add(dice,{opacity:[0,1],translateY:[-34,0],rotate:()=>[utils.random(-260,260),0],scale:[1.3,1],
  duration:full?600:320,delay:stagger(95),ease:'outBounce'},130);
 if(totalEl&&Number.isFinite(total)) {
  const state={v:Math.min(2,total)};totalEl.textContent=String(state.v);
  tl.add(state,{v:total,duration:440,ease:'outExpo',onUpdate:()=>{totalEl.textContent=String(Math.round(state.v));},onComplete:()=>{totalEl.textContent=String(total);}},300);
  tl.add(totalEl,{scale:[.6,1],opacity:[.3,1],duration:420,ease:'outBack(1.8)'},300);
 }
 const tiers=qa('.t:not(.on)');
 if(tiers.length)tl.add(tiers,{opacity:[0,1],duration:200,delay:stagger(40)},420);
 if(on) {
  tl.add(on,{scale:[1.75,1],rotate:[-9,0],opacity:[0,1],duration:340,ease:'outBack(2.2)'},600);
  if(full)tl.call(()=>effect('shock',on,{color:toHex(bandColor(on)),radius:.55}),650);
  tl.add(card,{scale:[1,1.02,1],duration:220,ease:'outQuad'},700);
 }
 const rest=qa('.band,.outcome,.history,.inline,details,.why,.eyebrow');
 if(rest.length)tl.add(rest,{opacity:[0,1],translateY:[6,0],duration:260,delay:stagger(55)},on?720:260);
 if(result==='doubleSix')tl.call(()=>doubleSix(card,totalEl),780);
 if(result==='snakeEyes')tl.call(()=>snakeEyes(card,totalEl),780);
 const kind=card.dataset.fx;
 if(kind&&FX_CARDS[kind])tl.call(()=>FX_CARDS[kind](card),320);
}

function doubleSix(card,totalEl) {
 const glow=document.createElement('i');glow.className='tw-card-flash gold';card.append(glow);
 animate(glow,{opacity:[.95,0],duration:900,ease:'outQuad',onComplete:()=>glow.remove()});
 if(totalEl)animate(totalEl,{scale:[1.55,1],duration:620,ease:'outElastic(1,.45)'});
 animate(card,{translateX:[0,-5,5,-3,2,0],duration:420,ease:'outQuad'});
 effect('sparks',totalEl??card,{color:'#ffd27a'});
}
const CRACK='M0 38 L14 34 L22 40 L33 30 L41 36 L52 22 L60 27 L73 14 M33 30 L30 18 L36 8 M52 22 L58 40 L66 46 M14 34 L10 50 L4 58';
function snakeEyes(card,totalEl) {
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('class','tw-crack');svg.setAttribute('viewBox','0 0 80 60');
 svg.innerHTML=`<path d="${CRACK}" pathLength="1"/>`;
 (totalEl?.parentElement??card).append(svg);
 animate(svg.querySelector('path'),{strokeDashoffset:[1,0],duration:360,ease:'outQuart'});
 animate(card,{translateX:[0,-3,3,-2,2,-1,0],translateY:[0,1,-1,0],duration:520,ease:'linear'});
 if(totalEl)animate(totalEl,{opacity:[1,.2,1,.45,1],duration:520,ease:'linear'});
 effect('embers',totalEl??card,{color:'#c0301c'});
}

/** A luck spend or reroll animates only what changed: the total and the tier it now reaches. */
export function retally(card,before,total) {
 const totalEl=card.querySelector('.total'),on=card.querySelector('.t.on');
 if(totalEl)countNode(totalEl,before,total);
 if(totalEl)animate(totalEl,{scale:[1.35,1],duration:520,ease:'outBack(2)'});
 if(on){animate(on,{scale:[1.4,1],duration:420,ease:'outBack(2.2)'});effect('shock',on,{color:toHex(bandColor(on)),radius:.5});}
 const history=card.querySelector('.history');
 if(history)animate(history,{opacity:[0,1],translateX:[-8,0],duration:320});
}

// Cards that carry an effect of their own, played on every client that sees them arrive.
const FX_CARDS={
 flare(card) {effect('flare',card.querySelector('.fx-anchor')??card,{color:card.dataset.color||'#4fbf5a'});},
 wound(card) {
  const bloom=card.querySelector('.fx-bloom');
  if(bloom)animate(bloom,{scale:[.2,1],opacity:[0,.9],duration:700,ease:'outExpo'});
  effect('spatter',card.querySelector('.fx-anchor')??card,{count:50});
 },
 death(card) {
  if(lavish())animate(card,{filter:['grayscale(0) brightness(1.2)','grayscale(1) brightness(1)'],duration:1600,ease:'inOutQuad'});
  const r=card.getBoundingClientRect();
  effect('ash',{x:r.left+r.width/2,y:r.top+r.height/2},{w:r.width,h:r.height});
 },
 shift(card) {
  const anchor=card.querySelector('.fx-anchor')??card;
  flash('#fff4c0',{duration:800,peak:.9});
  effect('lightning',anchor);
  setTimeout(()=>effect('steam',anchor,{w:260,h:90,count:70}),420);
  jolt(card,{strength:8});
 },
 // Party luck: the token spins onto the desk, flips and glints when spent, dulls when refused.
 luck(card) {
  const coin=card.querySelector('.lk-coin'),pips=card.querySelectorAll('.lk-pool .pip');
  if(coin)animate(coin,{rotateY:[540,0],scale:[1.5,1],duration:lavish()?720:360,ease:'outBack(1.6)'});
  if(pips.length)animate(pips,{scale:[0,1],opacity:[0,1],delay:stagger(35,{start:160}),duration:260,ease:'outBack(2)'});
  effect('glint',coin??card,{color:'#ffe6a0'});
 },
 'luck-approved'(card) {
  const coin=card.querySelector('.lk-coin'),spent=card.querySelector('.lk-pool .spent'),mark=card.querySelector('.lk-stamp');
  if(coin)animate(coin,{rotateY:[0,720],scale:[1,1.35,1],duration:lavish()?760:380,ease:'outQuart'});
  if(spent)animate(spent,{rotateY:[0,540],scale:[1.7,1],duration:lavish()?680:340,ease:'outQuad'});
  effect('glint',coin??card,{color:'#fff0b8'});
  if(mark&&lavish())mark.style.opacity='0';
  if(mark)setTimeout(()=>{stamp(mark,{rotate:-9});effect('dust',mark,{count:14});},lavish()?300:0);
 },
 'luck-declined'(card) {
  const coin=card.querySelector('.lk-coin'),mark=card.querySelector('.lk-stamp');
  if(coin)animate(coin,{rotate:[0,-16,10,-4,0],duration:520,ease:'outQuad'});
  if(mark){stamp(mark,{rotate:7});setTimeout(()=>{jolt(card,{strength:4});effect('dust',mark,{count:10});},lavish()?160:0);}
 }
};
