import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTENT} from '../data/content.mjs';
import {packageContent,assignContent,assignmentState,loadoutContent,loadoutChoiceContent,advanceContent,woundContent,treatContent,
 consequenceContent,consciousnessContent,consciousnessPreview,restContent,shiftContent,partyLuckContent,CONSEQUENCES} from '../module/dialogs.mjs';
import {luckRequestCard,luckApprovedCard,luckDeclinedCard,luckPool} from '../module/cards.mjs';

const values=(html,name)=>[...html.matchAll(new RegExp(`name="${name}" value="([^"]*)"`,'g'))].map(m=>m[1]);
const checked=(html,name)=>[...html.matchAll(new RegExp(`name="${name}" value="([^"]*)" checked`,'g'))].map(m=>m[1]);
const count=(html,pattern)=>(html.match(pattern)??[]).length;

test('stat packages are slips that print the values they hand out',()=>{
 const html=packageContent();
 assert.deepEqual(values(html,'package'),['rookie','soldier','expert','specialist']);
 assert.deepEqual(checked(html,'package'),['rookie']);
 assert.match(html,/<b>Specialist<\/b><small><span class="arr"><i class="up">\+3<\/i><i class="up">\+2<\/i><i class="up">\+1<\/i><i class="zero">0<\/i><i class="dn">−1<\/i>/);
});

test('assigning six stats offers only the package values and starts balanced',()=>{
 const html=assignContent('soldier');
 for(const stat of ['agility','technique','mind','body','heart','duty'])assert.deepEqual(values(html,stat),['2','1','0','-1']);
 assert.deepEqual(['agility','technique','mind','body','heart','duty'].map(s=>checked(html,s)[0]),['2','1','1','0','0','-1']);
 assert.match(html,/class="as-panel ok" data-package="soldier"/);
 assert.equal(count(html,/class="as-tok used"/g),6);
});

test('the assignment check names what is still to place and what is over-used',()=>{
 const good=assignmentState({agility:2,technique:1,mind:1,body:0,heart:0,duty:-1},'soldier');
 assert.equal(good.valid,true);assert.equal(good.text,'Balanced');
 const bad=assignmentState({agility:2,technique:2,mind:1,body:0,heart:0,duty:-1},'soldier');
 assert.equal(bad.valid,false);assert.deepEqual(bad.over,[2]);assert.equal(bad.text,'To place +1');
 assert.deepEqual(bad.tokens.map(t=>t.used),[true,true,false,true,true,true]);
 assert.equal(assignmentState({agility:1},'rookie').valid,false);
});

test('loadouts are requisition slips with their manifests and the additions they allow',()=>{
 const html=loadoutContent(CONTENT.loadouts);
 assert.deepEqual(checked(html,'key'),[CONTENT.loadouts[0].system.key]);
 assert.equal(values(html,'key').length,CONTENT.loadouts.length);
 assert.match(html,/2× Gas Canister/);assert.match(html,/class="slip-stamp" aria-hidden="true">Issued/);
 const choices=loadoutChoiceContent(CONTENT.loadouts[0]);
 assert.deepEqual(values(choices,'choice'),['0','1','2','3','4']);
 assert.match(choices,/<span class="rm">replaces Satchel<\/span>/);
});

test('advancement keys read current to next and lock spent or maxed statistics',()=>{
 const html=advanceContent({agility:1,technique:3,mind:0,body:0,heart:1,duty:2},{agility:true});
 assert.match(html,/value="agility" disabled>/);assert.match(html,/value="technique" disabled>/);
 assert.deepEqual(checked(html,'stat'),['mind']);
 assert.match(html,/<b>MND<\/b><em>0<i aria-hidden="true">›<\/i><strong>\+1<\/strong><\/em>/);
 assert.match(html,/<b>TEC<\/b><em>\+3<\/em><small>At \+3<\/small>/);
});

test('the injury picker keeps its field names and defaults',()=>{
 const html=woundContent();
 assert.deepEqual(values(html,'region'),['head','rightArm','chest','leftArm','rightLeg','leftLeg']);
 assert.deepEqual([checked(html,'region'),checked(html,'severity'),checked(html,'injuryType')].flat(),['chest','minor','blunt']);
 assert.match(html,/class="bm bm-ra" title="Right arm"/);
});

test('treatment tickets flag the options a wound is not eligible for',()=>{
 const wound={name:'Left arm · minor piercing',system:{severity:'minor',injuryType:'piercing',region:'leftArm',fromMajor:false}};
 const html=treatContent(wound);
 assert.deepEqual(values(html,'result'),['stabilize','downgrade','piercing','remove','restore']);
 assert.deepEqual(checked(html,'result'),['stabilize']);
 assert.equal(count(html,/class="tr-opt off"/g),2);
 assert.match(treatContent({name:'x',system:{severity:'crippling',injuryType:'blunt'}},true),/Amputate the limb and dress the stump/);
});

test('the consequence panel lists tagged actors first and every consequence kind',()=>{
 const html=consequenceContent({targets:[{uuid:'a',name:'Ada'},{uuid:'b',name:'<Bo>',tag:'targeted'}],selected:'b'});
 assert.match(html,/<select name="actor"[^>]*><option value="b" selected>&lt;Bo&gt; · targeted<\/option><option value="a">Ada<\/option>/);
 assert.deepEqual(values(html,'effect'),CONSEQUENCES.map(c=>c[0]));
 assert.deepEqual(checked(html,'effect'),['wound']);
});

test('steppers preview the consciousness track and mint the luck pool',()=>{
 assert.deepEqual(consciousnessPreview(3,4,1),{after:2,boxes:['held','held','lose','spent']});
 assert.deepEqual(consciousnessPreview(1,4,-2),{after:3,boxes:['held','gain','gain','spent']});
 assert.equal(consciousnessPreview(2,3,-5).after,3);
 const cs=consciousnessContent({value:1,max:3,loss:1});
 assert.match(cs,/name="loss" value="1"/);assert.match(cs,/<small>Unconscious<\/small>/);
 const luck=partyLuckContent({players:2,max:2});
 assert.match(luck,/name="max" value="2"/);assert.match(luck,/data-min="0"/);
 assert.equal(count(luck,/class="pip round on"/g),2);assert.equal(count(luck,/class="pip round/g),4);
});

test('rest is two stamped choices and the shift panel only asks about form when entering it',()=>{
 assert.deepEqual(values(restContent(),'result'),['partial','success']);
 assert.deepEqual(checked(restContent(),'result'),['partial']);
 const enter=shiftContent({active:false});
 assert.match(enter,/name="weak">/);assert.match(enter,/name="fresh" checked>/);
 assert.doesNotMatch(shiftContent({active:true}),/name="weak"/);
});

test('luck cards carry the token, requester, roll, kind and pool, and stamp the answer',()=>{
 const request=luckRequestCard({requester:'<Eve>',actorImg:'',rollName:'Strike the nape',kind:'reroll',value:3,max:5});
 assert.match(request,/data-fx="luck"/);assert.match(request,/&lt;Eve&gt;/);assert.match(request,/Strike the nape/);
 assert.match(request,/<span class="hstamp brass">Reroll<\/span>/);
 assert.match(request,/data-tw-action="approve-luck"/);assert.match(request,/data-tw-action="deny-luck"/);
 assert.equal(count(request,/class="pip round on"/g),3);assert.equal(count(request,/class="pip round/g),5);
 const approved=luckApprovedCard({requester:'Eve',rollName:'Agility',kind:'plus',value:2,max:5});
 assert.match(approved,/data-fx="luck-approved"/);assert.match(approved,/class="lk-stamp">Approved/);
 assert.match(approved,/class="hstamp brass">\+1/);assert.equal(count(approved,/class="pip round spent"/g),1);
 assert.doesNotMatch(approved,/data-tw-action/);
 const declined=luckDeclinedCard({requester:'Eve',rollName:'Agility',kind:'plus',value:2,max:5});
 assert.match(declined,/data-fx="luck-declined"/);assert.match(declined,/class="lk-stamp">Declined/);assert.match(declined,/Pool unchanged · 2 of 5/);
 assert.equal(count(luckPool(0),/class="pip round/g),1);
});
