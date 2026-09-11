import {STATS,REGIONS} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,guard,confirm,requireOwner,requireGM} from './ui.mjs';
import {rollActor,moveByKey,getParty} from './rolls.mjs';
import {createCharacter,equipLoadout,advance,addWound,treatWound,toggleShift,createParty,resetMission} from './actions.mjs';
import {injuryLedger,actionGroups,actionCategories,actionStats,actionRow,growthRecord,gearRow,requisitionSlip,powerCard,shiftPlate,
 consciousnessFormula,consciousnessTrack,statCards,reachRuler,biteTrack,notches,tally,FEAR,
 STAT_DESCRIPTIONS,SEVERITY_LABEL,INJURY_LABEL,SHEET_TABS as TABS,QUICK_ACTIONS as QUICK,unitCard} from './dossier.mjs';
import {SPRITE} from './icons.mjs';
import {wireSheet,queueImpact,kitMotion} from './sheet-fx.mjs';
import {wireActions,pressRoll} from './actions-fx.mjs';
import {bodyFigure} from './figure.mjs';
import {KIT,fieldKitLayout,kitContainer,kitObject,flareColour} from './kit.mjs';
import {KIT_SPRITE} from './kit-art.mjs';
import {postCard,flareCard,deathCard} from './cards.mjs';
const {HandlebarsApplicationMixin}=foundry.applications.api;
const {ActorSheetV2,ItemSheetV2}=foundry.applications.sheets;
const PARTIALS=['header','overview','actions','outcomes','wounds','gear','kit-slots','shifter','record','party'];
// A loadout that actually unpacked drops its objects into the kit on the next render.
const unpacked=sheet=>{queueImpact(sheet.actor.id,{kind:'unpack'});sheet.render();};
export class TitanActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw','tw-actor'],position:{width:860,height:760},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{
  twTab:function(_e,target){this._tabChanged=this._twTab!==target.dataset.tab;this._twTab=target.dataset.tab;this.render();},
  // A filter chip re-deals the card file on the next render.
  filterCategory:function(_e,target){this._category=target.dataset.category||'';this._twDeal=true;this.render();},
  filterStat:function(_e,target){this._statFilter=this._statFilter===target.dataset.stat?'':target.dataset.stat;this._twDeal=true;this.render();},
  clearDifficult:guard(function(){requireOwner(this.actor);return this.actor.update({'system.nextDifficult':false});}),
  setFear:guard(function(_e,target){requireOwner(this.actor);return this.actor.update({'system.fear':target.dataset.state});}),
  rollStat:guard(function(_e,target){return rollActor(this.actor,target.dataset.stat);}),
  rollMove:guard(function(_e,target){pressRoll(target);const move=target.dataset.itemId?this.actor.items.get(target.dataset.itemId):moveByKey(target.dataset.key);return rollActor(this.actor,move.system.stat,{move});}),
  editItem:guard(function(_e,target){return this.actor.items.get(target.dataset.itemId)?.sheet.render(true);}),
  deleteItem:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item&&await confirm('Remove item',`Remove ${item.name} from this actor?`))await item.delete();}),
  quantity:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.quantity':Math.max(0,item.system.quantity+Number(target.dataset.delta))});}),
  nudge:guard(async function(_e,target){requireOwner(this.actor);
   const path=target.dataset.path,min=target.dataset.min===undefined?null:Number(target.dataset.min);
   const current=Number(foundry.utils.getProperty(this.actor,path)||0)+Number(target.dataset.delta);
   await this.actor.update({[path]:min===null?current:Math.max(min,current)});}),
  // Click a box or notch to set the tracker to that point; the current top one steps back by one.
  setConsciousness:guard(async function(_e,target){requireOwner(this.actor);
   const path=this.actor.system.shift?.active?'system.consciousness.titanLoss':'system.consciousness.loss';
   await this.actor.update({[path]:Number(foundry.utils.getProperty(this.actor,path)||0)+(this.actor.tw.value-Number(target.dataset.to))});}),
  setPath:guard(async function(_e,target){requireOwner(this.actor);await this.actor.update({[target.dataset.path]:Math.max(0,Number(target.dataset.value)||0)});}),
  // Kit objects: take one out (its motion plays before the update), put one back, or restock.
  kitSpend:guard(async function(_e,target){requireOwner(this.actor);
   const item=this.actor.items.get(target.dataset.itemId);if(!item||item.system.quantity<1)return;
   if(!target.dataset.played)await kitMotion(this,target,'spend');
   await item.update({'system.quantity':item.system.quantity-1});
   if(kitObject(item)==='flare')await postCard(this.actor,flareCard({actorName:this.actor.name,actorImg:this.actor.img,name:item.name,colour:flareColour(item)}),'flare');}),
  kitRestore:guard(async function(_e,target){requireOwner(this.actor);
   const item=this.actor.items.get(target.dataset.itemId);if(!item)return;
   queueImpact(this.actor.id,{kind:'restock',itemId:item.id,from:item.system.quantity});
   await item.update({'system.quantity':item.system.quantity+1});}),
  kitRefill:guard(async function(_e,target){requireOwner(this.actor);
   const item=this.actor.items.get(target.dataset.itemId);if(!item||item.system.capacity<=item.system.quantity)return;
   queueImpact(this.actor.id,{kind:'restock',itemId:item.id,from:item.system.quantity});
   await item.update({'system.quantity':item.system.capacity});}),
  kitResupply:guard(async function(){requireOwner(this.actor);
   const updates=this.actor.items.filter(i=>i.type==='gear'&&i.system.equipped&&kitObject(i)&&i.system.capacity>i.system.quantity).map(i=>({_id:i.id,'system.quantity':i.system.capacity}));
   if(!updates.length)return;
   queueImpact(this.actor.id,{kind:'unpack'});
   await this.actor.updateEmbeddedDocuments('Item',updates);}),
  toggleEquipped:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.equipped':!item.system.equipped});}),
  toggleHealed:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.healed':!item.system.healed});}),
  createCharacter:guard(function(){return createCharacter(this.actor);}),
  equipLoadout:guard(async function(){if(await equipLoadout(this.actor))unpacked(this);}),
  useLoadout:guard(async function(_e,target){if(await equipLoadout(this.actor,this.actor.items.get(target.dataset.itemId)))unpacked(this);}),
  advance:guard(function(){return advance(this.actor);}),
  // A growth mark: an open one records a GM-awarded advance, an inked one strikes it back out.
  markAdvance:guard(async function(_e,target){requireOwner(this.actor);
   const key=target.dataset.stat,label=STATS[key],base=Number(this.actor.system.stats?.[key]??0);if(!label)return;
   const sg=n=>n>0?`+${n}`:n<0?`−${-n}`:'0';
   if(this.actor.system.advanced?.[key]){
    if(await confirm('Strike out advancement',`Strike out the ${label} advancement? Base ${label} returns from ${sg(base)} to ${sg(Math.max(-3,base-1))}.`))
     await this.actor.update({[`system.stats.${key}`]:Math.max(-3,base-1),[`system.advanced.${key}`]:false});
    return;
   }
   if(base>=3)throw new Error(`${label} is already at +3.`);
   if(await confirm('GM-awarded advancement',`Advance ${label} from ${sg(base)} to ${sg(base+1)}? Each statistic can be advanced once, when the GM awards it.`))
    await this.actor.update({[`system.stats.${key}`]:base+1,[`system.advanced.${key}`]:true});}),
  addWound:guard(function(){return addWound(this.actor);}),
  treatWound:guard(function(_e,target){return treatWound(this.actor,target.dataset.itemId);}),
  shift:guard(function(){return toggleShift(this.actor);}),
  catchBreath:guard(function(){requireOwner(this.actor);return this.actor.update({'system.fatigue':0});}),
  createParty:guard(createParty),resetMission:guard(resetMission),
  openActor:guard(function(_e,target){return game.actors.get(target.dataset.actorId)?.sheet.render(true);}),
  openParty:guard(function(){const p=getParty();if(p)return p.sheet.render(true);if(game.user.isGM)return createParty();ui.notifications.warn('Ask your GM to create a Party actor.');}),
  openRules:guard(async function(){const p=game.packs.get(ID+'.rules');const idx=await p.getIndex();const e=idx.find(i=>i.name.startsWith('Start here:'));const doc=await p.getDocument(e._id);doc.sheet.render(true);}),
  openCompendium:guard(function(_e,target){game.packs.get(ID+'.'+target.dataset.pack)?.render(true);}),
  editPortrait:guard(async function(){requireOwner(this.actor);new foundry.applications.apps.FilePicker.implementation({type:'image',current:this.actor.img,callback:path=>this.actor.update({img:path})}).render(true);})
 }};
 static PARTS={sheet:{template:`systems/${ID}/templates/actor.hbs`,scrollable:['.sheet-body']}};
 async _prepareContext(options) {
  await foundry.applications.handlebars.loadTemplates(PARTIALS.map(name=>`systems/${ID}/templates/dossier-${name}.hbs`));
  const context=await super._prepareContext(options),actor=this.actor,system=actor.system,d=actor.tw;
  const isParty=actor.type==='party',isTitan=actor.type==='titan';
  const definitions=TABS[isTitan?'titan':'soldier'];
  const fallback=definitions[0][0];
  const tab=definitions.some(([key])=>key===this._twTab)?this._twTab:fallback;
  // A Party sheet reads its own pool, even when another Party actor is the active one.
  const party=isParty?actor:getParty(),items=actor.items.contents.map(i=>({...i.toObject(),id:i.id}));
  const shifted=!!system.shift?.active;
  const stackWounds=game.settings.get(ID,'stackWounds');
  const catalogue=CONTENT.moves;
  const statRows=statCards(system,items,d,{stackWounds});
  const warnings=[];
  if(d.deathReview)warnings.push({icon:'skull',tone:'grave',text:'Death threshold reached. GM review required before this character acts again.'});
  if(!d.mindless&&d.value<=0&&!system.dead)warnings.push({icon:'moon',tone:'grave',text:'Unconscious. Rolls need GM permission.'});
  if(d.combatDifficult)warnings.push({icon:'combat',tone:'warn',text:'Below half consciousness: every combat roll is difficult.'});
  if(d.restBlocked)warnings.push({icon:'bandage',tone:'warn',text:'Rest automatically fails while a major or untreated crippling wound stands.'});
  if(system.nextDifficult)warnings.push({icon:'stamp',tone:'warn',text:'The next roll is marked difficult.'});
  if(!isTitan&&system.fear==='frozen')warnings.push({icon:'skull',tone:'grave',text:'Frozen in fear. You cannot act until a comrade rolls + Duty to snap you out of it.'});
  if(!isTitan&&system.fear==='shaken')warnings.push({icon:'wind',tone:'warn',text:'Shaken. Roll + Heart at every Titan sighting until you make a 10+.'});
  const biteCall=biteTrack(system,d);
  if(biteCall.bites>0)warnings.push({icon:'drop',tone:biteCall.severity==='crippling'?'grave':biteCall.severity==='major'?'warn':'ok',text:biteCall.bites+' Titan bite'+(biteCall.bites===1?'':'s')+' recorded — '+biteCall.label.toLowerCase()+'. '+biteCall.hint});
  if(shifted&&system.shift.absorption>0)warnings.push({icon:'clock',tone:'warn',text:`Absorption penalty −${system.shift.absorption} on resistance rolls.`});
  const figure={titan:d.titan,dead:!!system.dead,coma:!d.mindless&&!isParty&&d.max<=0,
   bites:d.titan&&system.bites?biteCall:null,
   armour:d.titan&&items.some(i=>i.type==='power'&&i.system.equipped&&i.system.key==='armoured-titan')?{intact:!!system.shift?.armourIntact}:null};
  // A Titan's flesh closes by itself: minor wounds in seconds, major ones in minutes, the rest at the GM's word.
  const regrowing=isTitan?items.filter(i=>i.type==='wound'&&!i.system.healed&&i.system.formScope==='titan'):[];
  const titanRail=isTitan?{steam:regrowing.length,armour:figure.armour,nape:system.dead?'severed':'intact',
   regen:Object.entries({minor:'in seconds',major:'in minutes',crippling:'at GM ruling'}).map(([key,pace])=>({key,pace,label:SEVERITY_LABEL[key],count:regrowing.filter(w=>w.system.severity===key).length})).filter(r=>r.count)}:null;
  const roster=isParty?game.actors.filter(a=>a.type==='soldier'&&a.testUserPermission(game.user,'OBSERVER')).map(a=>unitCard({id:a.id,name:a.name,img:a.img,system:a.system,items:a.items,d:a.tw})):[];
  return {...context,actor,system,d,editable:this.isEditable,isGM:game.user.isGM,isParty,isTitan,
   sprite:SPRITE+KIT_SPRITE,
   tabs:definitions.map(([key,label,icon],index)=>({key,label,icon,index:String(index+1).padStart(2,'0'),active:key===tab})),
   record:tab==='record',actions:tab==='actions',equipment:tab==='equipment',injuries:tab==='injuries',powers:tab==='powers',background:tab==='background',
   stats:statRows,anyModifier:statRows.some(row=>row.anyReason),
   ledger:injuryLedger(items,d.titan,stackWounds),
   figure:isParty?'':bodyFigure(items,{...figure,uid:`tw-fig-${this.id}`}),
   miniFigure:isParty?'':bodyFigure(items,{...figure,uid:`tw-mini-${this.id}`,mini:true}),
   kit:fieldKitLayout(items),serial:actor.id?.slice(-8).toUpperCase(),
   portraitAvailable:actor.img&&!actor.img.includes('mystery-man')&&!actor.img.includes('assets/crest.svg'),
   luckPips:Array.from({length:Math.max(0,Math.min(14,party?.system.luck.max??0))},(_,i)=>{
    const value=party?.system.luck.value??0,n=i+1;
    return {filled:i<value,to:n===value?n-1:n,label:n===value?`Spend down to ${n-1}`:`Set the pool to ${n}`};
   }),
   yearTally:tally(system.shift?.yearsRemaining??13),
   gear:items.filter(i=>i.type==='gear').map(gearRow),
   loadouts:items.filter(i=>i.type==='loadout').map(requisitionSlip),wounds:items.filter(i=>i.type==='wound'),
   ownedPowers:items.filter(i=>i.type==='power').map(powerCard),shiftPlate:shiftPlate(system,items),
   ownedMoves:items.filter(i=>i.type==='move').map(i=>actionRow(i,d,{owned:true})),
   quickActions:QUICK.map(([key,icon,alias,primary])=>{const move=moveByKey(key);return move?actionRow(move,d,{icon,alias,primary}):null;}).filter(Boolean),
   actionCategories:actionCategories(catalogue,this._category??''),
   actionStats:actionStats(catalogue,d,this._statFilter??''),
   actionGroups:actionGroups(catalogue,d,{category:this._category??'',stat:this._statFilter??''}),
   actionCount:catalogue.length,
   growth:growthRecord(system,{settable:this.isEditable&&!isTitan&&!isParty}),
   party:party?{id:party.id,name:party.name,value:party.system.luck.value,max:party.system.luck.max}:null,
   roster,squad:{count:roster.length,fallen:roster.filter(u=>u.dead).length,down:roster.filter(u=>!u.dead&&u.value<=0).length},
   figureFlags:{dead:figure.dead,coma:figure.coma&&!figure.dead},titanRail,
   lossPath:shifted?'system.consciousness.titanLoss':'system.consciousness.loss',loss:shifted?system.consciousness.titanLoss:system.consciousness.loss,
   maxPath:shifted?'system.consciousness.titanMaxAdjustment':'system.consciousness.maxAdjustment',maxAdjustment:shifted?system.consciousness.titanMaxAdjustment:system.consciousness.maxAdjustment,
   formula:consciousnessFormula(system,d,shifted),warnings,
   track:consciousnessTrack(system,d,shifted),
   reach:reachRuler(system,d),
   bites:biteTrack(system,d),
   fatigueNotches:notches(system.fatigue),
   fear:{...FEAR[system.fear??'steady'],states:Object.values(FEAR).map(f=>({...f,on:f.key===(system.fear??'steady')}))},
   critical:!d.mindless&&d.max>0&&d.value<=Math.ceil(d.max/3),
   statusTone:system.dead?'grave':d.mindless?'ok':d.value<=0?'grave':d.combatDifficult?'warn':'ok',
   severityLabels:SEVERITY_LABEL,injuryLabels:INJURY_LABEL,regionLabels:REGIONS};
 }
 async _renderHTML(context,options){
  const el=this.element,active=el?.contains(document.activeElement)?document.activeElement:null;
  this._viewState={scroll:el?.querySelector('.sheet-body')?.scrollTop??0,details:[...(el?.querySelectorAll('details')??[])].map(d=>d.open),focus:active?.name?{name:active.name,value:active.value,dirty:active.matches('input:not([type=checkbox]),textarea')&&active.value!==active.defaultValue,start:active.selectionStart,end:active.selectionEnd}:null};
  return super._renderHTML(context,options);
 }
 async _onRender(context,options){
  await super._onRender(context,options);
  const el=this.element,state=this._viewState,body=el.querySelector('.sheet-body');
  if(body)body.scrollTop=this._tabChanged?0:state?.scroll??0;
  if(!this._tabChanged){el.querySelectorAll('details').forEach((d,i)=>d.open=state?.details[i]??false);const focused=state?.focus;if(focused){const input=[...el.querySelectorAll('[name]')].find(e=>e.name===focused.name);if(input&&!input.disabled){if(focused.dirty&&input.type!=='checkbox')input.value=focused.value;input.focus({preventScroll:true});if(focused.start!==null&&input.setSelectionRange&&['text','search','textarea',''].includes(input.type))input.setSelectionRange(focused.start,focused.end);}}}
  wireActions(this,el);
  wireSheet(this,el,{tabChanged:this._tabChanged});
  this._tabChanged=false;
 }
 async _onDragStart(event){const row=event.target.closest('[data-item-id]');if(!row)return super._onDragStart(event);const item=this.actor.items.get(row.dataset.itemId);if(item)event.dataTransfer.setData('text/plain',JSON.stringify(item.toDragData()));}
}
export function refreshPartyDisplays() {
 for(const app of TitanActorSheet.instances())if(app.rendered)app.render(false);
}
for(const hook of ['createActor','updateActor','deleteActor'])Hooks.on(hook,actor=>{if(actor.type==='party')refreshPartyDisplays();});
// A wound landing, a death or a transformation plays once on every open sheet of that actor.
Hooks.on('createItem',item=>{if(item.type==='wound'&&item.parent?.documentName==='Actor')queueImpact(item.parent.id,{kind:'wound',severity:item.system.severity,region:item.system.region,injuryType:item.system.injuryType});});
Hooks.on('updateActor',(actor,changes,_options,userId)=>{
 if(foundry.utils.getProperty(changes,'system.dead')===true) {
  queueImpact(actor.id,{kind:'death'});
  // Only the client that made the change posts the card, so the table sees it once.
  if(userId===game.user.id)postCard(actor,deathCard({actorName:actor.name,actorImg:actor.img}),'death');
 }
 if(foundry.utils.getProperty(changes,'system.shift.active')===true)queueImpact(actor.id,{kind:'shift'});
 if(foundry.utils.getProperty(changes,'system.shift.armourIntact')===false)queueImpact(actor.id,{kind:'armour'});
});
Hooks.on('updateItem',(item,changes)=>{
 if(item.type!=='wound'||item.parent?.documentName!=='Actor')return;
 const at={region:item.system.region,titan:item.system.formScope==='titan',itemId:item.id,severity:item.system.severity};
 if(foundry.utils.getProperty(changes,'system.healed')===true)queueImpact(item.parent.id,{kind:'heal',...at});
 else if(foundry.utils.getProperty(changes,'system.treated')===true)queueImpact(item.parent.id,{kind:'treat',...at});
});
export class TitanItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw','tw-item'],position:{width:560,height:640},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{
  roll:guard(function(){if(!this.item.actor)throw new Error('Drag this action onto an actor to roll it.');return rollActor(this.item.actor,this.item.system.stat,{move:this.item});}),
  nudge:guard(async function(_e,target){const path=target.dataset.path,min=target.dataset.min===undefined?null:Number(target.dataset.min);
   const current=Number(foundry.utils.getProperty(this.item,path)||0)+Number(target.dataset.delta);
   await this.item.update({[path]:min===null?current:Math.max(min,current)});}),
  editImage:guard(async function(){new foundry.applications.apps.FilePicker.implementation({type:'image',current:this.item.img,callback:path=>this.item.update({img:path})}).render(true);})
 }};
 static PARTS={sheet:{template:`systems/${ID}/templates/item.hbs`,scrollable:['.sheet-body']}};
 async _prepareContext(options){
  await foundry.applications.handlebars.loadTemplates([`systems/${ID}/templates/dossier-kit-slots.hbs`]);
  const context=await super._prepareContext(options),item=this.item,system=item.system;
  const plain={...item.toObject(),id:item.id};
  const kinds={gear:'Equipment',move:'Field action',power:'Titan power',wound:'Injury',loadout:'Loadout',advancement:'Advancement'};
  return {...context,item,system,editable:this.isEditable,sprite:SPRITE+KIT_SPRITE,
   kitChoices:{'':'Automatic',none:'Not a consumable',...Object.fromEntries(Object.entries(KIT).map(([key,def])=>[key,def.label]))},
   kitPreview:item.type==='gear'?kitContainer(plain):null,
   slip:item.type==='loadout'?requisitionSlip(plain):null,serial:item.id?.slice(-6).toUpperCase(),
   kindIcon:{gear:'gear',move:'dice',power:'shifting',wound:'drop',loadout:'pack',advancement:'arrowUp'}[item.type]??'wings',
   woundFigure:item.type==='wound'?bodyFigure([plain],{mini:true,uid:`tw-item-${item.id}`,titan:system.formScope==='titan'}):'',
   kind:kinds[item.type]??item.type,
   stats:STATS,regions:REGIONS,
   isMove:item.type==='move',isWound:item.type==='wound',isGear:item.type==='gear',isPower:item.type==='power',isLoadout:item.type==='loadout',
   hasChecks:['move','gear','power','wound'].includes(item.type),
   statLabel:STATS[system.stat],
   description:await foundry.applications.ux.TextEditor.enrichHTML(system.description,{async:true,secrets:this.isEditable}),
   severity:SEVERITY_LABEL,injuryTypes:{...INJURY_LABEL,piercing:'Piercing / ballistic'},
   formScopes:{human:'Human body',titan:'Titan body'},bonusStats:{'':'None',...STATS}};
 }
}
