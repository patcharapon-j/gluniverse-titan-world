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
  const waitUntil=async predicate=>{for(let i=0;i<40;i++){if(predicate())return true;await new Promise(resolve=>setTimeout(resolve,50));}return false;};
  await party.update({'system.luck.value':1});
  check('Open soldier sheet receives shared party updates',await waitUntil(()=>actor.sheet.element.querySelector('[data-live="party-luck"]')?.textContent.trim().startsWith('1')));
  await actor.update({'system.stats.body':1});
  check('Base edit refreshes derived consciousness immediately',await waitUntil(()=>actor.sheet.element.querySelector('[data-live="consciousness"]')?.textContent.trim().startsWith('4')));
  actor.sheet._twTab='background';await actor.sheet.render(true);
  const anchor=actor.sheet.element.querySelector('[name="system.anchor"]');anchor.focus();anchor.value='Unsaved typing survives a party update';anchor.setSelectionRange(7,7);
  await party.update({'system.luck.value':2});
  await waitUntil(()=>actor.sheet.element.querySelector('[name="system.anchor"]')!==anchor);
  const restored=actor.sheet.element.querySelector('[name="system.anchor"]');
  check('Live updates preserve focused unsaved text and caret',restored.value==='Unsaved typing survives a party update'&&document.activeElement===restored&&restored.selectionStart===7);
  restored.blur();actor.sheet._twTab='actions';await actor.sheet.render(true);
  const search=actor.sheet.element.querySelector('[data-move-search]');search.value='nape';search.dispatchEvent(new Event('input'));
  await party.update({'system.luck.value':3});
  await waitUntil(()=>actor.sheet.element.querySelector('[data-move-search]')!==search);
  check('Action search survives live updates',actor.sheet.element.querySelector('[data-move-search]').value==='nape'&&[...actor.sheet.element.querySelectorAll('[data-move-name]:not([hidden])')].every(row=>row.dataset.moveName.toLowerCase().includes('nape')));
  actor.sheet._twTab='record';await actor.update({'system.stats.body':0});await actor.sheet.render(true);
  const bodyInput=actor.sheet.element.querySelector('[name="system.stats.body"]');bodyInput.value='1';bodyInput.dispatchEvent(new Event('change',{bubbles:true}));
  check('Native form change saves and updates derived display',await waitUntil(()=>actor.system.stats.body===1&&actor.sheet.element.querySelector('[data-live="consciousness"]')?.textContent.trim().startsWith('4')));
  await actor.update({'system.stats.body':0});await actor.sheet.render(true);
  const scrollBody=actor.sheet.element.querySelector('.sheet-body');scrollBody.scrollTop=80;const scrollBefore=scrollBody.scrollTop;
  await party.update({'system.luck.value':2});await waitUntil(()=>actor.sheet.element.querySelector('.sheet-body')!==scrollBody);
  check('Live refresh preserves scroll position',Math.abs(actor.sheet.element.querySelector('.sheet-body').scrollTop-scrollBefore)<2);
  let tabsFit=true;
  for(const tab of ['record','injuries','equipment','actions','background','powers']){actor.sheet._twTab=tab;await actor.sheet.render(true);const body=actor.sheet.element.querySelector('.sheet-body');tabsFit&&=body.scrollWidth<=body.clientWidth+1;}
  check('All six dossier pages fit without horizontal overflow',tabsFit);
  actor.sheet._twTab='record';await actor.sheet.render(true);actor.sheet.setPosition({width:640});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const narrowBody=actor.sheet.element.querySelector('.sheet-body');check('Narrow dossier reflows without horizontal overflow',narrowBody.scrollWidth<=narrowBody.clientWidth+1);
  actor.sheet.setPosition({width:980});await actor.sheet.render(true);
  // Exercise the real DialogV2 sanitizer, form submission, and sheet refresh.
  const [treatmentWound]=await actor.createEmbeddedDocuments('Item',[{name:'QA treatment cut',type:'wound',system:{region:'chest',severity:'major',injuryType:'cutting',formScope:'human',consciousnessLoss:1}}]);
  actor.sheet._twTab='injuries';await actor.sheet.render(true);
  const openTreatment=async()=>{actor.sheet.element.querySelector(`[data-action="treatWound"][data-item-id="${treatmentWound.id}"]`).click();check('Treatment dialog opens from sheet',await waitUntil(()=>document.querySelector('.tw-treat .tr-opt>span')));return document.querySelector('.tw-treat');};
  let treatmentDialog=await openTreatment();
  check('Treatment text retains usable width after Foundry sanitizes SVG',treatmentDialog.querySelector('.tr-opt>span').getBoundingClientRect().width>200);
  check('Ineligible treatments are disabled',treatmentDialog.querySelector('input[value="piercing"]').disabled&&treatmentDialog.querySelector('input[value="remove"]').disabled);
  treatmentDialog.querySelector('[data-action="cancel"]').click();await waitUntil(()=>!document.querySelector('.tw-treat'));
  check('Cancel leaves wound unchanged',!treatmentWound.system.treated&&treatmentWound.system.severity==='major');
  treatmentDialog=await openTreatment();treatmentDialog.querySelector('[data-action="apply"]').click();
  check('Apply marks wound treated and refreshes its dressing',await waitUntil(()=>treatmentWound.system.treated&&actor.sheet.element.querySelector('.wound.treated .dressing-pad')));
  await waitUntil(()=>!document.querySelector('.tw-treat'));
  treatmentDialog=await openTreatment();treatmentDialog.querySelector('input[value="downgrade"]').checked=true;treatmentDialog.querySelector('[data-action="apply"]').click();
  check('First aid downgrade restores wound consciousness',await waitUntil(()=>treatmentWound.system.severity==='minor'&&treatmentWound.system.consciousnessLoss===0&&treatmentWound.system.fromMajor));
 }catch(error){results.push({name:'Runtime error',pass:false,error:error.stack??error.message});console.error('TW QA',error);}
 const panel=document.createElement('details');panel.id='tw-qa-results';panel.style.cssText='position:fixed;bottom:8px;left:8px;z-index:10000;background:#eee;color:#111;padding:10px;max-width:620px;max-height:300px;overflow:auto';
 const summary=document.createElement('summary');summary.textContent=`Titan World QA: ${results.filter(r=>r.pass).length}/${results.length} checks passed`;
 const pre=document.createElement('pre');pre.textContent=JSON.stringify(results,null,2);panel.append(summary,pre);document.body.append(panel);
});
