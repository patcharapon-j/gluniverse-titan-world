// Loaded only by scripts/prepare-qa.mjs into the disposable QA copy.
import {CONTENT} from '../data/content.mjs';
import {rollContent,requestLuck,approveLuck} from './rolls.mjs';
const ID='gluniverse-titan-world';
Hooks.once('ready',async()=>{
 if(game.world.id!=='titan-world-qa'||game.user.name!=='QA Gamemaster')return;
 const results=[];const check=(name,ok)=>{results.push({name,pass:!!ok});if(!ok)throw new Error(name);};
 try {
  for(const [key,count] of [['rules',68],['moves',77],['equipment',38],['powers',9],['injuries',72],['advancement',4],['templates',6]]){
   const pack=game.packs.get(ID+'.'+key);const docs=await pack.getDocuments();check('Native pack '+key,docs.length===count&&!pack.invalidDocumentIds.size);
  }
  const journal=await game.packs.get(ID+'.rules').getDocuments();check('Complete rulebook has page text',journal.find(j=>j.name==='Titan World: Complete Third Edition').pages.contents[0].text.content.length>70000);
  let actor=game.actors.find(a=>a.name==='QA Soldier');actor??=await foundry.documents.Actor.create({name:'QA Soldier',type:'soldier',system:{stats:{agility:2,technique:1,mind:1,body:0,heart:0,duty:-1}},ownership:{default:0,TWQA000000000002:3}});
  await actor.update({'system.shift.active':false,'system.consciousness.loss':0,'system.nextDifficult':false,'system.fatigue':0});
  if(actor.items.size)await actor.deleteEmbeddedDocuments('Item',actor.items.map(i=>i.id));
  check('Actor model and derived data',actor.tw.max===3&&actor.tw.stats.agility===2);
  const [wound]=await actor.createEmbeddedDocuments('Item',[{name:'QA chest wound',type:'wound',system:{region:'chest',severity:'major',consciousnessLoss:1}}]);
  check('Live embedded wound applies',actor.tw.stats.body===-1&&actor.tw.value===2);
  await wound.update({'system.severity':'minor','system.consciousnessLoss':0,'system.fromMajor':true});check('Live treatment restores derived values',actor.tw.stats.body===0&&actor.tw.value===3);
  await wound.delete();
  const power=foundry.utils.deepClone(CONTENT.powers.find(p=>p.system.key==='armoured-titan'));delete power._id;
  await actor.createEmbeddedDocuments('Item',[power]);await actor.update({'system.shift.active':true,'system.shift.armourIntact':true});
  check('Live transformed Armoured power',actor.tw.max===12&&actor.tw.stats.agility===1);
  const [tw]=await actor.createEmbeddedDocuments('Item',[{name:'QA Titan leg wound',type:'wound',system:{region:'leftLeg',severity:'major',consciousnessLoss:1}}]);
  check('New wound assigned to active form',tw.system.formScope==='titan');
  await actor.update({'system.shift.active':false});check('Human state ignores Titan injuries',actor.tw.stats.agility===2&&actor.tw.value===3);
  const gear=foundry.utils.deepClone(CONTENT.gear.find(g=>g.name==='Gas Canister'));delete gear._id;gear.system.quantity=2;await actor.createEmbeddedDocuments('Item',[gear]);
  await actor.sheet.render(true);check('ActorSheetV2 renders',!!actor.sheet.element?.querySelector('[data-action="rollStat"]'));
  for(const type of ['gear','move','power','wound','loadout','advancement']){
   const item=actor.items.find(i=>i.type===type)??(await actor.createEmbeddedDocuments('Item',[{name:'QA '+type,type}]))[0];
   await item.sheet.render(true);check('ItemSheetV2 '+type,item.sheet.element?.textContent.includes(item.name)||!!item.sheet.element?.querySelector('input[name="name"]'));await item.sheet.close();
  }
  let party=game.actors.find(a=>a.type==='party');party??=await foundry.documents.Actor.create({name:'QA Party',type:'party',system:{luck:{value:4,max:4}},ownership:{default:2}});
  await party.update({'system.luck.value':4});await game.settings.set(ID,'partyActor',party.id);
  const roll=await new foundry.dice.Roll('2d6 + 2').evaluate();
  const meta={actorUuid:actor.uuid,name:'QA Agility',stat:'agility',modifiers:{stat:2,advantage:0,modifier:0,fatigue:0},difficult:false,moveKey:'',luckBonus:0,revision:0};
  const message=await foundry.documents.ChatMessage.create({speaker:foundry.documents.ChatMessage.getSpeaker({actor}),rolls:[roll],content:await rollContent(meta,roll),flags:{[ID]:{roll:meta}}},{messageMode:'public'});
  check('Foundry roll serializes',message.rolls[0].total===roll.total);
  const request=await requestLuck(message,'plus');await approveLuck(request);
  check('Luck +1 spends exactly one point',party.system.luck.value===3&&message.getFlag(ID,'roll').luckBonus===1);
  let duplicateBlocked=false;try{await approveLuck(request);}catch{duplicateBlocked=true;}check('Duplicate luck request rejected',duplicateBlocked&&party.system.luck.value===3);
  const rerollRequest=await requestLuck(message,'reroll');await approveLuck(rerollRequest);check('Luck reroll updates roll and clears +1',party.system.luck.value===2&&message.getFlag(ID,'roll').luckBonus===0&&message.getFlag(ID,'roll').revision===2);
  await actor.sheet.render(true);
 }catch(error){results.push({name:'Runtime error',pass:false,error:error.stack??error.message});console.error('TW QA',error);}
 const panel=document.createElement('details');panel.id='tw-qa-results';panel.style.cssText='position:fixed;bottom:8px;left:8px;z-index:10000;background:#eee;color:#111;padding:10px;max-width:620px;max-height:300px;overflow:auto';
 const summary=document.createElement('summary');summary.textContent=`Titan World QA: ${results.filter(r=>r.pass).length}/${results.length} checks passed`;
 const pre=document.createElement('pre');pre.textContent=JSON.stringify(results,null,2);panel.append(summary,pre);document.body.append(panel);
});
