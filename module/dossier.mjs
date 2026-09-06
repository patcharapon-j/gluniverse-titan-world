import {REGIONS} from './rules.mjs';
const SEVERITY={minor:1,major:2,crippling:3};
export const STAT_DESCRIPTIONS={agility:'Speed, balance and precision.',technique:'Blades, cables and control.',mind:'Judgement under pressure.',body:'Strength and endurance.',heart:'Courage in the face of death.',duty:'Command, trust and resolve.'};
const SHAPES={
 head:'M100 8c14 0 24 12 24 30 0 12-6 26-24 26S76 50 76 38c0-18 10-30 24-30z',
 chest:'M66 82c10-5 58-5 68 0l-4 48c-2 12-2 24 0 36l4 26c-14 6-54 6-68 0l4-26c2-12 2-24 0-36z',
 leftArm:'M64 84c-12 8-20 24-22 44l-4 44-8 40c-2 8 2 10 6 10s6-2 8-8l10-40 8-44 8-30z',
 rightArm:'M136 84c12 8 20 24 22 44l4 44 8 40c2 8-2 10-6 10s-6-2-8-8l-10-40-8-44-8-30z',
 leftLeg:'M68 196c10 4 22 6 32 6l-4 50-4 44 2 42-2 10 2 12H72l4-14-4-50-2-46z',
 rightLeg:'M132 196c-10 4-22 6-32 6l4 50 4 44-2 42 2 10-2 12h22l-4-14 4-50 2-46z'
};
export function conditionRegions(items,titan=false) {
 return Object.entries(REGIONS).map(([key,label])=>{
  const wounds=items.filter(i=>i.type==='wound'&&!i.system.healed&&i.system.region===key&&(i.system.formScope??'human')===(titan?'titan':'human'));
  const level=Math.max(0,...wounds.map(w=>SEVERITY[w.system.severity]??0));
  const severity=Object.keys(SEVERITY).find(k=>SEVERITY[k]===level)??'clear';
  return {key,label,severity,count:wounds.length,path:SHAPES[key],summary:wounds.length?severity:'Uninjured',pips:[1,2,3].map(n=>({filled:n<=level}))};
 });
}
export function fieldKit(items) {
 return items.filter(i=>i.type==='gear'&&i.system.equipped).slice(0,5).map(i=>({...i,empty:i.system.quantity===0}));
}
