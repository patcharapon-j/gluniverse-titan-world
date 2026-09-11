import test from 'node:test';
import assert from 'node:assert/strict';
import {growthRecord,actionGroups,actionRow} from '../module/dossier.mjs';
import {CONTENT} from '../data/content.mjs';

const soldier=(extra={})=>({stats:{agility:1,technique:3,mind:0,body:0,heart:2,duty:-1},
 advanced:{agility:true,technique:false,mind:false,body:false,heart:false,duty:false},regiment:'Survey Corps',rank:'Recruit',shift:{experienced:false},...extra});

test('growth marks: advanced, open, and the +3 ceiling that cannot be advanced',()=>{
 const g=growthRecord(soldier());
 assert.deepEqual(g.marks.map(m=>m.state),['advanced','capped','open','open','open','open']);
 assert.equal(g.count,1);assert.equal(g.open,4);
 assert.equal(g.marks[0].settable,true);assert.equal(g.marks[1].settable,false);
 assert.equal(g.marks[5].display,'−1');
 assert.match(g.marks[2].title,/0 → \+1/);
 assert.equal(g.summary,'1 of 6 advanced · 4 open');
 assert.equal(growthRecord(soldier(),{settable:false}).marks.some(m=>m.settable),false);
});

test('milestone stamps follow promotion, advances, a full record and shifter experience',()=>{
 assert.deepEqual(growthRecord(soldier()).stamps.map(s=>s.key),['enlisted','advanced']);
 const all=Object.fromEntries(['agility','technique','mind','body','heart','duty'].map(k=>[k,true]));
 const full=growthRecord(soldier({rank:'Squad Leader',advanced:all,shift:{experienced:true}}));
 assert.deepEqual(full.stamps.map(s=>s.key),['enlisted','promoted','advanced','complete','shifter']);
 assert.equal(full.stamps[1].text,'Squad Leader');
 assert.equal(new Set(full.stamps.map(s=>s.lean)).size,full.stamps.length);
 assert.equal(growthRecord({stats:{},advanced:{},regiment:''}).stamps[0].text,'Enlisted');
});

test('every catalogue action lands in exactly one cluster, and filters narrow them',()=>{
 const d={stats:{agility:1,technique:0,mind:0,body:0,heart:0,duty:0}};
 const count=groups=>groups.reduce((n,g)=>n+g.clusters.reduce((m,c)=>m+c.moves.length,0),0);
 assert.equal(count(actionGroups(CONTENT.moves,d)),CONTENT.moves.length);
 const agi=actionGroups(CONTENT.moves,d,{stat:'agility'});
 assert.ok(agi.every(g=>g.clusters.every(c=>c.stat==='agility'&&c.mod==='+1')));
 const row=actionRow(CONTENT.moves[0],d);
 assert.ok(row.anyOutcome&&row.outcomes.every(o=>o.range&&o.band));
});
