import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionRegions,fieldKit} from '../module/dossier.mjs';
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
