import {REGIONS,REGIONAL_STAT,STATS,TITAN_HEIGHTS,meleeReach,meleeAgainst,biteTally} from './rules.mjs';
import {CATEGORY_ICON,REGION_ICON,INJURY_ICON,STAT_ICON,gearIcon} from './icons.mjs';
const SEVERITY={minor:1,major:2,crippling:3};
export const SEVERITY_LABEL={minor:'Minor',major:'Major',crippling:'Crippling'};
export const INJURY_LABEL={blunt:'Blunt',cutting:'Cutting',piercing:'Piercing',burn:'Burn'};
export const STAT_DESCRIPTIONS={
 agility:'Speed and precision. ODM, dodging, catching.',
 technique:'Skill with a weapon. Blades, rifles, knives.',
 mind:'Perception and planning. First aid.',
 body:'Toughness. What you dish out and take.',
 heart:'Nerve. Staring death in the face.',
 duty:'Worth as a soldier. Respect and command.'
};
export const STAT_SHORT={agility:'AGI',technique:'TEC',mind:'MND',body:'BDY',heart:'HRT',duty:'DTY'};
// Each statistic carries its own ink colour, so an action list can be read by colour alone.
export const STAT_KEY={agility:'agi',technique:'tec',mind:'mnd',body:'bdy',heart:'hrt',duty:'dty'};
export const REGION_SHORT={head:'Head',chest:'Chest',leftArm:'L. Arm',rightArm:'R. Arm',leftLeg:'L. Leg',rightLeg:'R. Leg'};
export const FEAR={
 steady:{key:'steady',label:'Steady',icon:'shield',tone:'ok',line:'No fear roll is owed. Roll + Heart the next time something shakes you.'},
 shaken:{key:'shaken',label:'Shaken',icon:'wind',tone:'warn',line:'Rolled 7-9. Your next roll is difficult, and you roll + Heart at every sighting until a 10+.'},
 frozen:{key:'frozen',label:'Frozen',icon:'skull',tone:'grave',line:'Rolled 6 or lower. You cannot act until a comrade rolls + Duty to snap you out of it.'}
};
// Anterior figure drawn on a 200 x 380 grid: silhouette, injury hatch mark, and its leader label.
const SHAPES={
 head:{path:'M100 8c14 0 24 12 24 30 0 12-6 26-24 26S76 50 76 38c0-18 10-30 24-30z',
  mark:'M84 26l32 26M84 52l32-26',lead:{x1:126,y1:34,x2:150,y2:34},labels:[{x:153,y:31,text:'Head'},{x:153,y:41,text:'-1 Mind'}]},
 chest:{path:'M66 82c10-5 58-5 68 0l-4 48c-2 12-2 24 0 36l4 26c-14 6-54 6-68 0l4-26c2-12 2-24 0-36z',
  mark:'M82 116l36 44M82 160l36-44',detail:'M100 86v104M78 122c8 6 36 6 44 0',labels:[{x:100,y:106,text:'Chest',anchor:'middle'},{x:100,y:116,text:'-1 Body',anchor:'middle'}]},
 leftArm:{path:'M64 84c-12 8-20 24-22 44l-4 44-8 40c-2 8 2 10 6 10s6-2 8-8l10-40 8-44 8-30z',
  mark:'M38 150l14 4M36 165l14 4',lead:{x1:34,y1:154,x2:26,y2:154},labels:[{x:23,y:150,text:'L. Arm',anchor:'end'},{x:23,y:160,text:'-1 Tec',anchor:'end'}]},
 rightArm:{path:'M136 84c12 8 20 24 22 44l4 44 8 40c2 8-2 10-6 10s-6-2-8-8l-10-40-8-44-8-30z',
  mark:'M162 150l-14 4M164 165l-14 4',lead:{x1:166,y1:154,x2:174,y2:154},labels:[{x:177,y:150,text:'R. Arm'},{x:177,y:160,text:'-1 Tec'}]},
 leftLeg:{path:'M68 196c10 4 22 6 32 6l-4 50-4 44 2 42-2 10 2 12H72l4-14-4-50-2-46z',
  mark:'M74 270l22 22M74 292l22-22',lead:{x1:70,y1:300,x2:44,y2:300},labels:[{x:41,y:296,text:'L. Leg',anchor:'end'},{x:41,y:306,text:'-1 Agi',anchor:'end'}]},
 rightLeg:{path:'M132 196c-10 4-22 6-32 6l4 50 4 44-2 42 2 10-2 12h22l-4-14 4-50 2-46z',
  mark:'M104 270l22 22M104 292l22-22',lead:{x1:130,y1:300,x2:156,y2:300},labels:[{x:159,y:296,text:'R. Leg'},{x:159,y:306,text:'-1 Agi'}]}
};
const woundsFor=(items,titan)=>items.filter(i=>i.type==='wound'&&!i.system.healed&&(i.system.formScope??'human')===(titan?'titan':'human'));
const signed=n=>n>0?`+${n}`:n<0?`−${Math.abs(n)}`:'0';
/** Region cards for the overview strip and the wound atlas. */
export function conditionRegions(items,titan=false) {
 return Object.entries(REGIONS).map(([key,label])=>{
  const wounds=woundsFor(items,titan).filter(i=>i.system.region===key);
  const level=Math.max(0,...wounds.map(w=>SEVERITY[w.system.severity]??0));
  const severity=Object.keys(SEVERITY).find(k=>SEVERITY[k]===level)??'clear';
  const shape=SHAPES[key];
  return {key,label,short:REGION_SHORT[key],icon:REGION_ICON[key],severity,count:wounds.length,
   path:shape.path,mark:shape.mark,detail:shape.detail,lead:shape.lead,labels:shape.labels,
   stat:REGIONAL_STAT[key],statLabel:STATS[REGIONAL_STAT[key]],statShort:STAT_SHORT[REGIONAL_STAT[key]],
   summary:wounds.length?severity:'Uninjured',
   headline:wounds.length?`${SEVERITY_LABEL[severity]} · ${INJURY_LABEL[wounds[0].system.injuryType]??''}`.trim().replace(/ ·\s*$/,''):'—',
   pips:[1,2,3].map(n=>({filled:n<=level}))};
 });
}
const LIMB=key=>key==='leftArm'||key==='rightArm'||key==='leftLeg'||key==='rightLeg';
const LIMB_WORD=key=>key.endsWith('Arm')?'arm':'leg';
/** What this exact injury does to you, in the rulebook's own terms. */
export function woundEffects(severity,type,region) {
 const stat=STATS[REGIONAL_STAT[region]],lines=[];
 if(severity==='major')lines.push(`−1 ${stat} on every roll, and out of commission until it is treated. First aid can bring it down to minor.`);
 if(severity==='crippling')lines.push(`Permanent. −1 ${stat}, and rest is blocked until it has been amputated and treated.`);
 if(severity==='minor'&&type!=='piercing')lines.push('No statistic penalty. It can clear on its own after a rest, on a 10+ roll + Body.');
 if(type==='blunt'){
  if(severity==='minor')lines.push('Bruised or fractured. Every blunt attack aimed here has advantage while it stands.');
  if(severity==='major')lines.push('The bone is broken. It must be splinted or cast before it can be treated.');
  if(severity==='crippling')lines.push(LIMB(region)?`The ${LIMB_WORD(region)} bone is shattered and must be amputated.`
   :region==='chest'?'Spinal injury. Paralysed from the waist down.'
   :'Permanent brain damage. Mind is set to −3 and can never be raised.');
 }
 if(type==='cutting'){
  if(severity==='minor')lines.push('An open cut. Every cutting attack aimed here has advantage while it stands.');
  if(severity==='major')lines.push('Bleeding. Consciousness drains at the GM’s call, capped at −1 until five such wounds stand.');
  if(severity==='crippling')lines.push(LIMB(region)?`The ${LIMB_WORD(region)} is severed. Bleeding can be lethal.`
   :region==='chest'?'Opened up. Bleeding can be lethal.'
   :'A crippling cut to the head is instant death.');
 }
 if(type==='piercing'){
  if(severity==='minor')lines.push(`Piercing wounds debuff as though they were major: −1 ${stat}. Rest cannot clear it; only first aid can, and only into a cut.`);
  if(severity==='major')lines.push(region==='head'?'Bleeds like a major cut, and the jaw is blown open — no speech.':'Bleeds like a major cut.');
  if(severity==='crippling')lines.push(region==='head'?'A crippling piercing wound to the head kills instantly.'
   :'A bone is shattered beyond repair, or an organ destroyed.');
 }
 if(type==='burn'){
  if(severity==='minor')lines.push('Rolls against being burned are difficult while it stands. Three minor burns become a major wound.');
  if(severity==='major')lines.push('Roll + Body or begin to bleed.');
  if(severity==='crippling')lines.push(LIMB(region)?`The ${LIMB_WORD(region)} is charred and unusable. Amputation is the only option.`
   :'Untreatable on the head or chest. This is a slow and certain death.');
 }
 return lines;
}
/** Full injury ledger: one row per region, carrying every wound recorded on it. */
export function injuryLedger(items,titan=false,stackWounds=false) {
 return conditionRegions(items,titan).map(region=>{
  const wounds=items.filter(i=>i.type==='wound'&&i.system.region===region.key&&(i.system.formScope??'human')===(titan?'titan':'human'))
   .map(wound=>{
    const w=wound.system,penalised=w.severity!=='minor'||w.injuryType==='piercing';
    // Generated names restate the severity and type, which the row already shows.
    const generated=`${REGIONS[region.key]} · ${w.severity} ${w.injuryType}`;
    return {...wound,id:wound.id,label:wound.name===generated?'':wound.name,
     severity:w.severity,severityLabel:SEVERITY_LABEL[w.severity],
     type:w.injuryType,typeLabel:INJURY_LABEL[w.injuryType],typeIcon:INJURY_ICON[w.injuryType],
     loss:Number(w.consciousnessLoss||0),treated:w.treated,healed:w.healed,fromMajor:w.fromMajor,
     penalty:!w.healed&&penalised?`−1 ${STATS[region.stat]}`:'',
     effects:woundEffects(w.severity,w.injuryType,region.key),
     blocksRest:!w.healed&&(w.severity==='major'||(w.severity==='crippling'&&!w.treated)),
     mindless:w.severity==='crippling'&&region.key==='head'&&w.injuryType==='blunt'};
   });
  const live=wounds.filter(w=>!w.healed);
  const penalising=live.filter(w=>w.penalty).length;
  const applied=penalising?`−${stackWounds?penalising:1} ${STATS[region.stat]}`:'';
  return {...region,wounds,any:wounds.length>0,live:live.length,
   loss:live.reduce((n,w)=>n+w.loss,0),applied,
   appliedShort:penalising?`−${stackWounds?penalising:1} ${STAT_SHORT[region.stat]}`:'',
   hint:applied?`${applied} on every roll while this stands`:`Clear · major or piercing = −1 ${STATS[region.stat]}`,
   clear:live.length===0};
 });
}
/** Where every difference between a base statistic and its effective value came from. */
export function statSources(system,items,derived,{stackWounds=false}={}) {
 const out=Object.fromEntries(Object.keys(STATS).map(k=>[k,[]]));
 const add=(stat,label,delta,tone='pen',short=label)=>{if(out[stat]&&delta)out[stat].push({label,short,delta,tone:delta>0?'gain':tone,display:signed(delta)});};
 const set=(stat,label,value,tone='pen',short=label)=>{if(out[stat])out[stat].push({label,short,delta:0,fixed:true,tone,display:`= ${signed(value)}`});};
 const shifted=!!system.shift?.active,titan=derived.titan;
 const equipped=key=>items.some(i=>i.type==='power'&&i.system.equipped&&i.system.key===key);
 if(titan)set('body','Titan body',3,'gain');
 if(shifted){
  if(equipped('colossal-titan'))set('agility','Colossal Titan',-2);
  if(equipped('jaw-titan'))add('agility','Jaw Titan',1);
  if(equipped('cart-titan'))add('agility','Cart Titan',1);
  if(equipped('armoured-titan')&&system.shift.armourIntact)add('agility','Armour plating',-1);
  for(const power of items.filter(i=>i.type==='power'&&i.system.equipped&&['beast-titan','female-titan'].includes(i.system.key)))
   add(power.system.bonusStat,power.name,1);
  if(system.shift.weak){set('body','Weak form',-1);set('agility','Weak form',-1);set('technique','Weak form',-1);}
 }
 const seen=new Set();
 for(const wound of woundsFor(items,titan)){
  const w=wound.system,stat=REGIONAL_STAT[w.region];
  const label=`${REGION_SHORT[w.region]} · ${w.severity} ${w.injuryType}`;
  if(w.severity!=='minor'||w.injuryType==='piercing'){
   if(stat&&(stackWounds||!seen.has(w.region)))add(stat,label,-1,'pen',REGION_SHORT[w.region]);
   seen.add(w.region);
  }
  if(w.severity==='crippling'&&w.region==='head'&&w.injuryType==='blunt')set('mind','Crippling head trauma',-3,'pen','Head trauma');
 }
 for(const item of items.filter(i=>i.type==='gear'&&i.system.equipped&&i.system.quantity>0))
  add(item.system.bonusStat,item.name,Number(item.system.bonus||0));
 // Fatigue is spent at the moment of the roll, so it is listed apart from the effective value.
 const fatigue=Number(system.fatigue||0);
 if(fatigue)out.agility.push({label:'Dodge fatigue',short:'Fatigue',delta:-fatigue,display:`−${fatigue}`,tone:'pen',atRoll:true});
 return out;
}
/** The six statistic cards, each carrying the named reasons its number moved. */
export function statCards(system,items,derived,{stackWounds=false}={}) {
 const sources=statSources(system,items,derived,{stackWounds});
 return Object.entries(STATS).map(([key,label])=>{
  const effective=Number(derived.stats?.[key]??0),base=Number(system.stats?.[key]??0),delta=effective-base;
  const reasons=sources[key]??[];
  return {key,label,tone:STAT_KEY[key],icon:STAT_ICON[key],description:STAT_DESCRIPTIONS[key],value:base,effective,
   modified:delta!==0,penalty:delta<0,
   sign:effective>0?'+':effective<0?'−':'',abs:Math.abs(effective),display:signed(effective),
   deltaLabel:delta?`${signed(delta)} applied`:'',
   reasons,anyReason:reasons.length>0,
   // The card names two reasons in full; the rest are counted and left to the Gear tab's ledger.
   shown:reasons.slice(0,2),extra:Math.max(0,reasons.length-2),
   why:reasons.map(r=>`${r.display} ${r.label}`).join(' · '),
   advanced:!!system.advanced?.[key],capped:base>=3};
 });
}
/** Consciousness drawn as boxes: held, spent, struck out by wounds, and struck off the sheet. */
export function consciousnessTrack(system,derived,shifted=false) {
 const max=Math.max(0,Number(derived.max)||0);
 const adjust=Number(system.consciousness?.[shifted?'titanMaxAdjustment':'maxAdjustment']||0);
 const held=Math.max(0,Math.min(max,Number(derived.value)||0));
 const wounded=Math.max(0,Math.min(max-held,Number(derived.woundLoss)||0));
 const spent=Math.max(0,max-held-wounded);
 const voided=adjust<0?Math.min(14,-adjust):0;
 const boxes=[
  ...Array.from({length:Math.min(28,held)},()=>({state:'held'})),
  ...Array.from({length:spent},()=>({state:'spent'})),
  ...Array.from({length:wounded},()=>({state:'wounded'})),
  ...Array.from({length:voided},()=>({state:'void'}))
 ].slice(0,32);
 const deficit=Math.max(0,-(Number(derived.value)||0));
 return {boxes,held,spent,wounded,voided,deficit,
  below:Array.from({length:Math.min(20,deficit)},(_,n)=>({fatal:max>0&&n+1>=max})),
  deathAt:max>0?`−${max}`:'GM ruling',coma:max<=0,
  legend:[wounded?{state:'wounded',text:`${wounded} struck out by wounds`}:null,
   spent?{state:'spent',text:`${spent} spent`}:null,
   voided?{state:'void',text:`${voided} off the sheet`}:null].filter(Boolean)};
}
/** Consumable rows for the sidebar, each with a supply gauge read off its capacity. */
export function fieldKit(items,limit=6) {
 return items.filter(i=>i.type==='gear'&&i.system.equipped).slice(0,limit).map(i=>{
  const quantity=Number(i.system.quantity||0),capacity=Math.max(0,Number(i.system.capacity||0));
  const kind=gearIcon(i.name,i.system.key);
  // Slots are only worth drawing when they fit on one row and say more than the count does.
  const slots=capacity>1&&capacity<=8?capacity:0;
  const full=capacity>0?Math.min(1,quantity/capacity):quantity>0?1:0;
  return {...i,id:i.id,icon:kind,kind,quantity,capacity,
   empty:quantity===0,single:capacity===1||(!capacity&&quantity<=1),
   low:capacity>0?quantity>0&&quantity<capacity&&quantity<=Math.ceil(capacity/3):quantity===1,
   percent:Math.round(full*100),
   pips:Array.from({length:slots},(_,n)=>({filled:n<quantity}))};
 });
}
/** Every catalogue action, grouped by category and then clustered by statistic. */
export function actionGroups(moves,derived,{search='',category='',stat=''}={}) {
 const term=search.trim().toLowerCase();
 const rows=moves.filter(m=>!category||m.system.category===category)
  .filter(m=>!stat||m.system.stat===stat)
  .filter(m=>!term||m.name.toLowerCase().includes(term)||m.system.source.toLowerCase().includes(term))
  .map(m=>actionRow(m,derived));
 const order=Object.keys(CATEGORY_ICON);
 return order.filter(name=>rows.some(r=>r.category===name)).map(name=>{
  const within=rows.filter(r=>r.category===name);
  return {name,icon:CATEGORY_ICON[name],count:within.length,
   clusters:Object.keys(STATS).filter(key=>within.some(m=>m.stat===key)).map(key=>({
    stat:key,label:STATS[key],short:STAT_SHORT[key],tone:STAT_KEY[key],icon:STAT_ICON[key],
    mod:signed(Number(derived?.stats?.[key]??0)),
    moves:within.filter(m=>m.stat===key)}))};
 });
}
export function actionRow(move,derived,extra={}) {
 const system=move.system,stat=system.stat,mod=Number(derived?.stats?.[stat]??0);
 const generic=/^Resolve the/.test(system.success??'');
 return {...extra,key:system.key,name:move.name,id:move.id,category:system.category,
  icon:extra.icon??CATEGORY_ICON[system.category]??'combat',stat,statLabel:STATS[stat],statShort:STAT_SHORT[stat],tone:STAT_KEY[stat],
  mod,modDisplay:signed(mod),
  difficult:!!system.difficult,combat:!!system.combat,source:system.source,
  // A combat flag only matters while low consciousness is turning those rolls difficult.
  combatHot:!!system.combat&&!!derived?.combatDifficult,
  line:generic?system.source:system.success};
}
/** Category chips for the actions toolbar. */
export function actionCategories(moves,active='') {
 return [{key:'',label:'All',icon:'filter',count:moves.length,active:!active},
  ...Object.keys(CATEGORY_ICON).map(name=>({key:name,label:name,icon:CATEGORY_ICON[name],
   count:moves.filter(m=>m.system.category===name).length,active:active===name}))
  .filter(c=>c.count>0)];
}
/** Statistic chips for the actions toolbar, priced against this character. */
export function actionStats(moves,derived,active='') {
 return Object.entries(STATS).map(([key,label])=>({key,label,short:STAT_SHORT[key],tone:STAT_KEY[key],icon:STAT_ICON[key],
  mod:signed(Number(derived?.stats?.[key]??0)),
  count:moves.filter(m=>m.system.stat===key).length,active:active===key})).filter(c=>c.count>0);
}
/** The consciousness maximum, written the way the rulebook derives it. */
export function consciousnessFormula(system,derived,shifted) {
 const adjust=Number(system.consciousness?.[shifted?'titanMaxAdjustment':'maxAdjustment']||0);
 const parts=['3',`Body ${signed(Number(system.stats?.body??0))}`,`Heart ${signed(Number(system.stats?.heart??0))}`];
 if(adjust)parts.push(`Adj ${signed(adjust)}`);
 if(shifted)parts.push('Titan form');
 return {text:parts.join(' · '),death:derived.max>0?`Death at −${derived.max}`:'GM ruling'};
}
export const gearRow=item=>({...item,id:item.id,icon:gearIcon(item.name,item.system.key),
 quantity:Number(item.system.quantity||0),capacity:Number(item.system.capacity||0),
 empty:Number(item.system.quantity||0)===0,
 modifier:item.system.bonusStat&&item.system.bonus?`${item.system.bonus>0?'+':'−'}${Math.abs(item.system.bonus)} ${STATS[item.system.bonusStat]??item.system.bonusStat}`:''});

// A ruler rather than a lookup: every Titan height the book lists, marked against
// the band you can actually reach. One glance answers "can I take that one?".
const METRES = n => Number.isInteger(n) ? `${n} m` : `${n.toFixed(1)} m`;
export function reachRuler(system,derived) {
 const reach = meleeReach(derived,system);
 const shifted = !!system.shift?.active;
 const cells = TITAN_HEIGHTS.map(height=>{
  const call = meleeAgainst(derived,system,height);
  return {height,label:String(height),verdict:call.verdict,
   in:call.inReach,hard:call.verdict==='hard',fail:call.verdict==='fail',out:!call.inReach,
   title:`${height} m Titan — ${{in:'within hand-to-hand reach',hard:'in reach, but every roll against it is difficult',fail:'in reach, but you automatically fail without Body +2',out:'out of hand-to-hand reach'}[call.verdict]}`};
 });
 const engageable = cells.filter(c=>c.in);
 return {...reach,cells,shifted,
  path:shifted?'system.shift.height':'system.height',
  own:Number((shifted?system.shift?.height:system.height)??0)||0,
  ownLabel:derived.mindless?'Titan height':shifted?(system.shift?.weak?'form · weak, half height':'Titan form height'):'your height',
  heightLabel:METRES(reach.height),
  bandLabel:engageable.length?`${METRES(reach.low)} – ${METRES(reach.high)}`:'nothing in reach',
  difficultLabel:METRES(reach.difficultAt),
  anyHard:cells.some(c=>c.hard),
  lines:derived.mindless?[
   {tone:'ok',icon:'body',text:`This Titan meets anything within ${METRES(reach.range)} of its own height — ${METRES(reach.low)} to ${METRES(reach.high)} — hand to hand.`},
   {tone:'warn',icon:'hunting',text:`An opponent ${METRES(reach.difficultAt)} or taller stands five metres over it: every roll against that opponent is difficult.`},
   {tone:'ok',icon:'blade',text:'Inside that band a crippling wound to the head takes the nape with it and kills this Titan.'},
   {tone:'warn',icon:'wind',text:'Outside it, this Titan simply picks a soldier up, and anything short of a Titan-slaying weapon only ever leaves a minor wound on it.'}
  ]:[
   reach.bodyGate
    ? {tone:'grave',icon:'skull',text:'You are not a Titan and your Body is below +2, so every hand-to-hand roll against a Titan automatically fails. Fight from the gear instead.'}
    : {tone:'ok',icon:'body',text:`You can engage a Titan whose height is within ${METRES(reach.range)} of your own — ${METRES(reach.low)} to ${METRES(reach.high)}.`},
   {tone:'warn',icon:'hunting',text:`A Titan ${METRES(reach.difficultAt)} or taller is at least five metres over you: every roll against it is difficult.`},
   {tone:'ok',icon:'blade',text:'Within reach, a crippling wound to the head takes the nape with it and kills the Titan.'},
   {tone:'warn',icon:'wind',text:'Out of reach it simply picks you up, and anything short of a Titan-slaying weapon only ever leaves a minor wound.'}
  ]};
}
// Absorption counts bites, and the count is the wound.
export function biteTrack(system,derived) {
 const tally = biteTally(system,derived);
 const boxes = Array.from({length:Math.max(tally.crippling,tally.bites)},(_,n)=>{
  const at = n+1;
  return {at,taken:at<=tally.bites,
   mark:at===tally.major?'major':at===tally.crippling?'crippling':'',
   title:at===tally.major?`Bite ${at} — the wound becomes major`:at===tally.crippling?`Bite ${at} — the wound becomes crippling`:`Bite ${at}`};
 });
 return {...tally,boxes,
  label:{none:'No bites',minor:'Minor cutting wound',major:'Major cutting wound',crippling:'Crippling cutting wound'}[tally.severity],
  hint:tally.next
   ? `${tally.next} more bite${tally.next===1?'':'s'} makes it ${tally.nextLabel}.`
   : 'Further bites are the GM’s call.',
  note:tally.armoured
   ? 'The Armoured Titan halves bite damage: six bites to reach major, and the armour breaks with it.'
   : 'Three bites make it major, five make it crippling. Rest resets nothing here — the GM does.'};
}
