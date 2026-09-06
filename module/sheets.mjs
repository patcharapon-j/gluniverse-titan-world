import {STATS,REGIONS} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,guard,confirm,requireOwner,requireGM} from './ui.mjs';
import {rollActor,moveByKey,getParty} from './rolls.mjs';
import {createCharacter,equipLoadout,advance,addWound,treatWound,toggleShift,createParty,resetMission} from './actions.mjs';
import {injuryLedger,fieldKit,actionGroups,actionCategories,actionStats,actionRow,gearRow,
 consciousnessFormula,consciousnessTrack,statCards,FEAR,
 STAT_DESCRIPTIONS,SEVERITY_LABEL,INJURY_LABEL} from './dossier.mjs';
import {SPRITE} from './icons.mjs';
const {HandlebarsApplicationMixin}=foundry.applications.api;
const {ActorSheetV2,ItemSheetV2}=foundry.applications.sheets;
const PARTIALS=['header','overview','actions','wounds','gear','shifter','record','party'];
const TABS={
 soldier:[['record','Overview','shield'],['actions','Actions','combat'],['injuries','Wounds','drop'],['equipment','Gear','pack'],['powers','Shifter','shifting'],['background','Record','note']],
 titan:[['record','Overview','hunting'],['injuries','Wounds','drop'],['background','Record','note']]
};
// The rolls a soldier reaches for first. Sighting a Titan leads, because it interrupts everything else.
const QUICK=[
 ['face-fear','eye','Titan sighted',true],
 ['line-up-a-nape-strike','target'],['strike-the-nape','blade'],['evade-a-titan-s-grasp','agility'],
 ['rally-a-comrade','flag'],['first-aid','recovery']
];
export class TitanActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw','tw-actor'],position:{width:980,height:840},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{
  twTab:function(_e,target){this._tabChanged=this._twTab!==target.dataset.tab;this._twTab=target.dataset.tab;this.render();},
  filterCategory:function(_e,target){this._category=target.dataset.category||'';this.render();},
  filterStat:function(_e,target){this._statFilter=this._statFilter===target.dataset.stat?'':target.dataset.stat;this.render();},
  clearDifficult:guard(function(){requireOwner(this.actor);return this.actor.update({'system.nextDifficult':false});}),
  setFear:guard(function(_e,target){requireOwner(this.actor);return this.actor.update({'system.fear':target.dataset.state});}),
  rollStat:guard(function(_e,target){return rollActor(this.actor,target.dataset.stat);}),
  rollMove:guard(function(_e,target){const move=target.dataset.itemId?this.actor.items.get(target.dataset.itemId):moveByKey(target.dataset.key);return rollActor(this.actor,move.system.stat,{move});}),
  editItem:guard(function(_e,target){return this.actor.items.get(target.dataset.itemId)?.sheet.render(true);}),
  deleteItem:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item&&await confirm('Remove item',`Remove ${item.name} from this actor?`))await item.delete();}),
  quantity:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.quantity':Math.max(0,item.system.quantity+Number(target.dataset.delta))});}),
  nudge:guard(async function(_e,target){requireOwner(this.actor);
   const path=target.dataset.path,min=target.dataset.min===undefined?null:Number(target.dataset.min);
   const current=Number(foundry.utils.getProperty(this.actor,path)||0)+Number(target.dataset.delta);
   await this.actor.update({[path]:min===null?current:Math.max(min,current)});}),
  toggleEquipped:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.equipped':!item.system.equipped});}),
  toggleHealed:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.healed':!item.system.healed});}),
  createCharacter:guard(function(){return createCharacter(this.actor);}),equipLoadout:guard(function(){return equipLoadout(this.actor);}),
  useLoadout:guard(function(_e,target){return equipLoadout(this.actor,this.actor.items.get(target.dataset.itemId));}),
  advance:guard(function(){return advance(this.actor);}),addWound:guard(function(){return addWound(this.actor);}),
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
  const party=getParty(),items=actor.items.contents.map(i=>({...i.toObject(),id:i.id}));
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
  if(shifted&&system.shift.absorption>0)warnings.push({icon:'clock',tone:'warn',text:`Absorption penalty −${system.shift.absorption} on resistance rolls.`});
  return {...context,actor,system,d,editable:this.isEditable,isGM:game.user.isGM,isParty,isTitan,
   sprite:SPRITE,
   tabs:definitions.map(([key,label,icon],index)=>({key,label,icon,index:String(index+1).padStart(2,'0'),active:key===tab})),
   record:tab==='record',actions:tab==='actions',equipment:tab==='equipment',injuries:tab==='injuries',powers:tab==='powers',background:tab==='background',
   stats:statRows,anyModifier:statRows.some(row=>row.anyReason),
   ledger:injuryLedger(items,d.titan,stackWounds),
   kit:fieldKit(items),serial:actor.id?.slice(-8).toUpperCase(),
   portraitAvailable:actor.img&&!actor.img.includes('mystery-man')&&!actor.img.includes('assets/crest.svg'),
   luckPips:Array.from({length:Math.max(0,Math.min(14,party?.system.luck.max??0))},(_,i)=>({filled:i<(party?.system.luck.value??0)})),
   gear:items.filter(i=>i.type==='gear').map(gearRow),
   loadouts:items.filter(i=>i.type==='loadout'),wounds:items.filter(i=>i.type==='wound'),
   ownedPowers:items.filter(i=>i.type==='power'),
   ownedMoves:items.filter(i=>i.type==='move').map(i=>actionRow(i,d,{owned:true})),
   quickActions:QUICK.map(([key,icon,alias,primary])=>{const move=moveByKey(key);return move?actionRow(move,d,{icon,alias,primary}):null;}).filter(Boolean),
   actionCategories:actionCategories(catalogue,this._category??''),
   actionStats:actionStats(catalogue,d,this._statFilter??''),
   actionGroups:actionGroups(catalogue,d,{category:this._category??'',stat:this._statFilter??''}),
   actionCount:catalogue.length,
   party:party?{id:party.id,name:party.name,value:party.system.luck.value,max:party.system.luck.max}:null,
   roster:isParty?game.actors.filter(a=>a.type==='soldier'&&a.testUserPermission(game.user,'OBSERVER')).map(a=>({
    id:a.id,name:a.name,img:a.img,value:a.tw.value,max:a.tw.max,status:a.tw.status,
    tone:a.system.dead?'grave':a.tw.value<=0?'grave':a.tw.value<Math.ceil(a.tw.max/2)?'warn':'ok'})):[],
   lossPath:shifted?'system.consciousness.titanLoss':'system.consciousness.loss',loss:shifted?system.consciousness.titanLoss:system.consciousness.loss,
   maxPath:shifted?'system.consciousness.titanMaxAdjustment':'system.consciousness.maxAdjustment',maxAdjustment:shifted?system.consciousness.titanMaxAdjustment:system.consciousness.maxAdjustment,
   formula:consciousnessFormula(system,d,shifted),warnings,
   track:consciousnessTrack(system,d,shifted),
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
  const search=el.querySelector('[data-move-search]');
  const filter=()=>{
   const term=(this._search??'').toLowerCase();
   el.querySelectorAll('[data-move-name]').forEach(row=>row.hidden=!row.dataset.moveName.toLowerCase().includes(term));
   for(const selector of ['[data-move-cluster]','[data-move-group]'])el.querySelectorAll(selector).forEach(group=>{
    const rows=[...group.querySelectorAll('[data-move-name]')];
    group.hidden=rows.length>0&&rows.every(row=>row.hidden);
   });
   const empty=el.querySelector('[data-move-empty]');
   if(empty)empty.hidden=[...el.querySelectorAll('[data-move-name]')].some(row=>!row.hidden);
  };
  if(search){search.value=this._search??'';search.addEventListener('input',event=>{this._search=event.target.value;filter();});filter();}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(this._tabChanged&&!reduced)body?.animate([{opacity:.4,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
  const values=new Map();el.querySelectorAll('[data-live]').forEach(node=>{const key=node.dataset.live,value=node.textContent.trim();values.set(key,value);if(!this._tabChanged&&!reduced&&this._liveValues?.has(key)&&this._liveValues.get(key)!==value)node.animate([{backgroundColor:'#b9924a66'},{backgroundColor:'transparent'}],{duration:520});});
  this._liveValues=values;this._tabChanged=false;
 }
 async _onDragStart(event){const row=event.target.closest('[data-item-id]');if(!row)return super._onDragStart(event);const item=this.actor.items.get(row.dataset.itemId);if(item)event.dataTransfer.setData('text/plain',JSON.stringify(item.toDragData()));}
}
export function refreshPartyDisplays() {
 for(const app of TitanActorSheet.instances())if(app.rendered)app.render(false);
}
for(const hook of ['createActor','updateActor','deleteActor'])Hooks.on(hook,actor=>{if(actor.type==='party')refreshPartyDisplays();});
export class TitanItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw','tw-item'],position:{width:660,height:740},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{
  roll:guard(function(){if(!this.item.actor)throw new Error('Drag this action onto an actor to roll it.');return rollActor(this.item.actor,this.item.system.stat,{move:this.item});}),
  nudge:guard(async function(_e,target){const path=target.dataset.path,min=target.dataset.min===undefined?null:Number(target.dataset.min);
   const current=Number(foundry.utils.getProperty(this.item,path)||0)+Number(target.dataset.delta);
   await this.item.update({[path]:min===null?current:Math.max(min,current)});}),
  editImage:guard(async function(){new foundry.applications.apps.FilePicker.implementation({type:'image',current:this.item.img,callback:path=>this.item.update({img:path})}).render(true);})
 }};
 static PARTS={sheet:{template:`systems/${ID}/templates/item.hbs`,scrollable:['.sheet-body']}};
 async _prepareContext(options){
  const context=await super._prepareContext(options),item=this.item,system=item.system;
  const kinds={gear:'Equipment',move:'Field action',power:'Titan power',wound:'Injury',loadout:'Loadout',advancement:'Advancement'};
  return {...context,item,system,editable:this.isEditable,sprite:SPRITE,
   kind:kinds[item.type]??item.type,
   stats:STATS,regions:REGIONS,
   isMove:item.type==='move',isWound:item.type==='wound',isGear:item.type==='gear',isPower:item.type==='power',
   statLabel:STATS[system.stat],
   description:await foundry.applications.ux.TextEditor.enrichHTML(system.description,{async:true,secrets:this.isEditable}),
   severity:SEVERITY_LABEL,injuryTypes:{...INJURY_LABEL,piercing:'Piercing / ballistic'},
   formScopes:{human:'Human body',titan:'Titan body'},bonusStats:{'':'None',...STATS}};
 }
}
