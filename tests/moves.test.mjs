import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MOVES,OUTCOMES} from '../data/moves.mjs';
import {CONTENT} from '../data/content.mjs';
import {moveOutcomes,RESULT_TIERS} from '../module/rules.mjs';
import {actionRow} from '../module/dossier.mjs';
const TIERS=['success','partial','failure','snakeEyes'];
test('every field action is written out for all four result tiers',()=>{
 assert.equal(MOVES.length,77);
 for(const [name] of MOVES) {
  const rows=OUTCOMES[name];
  assert.ok(Array.isArray(rows),`${name} has no authored outcomes`);
  assert.ok(rows.length>=4,`${name} is missing a result tier`);
  rows.slice(0,4).forEach((text,index)=>{
   assert.equal(typeof text,'string');
   assert.ok(text.trim().length>12,`${name} · ${TIERS[index]} is too thin to resolve a roll from`);
   assert.ok(!/^Resolve the/.test(text),`${name} · ${TIERS[index]} still defers to the rulebook`);
  });
 }
 assert.deepEqual(Object.keys(OUTCOMES).filter(name=>!MOVES.some(m=>m[0]===name)),[]);
});
test('the built catalogue carries the same authored results as the source table',()=>{
 assert.equal(CONTENT.moves.length,MOVES.length);
 for(const move of CONTENT.moves) {
  const rows=OUTCOMES[move.name];
  assert.ok(rows,`${move.name} is in the catalogue but not in the outcome table`);
  TIERS.forEach((tier,index)=>assert.equal(move.system[tier],rows[index],`${move.name} · ${tier} drifted from data/moves.mjs`));
 }
});
test('the ladder reads best first, and a difficult roll strikes out its middle tier',()=>{
 const rows=moveOutcomes({success:'A',partial:'B',failure:'C',snakeEyes:'D'});
 assert.deepEqual(rows.map(r=>r.key),['success','partial','failure','snakeEyes']);
 assert.deepEqual(rows.map(r=>r.text),['A','B','C','D']);
 assert.deepEqual(rows.map(r=>r.struck),[false,false,false,false]);
 assert.deepEqual(rows.map(r=>r.range),['10+','7–9','6−','1+1']);
 const hard=moveOutcomes({success:'A',partial:'B',failure:'C',snakeEyes:'D',difficult:true});
 assert.equal(hard.find(r=>r.key==='partial').struck,true);
 // A tier nobody wrote is left out rather than printed empty.
 assert.deepEqual(moveOutcomes({success:'A',partial:'  '}).map(r=>r.key),['success']);
 assert.deepEqual(moveOutcomes({}),[]);
 assert.deepEqual(RESULT_TIERS.map(t=>t.key),['failure','partial','success']);
});
test('an action row hands the sheet the whole ladder and its own 10+ line',()=>{
 const move=CONTENT.moves.find(m=>m.system.key==='strike-the-nape');
 const row=actionRow(move,{stats:{technique:2}});
 assert.equal(row.anyOutcome,true);
 assert.equal(row.outcomes.length,4);
 assert.equal(row.hit,move.system.success);
 assert.equal(row.modDisplay,'+2');
 // The row's own subtitle names the source section; the ladder carries the results.
 assert.equal(row.line,move.system.source);
 const hard=actionRow(CONTENT.moves.find(m=>m.system.key==='dodge-a-bullet'),{stats:{agility:3}});
 assert.equal(hard.difficult,true);
 assert.equal(hard.outcomes.find(o=>o.key==='partial').struck,true);
});
