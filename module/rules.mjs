export const STATS = {agility:'Agility', technique:'Technique', mind:'Mind', body:'Body', heart:'Heart', duty:'Duty'};
export const REGIONS = {head:'Head', chest:'Chest', leftArm:'Left arm', rightArm:'Right arm', leftLeg:'Left leg', rightLeg:'Right leg'};
export const REGIONAL_STAT = {head:'mind', chest:'body', leftArm:'technique', rightArm:'technique', leftLeg:'agility', rightLeg:'agility'};
export const ARRAYS = {rookie:[1,1,0,0,-1,-1], soldier:[2,1,1,0,0,-1], expert:[2,1,1,1,0,-1], specialist:[3,2,1,0,-1,-1]};
export const clamp = (n,min,max) => Math.min(max,Math.max(min,Number(n)||0));
// The three thresholds every roll is read against, lowest first, plus the natural
// snake-eyes tier that overrides them. Roll cards, action lists and item sheets all
// name the tiers from here so they cannot drift apart.
export const RESULT_TIERS = [
  {key:'failure', band:'miss', range:'6−', label:'Failure'},
  {key:'partial', band:'mix',  range:'7–9', label:'Partial'},
  {key:'success', band:'hit',  range:'10+',  label:'Success'}
];
export const SNAKE_EYES_TIER = {key:'snakeEyes', band:'grim', range:'1+1', label:'Snake eyes'};
// Every authored result for one action, best first, ready to print without the rulebook.
// A difficult roll has no middle ground, so its 7-9 row is marked struck rather than dropped.
export function moveOutcomes(system={}) {
  const rows = [...RESULT_TIERS].reverse().map(tier=>({...tier,
    text:String(system[tier.key]??'').trim(), struck:!!system.difficult && tier.key==='partial'}));
  rows.push({...SNAKE_EYES_TIER, text:String(system.snakeEyes??'').trim(), struck:false});
  return rows.filter(row=>row.text);
}
export function outcome(dice,total,difficult=false) {
  if (dice.length === 2 && dice.every(d=>d===1)) return 'snakeEyes';
  if (dice.length === 2 && dice.every(d=>d===6)) return 'doubleSix';
  return total>=10 ? 'success' : total>=7 && !difficult ? 'partial' : 'failure';
}
export function derive(system,items=[],type='soldier',settings={}) {
  const stats = Object.fromEntries(Object.keys(STATS).map(k=>[k,Number(system.stats?.[k]??0)]));
  const shifted = !!system.shift?.active;
  const titan = type==='titan' || shifted;
  const wounds = items.filter(i=>i.type==='wound' && !i.system.healed && (i.system.formScope??'human')===(titan?'titan':'human'));
  const powers = new Set(items.filter(i=>i.type==='power' && i.system.equipped).map(i=>i.system.key));
  if(titan) stats.body=3;
  if(shifted) {
    if(powers.has('colossal-titan')) stats.agility=-2;
    if(powers.has('jaw-titan')) stats.agility++;
    if(powers.has('cart-titan')) stats.agility++;
    if(powers.has('armoured-titan') && system.shift.armourIntact) stats.agility--;
    for(const i of items.filter(i=>i.type==='power' && i.system.equipped && ['beast-titan','female-titan'].includes(i.system.key))) {
      if(i.system.bonusStat in stats) stats[i.system.bonusStat]++;
    }
    if(system.shift.weak) Object.assign(stats,{body:-1,agility:-1,technique:-1});
  }
  const beforeWounds = {...stats};
  const seen = new Set();
  for(const wound of wounds) {
    const w=wound.system, stat=REGIONAL_STAT[w.region];
    if(w.severity!=='minor' || w.injuryType==='piercing') {
      if(stat && (settings.stackWounds || !seen.has(w.region))) stats[stat]--;
      seen.add(w.region);
    }
    if(w.severity==='crippling' && w.region==='head' && w.injuryType==='blunt') stats.mind=-3;
  }
  for(const i of items.filter(i=>i.type==='gear' && i.system.equipped && i.system.quantity>0)) {
    if(i.system.bonusStat in stats) stats[i.system.bonusStat]+=i.system.bonus;
  }
  if(wounds.some(i=>i.system.severity==='crippling'&&i.system.region==='head'&&i.system.injuryType==='blunt'))stats.mind=-3;
  let max=3+(settings.woundedBodyMax?stats.body:beforeWounds.body)+beforeWounds.heart+Number(system.consciousness?.[shifted?'titanMaxAdjustment':'maxAdjustment']||0);
  if(shifted && powers.has('armoured-titan') && system.shift.armourIntact) max*=2;
  if(shifted && system.shift.weak) max=1;
  const woundLoss=wounds.reduce((n,i)=>n+Number(i.system.consciousnessLoss||0),0);
  const value=Math.min(max,max-woundLoss-Number(system.consciousness?.[shifted?'titanLoss':'loss']||0));
  const mindless=type==='titan';
  return {stats,max,value,woundLoss,titan,mindless,powers:[...powers],
    combatDifficult:!mindless && value<Math.floor(max/2),
    status:system.dead?'Deceased':mindless?'Nape intact':max<=0?'Coma':value<=0?'Unconscious':'Conscious',
    deathReview:!mindless && max>0 && value<=-max,
    restBlocked:wounds.some(i=>i.system.severity==='major' || (i.system.severity==='crippling'&&!i.system.treated)),
    majorLeg:wounds.some(i=>['leftLeg','rightLeg'].includes(i.system.region)&&i.system.severity!=='minor')};
}
export function rollModifiers(derived,system,stat,{advantage=0,modifier=0,combat=false,difficult=false}={}) {
  return {stat:derived.stats[stat]??0, advantage:clamp(advantage,0,3), modifier:Number(modifier)||0,
    fatigue:stat==='agility'?-(Number(system.fatigue)||0):0,
    difficult:!!(difficult||system.nextDifficult||(combat&&derived.combatDifficult))};
}
export function validateArray(stats,key) {
  return [...Object.values(stats)].sort().join(',') === [...(ARRAYS[key]??[])].sort().join(',');
}
// Titan Size / Hand-To-Hand Combat. Reach is a band around your own height: two
// metres normally, ten once you are Titan-sized. A Titan five metres taller than
// you makes every roll against it difficult, and outside a Titan body you need
// Body +2 to connect at all.
export const TITAN_HEIGHTS = [3,4,5,6,7,8,9,10,11,12,13,14,15];
export function meleeReach(derived,system={}) {
  const shifted = !!system.shift?.active;
  const declared = Number((shifted ? system.shift?.height : system.height) ?? 0) || 0;
  // A weak form comes out at about half its regular height.
  const height = shifted && system.shift?.weak ? declared/2 : declared;
  const titanSized = height>=10;
  const range = titanSized ? 10 : 2;
  return {height,range,titanSized,low:Math.max(0,height-range),high:height+range,
    difficultAt:height+5, bodyGate:!derived.titan && (derived.stats?.body??0)<2};
}
export function meleeAgainst(derived,system,targetHeight) {
  const reach = meleeReach(derived,system);
  const target = Number(targetHeight)||0;
  const inReach = Math.abs(target-reach.height) <= reach.range + 1e-9;
  return {...reach,target,inReach,
    difficult:inReach && target>=reach.difficultAt,
    autoFail:inReach && reach.bodyGate,
    decapitate:inReach,
    verdict:!inReach ? 'out' : reach.bodyGate ? 'fail' : target>=reach.difficultAt ? 'hard' : 'in'};
}
// Titan Shifter Absorption: a bite opens as a minor cutting wound, three make it
// major and five crippling. The Armoured Titan halves the damage, so it takes six
// to break the armour into a major wound.
export function biteTally(system={},derived={}) {
  const armoured = (derived.powers??[]).includes('armoured-titan');
  const bites = Math.max(0,Number(system.bites)||0);
  const major = armoured ? 6 : 3, crippling = armoured ? 10 : 5;
  const severity = bites>=crippling ? 'crippling' : bites>=major ? 'major' : bites>0 ? 'minor' : 'none';
  return {bites,armoured,major,crippling,severity,
    next: bites<major ? major-bites : bites<crippling ? crippling-bites : 0,
    nextLabel: bites<major ? 'major' : bites<crippling ? 'crippling' : ''};
}
