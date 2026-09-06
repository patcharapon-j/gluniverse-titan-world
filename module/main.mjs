import {derive} from './rules.mjs';
import {registerModels} from './models.mjs';
import {TitanActorSheet,TitanItemSheet} from './sheets.mjs';
import {rollActor,registerChat,getParty} from './rolls.mjs';
import {consequence,createParty,resetMission} from './actions.mjs';
import {ID,report} from './ui.mjs';
import {registerDiceSoNice} from './dice-so-nice.mjs';
registerDiceSoNice();
class TitanActor extends foundry.documents.Actor {
 get tw(){return derive(this.system,this.items.contents,this.type,{stackWounds:game.settings.get(ID,'stackWounds'),woundedBodyMax:game.settings.get(ID,'woundedBodyMax')});}
 getRollData(){const data=super.getRollData();return {...data,stats:this.tw.stats};}
 rollStat(stat,options){return rollActor(this,stat,options);}
}
Hooks.once('init',()=>{
 registerModels();CONFIG.Actor.documentClass=TitanActor;
 game.settings.register(ID,'stackWounds',{name:'Stack wound penalties in the same region',hint:'Default: one stat penalty per wounded region. Enable to apply one penalty per wound.',scope:'world',config:true,type:Boolean,default:false,requiresReload:true});
 game.settings.register(ID,'woundedBodyMax',{name:'Use wounded Body for maximum consciousness',hint:'Default: use Body before wound penalties, then subtract wound loss. Enable if the GM rules that chest wounds also lower the maximum.',scope:'world',config:true,type:Boolean,default:false,requiresReload:true});
 game.settings.register(ID,'partyActor',{name:'Party luck actor ID',hint:'Normally set by Create shared pool. If using multiple Party actors, enter the active one’s ID.',scope:'world',config:true,type:String,default:''});
 const sheets=foundry.applications.apps.DocumentSheetConfig;
 sheets.registerSheet(CONFIG.Actor.documentClass,ID,TitanActorSheet,{types:['soldier','titan','party'],makeDefault:true,label:'TW.Sheet'});
 sheets.registerSheet(CONFIG.Item.documentClass,ID,TitanItemSheet,{types:['gear','move','power','wound','loadout','advancement'],makeDefault:true,label:'TW.Sheet'});
 CONFIG.Combat.initiative={formula:'2d6 + @stats.agility',decimals:0};
 game.titanWorld={rollActor,createParty,resetMission,getParty,consequence};
 registerChat(consequence);
});
Hooks.on('preCreateItem',(item)=>{if(item.type==='wound'&&item.parent?.documentName==='Actor')item.updateSource({'system.formScope':item.parent.tw.titan?'titan':'human'});});
Hooks.on('hotbarDrop',(_bar,data,slot)=>{
 if(data.type!=='Item')return;
 (async()=>{const item=await fromUuid(data.uuid);if(item?.type!=='move'||!item.actor)return;
  const command=`const item = await fromUuid(${JSON.stringify(item.uuid)}); if (item?.actor) await game.titanWorld.rollActor(item.actor, item.system.stat, {move:item});`;
  let macro=game.macros.find(m=>m.command===command);macro??=await foundry.documents.Macro.create({name:item.name,type:'script',img:item.img,command});await game.user.assignHotbarMacro(macro,slot);
 })().catch(report);return false;
});
Hooks.once('ready',()=>{console.info('Titan World | v14 system ready');});
