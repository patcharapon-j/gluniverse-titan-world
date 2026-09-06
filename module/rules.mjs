export const STATS = {agility:'Agility', technique:'Technique', mind:'Mind', body:'Body', heart:'Heart', duty:'Duty'};
export const REGIONS = {head:'Head', chest:'Chest', leftArm:'Left arm', rightArm:'Right arm', leftLeg:'Left leg', rightLeg:'Right leg'};
export const REGIONAL_STAT = {head:'mind', chest:'body', leftArm:'technique', rightArm:'technique', leftLeg:'agility', rightLeg:'agility'};
export const ARRAYS = {rookie:[1,1,0,0,-1,-1], soldier:[2,1,1,0,0,-1], expert:[2,1,1,1,0,-1], specialist:[3,2,1,0,-1,-1]};
export const clamp = (n,min,max) => Math.min(max,Math.max(min,Number(n)||0));
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
