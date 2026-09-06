import test from 'node:test';
import assert from 'node:assert/strict';
import {approveLuck} from '../module/rolls.mjs';
import {registerDiceSoNice} from '../module/dice-so-nice.mjs';
const ID='gluniverse-titan-world';

test('DsN registers custom card hiding and an optional theme',()=>{
 const hooks=new Map();globalThis.Hooks={once:(name,fn)=>hooks.set(name,fn)};
 registerDiceSoNice();
 let selector,theme,mode;
 hooks.get('diceSoNiceInit')({setMessageUpdateHideSelector:value=>selector=value});
 hooks.get('diceSoNiceReady')({addColorset:(value,preference)=>{theme=value;mode=preference;}});
 assert.equal(selector,'.dice-roll, .tw.chat-card');
 assert.equal(theme.name,'titan-world-regiment');assert.equal(mode,'default');
});

for(const visibility of ['public','gm','blind','self'])test(`Luck rerolls append once and preserve ${visibility} visibility without DsN installed`,async()=>{
 const gm={id:'gm',isGM:true,active:true},author={id:'player',name:'Player'};
 let sequence=0;
 function dice(total){return {total,dice:[{results:[{active:true,result:2},{active:true,result:3}]}],toJSON(){return JSON.stringify({total});},async reroll(){sequence++;return dice(total+1);}};}
 const party={system:{luck:{value:5}},async update(data){this.system.luck.value=data['system.luck.value'];}};
 const updates=[];
 const source={id:'source',author,rolls:[dice(7)],whisper:visibility==='public'?[]:visibility==='self'?['player']:['gm'],blind:visibility==='blind',speaker:{actor:'soldier'},meta:{name:'Agility',stat:'agility',modifiers:{stat:2,advantage:0,modifier:0,fatigue:0},luckBonus:0,revision:0},getFlag(){return this.meta;},async update(data){updates.push(data);if(data.rolls)this.rolls=data.rolls.map(r=>dice(JSON.parse(r).total));this.meta=data[`flags.${ID}.roll`];}};
 globalThis.game={user:gm,users:[gm],actors:new Map([['party',party]]),messages:new Map([['source',source]]),settings:{get:()=> 'party'}};
 globalThis.foundry={utils:{deepClone:structuredClone}};
 const original={whisper:[...source.whisper],blind:source.blind,speaker:{...source.speaker}};
 async function spend(kind){const req={author,resolved:false,getFlag(_id,key){return key==='resolved'?this.resolved:{source:'source',kind,revision:source.meta.revision};},async setFlag(_id,_key,value){this.resolved=value;},async update(){}};await approveLuck(req);}
 await spend('reroll');await spend('reroll');await spend('plus');
 assert.equal(sequence,2);assert.deepEqual(source.rolls.map(r=>r.total),[7,8,9]);
 assert.equal(updates[0].rolls.length,2);assert.equal(updates[1].rolls.length,3);
 assert.equal('rolls' in updates[2],false);assert.match(updates[2].content,/10 ·/);
 assert.equal(party.system.luck.value,2);
 assert.deepEqual({whisper:source.whisper,blind:source.blind,speaker:source.speaker},original);
 for(const update of updates)for(const key of ['author','whisper','blind','speaker'])assert.equal(key in update,false);
});
