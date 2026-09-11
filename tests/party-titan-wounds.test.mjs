import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFigure} from '../module/figure.mjs';
import {conditionRegions,unitCard} from '../module/dossier.mjs';

const wound=(region,severity,injuryType,extra={})=>({type:'wound',id:`w-${region}`,name:'',system:{region,severity,injuryType,formScope:'human',treated:false,healed:false,...extra}});

test('a party unit card draws held, spent and wounded boxes and flags the worst standing wound',()=>{
 const d={max:5,value:2,woundLoss:1,status:'Hurt',titan:false};
 const card=unitCard({id:'u',name:'Ilse',img:'icons/svg/mystery-man.svg',system:{rank:'Private',fatigue:2,dead:false,shift:{active:false}},
  items:[wound('chest','major','cutting'),wound('head','minor','blunt',{healed:true})],d});
 assert.deepEqual(card.boxes,['held','held','spent','spent','wounded']);
 assert.equal(card.img,'');assert.equal(card.wounds,1);assert.equal(card.worst,'major');assert.equal(card.tone,'warn');
 assert.deepEqual(card.notches,[true,true,false]);
});

test('the figure names each wound, region and stump so a sheet impact can find what changed',()=>{
 const svg=bodyFigure([wound('chest','major','cutting',{treated:true}),wound('leftArm','crippling','cutting')],{uid:'t'});
 assert.match(svg,/class="wound t-cutting s-major treated" data-wound-id="w-chest"/);
 assert.match(svg,/class="wounds" data-wounds="chest"/);
 assert.match(svg,/class="stump bleeding" data-stump="leftArm"/);
});

test('coma and death are plated by the Wounds tab, not drawn into the figure',()=>{
 const svg=bodyFigure([],{uid:'c',coma:true});
 assert.doesNotMatch(svg,/coma-plate/);
 assert.match(svg,/class="fig human coma"/);
});

test('region cards no longer carry the retired silhouette',()=>{
 const chest=conditionRegions([]).find(r=>r.key==='chest');
 for(const key of ['path','mark','detail','lead','labels'])assert.equal(key in chest,false);
 assert.equal(chest.statShort,'BDY');
});
