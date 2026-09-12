import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {titanFigureVariant,bodyFigure} from '../module/figure.mjs';
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

test('sheet and inspector figures resolve every clip and mask without sharing ids',async()=>{
 const wounds=[wound('leftArm','crippling','cutting'),wound('chest','major','cutting')];
 const markup=bodyFigure(wounds,{uid:'sheet'})+bodyFigure(wounds,{uid:'inspector'});
 const ids=[...markup.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const [,id] of markup.matchAll(/url\(#([^\)]+)\)/g))assert.ok(ids.includes(id),`Missing figure resource: ${id}`);
 const assets=new Set([...markup.matchAll(/href="systems\/gluniverse-titan-world\/([^"]+)"/g)].map(m=>m[1]));
 assert.equal(assets.size,5);
 for(const asset of assets){
  const image=await fs.readFile(new URL(`../${asset}`,import.meta.url));
  assert.equal(image.subarray(1,4).toString(),'PNG');
  assert.ok(image.readUInt32BE(20)>=1000,`Expected a high-resolution asset: ${asset}`);
 }
});

test('PCs and Titans use separate art and masks while preserving wound scope',()=>{
 const human=bodyFigure([wound('chest','major','cutting')],{uid:'human'});
 const titan=bodyFigure([wound('chest','major','cutting')],{uid:'titan',titan:true});
 assert.match(human,/anatomy\/body-cadet\.png/);
 assert.doesNotMatch(human,/anatomy\/titan-render\.png/);
 assert.match(titan,/anatomy\/titan-render\.png/);
 assert.doesNotMatch(titan,/anatomy\/body-render\.png/);
 assert.doesNotMatch(titan,/class="wound t-cutting/);
});

 test('only equipped Colossal power selects exposed-muscle body',()=>{
 const power={type:'power',system:{key:'colossal-titan',equipped:true}};
 assert.equal(titanFigureVariant([]),'ordinary');
 assert.equal(titanFigureVariant([power]),'colossal');
 assert.equal(titanFigureVariant([{...power,system:{...power.system,equipped:false}}]),'ordinary');
 assert.ok(bodyFigure([],{titan:true}).includes('class="body-render" href="systems/gluniverse-titan-world/assets/anatomy/titan-ordinary.png"'));
 assert.ok(bodyFigure([power],{titan:true}).includes('class="body-render" href="systems/gluniverse-titan-world/assets/anatomy/titan-render.png"'));
 });

test('armour art follows the power, armour condition, and removable body regions',()=>{
 const power={type:'power',system:{key:'armoured-titan',equipped:true}};
 assert.equal(titanFigureVariant([power]),'armoured');
 const intact=bodyFigure([power],{titan:true,armour:{intact:true}});
 const broken=bodyFigure([power,wound('leftArm','crippling','cutting',{formScope:'titan'})],{titan:true,armour:{intact:false}});
 assert.match(intact,/class="body-render" href="[^"]*titan-armoured\.png/);
 assert.match(broken,/class="body-render" href="[^"]*titan-armoured-broken\.png/);
 assert.match(broken,/class="part lower lost"/);
 assert.doesNotMatch(broken,/class="armour/);
 assert.doesNotMatch(bodyFigure([power]),/class="body-render" href="[^"]*titan-armoured/);
});

test('treatment replaces open cuts and bleeding with a dressing and status label',()=>{
 const open=bodyFigure([wound('chest','major','cutting')]);
 const treated=bodyFigure([wound('chest','major','cutting',{treated:true})]);
 assert.match(open,/class="drip"/);
 assert.match(treated,/class="dressing-pad"/);
 assert.match(treated,/Treated · dressed/);
 assert.doesNotMatch(treated,/class="drip"|decal-cutting/);
});
