import {STATS,REGIONS} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,guard,confirm,requireOwner,requireGM} from './ui.mjs';
import {rollActor,moveByKey,getParty} from './rolls.mjs';
import {createCharacter,equipLoadout,advance,addWound,treatWound,toggleShift,createParty,resetMission} from './actions.mjs';
const {HandlebarsApplicationMixin}=foundry.applications.api;
const {ActorSheetV2,ItemSheetV2}=foundry.applications.sheets;
export class TitanActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw'],position:{width:920,height:810},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{
  twTab:function(_e,target){this._twTab=target.dataset.tab;this.render();},
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
  const context=await super._prepareContext(options),actor=this.actor,system=actor.system,d=actor.tw;
  const tab=this._twTab??'record',party=getParty();
  const moves=CONTENT.moves.filter(m=>this._category?m.system.category===this._category:true);
  const groups=[...new Set(moves.map(m=>m.system.category))].map(name=>({name,moves:moves.filter(m=>m.system.category===name)}));
  const items=actor.items.contents.map(i=>({...i.toObject(),id:i.id}));
  return {...context,actor,system,d,editable:this.isEditable,isGM:game.user.isGM,isParty:actor.type==='party',
   tabs:['record','actions','equipment','injuries','powers','background'].map(key=>({key,label:{record:'Field record',actions:'All actions',equipment:'Equipment',injuries:'Injuries',powers:'Titan powers',background:'Background'}[key],active:key===tab})),
   record:tab==='record',actions:tab==='actions',equipment:tab==='equipment',injuries:tab==='injuries',powers:tab==='powers',background:tab==='background',
   stats:Object.entries(STATS).map(([key,label])=>({key,label,value:system.stats[key],effective:d.stats[key],display:d.stats[key]>0?'+'+d.stats[key]:d.stats[key],advanced:system.advanced[key]})),
   gear:items.filter(i=>i.type==='gear'),loadouts:items.filter(i=>i.type==='loadout'),wounds:items.filter(i=>i.type==='wound'),ownedPowers:items.filter(i=>i.type==='power'),ownedMoves:items.filter(i=>i.type==='move'),
   quickMoves:['reposition-before-regeneration','line-up-a-nape-strike','strike-the-nape','evade-a-titan-s-grasp','rally-a-comrade','first-aid'].map(k=>moveByKey(k)).filter(Boolean),groups,
   party:party?{name:party.name,value:party.system.luck.value,max:party.system.luck.max}:null,
   lossPath:system.shift.active?'system.consciousness.titanLoss':'system.consciousness.loss',loss:system.shift.active?system.consciousness.titanLoss:system.consciousness.loss,
   maxPath:system.shift.active?'system.consciousness.titanMaxAdjustment':'system.consciousness.maxAdjustment',maxAdjustment:system.shift.active?system.consciousness.titanMaxAdjustment:system.consciousness.maxAdjustment,
   meter:Array.from({length:Math.max(0,Math.min(20,d.max))},(_,i)=>({empty:i>=d.value}))};
 }
 async _onRender(context,options){await super._onRender(context,options);this.element.querySelector('[data-move-search]')?.addEventListener('input',event=>{const term=event.target.value.toLowerCase();this.element.querySelectorAll('[data-move-name]').forEach(row=>row.hidden=!row.dataset.moveName.toLowerCase().includes(term));});}
 async _onDragStart(event){const row=event.target.closest('[data-item-id]');if(!row)return super._onDragStart(event);const item=this.actor.items.get(row.dataset.itemId);if(item)event.dataTransfer.setData('text/plain',JSON.stringify(item.toDragData()));}
}
export class TitanItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
 static DEFAULT_OPTIONS={classes:['tw'],position:{width:680,height:720},window:{resizable:true},form:{submitOnChange:true,closeOnSubmit:false},actions:{roll:guard(function(){if(!this.item.actor)throw new Error('Drag this action onto an actor to roll it.');return rollActor(this.item.actor,this.item.system.stat,{move:this.item});})}};
 static PARTS={sheet:{template:`systems/${ID}/templates/item.hbs`}};
 async _prepareContext(options){const context=await super._prepareContext(options),item=this.item;return {...context,item,system:item.system,editable:this.isEditable,stats:STATS,regions:REGIONS,isMove:item.type==='move',isWound:item.type==='wound',isGear:item.type==='gear',isPower:item.type==='power',description:await foundry.applications.ux.TextEditor.enrichHTML(item.system.description,{async:true,secrets:this.isEditable}),severity:{minor:'Minor',major:'Major',crippling:'Crippling'},injuryTypes:{blunt:'Blunt',cutting:'Cutting',piercing:'Piercing / ballistic',burn:'Burn'},formScopes:{human:'Human body',titan:'Titan body'},bonusStats:{'':'None',...STATS}};}
}
