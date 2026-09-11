// Consumables as physical objects: what each carried item is, how many slots it fills, and
// whether it rides on the ODM rig or in the bag. Plain quantities stay on the item sheet.
export const KIT={
 blade:{label:'Blades',place:'rig',cap:6,box:'0 0 12 60',spend:'Draw a blade',restore:'Sheathe a blade'},
 canister:{label:'Gas',place:'rig',cap:3,box:'0 0 20 46',spend:'Swap out a spent canister',restore:'Fit a full canister'},
 shell:{label:'Shells',place:'bag',cap:6,box:'0 0 12 40',spend:'Fire a shell',restore:'Load a shell'},
 flare:{label:'Flare',place:'bag',cap:3,box:'0 0 14 36',spend:'Fire the flare',restore:'Pack a flare'},
 magazine:{label:'Magazines',place:'bag',cap:5,box:'0 0 16 34',spend:'Spend a magazine',restore:'Pack a magazine'},
 bandage:{label:'Bandages',place:'bag',cap:4,box:'0 0 26 22',spend:'Use a bandage',restore:'Pack a bandage'},
 medkit:{label:'First aid',place:'bag',cap:3,box:'0 0 30 24',spend:'Use the kit',restore:'Pack a kit'},
 ration:{label:'Rations',place:'bag',cap:5,box:'0 0 28 18',spend:'Eat a ration',restore:'Pack a ration'},
 vial:{label:'Vials',place:'bag',cap:3,box:'0 0 12 34',spend:'Use a vial',restore:'Pack a vial'},
 dynamite:{label:'Dynamite',place:'bag',cap:4,box:'0 0 12 40',spend:'Light a stick',restore:'Pack a stick'},
 canteen:{label:'Water',place:'bag',cap:2,box:'0 0 26 34',spend:'Drink',restore:'Refill a canteen'},
 pouch:{label:'Supplies',place:'bag',cap:5,box:'0 0 26 24',spend:'Use one',restore:'Pack one'}
};
// Matched by key, then by name, so homebrew gear still finds its object. Order matters:
// a flare gun is not a flare, and extra gas canisters are canisters.
const MATCH=[
 [/flare[\s-]?gun/i,null],[/gas|canister/i,'canister'],[/blade|sword/i,'blade'],[/flare/i,'flare'],
 [/magazine|clip\b/i,'magazine'],[/\bshells?\b|cartridge|ammunition/i,'shell'],[/first[\s-]?aid|medkit|medical kit/i,'medkit'],
 [/bandage|splint|cast\b|disinfect|gauze/i,'bandage'],[/ration|food/i,'ration'],[/serum|spinal|vial/i,'vial'],
 [/dynamite|explosive|grenade/i,'dynamite'],[/canteen|water/i,'canteen']
];
const FLARE={green:'#3f9a4a',red:'#c8322a',black:'#2a2522',yellow:'#e0b83a',purple:'#6a3f8a',white:'#ece6da',blue:'#3a62a8'};
const subject=item=>`${item.system?.key??''} ${item.name??''}`;

/** The kit object an item is drawn as, or null for gear that is not a consumable. */
export function kitObject(item) {
 const chosen=item.system?.category;
 if(chosen==='none')return null;
 if(KIT[chosen])return chosen;
 for(const [pattern,object] of MATCH)if(pattern.test(subject(item)))return object;
 return null;
}
export function flareColour(item) {
 const text=subject(item).toLowerCase();
 return Object.entries(FLARE).find(([name])=>text.includes(name))?.[1]??'#d8a23a';
}
const vialColour=item=>/spinal/i.test(subject(item))?'#d8bf6a':'#8fb8d8';

/** One container: a slot per unit up to a physical cap, with the count stamped past it. */
export function kitContainer(item) {
 const object=kitObject(item);if(!object)return null;
 const def=KIT[object],quantity=Math.max(0,Number(item.system.quantity)||0),capacity=Math.max(0,Number(item.system.capacity)||0);
 const count=Math.max(1,Math.min(def.cap,Math.max(capacity,quantity)));
 return {id:item.id,name:item.name,object,label:object==='flare'?item.name:def.label,place:def.place,box:def.box,
  quantity,capacity,colour:object==='flare'?flareColour(item):object==='vial'?vialColour(item):'',
  slots:Array.from({length:count},(_,i)=>({n:i+1,on:i<quantity})),
  overflow:quantity>def.cap?quantity:0,empty:quantity===0,refill:capacity>quantity,spend:def.spend,restore:def.restore};
}
/** The carried consumables, split between the rig and a bag sized by what the soldier carries. */
export function fieldKitLayout(items) {
 const carried=items.filter(i=>i.type==='gear'&&i.system.equipped);
 const containers=carried.map(kitContainer).filter(Boolean)
  .sort((a,b)=>(a.place==='rig'?0:1)-(b.place==='rig'?0:1));
 // Two containers of the same object (gas and extra gas) are told apart by their item names.
 for(const c of containers)if(containers.some(o=>o!==c&&o.object===c.object))c.label=c.name;
 const bag=carried.some(i=>/backpack/i.test(subject(i)))?'backpack':carried.some(i=>/satchel/i.test(subject(i)))?'satchel':'pouch';
 const rig=containers.filter(c=>c.place==='rig');
 return {containers,rig,bag:containers.filter(c=>c.place==='bag'),bagKind:bag,
  bagLabel:{backpack:'Full backpack',satchel:'Satchel',pouch:'Belt pouch'}[bag],
  any:containers.length>0,resupply:containers.some(c=>c.refill),
  rigData:JSON.stringify(rig.map(c=>({id:c.id,object:c.object,slots:c.slots.map(s=>s.on)})))};
}
