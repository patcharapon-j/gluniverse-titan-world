import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {conditionRegions,fieldKit,statSources,consciousnessTrack,woundEffects,reachRuler,biteTrack} from '../module/dossier.mjs';
import {derive,meleeReach,meleeAgainst,biteTally,TITAN_HEIGHTS} from '../module/rules.mjs';
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

test('melee reach follows the Titan size band, difficulty and the Body gate',()=>{
 const soldier={stats:{agility:1,technique:1,mind:0,body:1,heart:1,duty:1},height:1.7,consciousness:{},shift:{active:false}};
 const weak=derive(soldier,[],'soldier',{});
 // A 1.7 m soldier reaches two metres either way, and below Body +2 lands nothing.
 assert.equal(meleeReach(weak,soldier).range,2);
 assert.equal(meleeReach(weak,soldier).bodyGate,true);
 assert.equal(meleeAgainst(weak,soldier,3).verdict,'fail');
 assert.equal(meleeAgainst(weak,soldier,4).verdict,'out');
 const strong={...soldier,stats:{...soldier.stats,body:2}};
 const able=derive(strong,[],'soldier',{});
 assert.equal(meleeAgainst(able,strong,3).verdict,'in');
 assert.equal(meleeAgainst(able,strong,3).decapitate,true);
 // Titan-sized widens the band to ten metres, and five metres of height makes it difficult.
 const shifter={...soldier,shift:{active:true,height:10}};
 const shifted=derive(shifter,[],'soldier',{});
 const reach=meleeReach(shifted,shifter);
 assert.equal(reach.range,10);
 assert.equal(reach.titanSized,true);
 assert.equal(reach.bodyGate,false);
 assert.equal(meleeAgainst(shifted,shifter,14).verdict,'in');
 assert.equal(meleeAgainst(shifted,shifter,15).verdict,'hard');
 assert.equal(meleeAgainst(shifted,shifter,21).verdict,'out');
 // A weak form comes out at half its height, which narrows the band with it.
 const frail={...soldier,shift:{active:true,height:10,weak:true}};
 assert.equal(meleeReach(derive(frail,[],'soldier',{}),frail).range,2);
 // The ruler covers every height the book lists and agrees with the call.
 const ruler=reachRuler(strong,able);
 assert.equal(ruler.cells.length,TITAN_HEIGHTS.length);
 assert.deepEqual(ruler.cells.filter(c=>c.in).map(c=>c.height),[3]);
});
test('Titan bites deepen one wound, and armour halves the damage',()=>{
 const base={stats:{body:0,heart:0},consciousness:{},shift:{active:false}};
 const plain=derive(base,[],'soldier',{});
 assert.equal(biteTally({bites:0},plain).severity,'none');
 assert.equal(biteTally({bites:2},plain).severity,'minor');
 assert.equal(biteTally({bites:3},plain).severity,'major');
 assert.equal(biteTally({bites:5},plain).severity,'crippling');
 assert.equal(biteTally({bites:2},plain).next,1);
 // The Armoured Titan takes six to reach major, and ten to be crippled.
 const armoured=biteTally({bites:5},{powers:['armoured-titan']});
 assert.equal(armoured.major,6);
 assert.equal(armoured.crippling,10);
 assert.equal(armoured.severity,'minor');
 const track=biteTrack({bites:3},plain);
 assert.equal(track.boxes.length,5);
 assert.deepEqual(track.boxes.map(b=>b.taken),[true,true,true,false,false]);
 assert.equal(track.boxes[2].mark,'major');
 assert.equal(track.boxes[4].mark,'crippling');
});
test('every Handlebars helper this system registers is namespaced',async()=>{
 // Foundry core reads a bare {{ icon }} as data in a dozen of its own templates,
 // so an unprefixed helper of that name hijacks the sidebar and window controls.
 const source=await readFile(new URL('../module/main.mjs',import.meta.url),'utf8');
 const names=[...source.matchAll(/Handlebars\.registerHelper\('([^']+)'/g)].map(m=>m[1]);
 assert.ok(names.length>0);
 for(const name of names)assert.match(name,/^tw[A-Z]/,`${name} must be namespaced`);
});
