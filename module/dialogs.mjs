// The remaining system dialogs as compact firing panels: requisition slips, a body map, value
// chips, statistic keys, icon segments, steppers and stamped choices instead of form fields.
// Pure markup plus the small behaviours that keep each panel honest, so the actions and the
// preview harness build them the same way. Motion is imported only inside browser callbacks.
import {STATS,REGIONS,ARRAYS,validateArray} from './rules.mjs';
import {esc,segments} from './ui.mjs';
import {STAT_SHORT,STAT_KEY} from './dossier.mjs';
import {icon,gearIcon,INJURY_ICON} from './icons.mjs';

const signed=n=>n>0?`+${n}`:n<0?`−${Math.abs(n)}`:'0';
const num=n=>n<0?`−${Math.abs(n)}`:String(n);
const radio=(name,value,checked,extra='')=>`<input type="radio" name="${esc(name)}" value="${esc(value)}"${checked?' checked':''}${extra}>`;
const PACKAGE_LABEL={rookie:'Rookie',soldier:'Soldier',expert:'Expert',specialist:'Specialist'};

// ── Requisition slips ────────────────────────────────────────────────────────
/** A paper slip on the desk; the checked one is lifted and stamped. `body` is markup the caller escaped. */
export const slip=(name,value,title,body,checked,mark='Issued')=>
 `<label class="slip">${radio(name,value,checked)}<b>${esc(title)}</b><small>${body}</small><i class="slip-stamp" aria-hidden="true">${esc(mark)}</i></label>`;
const manifest=entries=>entries.map(e=>`<span>${icon(gearIcon(e.name))}${e.quantity>1?`${e.quantity}× `:''}${esc(e.name)}</span>`).join('');
const spec=loadout=>typeof loadout.system.loadout==='string'?JSON.parse(loadout.system.loadout):loadout.system.loadout;
export const loadoutContent=loadouts=>`<div class="slips">${loadouts.map((l,i)=>slip('key',l.system.key,l.name,manifest(spec(l).base),i===0)).join('')}</div>`;
export function loadoutChoiceContent(loadout) {
 return `<p>Choose one addition to the ${esc(loadout.name)}.</p><div class="slips">${spec(loadout).choices.map((c,i)=>
  slip('choice',i,c.label,manifest(c.items)+(c.remove?.length?`<span class="rm">replaces ${esc(c.remove.join(', '))}</span>`:''),i===0)).join('')}</div>`;
}
/** The four stat packages, each slip carrying the values it hands out. */
export const packageContent=(selected='rookie')=>`<div class="slips pkgs">${Object.entries(ARRAYS).map(([key,array])=>
 slip('package',key,PACKAGE_LABEL[key]??key,`<span class="arr">${array.map(n=>`<i class="${n>0?'up':n<0?'dn':'zero'}">${signed(n)}</i>`).join('')}</span>`,key===selected,'Filed')).join('')}</div>`;

// ── Assigning six stats ──────────────────────────────────────────────────────
/** Each value in the package is a token, used once a statistic holds it; valid only when all are spent exactly. */
export function assignmentState(stats,pkg) {
 const array=ARRAYS[pkg]??[],keys=Object.keys(STATS),picked=keys.map(k=>Number(stats?.[k]));
 const count=list=>list.reduce((m,n)=>m.set(n,(m.get(n)||0)+1),new Map());
 const need=count(array),have=count(picked),seen=new Map();
 const tokens=array.map(value=>{const k=(seen.get(value)||0)+1;seen.set(value,k);return {value,used:k<=(have.get(value)||0)};});
 const over=[...have].filter(([n,c])=>c>(need.get(n)||0)).map(([n])=>n);
 const valid=array.length>0&&picked.every(Number.isFinite)&&validateArray(Object.fromEntries(keys.map((k,i)=>[k,picked[i]])),pkg);
 return {valid,tokens,over,text:valid?'Balanced':`To place ${tokens.filter(t=>!t.used).map(t=>signed(t.value)).join(' ')}`};
}
export function assignContent(pkg) {
 const array=ARRAYS[pkg]??[],values=[...new Set(array)].sort((a,b)=>b-a);
 const state=assignmentState(Object.fromEntries(Object.keys(STATS).map((k,i)=>[k,array[i]])),pkg);
 const rows=Object.entries(STATS).map(([key,label],i)=>`<div class="as-row s-${STAT_KEY[key]}" role="radiogroup" aria-label="${esc(label)}"><span class="as-k"><b>${STAT_SHORT[key]}</b><small>${esc(label)}</small></span>${
  values.map(n=>`<label class="as-chip" title="${esc(label)} ${signed(n)}">${radio(key,n,n===array[i])}<span>${signed(n)}</span></label>`).join('')}</div>`).join('');
 return `<div class="as-panel${state.valid?' ok':''}" data-package="${esc(pkg)}" style="--as-n:${values.length}">
<div class="as-tray"><span class="rd-l">${esc(PACKAGE_LABEL[pkg]??pkg)}</span><span class="as-toks">${state.tokens.map(t=>`<i class="as-tok${t.used?' used':''}">${signed(t.value)}</i>`).join('')}</span><output class="as-status">${esc(state.text)}</output></div>
<div class="as-rows">${rows}</div></div>
<p class="note">Assign exactly ${array.map(signed).join(', ')}. This replaces current stats and clears advancement marks.</p>`;
}

// ── GM advancement ───────────────────────────────────────────────────────────
/** Statistic keys reading current → next; spent or maxed keys are struck and cannot be pressed. */
export function advanceContent(stats={},advanced={}) {
 const first=Object.keys(STATS).find(k=>!advanced[k]&&(Number(stats[k])||0)<3);
 const keys=Object.entries(STATS).map(([key,label])=>{
  const v=Number(stats[key])||0,why=advanced[key]?'Advanced':v>=3?'At +3':'';
  return `<label class="rk adv-k s-${STAT_KEY[key]}${why?' spent':''}" title="${esc(label)} ${signed(v)}${why?` · ${why}`:` → ${signed(v+1)}`}">${radio('stat',key,key===first,why?' disabled':'')}<b>${STAT_SHORT[key]}</b>${
   why?`<em>${signed(v)}</em><small>${why}</small>`:`<em>${signed(v)}<i aria-hidden="true">›</i><strong>${signed(v+1)}</strong></em>`}</label>`;
 }).join('');
 return `<p>Use only after the GM awards an increase. Each stat can be increased once, to a maximum of +3.</p><div class="rd-keys adv-keys" role="radiogroup" aria-label="Stat">${keys}</div>`;
}

// ── Injuries ─────────────────────────────────────────────────────────────────
// The region is picked off a body map (the character's right on the viewer's left), then severity and type.
const BODY_MAP=[['head','Head','hd'],['rightArm','R. arm','ra'],['chest','Chest','ch'],['leftArm','L. arm','la'],['rightLeg','R. leg','rl'],['leftLeg','L. leg','ll']];
export function woundContent({region='chest',severity='minor',injuryType='blunt'}={}) {
 return `<div class="wd-pick">
<div class="bodymap" role="radiogroup" aria-label="Region">${BODY_MAP.map(([key,label,area])=>`<label class="bm bm-${area}" title="${esc(REGIONS[key])}">${radio('region',key,key===region)}<span>${label}</span></label>`).join('')}</div>
<div class="wd-f"><span class="rd-l">Severity</span><div class="segs sev" role="radiogroup" aria-label="Severity">${segments('severity',[['minor','Minor'],['major','Major'],['crippling','Crippling']],severity)}</div>
<span class="rd-l">Type</span><div class="segs type" role="radiogroup" aria-label="Injury type">${segments('injuryType',[['blunt','Blunt'],['cutting','Cut','Cutting'],['piercing','Pierce','Piercing / ballistic'],['burn','Burn']],injuryType)}</div></div>
</div><p class="note">Consciousness loss defaults to 1 for major or crippling injuries, or 2 for the head. You can edit the recorded loss. Narrative consequences remain GM decisions.</p>`;
}
/** Treatment tickets for one wound; unavailable results are disabled with their reason. */
export function treatContent(wound,amputate=false) {
 const s=wound?.system??{},minor=s.severity==='minor';
 const rows=[
  ['stabilize',amputate?'Amputate the limb and dress the stump':'Stop bleeding / mark treated',amputate?'blade':'bandage',''],
  ['downgrade','Major → minor, restore wound consciousness','recovery',s.severity==='major'?'':'Major wounds only'],
  ['piercing','Minor piercing → minor cutting','pierce',minor&&s.injuryType==='piercing'?'':'Minor piercing wounds only'],
  ['remove','Remove eligible minor wound','trash',minor&&s.injuryType!=='piercing'&&!s.fromMajor?'':'Needs further treatment or the end of the mission'],
  ['restore','Restore wound consciousness loss only','refresh','']];
 return `<div class="tr-wound ${esc(s.severity)}">${icon(INJURY_ICON[s.injuryType]??'drop')}<b>${esc(wound?.name)}</b>${s.severity?`<span class="tr-sev">${esc(s.severity)}</span>`:''}</div>
<div class="tr-opts" role="radiogroup" aria-label="Result">${rows.map(([value,label,glyph,why],i)=>
 `<label class="tr-opt${why?' off':''}"${why?` title="${esc(why)}"`:''}>${radio('result',value,i===0,why?' disabled':'')}${icon(glyph)}<span><b>${esc(label)}</b>${why?`<small>${esc(why)}</small>`:''}</span></label>`).join('')}</div>
<p class="note">Roll first aid or recovery first. Treatment does not decide timing, amputation, or narrative eligibility.</p>`;
}

// ── GM consequence ───────────────────────────────────────────────────────────
export const CONSEQUENCES=[['wound','Injury','drop','Record an injury'],['consciousness','Consc.','eye','Change consciousness'],
 ['fear','Fear','skull','Make next roll difficult'],['fatigue','Fatigue','wind','Add one dodge fatigue'],['breath','Breath','feather','Clear dodge fatigue'],
 ['shift','Titan','shifting','Toggle Titan form'],['rest','Rest','moon','Apply overnight rest result']];
/** Who it lands on (targeted and rolling actors first), then the consequence as icon segments. */
export function consequenceContent({targets=[],selected,effect='wound'}={}) {
 const who=[...targets].sort((a,b)=>!!b.tag-!!a.tag).map(t=>`<option value="${esc(t.uuid)}"${t.uuid===selected?' selected':''}>${esc(t.name)}${t.tag?` · ${esc(t.tag)}`:''}</option>`).join('');
 const kinds=CONSEQUENCES.map(([value,label,glyph,title])=>`<label class="seg cq" title="${esc(title)}">${radio('effect',value,value===effect)}${icon(glyph)}<span>${esc(label)}</span></label>`).join('');
 return `<div class="rd-f"><span class="rd-l">Affected</span><label class="cq-who">${icon('target')}<select name="actor" aria-label="Affected actor">${who}</select></label></div>
<div class="rd-f"><span class="rd-l">Consequence</span><div class="segs cq-kinds" role="radiogroup" aria-label="Consequence">${kinds}</div><output class="cq-line">${esc(CONSEQUENCES.find(c=>c[0]===effect)?.[3]??'')}</output></div>`;
}

// ── Steppers ─────────────────────────────────────────────────────────────────
/** ± and the wheel nudge it; `min`/`max` clamp only the controls, never what is typed. */
export const stepper=(name,value,{min,max,label=''}={})=>`<div class="num dl-step"${min!=null?` data-min="${min}"`:''}${max!=null?` data-max="${max}"`:''}><button type="button" value="-1" aria-label="Decrease ${esc(label)}">${icon('minus')}</button><input type="number" name="${esc(name)}" value="${esc(value)}" step="1" aria-label="${esc(label)}"><button type="button" value="1" aria-label="Increase ${esc(label)}">${icon('plus')}</button></div>`;
/** The track after the change: boxes kept, boxes about to be struck out, and boxes restored. */
export function consciousnessPreview(value,max,loss) {
 const now=Number(value)||0,top=Math.max(0,Number(max)||0),after=Math.min(top,now-(Math.trunc(Number(loss))||0));
 return {after,boxes:Array.from({length:top},(_,i)=>i<Math.min(now,after)?'held':i<now?'lose':i<after?'gain':'spent')};
}
const csRead=(value,max,loss)=>{const p=consciousnessPreview(value,max,loss);
 return `<span class="cs-track" aria-hidden="true">${p.boxes.map(s=>`<i class="cs-box ${s}"></i>`).join('')}</span><output class="cs-out${p.after<=0?' out':''}"><b>${num(Number(value)||0)}</b><i>→</i><b>${num(p.after)}</b>${p.after<=0?'<small>Unconscious</small>':''}</output>`;};
export function consciousnessContent({value=0,max=0,loss=1}={}) {
 return `<div class="cs-panel" data-value="${Number(value)||0}" data-max="${Number(max)||0}">
<div class="rd-f"><span class="rd-l">Points lost · negative restores</span>${stepper('loss',loss,{label:'Points lost'})}</div>
<div class="cs-read">${csRead(value,max,loss)}</div></div>`;
}
const LUCK_SLOTS=14;
/** The pool is minted as brass tokens: click one to set the maximum, click the top one to take it back. */
export function partyLuckContent({players=0,max=1}={}) {
 const slots=Math.min(LUCK_SLOTS,Math.max(4,players*2,max));
 return `<div class="lk-panel">
<div class="lk-tokens pips luck" role="group" aria-label="Luck tokens">${Array.from({length:slots},(_,i)=>`<button type="button" class="pip round${i<max?' on':''}" value="${i+1}" aria-label="Set the pool to ${i+1}"></button>`).join('')}</div>
<div class="lk-set"><div class="rd-f"><span class="rd-l">Maximum luck</span>${stepper('max',max,{min:0,label:'Maximum luck'})}</div><small class="lk-hint">One or two points per player · ${players} player${players===1?'':'s'}</small></div></div>`;
}

// ── Stamped choices ──────────────────────────────────────────────────────────
export const restContent=(selected='partial')=>`<div class="stamps" role="radiogroup" aria-label="Approved result">${
 [['partial','7–9','Restore consciousness'],['success','10+','Restore consciousness and eligible minor wounds']].map(([value,range,text])=>
  `<label class="stampch rs-${value}">${radio('result',value,value===selected)}<b>${range}</b><span>${text}</span><i class="stampch-mark" aria-hidden="true">Approved</i></label>`).join('')}</div>`;
const dtog=(name,title,detail,checked=false)=>`<label class="dtog"><input type="checkbox" name="${esc(name)}"${checked?' checked':''}><span><b>${esc(title)}</b><small>${esc(detail)}</small></span></label>`;
export function shiftContent({active=false}={}) {
 const [from,to]=active?['Titan','Human']:['Human','Titan'];
 return `<div class="sh-dir${active?' leave':''}"><span>${from}</span>${icon('shifting')}<b>${to}</b></div>
<p>Apply only after the GM resolves the transformation or dismount roll. Human and Titan injuries are tracked separately. Use a new form to clear the old Titan body's injuries.</p>${active?'':`<p class="warning">The source conflicts on shifting with crippling wounds. Confirm full, partial, or exceptional weak form with the GM.</p>
<div class="dtogs">${dtog('weak','Exceptional weak form','Physical stats −1, consciousness maximum 1')}${dtog('fresh','New Titan body','Clear old Titan injuries and exhaustion',true)}</div>`}`;
}

// ── Behaviour ────────────────────────────────────────────────────────────────
/** Wires whichever panels a dialog carries: steppers, luck tokens, live readouts and the stat assignment. */
export function wireDialog(root) {
 const form=root?.querySelector?.('form')??root;
 if(!form?.querySelector||form.dataset.twWired)return;
 form.dataset.twWired='1';
 const apply=form.querySelector('.form-footer button[data-action="apply"]');
 const motion=fn=>import('./fx.mjs').then(fx=>{if(fx.moving())fn(fx);}).catch(()=>{});
 const poke=input=>input.dispatchEvent(new Event('input',{bubbles:true}));
 for(const box of form.querySelectorAll('.dl-step')) {
  const input=box.querySelector('input'),min=Number(box.dataset.min??-Infinity),max=Number(box.dataset.max??Infinity);
  const nudge=delta=>{input.value=String(Math.min(max,Math.max(min,(Math.trunc(Number(input.value))||0)+delta)));poke(input);};
  box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>nudge(Number(b.value))));
  box.addEventListener('wheel',event=>{event.preventDefault();nudge(event.deltaY<0?1:-1);},{passive:false});
 }
 // A slip or stamped choice kicks up a little dust as the clerk's stamp lands.
 form.addEventListener('change',event=>{
  const mark=event.target.checked&&event.target.closest?.('.slip,.stampch')?.querySelector('.slip-stamp,.stampch-mark');
  if(mark)motion(fx=>fx.effect('dust',mark,{count:10}));
 });
 const lk=form.querySelector('.lk-panel'),luck=form.querySelector('input[name="max"]');
 if(lk&&luck) {
  const pips=[...lk.querySelectorAll('.pip')];
  pips.forEach(p=>p.addEventListener('click',()=>{const n=Number(p.value);luck.value=String(Math.trunc(Number(luck.value))===n?n-1:n);poke(luck);}));
  const sync=()=>{
   const n=Math.max(0,Math.trunc(Number(luck.value))||0),flipped=pips.filter((p,i)=>p.classList.contains('on')!==(i<n));
   flipped.forEach(p=>p.classList.toggle('on'));
   if(flipped.length)motion(fx=>flipped.forEach((p,i)=>p.animate([{transform:'rotateY(180deg) scale(1.3)'},{transform:'none'}],{duration:fx.lavish()?380:180,delay:i*30,easing:'cubic-bezier(.3,1.5,.5,1)'})));
  };
  luck.addEventListener('input',sync);luck.addEventListener('change',sync);
 }
 const cs=form.querySelector('.cs-panel'),loss=form.querySelector('input[name="loss"]');
 if(cs&&loss) {
  const read=cs.querySelector('.cs-read');let last=Number(loss.value)||0;
  const sync=()=>{const now=Number(loss.value)||0;read.innerHTML=csRead(cs.dataset.value,cs.dataset.max,now);
   if(now!==last)motion(fx=>fx.pulse(read.querySelector('.cs-out'),now>last));last=now;};
  loss.addEventListener('input',sync);loss.addEventListener('change',sync);
 }
 const cq=form.querySelector('.cq-kinds'),line=form.querySelector('.cq-line');
 if(cq&&line)cq.addEventListener('change',()=>{line.textContent=cq.querySelector('input:checked')?.closest('.seg')?.title??'';});
 // Apply stays disabled until every value in the package has been placed exactly once.
 const as=form.querySelector('.as-panel');
 if(as) {
  const status=as.querySelector('.as-status'),toks=[...as.querySelectorAll('.as-tok')];
  const sync=()=>{
   const state=assignmentState(Object.fromEntries(Object.keys(STATS).map(k=>[k,Number(form.querySelector(`input[name="${k}"]:checked`)?.value)])),as.dataset.package);
   const was=as.classList.contains('ok');
   toks.forEach((t,i)=>t.classList.toggle('used',!!state.tokens[i]?.used));
   as.querySelectorAll('.as-chip input').forEach(input=>input.parentElement.classList.toggle('over',input.checked&&state.over.includes(Number(input.value))));
   status.textContent=state.text;as.classList.toggle('ok',state.valid);
   if(apply)apply.disabled=!state.valid;
   if(state.valid&&!was)motion(fx=>status.animate([{transform:'rotate(-14deg) scale(1.8)',opacity:0},{transform:'rotate(-4deg) scale(1)',opacity:1}],{duration:fx.lavish()?320:160,easing:'cubic-bezier(.3,1.6,.5,1)'}));
   if(!state.valid&&was)motion(fx=>fx.jolt(status,{strength:3}));
  };
  as.addEventListener('change',sync);sync();
 }
}
