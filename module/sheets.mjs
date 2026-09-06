import {STATS,REGIONS} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,guard,confirm,requireOwner,requireGM} from './ui.mjs';
import {rollActor,moveByKey,getParty} from './rolls.mjs';
import {createCharacter,equipLoadout,advance,addWound,treatWound,toggleShift,createParty,resetMission} from './actions.mjs';
import {conditionRegions,fieldKit,STAT_DESCRIPTIONS} from './dossier.mjs';
const {HandlebarsApplicationMixin}=foundry.applications.api;
const {ActorSheetV2,ItemSheetV2}=foundry.applications.sheets;
export class TitanActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw','tw-actor'],position:{width:980,height:820},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{
  twTab:function(_e,target){this._tabChanged=this._twTab!==target.dataset.tab;this._twTab=target.dataset.tab;this.render();},
  rollStat:guard(function(_e,target){return rollActor(this.actor,target.dataset.stat);}),
  rollMove:guard(function(_e,target){const move=target.dataset.itemId?this.actor.items.get(target.dataset.itemId):moveByKey(target.dataset.key);return rollActor(this.actor,move.system.stat,{move});}),
  editItem:guard(function(_e,target){return this.actor.items.get(target.dataset.itemId)?.sheet.render(true);}),
  deleteItem:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item&&await confirm('Remove item',`Remove ${item.name} from this actor?`))await item.delete();}),
  quantity:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.quantity':Math.max(0,item.system.quantity+Number(target.dataset.delta))});}),
  toggleEquipped:guard(async function(_e,target){requireOwner(this.actor);const item=this.actor.items.get(target.dataset.itemId);if(item)await item.update({'system.equipped':!item.system.equipped});}),
  createCharacter:guard(function(){return createCharacter(this.actor);}),equipLoadout:guard(function(){return equipLoadout(this.actor);}),
  useLoadout:guard(function(_e,target){return equipLoadout(this.actor,this.actor.items.get(target.dataset.itemId));}),
  advance:guard(function(){return advance(this.actor);}),addWound:guard(function(){return addWound(this.actor);}),
  treatWound:guard(function(_e,target){return treatWound(this.actor,target.dataset.itemId);}),
  shift:guard(function(){return toggleShift(this.actor);}),
  catchBreath:guard(function(){requireOwner(this.actor);return this.actor.update({'system.fatigue':0});}),
  createParty:guard(createParty),resetMission:guard(resetMission),
  openParty:guard(function(){const p=getParty();if(p)return p.sheet.render(true);if(game.user.isGM)return createParty();ui.notifications.warn('Ask your GM to create a Party actor.');}),
  openRules:guard(async function(){const p=game.packs.get(ID+'.rules');const idx=await p.getIndex();const e=idx.find(i=>i.name.startsWith('Start here:'));const doc=await p.getDocument(e._id);doc.sheet.render(true);}),
  openCompendium:guard(function(_e,target){game.packs.get(ID+'.'+target.dataset.pack)?.render(true);}),
  editPortrait:guard(async function(){requireOwner(this.actor);new foundry.applications.apps.FilePicker.implementation({type:'image',current:this.actor.img,callback:path=>this.actor.update({img:path})}).render(true);})
 }};
 static PARTS={sheet:{template:`systems/${ID}/templates/actor.hbs`,scrollable:['.sheet-body']}};
 async _prepareContext(options) {
  await foundry.applications.handlebars.loadTemplates([`systems/${ID}/templates/dossier-header.hbs`,`systems/${ID}/templates/dossier-overview.hbs`]);
  const context=await super._prepareContext(options),actor=this.actor,system=actor.system,d=actor.tw;
  const tab=this._twTab??'record',party=getParty();
  const moves=CONTENT.moves.filter(m=>this._category?m.system.category===this._category:true);
  const groups=[...new Set(moves.map(m=>m.system.category))].map(name=>({name,moves:moves.filter(m=>m.system.category===name)}));
  const items=actor.items.contents.map(i=>({...i.toObject(),id:i.id}));
  return {...context,actor,system,d,editable:this.isEditable,isGM:game.user.isGM,isParty:actor.type==='party',
   tabs:['record','injuries','equipment','actions','background','powers'].map((key,index)=>({key,index:String(index+1).padStart(2,'0'),label:{record:'Overview',actions:'Actions',equipment:'Gear',injuries:'Wounds',powers:'Shifter',background:'Record'}[key],active:key===tab})),
   record:tab==='record',actions:tab==='actions',equipment:tab==='equipment',injuries:tab==='injuries',powers:tab==='powers',background:tab==='background',
   stats:Object.entries(STATS).map(([key,label])=>({key,label,description:STAT_DESCRIPTIONS[key],value:system.stats[key],effective:d.stats[key],modified:d.stats[key]!==system.stats[key],display:d.stats[key]>0?'+'+d.stats[key]:d.stats[key],advanced:system.advanced[key]})),
   regions:conditionRegions(items,d.titan),kit:fieldKit(items),serial:actor.id?.slice(-8).toUpperCase(),
   portraitAvailable:actor.img&&!actor.img.includes('mystery-man')&&!actor.img.includes('assets/crest.svg'),
   luckPips:Array.from({length:Math.max(0,Math.min(12,party?.system.luck.max??0))},(_,i)=>({filled:i<(party?.system.luck.value??0)})),
   gear:items.filter(i=>i.type==='gear'),loadouts:items.filter(i=>i.type==='loadout'),wounds:items.filter(i=>i.type==='wound'),ownedPowers:items.filter(i=>i.type==='power'),ownedMoves:items.filter(i=>i.type==='move'),
   quickMoves:['reposition-before-regeneration','line-up-a-nape-strike','strike-the-nape','evade-a-titan-s-grasp','rally-a-comrade','first-aid'].map(k=>moveByKey(k)).filter(Boolean),groups,
   party:party?{name:party.name,value:party.system.luck.value,max:party.system.luck.max}:null,
   lossPath:system.shift.active?'system.consciousness.titanLoss':'system.consciousness.loss',loss:system.shift.active?system.consciousness.titanLoss:system.consciousness.loss,
   maxPath:system.shift.active?'system.consciousness.titanMaxAdjustment':'system.consciousness.maxAdjustment',maxAdjustment:system.shift.active?system.consciousness.titanMaxAdjustment:system.consciousness.maxAdjustment,
   meter:Array.from({length:Math.max(0,Math.min(20,d.max))},(_,i)=>({empty:i>=d.value}))};
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
  const filter=()=>{const term=(this._search??'').toLowerCase();el.querySelectorAll('[data-move-name]').forEach(row=>row.hidden=!row.dataset.moveName.toLowerCase().includes(term));};
  if(search){search.value=this._search??'';search.addEventListener('input',event=>{this._search=event.target.value;filter();});filter();}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(this._tabChanged&&!reduced)body?.animate([{opacity:.5,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:160,easing:'ease-out'});
  const values=new Map();el.querySelectorAll('[data-live]').forEach(node=>{const key=node.dataset.live,value=node.textContent.trim();values.set(key,value);if(!this._tabChanged&&!reduced&&this._liveValues?.has(key)&&this._liveValues.get(key)!==value)node.animate([{backgroundColor:'#b9924a55'},{backgroundColor:'transparent'}],{duration:450});});
  this._liveValues=values;this._tabChanged=false;
 }
 async _onDragStart(event){const row=event.target.closest('[data-item-id]');if(!row)return super._onDragStart(event);const item=this.actor.items.get(row.dataset.itemId);if(item)event.dataTransfer.setData('text/plain',JSON.stringify(item.toDragData()));}
}
export function refreshPartyDisplays() {
 for(const app of TitanActorSheet.instances())if(app.rendered)app.render(false);
}
for(const hook of ['createActor','updateActor','deleteActor'])Hooks.on(hook,actor=>{if(actor.type==='party')refreshPartyDisplays();});
export class TitanItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw','tw-item'],position:{width:680,height:720},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{roll:guard(function(){if(!this.item.actor)throw new Error('Drag this action onto an actor to roll it.');return rollActor(this.item.actor,this.item.system.stat,{move:this.item});})}};
 static PARTS={sheet:{template:`systems/${ID}/templates/item.hbs`}};
 async _prepareContext(options){const context=await super._prepareContext(options),item=this.item;return {...context,item,system:item.system,editable:this.isEditable,stats:STATS,regions:REGIONS,isMove:item.type==='move',isWound:item.type==='wound',isGear:item.type==='gear',isPower:item.type==='power',description:await foundry.applications.ux.TextEditor.enrichHTML(item.system.description,{async:true,secrets:this.isEditable}),severity:{minor:'Minor',major:'Major',crippling:'Crippling'},injuryTypes:{blunt:'Blunt',cutting:'Cutting',piercing:'Piercing / ballistic',burn:'Burn'},formScopes:{human:'Human body',titan:'Titan body'},bonusStats:{'':'None',...STATS}};}
}
