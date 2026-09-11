import test from 'node:test';
import assert from 'node:assert/strict';
import {kitObject,kitContainer,fieldKitLayout,flareColour} from '../module/kit.mjs';
import {figureState,bodyFigure,needsAmputation} from '../module/figure.mjs';
import {notches,tally,consciousnessTrack} from '../module/dossier.mjs';
import {rollDialogContent} from '../module/roll-dialog.mjs';

const gear=(name,key,quantity,capacity,extra={})=>({type:'gear',name,id:key,system:{key,quantity,capacity,equipped:true,category:'',...extra}});
const wound=(region,severity,injuryType,extra={})=>({type:'wound',id:`${region}-${severity}-${injuryType}`,name:'',system:{region,severity,injuryType,formScope:'human',treated:false,healed:false,...extra}});

test('kit objects are matched by key and name, and a flare gun is not a flare',()=>{
 assert.equal(kitObject(gear('Flare Gun','flare-gun',1,1)),null);
 assert.equal(kitObject(gear('Green Flare','green-flare',1,1)),'flare');
 assert.equal(kitObject(gear('Extra Gas Canisters','extra-gas-canisters',1,1)),'canister');
 assert.equal(kitObject(gear('Rifle Magazine','rifle-magazine',5,5)),'magazine');
 assert.equal(kitObject(gear('Shell','shell',6,6)),'shell');
 assert.equal(kitObject(gear('Full First-Aid Kit','full-first-aid-kit',1,1)),'medkit');
 assert.equal(kitObject(gear('ODM Gear','odm-gear',1,1)),null);
 assert.equal(kitObject(gear('Homebrew hook','hook',3,3,{category:'blade'})),'blade');
 assert.equal(kitObject(gear('Gas Canister','gas-canister',1,1,{category:'none'})),null);
 assert.equal(flareColour(gear('Red Flare','red-flare',1,1)),'#c8322a');
});

test('a container draws one slot per unit up to its physical cap, then stamps the count',()=>{
 const pistol=kitContainer(gear('Pistol Magazine','pistol-magazine',10,10));
 assert.equal(pistol.slots.length,5);assert.equal(pistol.overflow,10);
 const blades=kitContainer(gear('Titan-Slaying Blade','titan-slaying-blade',2,6));
 assert.deepEqual(blades.slots.map(s=>s.on),[true,true,false,false,false,false]);
 assert.equal(blades.refill,true);assert.equal(blades.place,'rig');
 const spent=kitContainer(gear('Water Canteen','water-canteen',0,0));
 assert.equal(spent.slots.length,1);assert.equal(spent.empty,true);
});

test('the kit splits rig from bag, sizes the bag, and names duplicate objects',()=>{
 const layout=fieldKitLayout([gear('Gas Canister','gas-canister',1,2),gear('Extra Gas Canisters','extra-gas-canisters',1,1),
  gear('Titan-Slaying Blade','titan-slaying-blade',6,6),gear('Rations','rations',5,5),gear('Full Backpack','full-backpack',1,1),
  {...gear('Stowed Flare','red-flare',1,1),system:{key:'red-flare',quantity:1,capacity:1,equipped:false}}]);
 assert.equal(layout.bagKind,'backpack');
 assert.deepEqual(layout.rig.map(c=>c.object),['canister','canister','blade']);
 assert.deepEqual(layout.bag.map(c=>c.object),['ration']);
 assert.deepEqual(layout.rig.filter(c=>c.object==='canister').map(c=>c.label),['Gas Canister','Extra Gas Canisters']);
 assert.equal(JSON.parse(layout.rigData).length,3);
 assert.equal(fieldKitLayout([gear('Satchel','satchel',1,1)]).bagKind,'satchel');
});

test('a crippling cut takes the limb at once; crushed and charred limbs go when treated',()=>{
 let state=figureState([wound('rightArm','crippling','cutting')]);
 assert.equal(state.rightArm.lost,true);assert.equal(state.rightArm.stump,'bleeding');
 state=figureState([wound('leftLeg','crippling','blunt')]);
 assert.equal(state.leftLeg.lost,false);assert.equal(state.leftLeg.crushed,true);
 assert.equal(needsAmputation(wound('leftLeg','crippling','blunt')),true);
 state=figureState([wound('leftLeg','crippling','blunt',{treated:true})]);
 assert.equal(state.leftLeg.lost,true);assert.equal(state.leftLeg.stump,'dressed');
 state=figureState([wound('rightLeg','crippling','burn')]);
 assert.equal(state.rightLeg.charred,true);
 assert.equal(needsAmputation(wound('chest','crippling','blunt')),false);
});

test('stumps stay on a soldier but a Titan regrows the limb once the wound heals',()=>{
 assert.equal(figureState([wound('leftArm','crippling','cutting',{healed:true})]).leftArm.stump,'healed');
 const titan=figureState([wound('leftArm','crippling','cutting',{healed:true,formScope:'titan'})],{titan:true});
 assert.equal(titan.leftArm.lost,false);
 assert.equal(figureState([wound('head','crippling','cutting',{formScope:'titan'})],{titan:true}).head.decapitated,true);
});

test('the diagram carries every region, unique ids, and all three gore treatments',()=>{
 const svg=bodyFigure([wound('chest','major','cutting')],{uid:'sheet-1'});
 for(const region of ['head','chest','leftArm','rightArm','leftLeg','rightLeg'])assert.match(svg,new RegExp(`data-region="${region}"`));
 assert.match(svg,/id="sheet-1-clip-chest"/);
 assert.match(svg,/class="fig-clinical"/);assert.match(svg,/class="fig-visceral"/);
 assert.match(svg,/class="drip"/);
 assert.doesNotMatch(bodyFigure([wound('chest','major','cutting',{treated:true})],{uid:'x'}),/class="drip"/);
 assert.match(svg,/aria-label="Soldier body diagram: Chest major cutting"/);
});

test('strap notches and consciousness boxes set to the point clicked, and the top one steps back',()=>{
 const straps=notches(2);
 assert.equal(straps.length,4);
 assert.deepEqual(straps.map(n=>n.to),[1,1,3,4]);
 const track=consciousnessTrack({consciousness:{maxAdjustment:0}},{max:3,value:2,woundLoss:0});
 assert.deepEqual(track.boxes.map(b=>b.to),[1,1,3]);
});

test('the thirteen-year term is tallied in fives and scored out as years pass',()=>{
 const groups=tally(10);
 assert.equal(groups.length,3);
 assert.equal(groups.flatMap(g=>[...g.marks,g.slash].filter(Boolean)).filter(m=>m.spent).length,3);
});

test('the roll dialog checks the chosen statistic and writes its formula',()=>{
 const html=rollDialogContent({stat:'agility',stats:{agility:1,technique:0,mind:0,body:-1,heart:1,duty:1},fatigue:1,difficult:true,messageMode:'gm'});
 assert.match(html,/value="agility" checked/);
 assert.match(html,/value="gm" checked/);
 assert.match(html,/AGI \+1 fatigue −1/);
 assert.match(html,/Difficult · below 10 fails/);
 assert.equal((html.match(/name="stat"/g)??[]).length,6);
});
