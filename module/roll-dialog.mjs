// The roll dialog as a compact firing panel: statistic keys in their inks, advantage and
// visibility as segments, stamped flags and a live formula line. Pure markup plus the
// behaviour that keeps the formula honest, so the sheet and the preview harness build it
// the same way.
import {STATS} from './rules.mjs';
import {esc} from './ui.mjs';
import {STAT_SHORT,STAT_KEY} from './dossier.mjs';
const VISIBILITY={public:['Public','Everyone sees the roll'],gm:['GM + me','Only you and the GM see the roll'],
 blind:['GM only','Only the GM sees the result'],self:['Only me','Only you see the roll']};
const signed=n=>n>0?`+${n}`:n<0?`−${Math.abs(n)}`:'0';
const readSigned=text=>Number(String(text??'').replace('−','-'))||0;

function formula({short,value,advantage,modifier,fatigue},hard) {
 const parts=[`${short} ${signed(value)}`];
 if(advantage)parts.push(`adv +${advantage}`);
 if(modifier)parts.push(`mod ${signed(modifier)}`);
 if(fatigue)parts.push(`fatigue ${signed(fatigue)}`);
 const total=value+advantage+modifier+fatigue;
 return `<output><b>2d6${total?` ${signed(total)}`:''}</b><span>${esc(parts.join(' '))}</span></output>${hard?'<small>Difficult · below 10 fails</small>':''}`;
}

export const reachNote=reach=>`Hand-to-hand reach: Titans ${reach.low.toFixed(1)}–${reach.high.toFixed(1)} m; anything ${reach.difficultAt.toFixed(1)} m or taller makes every roll against it difficult.`;

export function rollDialogContent({stat,stats={},fatigue=0,lowConsciousness=false,warning='',difficult=false,combat=false,messageMode='public',note=''}) {
 const keys=Object.entries(STATS).map(([key,label])=>{
  const value=Number(stats[key])||0;
  return `<label class="rk s-${STAT_KEY[key]}" title="${esc(label)} ${signed(value)}"><input type="radio" name="stat" value="${key}"${key===stat?' checked':''}><b>${STAT_SHORT[key]}</b><em>${signed(value)}</em></label>`;
 }).join('');
 const segs=(name,entries,selected)=>entries.map(([value,label,title])=>
  `<label class="seg"${title?` title="${esc(title)}"`:''}><input type="radio" name="${name}" value="${value}"${String(value)===String(selected)?' checked':''}><span>${esc(label)}</span></label>`).join('');
 const fat=stat==='agility'?-(Number(fatigue)||0):0;
 const hard=difficult||(combat&&lowConsciousness);
 return `${warning?`<p class="warning">${esc(warning)}</p>`:''}
<div class="rd-keys" role="radiogroup" aria-label="Statistic">${keys}</div>
<div class="rd-row">
 <div class="rd-f"><span class="rd-l">Advantage</span><div class="segs adv" role="radiogroup" aria-label="Advantage">${segs('advantage',[[0,'0'],[1,'+1'],[2,'+2'],[3,'+3']],0)}</div></div>
 <div class="rd-f"><span class="rd-l">Other modifier</span><div class="num rd-mod"><button type="button" class="rd-step" value="-1" aria-label="Decrease modifier">−</button><input type="number" name="modifier" value="0" step="1" aria-label="Other modifier"><button type="button" class="rd-step" value="1" aria-label="Increase modifier">+</button></div></div>
</div>
<div class="rd-flags">
 <label class="flagtog hard" title="Below 10 always fails — there is no 7–9 result"><input type="checkbox" name="difficult"${difficult?' checked':''}><span>Difficult</span></label>
 <label class="flagtog" title="Combat roll — below half consciousness makes it difficult"><input type="checkbox" name="combat"${combat?' checked':''}><span>Combat</span></label>
</div>
<div class="rd-f"><span class="rd-l">Visibility</span><div class="segs vis" role="radiogroup" aria-label="Visibility">${segs('messageMode',Object.entries(VISIBILITY).map(([key,[label,title]])=>[key,label,title]),messageMode)}</div></div>
<input type="hidden" name="_fatigue" value="${Number(fatigue)||0}"><input type="hidden" name="_lowcons" value="${lowConsciousness?1:0}">
<p class="rd-formula">${formula({short:STAT_SHORT[stat]??'',value:Number(stats[stat])||0,advantage:0,modifier:0,fatigue:fat},hard)}</p>
${note?`<p class="rd-note">${esc(note)}</p>`:''}`;
}

/** Keeps the formula line in step with the controls; wheel and ± nudge the modifier. */
export function wireRollDialog(root) {
 const form=root?.querySelector?.('form')??root;
 if(!form?.elements?.stat||form.dataset.twWired)return;
 form.dataset.twWired='1';
 const fields=form.elements,out=form.querySelector('.rd-formula');
 const update=()=>{
  const stat=fields.stat.value,key=form.querySelector(`.rk input[value="${stat}"]`)?.closest('.rk');
  const hard=fields.difficult.checked||(fields.combat.checked&&fields._lowcons?.value==='1');
  out.innerHTML=formula({short:key?.querySelector('b')?.textContent??'',value:readSigned(key?.querySelector('em')?.textContent),
   advantage:Number(fields.advantage.value)||0,modifier:Math.trunc(Number(fields.modifier.value))||0,
   fatigue:stat==='agility'?-(Number(fields._fatigue?.value)||0):0},hard);
  form.classList.toggle('is-hard',hard);
 };
 const step=delta=>{fields.modifier.value=String((Math.trunc(Number(fields.modifier.value))||0)+delta);update();};
 form.querySelectorAll('.rd-step').forEach(button=>button.addEventListener('click',()=>step(Number(button.value))));
 form.querySelector('.rd-mod')?.addEventListener('wheel',event=>{event.preventDefault();step(event.deltaY<0?1:-1);},{passive:false});
 form.addEventListener('input',update);form.addEventListener('change',update);
 update();
}
