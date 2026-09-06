import {STATS,outcome,rollModifiers,clamp} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,esc,field,select,prompt,requireOwner,requireGM,report} from './ui.mjs';
const LABELS={success:'10+ · Success',partial:'7–9 · Partial result',failure:'Failure',snakeEyes:'Snake eyes · Automatic failure',doubleSix:'Double six · Best possible result'};
export function moveByKey(key){return CONTENT.moves.find(m=>m.system.key===key);}
export async function rollActor(actor,stat,{move=null}={}) {
 requireOwner(actor);
 if(actor.system.dead)throw new Error('This actor is marked deceased. The GM must change that before rolling.');
 const d=actor.tw;
 let warning='';
 if(!d.mindless&&d.value<=0)warning+='This character is unconscious; only roll if the GM allows it. ';
 if(move?.system.key==='dodge-a-bullet'&&(d.stats.agility<3||d.majorLeg))warning+='The source requires Agility +3 and no major leg wound. GM approval is required. ';
 if(move?.system.key==='rest-for-the-night'&&d.restBlocked)warning+='Rest automatically fails with major wounds or untreated crippling wounds. Treat the injuries first. ';
 if(move?.system.key?.startsWith('transform-')&&actor.items.some(i=>i.type==='wound'&&i.system.severity==='crippling'&&!i.system.healed))warning+='The source conflicts on shifting with crippling injuries. Confirm the form with the GM. ';
 const data=await prompt(move?.name??`Roll ${STATS[stat]}`,`${warning?`<p class="warning">${esc(warning)}</p>`:''}${select('Stat','stat',STATS,stat)}<div class="grid2">${field('Advantage (0 to 3)','advantage',0,'number')}${field('Other modifier','modifier',0,'number')}</div><label class="field"><span><input type="checkbox" name="difficult" ${move?.system.difficult||actor.system.nextDifficult?'checked':''}> Difficult roll (below 10 fails)</span></label><label class="field"><span><input type="checkbox" name="combat" ${move?.system.combat?'checked':''}> Combat roll (apply low-consciousness difficulty)</span></label>${select('Visibility','messageMode',{public:'Public',gm:'GM and me',blind:'GM only',self:'Only me'},game.settings.get('core','messageMode'))}<p class="note">Advantage is capped at +3. Agility includes dodge fatigue. The GM decides when a roll is possible.</p>`,'Roll 2d6');
 if(!data)return;
 if(warning.includes('Rest automatically fails'))return ui.notifications.warn('Rest is blocked until the listed injuries are treated.');
 const modifiers=rollModifiers(d,actor.system,data.stat,{advantage:data.advantage,modifier:data.modifier,combat:!!data.combat,difficult:!!data.difficult});
 if(move?.system.key?.startsWith('resist-')&&move.system.key.includes('absorption')) modifiers.modifier-=actor.system.shift.absorption;
 const roll=await new foundry.dice.Roll('2d6 + @stat + @advantage + @modifier + @fatigue',modifiers).evaluate();
 const meta={actorUuid:actor.uuid,name:move?.name??STATS[data.stat],stat:data.stat,modifiers,difficult:modifiers.difficult,moveKey:move?.system.key??'',moveData:move?{name:move.name,system:move.system.toObject?move.system.toObject():foundry.utils.deepClone(move.system)}:null,luckBonus:0,revision:0};
 const message=await foundry.documents.ChatMessage.create({speaker:foundry.documents.ChatMessage.getSpeaker({actor}),rolls:[roll],content:await rollContent(meta,roll),flags:{[ID]:{roll:meta}}},{messageMode:data.messageMode});
 if(actor.system.nextDifficult)await actor.update({'system.nextDifficult':false});
 return message;
}
export async function rollContent(meta,roll,history='') {
 const dice=roll.dice[0].results.filter(r=>r.active).map(r=>r.result),total=roll.total+Number(meta.luckBonus||0);
 const result=outcome(dice,total,meta.difficult),move=meta.moveData??moveByKey(meta.moveKey);
 const detail=move?.system[result==='doubleSix'?'success':result]??({success:'You succeed.',partial:'You make progress, with a complication.',failure:'Find a new approach before trying again.',snakeEyes:'Automatic failure, regardless of modifiers.',doubleSix:'The best possible outcome.'}[result]);
 const rules=move?await foundry.applications.ux.TextEditor.enrichHTML(move.system.description,{async:true}):'';
 return `<section class="tw chat-card"><div class="eyebrow">${esc(meta.name)}${meta.difficult?' · Difficult':''}</div><div class="result ${['failure','snakeEyes'].includes(result)?'fail':''}">${esc(total)} · ${esc(LABELS[result])}</div><p>${esc(detail)}</p><p class="note">Dice ${dice.join(' + ')} · ${esc(STATS[meta.stat])} ${meta.modifiers.stat>=0?'+':''}${meta.modifiers.stat} · advantage +${meta.modifiers.advantage} · modifier ${meta.modifiers.modifier} · fatigue ${meta.modifiers.fatigue}${meta.luckBonus?' · luck +'+meta.luckBonus:''}</p>${history?`<p class="note">${esc(history)}</p>`:''}<div class="inline"><button type="button" data-tw-action="luck-plus">Request luck +1</button><button type="button" data-tw-action="luck-reroll">Request reroll</button><button type="button" data-tw-action="consequence">GM consequence</button></div>${rules?`<details><summary>Source rules · ${esc(move.system.source)}</summary><div class="rules">${rules}</div></details>`:''}</section>`;
}
export function getParty() {const id=game.settings.get(ID,'partyActor');return game.actors.get(id)??game.actors.find(a=>a.type==='party');}
export async function requestLuck(source,kind) {
 const meta=source.getFlag(ID,'roll');
 if(!meta||source.author?.id!==game.user.id)throw new Error('You may spend luck only on your own rolls.');
 const party=getParty();if(!party)throw new Error('Ask the GM to create a Party luck pool.');
 if(party.system.luck.value<1)throw new Error('The party has no luck remaining.');
 const existing=game.messages.find(m=>m.getFlag(ID,'luckRequest')?.source===source.id&&m.getFlag(ID,'luckRequest')?.revision===meta.revision&&!m.getFlag(ID,'resolved'));
 if(existing)return ui.notifications.info('A luck request for this roll is already pending.');
 return foundry.documents.ChatMessage.create({content:`<section class="tw chat-card"><b>${esc(game.user.name)} requests ${kind==='plus'?'+1':'a reroll'} using party luck.</b><p>${esc(meta.name)}</p><button type="button" data-tw-action="approve-luck">GM: approve spend</button><button type="button" data-tw-action="deny-luck">GM: decline</button></section>`,whisper:foundry.documents.ChatMessage.getWhisperRecipients('GM').map(u=>u.id),flags:{[ID]:{luckRequest:{source:source.id,kind,revision:meta.revision}}}});
}
let luckQueue=Promise.resolve();
export function approveLuck(request) {
 const task=luckQueue.catch(()=>{}).then(()=>applyLuck(request));luckQueue=task;return task;
}
async function applyLuck(request) {
 requireGM();
 const primary=game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(primary?.id!==game.user.id)throw new Error(`Luck is processed by ${primary?.name??'the primary GM'} to prevent simultaneous spends.`);
 if(request.getFlag(ID,'resolved'))throw new Error('This request has already been handled.');
 const req=request.getFlag(ID,'luckRequest'),source=game.messages.get(req?.source),meta=source?.getFlag(ID,'roll');
 if(!meta||source.author?.id!==request.author?.id||!['plus','reroll'].includes(req.kind)||req.revision!==meta.revision)throw new Error('This request is stale or is not for the requester’s own roll.');
 const party=getParty();if(!party||party.system.luck.value<1)throw new Error('No party luck remains.');
 const updated=foundry.utils.deepClone(meta),oldRoll=source.rolls.at(-1),oldTotal=oldRoll.total+(meta.luckBonus||0);
 updated.revision++;
 let roll=oldRoll;
 if(req.kind==='reroll') {roll=await oldRoll.reroll();updated.luckBonus=0;}else updated.luckBonus++;
 const value=party.system.luck.value;
 await request.setFlag(ID,'resolved','processing');
 await party.update({'system.luck.value':value-1});
 // DsN animates appended rolls. Keep earlier attempts, and omit rolls entirely for +1.
 const diceUpdate=req.kind==='reroll'?{rolls:[...source.rolls.map(r=>r.toJSON()),roll.toJSON()]}:{};
 try {await source.update({...diceUpdate,content:await rollContent(updated,roll,`Previous total ${oldTotal}. Party luck spent for ${req.kind==='plus'?'+1':'a reroll'}.`),[`flags.${ID}.roll`]:updated});}
 catch(error){await party.update({'system.luck.value':value});await request.setFlag(ID,'resolved',false);throw error;}
 await request.update({content:`<p>Luck approved for ${esc(source.author.name)}. ${party.system.luck.value} points remain.</p>`,[`flags.${ID}.resolved`]:'approved'});
}
export function registerChat(consequence) {
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  html.querySelectorAll('[data-tw-action]').forEach(button=>{
   const action=button.dataset.twAction;
   if((['consequence','approve-luck','deny-luck'].includes(action)&&!game.user.isGM)||(action.startsWith('luck-')&&message.author?.id!==game.user.id)){button.remove();return;}
   button.addEventListener('click',async()=>{button.disabled=true;try{
    if(action==='luck-plus')await requestLuck(message,'plus');
    else if(action==='luck-reroll')await requestLuck(message,'reroll');
    else if(action==='approve-luck')await approveLuck(message);
    else if(action==='deny-luck'){requireGM();await message.update({content:'<p>Luck request declined by the GM.</p>',[`flags.${ID}.resolved`]:'declined'});}
    else if(action==='consequence')await consequence(message);
   }catch(error){report(error);}finally{button.disabled=false;}});
  });
 });
}
