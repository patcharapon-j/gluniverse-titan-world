// The Actions and Record tabs in the hand: the card file filters and re-deals its cards, a
// roll presses its card into the drawer under the clerk's stamp, result ladders unfold like a
// slip drawn from behind the card, and growth marks and milestone stamps land as they change.
// Browser-only: sheets.mjs imports it, node tests never do.
import {animate,stagger,utils,moving,lavish,jolt,effect} from './fx.mjs';

// Only the first couple of dozen cards are dealt one by one; the rest simply arrive.
const DEAL=24;
// anime leaves its final transform inline, which would pin a card against its CSS hover lift.
const tidy=nodes=>()=>[nodes].flat().forEach(n=>{n.style.removeProperty('transform');n.style.removeProperty('opacity');n.style.removeProperty('height');});
const inView=view=>node=>{const r=node.getBoundingClientRect();return r.bottom>view.top&&r.top<view.bottom;};

/** Wires both tabs on render. Search text lives on the app so it survives re-renders; a filter chip flags `_twDeal`. */
export function wireActions(app,el) {
 const body=el.querySelector('.sheet-body');
 const dealt=!!app._twDeal;app._twDeal=false;
 if(!body)return;
 search(app,body,dealt);
 ladders(body);
 growth(app,body);
}

/** A roll starts: the card is pressed into the drawer and stamped; a quick action button is knocked in. */
export function pressRoll(target) {
 if(!target||!moving())return;
 const row=target.closest('.arow'),face=row??target.closest('.act');
 if(!face)return;
 const full=lavish();
 animate(face,{translateY:[2.5,0],scale:[.975,1],duration:full?420:220,ease:'outBack(3)',onComplete:tidy(face)});
 if(!row){jolt(face,{strength:3,duration:260});return;}
 const tile=row.querySelector('.atile');
 if(tile)animate(tile,{scale:[.72,1],rotate:[-10,0],duration:full?440:220,ease:'outBack(2.8)',onComplete:tidy(tile)});
 jolt(row,{strength:3.5,duration:320});
 const mark=document.createElement('i');mark.className='arow-stamp';mark.textContent='Rolled';mark.setAttribute('aria-hidden','true');
 row.append(mark);
 animate(mark,{scale:[2.1,1],rotate:[-20,-9],opacity:[0,.92],duration:full?340:180,ease:'outBack(2.2)'});
 setTimeout(()=>mark.isConnected&&mark.animate([{opacity:.92},{opacity:0}],{duration:360,easing:'ease-in',fill:'forwards'}).finished.finally(()=>mark.remove()),full?760:420);
 if(full&&tile)effect('shock',tile,{color:'#a83030',radius:.2});
}

// Typing filters the cards in place: survivors slide into the gaps, newly revealed cards drop in.
function search(app,body,dealt) {
 const input=body.querySelector('[data-move-search]');
 const rows=[...body.querySelectorAll('[data-move-name]')];
 if(!input&&!rows.length)return;
 const tally=body.querySelector('[data-move-tally]'),empty=body.querySelector('[data-move-empty]');
 const groups=[...body.querySelectorAll('[data-move-cluster],[data-move-group]')];
 const apply=()=>{
  const term=(app._search??'').toLowerCase();
  rows.forEach(row=>row.hidden=!row.dataset.moveName.toLowerCase().includes(term));
  groups.forEach(group=>{const own=[...group.querySelectorAll('[data-move-name]')];group.hidden=own.length>0&&own.every(row=>row.hidden);});
  const shown=rows.filter(row=>!row.hidden).length;
  if(empty)empty.hidden=shown>0;
  if(tally)tally.textContent=term.trim()?`${shown} of ${rows.length}`:'';
 };
 if(input){
  input.value=app._search??'';
  input.addEventListener('input',()=>{
   const before=moving()?new Map(rows.filter(row=>!row.hidden).map(row=>[row,row.getBoundingClientRect()])):null;
   app._search=input.value;apply();
   if(before)settle(rows,before,body);
  });
 }
 apply();
 if(dealt)deal(body);
}

function settle(rows,before,body) {
 const view=body.getBoundingClientRect(),seen=inView(view),fresh=[],full=lavish();
 for(const row of rows.filter(row=>!row.hidden&&seen(row))){
  const was=before.get(row),now=row.getBoundingClientRect();
  if(!was){fresh.push(row);continue;}
  const dx=was.left-now.left,dy=was.top-now.top;
  if(!dx&&!dy)continue;
  // A card that would fly further than the drawer is tall reads as noise; it drops in instead.
  if(Math.abs(dy)>view.height*.6){fresh.push(row);continue;}
  animate(row,{translateX:[dx,0],translateY:[dy,0],duration:full?320:160,ease:'outQuart',onComplete:tidy(row)});
 }
 if(fresh.length){const cards=fresh.slice(0,DEAL);animate(cards,{opacity:[0,1],translateY:[-7,0],rotate:()=>[utils.random(-2,2,1),0],delay:stagger(full?16:8),duration:full?260:140,ease:'outBack(1.6)',onComplete:tidy(cards)});}
}

// A filter chip re-renders the drawer: the chosen chip is pressed, and the cards are dealt back in.
function deal(body) {
 if(!moving())return;
 const full=lavish(),seen=inView(body.getBoundingClientRect());
 const chip=body.querySelectorAll('.act-bar .chip.on');
 if(chip.length)animate(chip,{scale:[1.2,1],duration:full?320:160,ease:'outBack(2.6)',onComplete:tidy([...chip])});
 const heads=[...body.querySelectorAll('.agroup:not([hidden])>.sec,.cluster:not([hidden])>.chead')].filter(seen);
 if(heads.length)animate(heads,{opacity:[0,1],translateX:[-10,0],delay:stagger(full?30:14),duration:full?240:120,ease:'outQuart',onComplete:tidy(heads)});
 const cards=[...body.querySelectorAll('.aitem:not([hidden])')].filter(seen).slice(0,DEAL*2);
 if(cards.length)animate(cards,{opacity:[0,1],translateY:[-9,0],rotate:()=>[utils.random(-2.5,2.5,1),0],delay:stagger(full?13:6,{start:40}),duration:full?300:150,ease:'outBack(1.5)',onComplete:tidy(cards)});
}

// The ladder slip unfolds beneath its card, rung by rung, and folds back up before it closes.
function ladders(body) {
 body.addEventListener('click',event=>{
  const summary=event.target.closest('details.aout>summary');
  const details=summary?.parentElement,slip=details?.querySelector(':scope>.oslip');
  if(!slip||!moving())return;
  event.preventDefault();
  if(details.dataset.folding)return;
  const full=lavish();
  details.dataset.folding='1';
  if(!details.open){
   details.open=true;
   animate(slip,{height:[0,slip.scrollHeight],opacity:[0,1],duration:full?300:150,ease:'outQuart',onComplete:()=>{tidy(slip)();delete details.dataset.folding;}});
   const rungs=[...slip.querySelectorAll('.orow')];
   if(full&&rungs.length)animate(rungs,{translateX:[-10,0],opacity:[0,1],delay:stagger(50,{start:70}),duration:260,ease:'outQuart',onComplete:tidy(rungs)});
  } else {
   animate(slip,{height:[slip.offsetHeight,0],opacity:[1,0],duration:full?200:110,ease:'inQuad',onComplete:()=>{details.open=false;tidy(slip)();delete details.dataset.folding;}});
  }
 });
}

// Growth marks are compared with the last render of this tab: an award is stamped, a strike-out is knocked.
function growth(app,body) {
 const cells=[...body.querySelectorAll('[data-growth]')],stamps=[...body.querySelectorAll('[data-stamp]')];
 if(!cells.length){app._twGrowth=null;return;}
 const was=app._twGrowth;
 app._twGrowth={marks:new Map(cells.map(c=>[c.dataset.growth,c.dataset.state])),stamps:new Map(stamps.map(s=>[s.dataset.stamp,s.dataset.stampText]))};
 if(!was||!moving())return;
 const full=lavish();
 for(const cell of cells){
  const before=was.marks.get(cell.dataset.growth),after=cell.dataset.state;
  if(!before||before===after)continue;
  const mark=cell.querySelector('.gmark'),ink=mark?.querySelector('.ink'),value=cell.querySelector('.gval');
  if(after==='advanced'){
   if(ink)animate(ink,{scale:[2.4,1],rotate:[-24,0],opacity:[0,1],duration:full?420:210,ease:'outBack(2.4)',onComplete:tidy(ink)});
   jolt(cell,{strength:5,duration:380});
   if(full&&mark)effect('shock',mark,{color:'#8e2323',radius:.25});
  } else jolt(cell,{strength:3,duration:300});
  if(value)animate(value,{scale:[1.45,1],duration:full?460:230,ease:'outBack(2.2)',onComplete:tidy(value)});
 }
 const fresh=stamps.filter(s=>was.stamps.get(s.dataset.stamp)!==s.dataset.stampText);
 if(fresh.length)animate(fresh,{scale:[2,1],opacity:[0,1],translateY:[-6,0],delay:stagger(110,{start:full?160:60}),duration:full?380:190,ease:'outBack(2.2)',onComplete:tidy(fresh)});
}
