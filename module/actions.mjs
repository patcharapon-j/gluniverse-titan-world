import {STATS,REGIONS,ARRAYS,validateArray} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,esc,field,select,prompt,confirm,requireOwner,requireGM} from './ui.mjs';
import {getParty} from './rolls.mjs';
const fresh=doc=>{const copy=foundry.utils.deepClone(doc);delete copy._id;return copy;};
export async function createCharacter(actor) {
 requireOwner(actor);
 const choice=await prompt('Character stat package',select('Package','package',{rookie:'Rookie: 1, 1, 0, 0, −1, −1',soldier:'Soldier: 2, 1, 1, 0, 0, −1',expert:'Expert: 2, 1, 1, 1, 0, −1',specialist:'Expert: 3, 2, 1, 0, −1, −1'},'rookie'),'Choose');
 if(!choice)return;
 const array=ARRAYS[choice.package];
 const values=Object.fromEntries([...new Set(array)].map(n=>[n,String(n)]));
 const data=await prompt('Assign your six stats',`<p>Assign exactly: ${array.join(', ')}. This replaces current stats and clears advancement marks.</p><div class="grid2">${Object.entries(STATS).map(([k,label],i)=>select(label,k,values,array[i])).join('')}</div>`,'Assign');
 if(!data)return;
 const stats=Object.fromEntries(Object.keys(STATS).map(k=>[k,Number(data[k])]));
 if(!validateArray(stats,choice.package))throw new Error('Those selections do not match the package. Choose each value the specified number of times.');
 await actor.update({'system.stats':stats,'system.advanced':Object.fromEntries(Object.keys(STATS).map(k=>[k,false]))});
}
export async function equipLoadout(actor,provided=null) {
 requireOwner(actor);
 let loadout=provided;
 if(!loadout){const data=await prompt('Equip a starting loadout',select('Loadout','key',Object.fromEntries(CONTENT.loadouts.map(l=>[l.system.key,l.name])),CONTENT.loadouts[0].system.key),'Choose');if(!data)return;loadout=CONTENT.loadouts.find(l=>l.system.key===data.key);}
 const spec=JSON.parse(loadout.system.loadout);let choice={items:[]};
 if(spec.choices.length){const data=await prompt(loadout.name,select('Choose one addition','choice',Object.fromEntries(spec.choices.map((c,i)=>[i,c.label])),0),'Equip');if(!data)return;choice=spec.choices[Number(data.choice)];}
 else if(!await confirm('Equip loadout',`Add ${loadout.name} to ${actor.name}? Existing equipment will remain.`))return;
 const entries=[...spec.base.filter(e=>!choice.remove?.includes(e.name)),...choice.items];
 const quantities=new Map();for(const e of entries)quantities.set(e.name,(quantities.get(e.name)||0)+e.quantity);
 const docs=[...quantities].map(([name,quantity])=>{const base=CONTENT.gear.find(g=>g.name===name);if(!base)throw new Error('Unknown gear '+name);const d=fresh(base);d.system.quantity=quantity;return d;});
 await actor.createEmbeddedDocuments('Item',docs);
}
export async function advance(actor) {
 requireOwner(actor);
 const eligible=Object.fromEntries(Object.entries(STATS).filter(([k])=>!actor.system.advanced[k]&&actor.system.stats[k]<3));
 if(!Object.keys(eligible).length)throw new Error('All stats have been advanced or are already +3.');
 const data=await prompt('GM-awarded advancement',`<p>Use only after the GM awards an increase. Each stat can be increased once, to a maximum of +3.</p>${select('Stat','stat',eligible,Object.keys(eligible)[0])}`,'Increase');
 if(data)await actor.update({[`system.stats.${data.stat}`]:actor.system.stats[data.stat]+1,[`system.advanced.${data.stat}`]:true});
}
export async function addWound(actor) {
 requireOwner(actor);
 const data=await prompt('Record a GM-assigned injury',`${select('Region','region',REGIONS,'chest')}<div class="grid2">${select('Severity','severity',{minor:'Minor',major:'Major',crippling:'Crippling'},'minor')}${select('Type','injuryType',{blunt:'Blunt',cutting:'Cutting',piercing:'Piercing / ballistic',burn:'Burn'},'blunt')}</div><p class="note">Consciousness loss defaults to 1 for major or crippling injuries, or 2 for the head. You can edit the recorded loss. Narrative consequences remain GM decisions.</p>`,'Record injury');
 if(!data)return;
 const base=CONTENT_INJURY(data);
 base.system.formScope=actor.tw.titan?'titan':'human';
 const docs=await actor.createEmbeddedDocuments('Item',[base]);return docs[0];
}
export function CONTENT_INJURY(data) {return {name:`${REGIONS[data.region]} · ${data.severity} ${data.injuryType}`,type:'wound',img:'icons/svg/blood.svg',system:{...data,consciousnessLoss:data.severity==='minor'?0:data.region==='head'?2:1,source:'Injuries',description:'<p>Consult the Injuries and The Four Types of Injuries rules journals for consequences and treatment.</p>'}};}
export async function treatWound(actor,id) {
 requireOwner(actor);const wound=actor.items.get(id);if(wound?.type!=='wound')return;
 const data=await prompt('Apply GM-approved treatment',`<p>${esc(wound.name)}</p>${select('Result','result',{stabilize:'Stop bleeding / mark treated',downgrade:'Major → minor, restore wound consciousness',piercing:'Minor piercing → minor cutting',remove:'Remove eligible minor wound',restore:'Restore wound consciousness loss only'},'stabilize')}<p class="note">Roll first aid or recovery first. Treatment does not decide timing, amputation, or narrative eligibility.</p>`,'Apply treatment');
 if(!data)return;
 if(data.result==='stabilize')return wound.update({'system.treated':true});
 if(data.result==='downgrade'){if(wound.system.severity!=='major')throw new Error('Only major wounds can be downgraded by regular first aid.');return wound.update({name:`${REGIONS[wound.system.region]} · minor ${wound.system.injuryType}`,'system.severity':'minor','system.fromMajor':true,'system.treated':true,'system.consciousnessLoss':0});}
 if(data.result==='piercing'){if(wound.system.severity!=='minor'||wound.system.injuryType!=='piercing')throw new Error('Choose a minor piercing wound.');return wound.update({name:`${REGIONS[wound.system.region]} · minor cutting`,'system.injuryType':'cutting','system.treated':true});}
 if(data.result==='restore')return wound.update({'system.consciousnessLoss':0});
 if(data.result==='remove'){if(wound.system.severity!=='minor'||wound.system.injuryType==='piercing'||wound.system.fromMajor)throw new Error('This wound requires further treatment or the end of the mission. Edit it after the GM approves.');return wound.delete();}
}
export async function consequence(message) {
 requireGM();
 const meta=message.getFlag(ID,'roll'),origin=meta?await fromUuid(meta.actorUuid):null;
 const actors=game.actors.filter(a=>a.type!=='party');if(!actors.length)return;
 const tokenTarget=[...game.user.targets][0]?.actor;
 const targets=new Map(actors.map(a=>[a.uuid,a]));if(tokenTarget)targets.set(tokenTarget.uuid,tokenTarget);if(origin)targets.set(origin.uuid,origin);
 const data=await prompt('Apply a GM consequence',`${select('Affected actor','actor',Object.fromEntries([...targets].map(([uuid,a])=>[uuid,a.name])),tokenTarget?.uuid??origin?.uuid??actors[0].uuid)}${select('Consequence','effect',{wound:'Record an injury',consciousness:'Change consciousness',fear:'Make next roll difficult',fatigue:'Add one dodge fatigue',breath:'Clear dodge fatigue',shift:'Toggle Titan form',rest:'Apply overnight rest result'},'wound')}`,'Continue');
 if(!data)return;const actor=targets.get(data.actor);requireOwner(actor);
 if(data.effect==='wound')return addWound(actor);
 if(data.effect==='consciousness'){const key=actor.system.shift.active?'titanLoss':'loss';const d=await prompt('Change consciousness',field('Points lost (negative restores)','loss',1,'number'),'Apply');if(d)return actor.update({['system.consciousness.'+key]:actor.system.consciousness[key]+Number(d.loss)});}
 if(data.effect==='fear')return actor.update({'system.nextDifficult':true});
 if(data.effect==='fatigue')return actor.update({'system.fatigue':actor.system.fatigue+1});
 if(data.effect==='breath')return actor.update({'system.fatigue':0});
 if(data.effect==='shift')return toggleShift(actor);
 if(data.effect==='rest'){
  if(actor.tw.restBlocked)throw new Error('Major or untreated crippling wounds block rest.');
  const d=await prompt('Apply overnight rest',select('Approved result','result',{partial:'7–9: restore consciousness',success:'10+: restore consciousness and eligible minor wounds'},'partial'),'Apply');if(!d)return;
  const scope=actor.tw.titan?'titan':'human';
  const lossUpdates=actor.items.filter(i=>i.type==='wound'&&i.system.formScope===scope&&i.system.consciousnessLoss>0).map(i=>({_id:i.id,'system.consciousnessLoss':0}));
  if(lossUpdates.length)await actor.updateEmbeddedDocuments('Item',lossUpdates);
  if(d.result==='success'){const ids=actor.items.filter(i=>i.type==='wound'&&i.system.formScope===scope&&i.system.severity==='minor'&&!i.system.fromMajor&&i.system.injuryType!=='piercing').map(i=>i.id);if(ids.length)await actor.deleteEmbeddedDocuments('Item',ids);}
  return actor.update({['system.consciousness.'+(actor.system.shift.active?'titanLoss':'loss')]:0});
 }
}
export async function toggleShift(actor) {
 requireOwner(actor);
 if(actor.type==='titan')throw new Error('Mindless Titans do not switch forms. Use a Soldier actor for a shifter.');
 if(!actor.items.some(i=>i.type==='power'))throw new Error('Add a Titan power from the compendium first.');
 const active=actor.system.shift.active;
 const data=await prompt(active?'Leave Titan form':'Enter Titan form',`<p>Apply only after the GM resolves the transformation or dismount roll. Human and Titan injuries are tracked separately. Use a new form to clear the old Titan body's injuries.</p>${active?'':`<p class="warning">The source conflicts on shifting with crippling wounds. Confirm full, partial, or exceptional weak form with the GM.</p><label><input name="weak" type="checkbox"> Exceptional weak form (physical stats −1, consciousness maximum 1)</label><br><label><input name="fresh" type="checkbox" checked> New Titan body: clear old Titan injuries and exhaustion</label>`}`,'Apply form');
 if(!data)return;
 if(!active&&data.fresh){const ids=actor.items.filter(i=>i.type==='wound'&&i.system.formScope==='titan').map(i=>i.id);if(ids.length)await actor.deleteEmbeddedDocuments('Item',ids);await actor.update({'system.consciousness.titanLoss':0});}
 await actor.update({'system.shift.active':!active,'system.shift.weak':!active&&!!data.weak});
 if(active){const d=actor.tw;await actor.update({'system.consciousness.loss':d.max-d.woundLoss-1});}
}
export async function createParty() {
 requireGM();const existing=getParty();if(existing){existing.sheet.render(true);return existing;}
 const players=game.users.filter(u=>!u.isGM).length;
 const data=await prompt('Create shared party luck',field('Maximum luck (one or two points per player)','max',Math.max(1,players),'number'),'Create');if(!data)return;
 const max=Math.max(0,Math.floor(Number(data.max)||0));
 const actor=await foundry.documents.Actor.create({name:'Party luck',type:'party',img:'icons/svg/d20.svg',ownership:{default:2},system:{luck:{value:max,max}}});
 await game.settings.set(ID,'partyActor',actor.id);actor.sheet.render(true);return actor;
}
export async function resetMission() {
 requireGM();const party=getParty();if(!party)throw new Error('Create a Party actor first.');
 if(await confirm('Refresh party luck','Refill shared luck to the mission maximum? Wounds and equipment are unchanged.'))await party.update({'system.luck.value':party.system.luck.max});
}
