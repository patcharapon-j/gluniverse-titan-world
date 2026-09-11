// Event cards: a flare fired, an injury reported, a soldier killed, a Titan transformation.
// Each carries data-fx, so every client that sees it arrive plays the same effect.
import {ID,esc} from './ui.mjs';
import {bodyFigure} from './figure.mjs';

const icon=name=>`<svg class="i" aria-hidden="true"><use href="#tw-i-${name}"/></svg>`;
const portrait=img=>img?`<span class="hp"><img src="${esc(img)}" alt=""></span>`:`<span class="hp none">${icon('wings')}</span>`;
const hero=(name,img,kicker,stamp='')=>`<header class="hero">${portrait(img)}<span class="hn"><b>${esc(name)}</b><small>${esc(kicker)}</small></span>${stamp}</header>`;
const REGION={head:'Head',chest:'Chest',leftArm:'Left arm',rightArm:'Right arm',leftLeg:'Left leg',rightLeg:'Right leg'};

export function flareCard({actorName,actorImg,name,colour}) {
 return `<section class="tw chat-card event ev-flare" data-fx="flare" data-color="${esc(colour)}">
${hero(actorName,actorImg,'Signal flare')}
<div class="ev"><span class="fx-anchor ev-object"><svg class="ko" viewBox="0 0 14 36" style="color:${esc(colour)}"><use href="#tw-k-flare"/></svg></span><span class="evt"><b>${esc(name)}</b><small>Fired</small></span><i class="ev-swatch" style="background:${esc(colour)}"></i></div>
</section>`;
}
export function woundCard({actorName,actorImg,wound,uid}) {
 const s=wound.system,loss=Number(s.consciousnessLoss||0);
 return `<section class="tw chat-card event ev-wound s-${esc(s.severity)}" data-fx="wound">
${hero(actorName,actorImg,'Injury report',`<span class="hstamp">${esc(s.severity)}</span>`)}
<div class="ev"><span class="fx-anchor ev-figure">${bodyFigure([wound],{mini:true,uid,titan:s.formScope==='titan'})}<i class="fx-bloom" aria-hidden="true"></i></span>
<span class="evt"><b>${esc(REGION[s.region]??s.region)}</b><small>${esc(s.severity)} · ${esc(s.injuryType)}</small><em>${loss?`−${loss} consciousness`:'No consciousness lost'}</em></span></div>
</section>`;
}
export function deathCard({actorName,actorImg}) {
 return `<section class="tw chat-card event ev-death" data-fx="death">
${hero(actorName,actorImg,'Personnel record closed')}
<div class="ev"><span class="fx-anchor ev-kia">KIA</span><span class="evt"><b>Killed in action</b><small>${esc(actorName)}</small></span></div>
</section>`;
}
export function shiftCard({actorName,actorImg,power}) {
 return `<section class="tw chat-card event ev-shift" data-fx="shift">
${hero(actorName,actorImg,'Titan transformation')}
<div class="ev"><span class="fx-anchor ev-bolt">${icon('shifting')}</span><span class="evt"><b>${esc(power||'Titan form')}</b><small>Transformed</small></span></div>
</section>`;
}
// Party luck as a brass token: who asked, for which roll, what kind, and the pool left behind.
const LUCK_KIND={plus:['+1','One added to the total'],reroll:['Reroll','The dice are thrown again']};
const LUCK_STATE={request:['Party luck requested','luck'],approved:['Party luck spent','luck-approved'],declined:['Party luck declined','luck-declined']};
const whole=n=>Math.max(0,Math.trunc(Number(n))||0);
/** The shared pool as brass pips; after an approval the token just spent sits tarnished at the edge. */
export function luckPool(value,max,{spent=false}={}) {
 const v=whole(value),slots=Math.min(14,Math.max(whole(max),v+(spent?1:0),1));
 return `<span class="pips luck lk-pool" role="img" aria-label="${v} of ${whole(max)||v} luck remaining">${Array.from({length:slots},(_,i)=>`<i class="pip round${i<v?' on':''}${spent&&i===v?' spent':''}"></i>`).join('')}</span>`;
}
function luckCard(state,{requester,actorImg,rollName,kind,value,max}={},extra='') {
 const [kicker,fx]=LUCK_STATE[state],[short,long]=LUCK_KIND[kind]??['Luck','Party luck'],v=whole(value),top=whole(max)||v;
 const left=state==='request'?`${v} of ${top} in the pool`:state==='approved'?`${v} of ${top} remain`:`Pool unchanged · ${v} of ${top}`;
 return `<section class="tw chat-card event luck-card lk-${state}" data-fx="${fx}">
${hero(requester||'A player',actorImg,kicker,`<span class="hstamp brass">${esc(short)}</span>`)}
<div class="ev"><span class="fx-anchor lk-coin">${icon('luck')}</span><span class="evt"><b>${esc(rollName||'Roll')}</b><small>${esc(long)}</small><em>${esc(left)}</em></span>${luckPool(v,top,{spent:state==='approved'})}${state==='request'?'':`<i class="lk-stamp">${state==='approved'?'Approved':'Declined'}</i>`}</div>
${extra}</section>`;
}
export const luckRequestCard=data=>luckCard('request',data,`<div class="inline"><button type="button" data-tw-action="approve-luck">${icon('check')}Approve</button><button type="button" data-tw-action="deny-luck">${icon('close')}Decline</button></div>`);
export const luckApprovedCard=data=>luckCard('approved',data);
export const luckDeclinedCard=data=>luckCard('declined',data);
export function postCard(actor,content,fx) {
 return foundry.documents.ChatMessage.create({speaker:foundry.documents.ChatMessage.getSpeaker({actor}),content,flags:{[ID]:{fx}}});
}
