import {STATS,REGIONS,validateArray} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,prompt,confirm,requireOwner,requireGM} from './ui.mjs';
import {getParty} from './rolls.mjs';
import {needsAmputation,titanFigureVariant} from './figure.mjs';
import {postCard,woundCard,shiftCard} from './cards.mjs';
import {packageContent,assignContent,loadoutContent,loadoutChoiceContent,advanceContent,woundContent,treatContent,
 consequenceContent,consciousnessContent,restContent,shiftContent,partyLuckContent,wireDialog} from './dialogs.mjs';
const fresh=doc=>{const copy=foundry.utils.deepClone(doc);delete copy._id;return copy;};
// Every dialog is a compact firing panel, wired on render (steppers, tokens, live readouts, validation).
const panel=(classes,width)=>({classes,width,render:(_event,dialog)=>wireDialog(dialog.element)});
export async function createCharacter(actor) {
 requireOwner(actor);
 const choice=await prompt('Character stat package',packageContent('rookie'),'Choose',panel(['tw-slips'],380));
 if(!choice)return;
 const data=await prompt('Assign your six stats',assignContent(choice.package),'Assign',panel(['tw-assign'],380));
 if(!data)return;
 const stats=Object.fromEntries(Object.keys(STATS).map(k=>[k,Number(data[k])]));
 if(!validateArray(stats,choice.package))throw new Error('Those selections do not match the package. Choose each value the specified number of times.');
 await actor.update({'system.stats':stats,'system.advanced':Object.fromEntries(Object.keys(STATS).map(k=>[k,false]))});
}
// Loadouts are requisition slips: pick one off the desk, then the addition it allows.
export async function equipLoadout(actor,provided=null) {
 requireOwner(actor);
 let loadout=provided;
 if(!loadout){const data=await prompt('Equip a starting loadout',loadoutContent(CONTENT.loadouts),'Requisition',panel(['tw-slips'],430));if(!data)return;loadout=CONTENT.loadouts.find(l=>l.system.key===data.key);}
 const spec=JSON.parse(loadout.system.loadout);let choice={items:[]};
 if(spec.choices.length){const data=await prompt(loadout.name,loadoutChoiceContent(loadout),'Equip',panel(['tw-slips'],430));if(!data)return;choice=spec.choices[Number(data.choice)];}
 else if(!await confirm('Equip loadout',`Add ${loadout.name} to ${actor.name}? Existing equipment will remain.`))return;
 const entries=[...spec.base.filter(e=>!choice.remove?.includes(e.name)),...choice.items];
 const quantities=new Map();for(const e of entries)quantities.set(e.name,(quantities.get(e.name)||0)+e.quantity);
 const docs=[...quantities].map(([name,quantity])=>{const base=CONTENT.gear.find(g=>g.name===name);if(!base)throw new Error('Unknown gear '+name);const d=fresh(base);d.system.quantity=quantity;d.system.capacity=quantity;return d;});
 await actor.createEmbeddedDocuments('Item',docs);
 return true;
}
export async function advance(actor) {
 requireOwner(actor);
 const eligible=Object.keys(STATS).filter(k=>!actor.system.advanced[k]&&actor.system.stats[k]<3);
 if(!eligible.length)throw new Error('All stats have been advanced or are already +3.');
 const data=await prompt('GM-awarded advancement',advanceContent(actor.system.stats,actor.system.advanced),'Increase',panel(['tw-advance'],330));
 if(data?.stat)await actor.update({[`system.stats.${data.stat}`]:actor.system.stats[data.stat]+1,[`system.advanced.${data.stat}`]:true});
}
export async function addWound(actor) {
 requireOwner(actor);
 const data=await prompt('Record a GM-assigned injury',woundContent(),'Record injury',panel(['tw-wound'],400));
 if(!data)return;
 const base=CONTENT_INJURY(data);
 base.system.formScope=actor.tw.titan?'titan':'human';
 const docs=await actor.createEmbeddedDocuments('Item',[base]);
 if(docs[0])await postCard(actor,woundCard({actorName:actor.name,actorImg:actor.img,wound:docs[0],titanVariant:titanFigureVariant(actor.items),armour:titanFigureVariant(actor.items)==='armoured'?{intact:actor.system.shift?.armourIntact!==false}:null,uid:`card-${docs[0].id}`}),'wound');
 return docs[0];
}
export function CONTENT_INJURY(data) {return {name:`${REGIONS[data.region]} · ${data.severity} ${data.injuryType}`,type:'wound',img:'icons/svg/blood.svg',system:{...data,consciousnessLoss:data.severity==='minor'?0:data.region==='head'?2:1,source:'Injuries',description:'<p>Consult the Injuries and The Four Types of Injuries rules journals for consequences and treatment.</p>'}};}
export async function treatWound(actor,id) {
 requireOwner(actor);const wound=actor.items.get(id);if(wound?.type!=='wound')return;
 const amputate=needsAmputation(wound);
 const data=await prompt(amputate?'Amputate and dress the stump':'Apply GM-approved treatment',treatContent(wound,amputate),'Apply treatment',panel(['tw-treat'],380));
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
 const tags=new Map();if(origin)tags.set(origin.uuid,'rolled');if(tokenTarget)tags.set(tokenTarget.uuid,'targeted');
 const data=await prompt('Apply a GM consequence',consequenceContent({targets:[...targets].map(([uuid,a])=>({uuid,name:a.name,tag:tags.get(uuid)})),selected:tokenTarget?.uuid??origin?.uuid??actors[0].uuid}),'Continue',panel(['tw-consequence'],380));
 if(!data)return;const actor=targets.get(data.actor);requireOwner(actor);
 if(data.effect==='wound')return addWound(actor);
 if(data.effect==='consciousness'){const key=actor.system.shift.active?'titanLoss':'loss';const d=await prompt('Change consciousness',consciousnessContent({value:actor.tw.value,max:actor.tw.max,loss:1}),'Apply',panel(['tw-stepper'],300));if(d)return actor.update({['system.consciousness.'+key]:actor.system.consciousness[key]+Number(d.loss)});}
 if(data.effect==='fear')return actor.update({'system.nextDifficult':true});
 if(data.effect==='fatigue')return actor.update({'system.fatigue':actor.system.fatigue+1});
 if(data.effect==='breath')return actor.update({'system.fatigue':0});
 if(data.effect==='shift')return toggleShift(actor);
 if(data.effect==='rest'){
  if(actor.tw.restBlocked)throw new Error('Major or untreated crippling wounds block rest.');
  const d=await prompt('Apply overnight rest',restContent(),'Apply',panel(['tw-rest'],340));if(!d)return;
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
 const data=await prompt(active?'Leave Titan form':'Enter Titan form',shiftContent({active}),'Apply form',panel(['tw-shift'],380));
 if(!data)return;
 if(!active&&data.fresh){const ids=actor.items.filter(i=>i.type==='wound'&&i.system.formScope==='titan').map(i=>i.id);if(ids.length)await actor.deleteEmbeddedDocuments('Item',ids);await actor.update({'system.consciousness.titanLoss':0});}
 await actor.update({'system.shift.active':!active,'system.shift.weak':!active&&!!data.weak});
 if(!active)await postCard(actor,shiftCard({actorName:actor.name,actorImg:actor.img,power:actor.items.find(i=>i.type==='power'&&i.system.equipped)?.name}),'shift');
 if(active){const d=actor.tw;await actor.update({'system.consciousness.loss':d.max-d.woundLoss-1});}
}
export async function createParty() {
 requireGM();const existing=getParty();if(existing){existing.sheet.render(true);return existing;}
 const players=game.users.filter(u=>!u.isGM).length;
 const data=await prompt('Create shared party luck',partyLuckContent({players,max:Math.max(1,players)}),'Create',panel(['tw-luck'],330));if(!data)return;
 const max=Math.max(0,Math.floor(Number(data.max)||0));
 const actor=await foundry.documents.Actor.create({name:'Party luck',type:'party',img:'icons/svg/d20.svg',ownership:{default:2},system:{luck:{value:max,max}}});
 await game.settings.set(ID,'partyActor',actor.id);actor.sheet.render(true);return actor;
}
export async function resetMission() {
 requireGM();const party=getParty();if(!party)throw new Error('Create a Party actor first.');
 if(await confirm('Refresh party luck','Refill shared luck to the mission maximum? Wounds and equipment are unchanged.'))await party.update({'system.luck.value':party.system.luck.max});
}
