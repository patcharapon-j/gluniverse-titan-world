import {STATS,outcome,rollModifiers,clamp,meleeReach,RESULT_TIERS,moveOutcomes} from './rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {ID,esc,field,select,check,prompt,requireOwner,requireGM,report} from './ui.mjs';
const LABELS={success:'10+ · Success',partial:'7–9 · Partial result',failure:'6− · Failure',snakeEyes:'Snake eyes · Automatic failure',doubleSix:'Double six · Best result'};
const BAND={success:'hit',doubleSix:'hit',partial:'mix',failure:'miss',snakeEyes:'miss'};
// The three thresholds, drawn as a scale so the tier reached is read before the number is.
const TIER_OF={success:'success',doubleSix:'success',partial:'partial',failure:'failure',snakeEyes:'failure'};
const EXTREME={doubleSix:{band:'hit',text:'Double six · the best possible result'},
 snakeEyes:{band:'miss',text:'Snake eyes · automatic failure'}};
const FACE={1:[[50,50]],2:[[27,27],[73,73]],3:[[27,27],[50,50],[73,73]],4:[[27,27],[73,27],[27,73],[73,73]],
 5:[[27,27],[73,27],[50,50],[27,73],[73,73]],6:[[27,27],[73,27],[27,50],[73,50],[27,73],[73,73]]};
const die=(n,dropped=false)=>`<div class="die${dropped?' dropped':''}" aria-label="d6 showing ${n}">${(FACE[n]??[]).map(([x,y])=>`<i style="left:${x}%;top:${y}%"></i>`).join('')}</div>`;
const chatIcon=name=>`<svg class="i" aria-hidden="true"><use href="#tw-i-${name}"/></svg>`;
const HAND_TO_HAND=new Set(['melee-initiative','melee-attack','evade-a-melee-attack','parry-with-blades','second-combo-attack','attack-a-restrained-opponent','disarm-an-opponent','pry-free-of-a-grasp','lift-a-titan-off-a-comrade','lift-a-burning-titan-safely','survive-being-crushed']);
// A successful break from a grasp costs you wind: every later Agility check is −1 until you catch your breath.
const DODGE_MOVES=new Set(['evade-a-titan-s-grasp']);
export function moveByKey(key){return CONTENT.moves.find(m=>m.system.key===key);}
export async function rollActor(actor,stat,{move=null}={}) {
 requireOwner(actor);
 if(actor.system.dead)throw new Error('This actor is marked deceased. The GM must change that before rolling.');
 const d=actor.tw;
 let warning='';
 if(!d.mindless&&d.value<=0)warning+='This character is unconscious; only roll if the GM allows it. ';
 if(actor.type==='soldier'&&actor.system.fear==='frozen')warning+='Frozen in fear: you cannot act at all until a comrade rolls + Duty to snap you out of it, or you are carried to safety. ';
 if(HAND_TO_HAND.has(move?.system.key)&&meleeReach(d,actor.system).bodyGate)warning+='In hand-to-hand against a Titan you automatically fail every roll: you are not a Titan and your Body is below +2. ';
 if(move?.system.key==='dodge-a-bullet'&&(d.stats.agility<3||d.majorLeg))warning+='The source requires Agility +3 and no major leg wound. GM approval is required. ';
 if(move?.system.key==='rest-for-the-night'&&d.restBlocked)warning+='Rest automatically fails with major wounds or untreated crippling wounds. Treat the injuries first. ';
 if(move?.system.key?.startsWith('transform-')&&actor.items.some(i=>i.type==='wound'&&i.system.severity==='crippling'&&!i.system.healed))warning+='The source conflicts on shifting with crippling injuries. Confirm the form with the GM. ';
 const reach=meleeReach(d,actor.system);
 const data=await prompt(move?.name??`Roll ${STATS[stat]}`,`${warning?`<p class="warning">${esc(warning)}</p>`:''}${select('Stat','stat',STATS,stat)}<div class="grid2">${field('Advantage (0 to 3)','advantage',0,'number')}${field('Other modifier','modifier',0,'number')}</div><div class="checks">${check('Difficult roll — below 10 always fails','difficult',!!(move?.system.difficult||actor.system.nextDifficult))}${check('Combat roll — apply low-consciousness difficulty','combat',!!move?.system.combat)}</div>${select('Visibility','messageMode',{public:'Public',gm:'GM and me',blind:'GM only',self:'Only me'},game.settings.get('core','messageMode'))}<p class="note">Advantage is capped at +3. Agility includes dodge fatigue. The GM decides when a roll is possible.${move?.system.combat?` Hand-to-hand reach: Titans ${reach.low.toFixed(1)}–${reach.high.toFixed(1)} m; anything ${reach.difficultAt.toFixed(1)} m or taller makes every roll against it difficult.`:''}</p>`,'Roll 2d6');
 if(!data)return;
 if(warning.includes('Rest automatically fails'))return ui.notifications.warn('Rest is blocked until the listed injuries are treated.');
 const modifiers=rollModifiers(d,actor.system,data.stat,{advantage:data.advantage,modifier:data.modifier,combat:!!data.combat,difficult:!!data.difficult});
 if(move?.system.key?.startsWith('resist-')&&move.system.key.includes('absorption')) modifiers.modifier-=actor.system.shift.absorption;
 const roll=await new foundry.dice.Roll('2d6 + @stat + @advantage + @modifier + @fatigue',modifiers).evaluate();
 const meta={actorUuid:actor.uuid,actorName:actor.name,actorImg:actor.img,name:move?.name??STATS[data.stat],stat:data.stat,modifiers,difficult:modifiers.difficult,moveKey:move?.system.key??'',moveData:move?{name:move.name,system:move.system.toObject?move.system.toObject():foundry.utils.deepClone(move.system)}:null,luckBonus:0,revision:0};
 const message=await foundry.documents.ChatMessage.create({speaker:foundry.documents.ChatMessage.getSpeaker({actor}),rolls:[roll],content:await rollContent(meta,roll),flags:{[ID]:{roll:meta}}},{messageMode:data.messageMode});
 const after={};
 if(actor.system.nextDifficult)after['system.nextDifficult']=false;
 // Facing fear sets a standing state the sheet tracks: 10+ steadies you, 7-9 shakes you, below that freezes you.
 if(move?.system.key==='face-fear'&&actor.type==='soldier') {
  const dice=roll.dice[0].results.filter(r=>r.active).map(r=>r.result);
  const result=outcome(dice,roll.total,modifiers.difficult);
  if(result==='success'||result==='doubleSix')after['system.fear']='steady';
  else if(result==='partial'){after['system.fear']='shaken';after['system.nextDifficult']=true;}
  else after['system.fear']='frozen';
 }
 if(DODGE_MOVES.has(move?.system.key)&&actor.type!=='titan') {
  const dice=roll.dice[0].results.filter(r=>r.active).map(r=>r.result);
  const result=outcome(dice,roll.total,modifiers.difficult);
  if(['success','doubleSix','partial'].includes(result)) {
   after['system.fatigue']=(Number(actor.system.fatigue)||0)+1;
   ui.notifications.info(`Dodge fatigue is now ${after['system.fatigue']}: −1 to every Agility check until ${actor.name} catches breath.`);
  }
 }
 if(Object.keys(after).length)await actor.update(after);
 return message;
}
export async function rollContent(meta,roll,history='') {
 const dice=roll.dice[0].results.filter(r=>r.active).map(r=>r.result),total=roll.total+Number(meta.luckBonus||0);
 const result=outcome(dice,total,meta.difficult),move=meta.moveData??moveByKey(meta.moveKey);
 // Two sixes reads as the best possible result, so it borrows the 10+ text unless the
 // action writes its own. Every other tier prints exactly what the action was authored with.
 const authored=result==='doubleSix'&&!move?.system.doubleSix?'success':result;
 const detail=move?.system[authored]??({success:'You succeed.',partial:'You make progress, with a complication.',failure:'Find a new approach before trying again.',snakeEyes:'Automatic failure, regardless of modifiers.',doubleSix:'The best possible outcome.'}[result]);
 // The whole ladder travels with the card, so the GM never has to open the rulebook to
 // read what the other tiers would have done.
 const ladder=moveOutcomes(move?.system??{}),marked=result==='doubleSix'?'success':result;
 const rules=move?await foundry.applications.ux.TextEditor.enrichHTML(move.system.description,{async:true}):'';
 const m=meta.modifiers,sign=n=>`${n>=0?'+':'−'}${Math.abs(n)}`;
 const parts=[`${esc(STATS[meta.stat])} ${sign(m.stat)}`];
 if(m.advantage)parts.push(`advantage +${m.advantage}`);
 if(m.modifier)parts.push(`modifier ${sign(m.modifier)}`);
 if(m.fatigue)parts.push(`fatigue ${sign(m.fatigue)}`);
 if(meta.luckBonus)parts.push(`luck +${meta.luckBonus}`);
 const reached=TIER_OF[result];
 const scale=RESULT_TIERS.map(tier=>{
  // A difficult roll has no middle ground, so that segment is struck out rather than hidden.
  const off=meta.difficult&&tier.key==='partial';
  return `<i class="t ${tier.band}${tier.key===reached?' on':''}${off?' off':''}"><b>${tier.range}</b><span>${esc(tier.label)}</span></i>`;
 }).join('');
 const extreme=EXTREME[result];
 const portrait=meta.actorImg
  ? `<span class="hp"><img src="${esc(meta.actorImg)}" alt=""></span>`
  : `<span class="hp none">${chatIcon('wings')}</span>`;
 const subtitle=[meta.name,move?.system.source].filter(Boolean).join(' · ');
 return `<section class="tw chat-card ${BAND[result]}">
<header class="hero">${portrait}
<span class="hn"><b>${esc(meta.actorName||meta.name)}</b><small>${esc(subtitle)}</small></span>
${meta.difficult?`<span class="hstamp">${chatIcon('stamp')}Difficult</span>`:''}</header>
<div class="r"><div class="total${['failure','snakeEyes'].includes(result)?' fail':''}">${esc(total)}</div>
<div class="rr"><div class="dice">${dice.map(n=>die(n)).join('')}</div><div class="mod">${parts.join(' · ')}</div></div></div>
<div class="tiers" role="img" aria-label="${esc(LABELS[result])}">${scale}</div>
${extreme?`<div class="band ${extreme.band}">${esc(extreme.text)}</div>`:''}
<div class="outcome"><span class="attr">${esc(move?move.name:STATS[meta.stat])} · ${esc(RESULT_TIERS.find(t=>t.key===reached).range)}</span>
<div class="why">${esc(detail)}</div></div>
${history?`<div class="history">${esc(history)}</div>`:''}
<div class="inline">
<button type="button" data-tw-action="luck-plus">${chatIcon('luck')}Luck +1</button>
<button type="button" data-tw-action="luck-reroll">${chatIcon('refresh')}Reroll</button>
<button type="button" data-tw-action="consequence">${chatIcon('stamp')}GM consequence</button>
</div>
${ladder.length?`<details class="ladder"><summary>Every result for ${esc(move.name)}</summary><ol class="olist">${ladder.map(row=>`<li class="orow ${row.band}${row.key===marked?' on':''}${row.struck?' off':''}"><span class="ot"><b>${esc(row.range)}</b><em>${esc(row.label)}</em></span><span class="od">${esc(row.text)}${row.struck?' <i>This roll is difficult: there is no middle result.</i>':''}</span></li>`).join('')}</ol></details>`:''}
${rules?`<details><summary>Source rules · ${esc(move.system.source)}</summary><div class="rules">${rules}</div></details>`:''}
</section>`;
}
export function getParty() {const id=game.settings.get(ID,'partyActor');return game.actors.get(id)??game.actors.find(a=>a.type==='party');}
export async function requestLuck(source,kind) {
 const meta=source.getFlag(ID,'roll');
 if(!meta||source.author?.id!==game.user.id)throw new Error('You may spend luck only on your own rolls.');
 const party=getParty();if(!party)throw new Error('Ask the GM to create a Party luck pool.');
 if(party.system.luck.value<1)throw new Error('The party has no luck remaining.');
 const existing=game.messages.find(m=>m.getFlag(ID,'luckRequest')?.source===source.id&&m.getFlag(ID,'luckRequest')?.revision===meta.revision&&!m.getFlag(ID,'resolved'));
 if(existing)return ui.notifications.info('A luck request for this roll is already pending.');
 return foundry.documents.ChatMessage.create({content:`<section class="tw chat-card">
<div class="eyebrow">${chatIcon('luck')}<span>Party luck requested</span></div>
<div class="band info">${esc(game.user.name)} · ${kind==='plus'?'+1':'reroll'}</div>
<div class="why">${esc(meta.name)} — ${party.system.luck.value} point${party.system.luck.value===1?'':'s'} remain in the pool.</div>
<div class="inline"><button type="button" data-tw-action="approve-luck">${chatIcon('check')}Approve</button><button type="button" data-tw-action="deny-luck">${chatIcon('close')}Decline</button></div>
</section>`,whisper:foundry.documents.ChatMessage.getWhisperRecipients('GM').map(u=>u.id),flags:{[ID]:{luckRequest:{source:source.id,kind,revision:meta.revision}}}});
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
 await request.update({content:`<section class="tw chat-card"><div class="eyebrow">${chatIcon('luck')}<span>Luck approved</span></div><div class="band hit">Spent for ${esc(source.author.name)}</div><div class="why">${party.system.luck.value} point${party.system.luck.value===1?'':'s'} remain in the shared pool.</div></section>`,[`flags.${ID}.resolved`]:'approved'});
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
    else if(action==='deny-luck'){requireGM();await message.update({content:`<section class="tw chat-card"><div class="eyebrow">${chatIcon('luck')}<span>Party luck</span></div><div class="band miss">Declined by the GM</div></section>`,[`flags.${ID}.resolved`]:'declined'});}
    else if(action==='consequence')await consequence(message);
   }catch(error){report(error);}finally{button.disabled=false;}});
  });
 });
}
