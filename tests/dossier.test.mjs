import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionRegions,fieldKit,statSources,consciousnessTrack,woundEffects} from '../module/dossier.mjs';
import {derive} from '../module/rules.mjs';
test('condition display uses current body and worst unhealed injury',()=>{
 const wound=(severity,formScope='human',healed=false)=>({type:'wound',system:{region:'leftArm',severity,formScope,healed}});
 const items=[wound('minor'),wound('major'),wound('crippling','human',true),wound('crippling','titan')];
 const human=conditionRegions(items).find(r=>r.key==='leftArm'),titan=conditionRegions(items,true).find(r=>r.key==='leftArm');
 assert.equal(human.severity,'major');assert.equal(human.count,2);assert.equal(human.pips.filter(p=>p.filled).length,2);
 assert.equal(titan.severity,'crippling');assert.equal(conditionRegions(items)[0].summary,'Uninjured');
});
test('field kit keeps actual quantities including depleted supplies',()=>{
 const gear=(quantity,equipped=true)=>({type:'gear',system:{quantity,equipped}});
 const rows=fieldKit([gear(0),gear(12),gear(3,false)]);
 assert.equal(rows.length,2);assert.equal(rows[0].empty,true);assert.equal(rows[1].system.quantity,12);
});
test('every statistic difference is named at its source',()=>{
 const items=[
  {type:'wound',name:'',system:{region:'leftLeg',severity:'major',injuryType:'cutting',formScope:'human',healed:false,consciousnessLoss:1}},
  {type:'wound',name:'',system:{region:'leftArm',severity:'minor',injuryType:'piercing',formScope:'human',healed:false,consciousnessLoss:0}},
  {type:'gear',name:'Extra Gas Canisters',system:{equipped:true,quantity:1,bonusStat:'agility',bonus:-1}}
 ];
 const system={stats:{agility:2,technique:1,mind:0,body:0,heart:1,duty:0},fatigue:1,consciousness:{loss:0,maxAdjustment:0}};
 const derived=derive(system,items,'soldier',{});
 const sources=statSources(system,items,derived,{});
 // Wounds, gear and Titan form move the effective value; fatigue is spent at the roll instead.
 for(const [stat,base] of Object.entries(system.stats)) {
  const applied=sources[stat].filter(s=>!s.atRoll).reduce((n,s)=>n+s.delta,0);
  assert.equal(base+applied,derived.stats[stat],`${stat} breakdown does not reconstruct the effective value`);
 }
 assert.deepEqual(sources.agility.map(s=>s.short),['L. Leg','Extra Gas Canisters','Fatigue']);
 assert.equal(sources.technique[0].display,'−1');
 assert.equal(sources.agility.at(-1).atRoll,true);
});
test('consciousness boxes separate what is held, spent, wounded and struck off',()=>{
 const system={stats:{body:0,heart:1},consciousness:{loss:1,maxAdjustment:-1},fatigue:0};
 const items=[{type:'wound',name:'',system:{region:'chest',severity:'major',injuryType:'cutting',formScope:'human',healed:false,consciousnessLoss:1}}];
 const derived=derive(system,items,'soldier',{});
 const track=consciousnessTrack(system,derived,false);
 assert.deepEqual(track.boxes.map(b=>b.state),['held','spent','wounded','void']);
 assert.equal(track.below.length,0);
 // Past zero the track empties and a below-zero row counts down to the death review.
 const spent={...system,consciousness:{loss:8,maxAdjustment:0}};
 const dying=derive(spent,items,'soldier',{});
 const past=consciousnessTrack(spent,dying,false);
 assert.equal(past.boxes.filter(b=>b.state==='held').length,0);
 assert.equal(past.deficit,5);
 assert.deepEqual(past.below.map(b=>b.fatal),[false,false,false,true,true]);
 assert.equal(past.deathAt,'−4');
});
test('an injury log entry says what the wound does to you',()=>{
 const head=woundEffects('crippling','blunt','head');
 assert.ok(head.some(line=>line.includes('Mind is set to −3')));
 const leg=woundEffects('major','cutting','leftLeg');
 assert.ok(leg.some(line=>line.includes('−1 Agility')));
 assert.ok(leg.some(line=>line.includes('Bleeding')));
 assert.ok(woundEffects('minor','piercing','rightArm').some(line=>line.includes('−1 Technique')));
});
