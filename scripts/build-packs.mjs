import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {MOVES,OUTCOMES} from '../data/moves.mjs';
import {STATS,REGIONS,ARRAYS} from '../module/rules.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const foundry=process.env.FOUNDRY_APP ?? 'C:/Program Files/Foundry Virtual Tabletop/resources/app';
const require=createRequire(path.join(foundry,'package.json'));
const {ClassicLevel}=require('classic-level');
const showdown=require('showdown');
const md=new showdown.Converter({tables:true,ghCompatibleHeaderId:true,simpleLineBreaks:true});
const source=await fs.readFile(path.join(root,'docs/Titan World_ 3rd Edition.md'),'utf8');
const clean=s=>s.replace(/[*]/g,'').replace(/\\([+\-.])/g,'$1').trim();
const slug=s=>clean(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const id=s=>createHash('sha256').update(s).digest('hex').slice(0,16);
const headings=[...source.matchAll(/^(#{1,6})[ \t]+(.+)$/gm)].map(m=>({name:clean(m[2]),level:m[1].length,start:m.index,end:m.index+m[0].length})).filter(h=>h.name&&h.name!=='Table of Contents (Links).');
function section(name) {
 const index=headings.findIndex(h=>h.name===name);if(index<0)throw new Error('Missing source section '+name);
 const h=headings[index], end=headings.slice(index+1).find(n=>n.level<=h.level)?.start??source.length;
 return source.slice(h.start,end).trim();
}
const html=name=>md.makeHtml(section(name));
const icon={move:'icons/svg/d20.svg',gear:'icons/svg/item-bag.svg',power:'icons/svg/wing.svg',wound:'icons/svg/blood.svg',loadout:'icons/svg/chest.svg',advancement:'icons/svg/upgrade.svg'};
function item(name,type,system={}) {return {_id:id(type+':'+name),name,type,img:icon[type],system,flags:{'gluniverse-titan-world':{source:'Titan World: 3rd Edition'}},effects:[]};}
const moves=MOVES.map(([name,stat,reference,category,difficult=false])=>{
 const result=OUTCOMES[name]??[];
 return item(name,'move',{key:slug(name),stat,category,difficult,combat:['Combat','Titan hunting'].includes(category),source:reference,
  description:html(reference),success:result[0]??'Resolve the 10+ result in the source rules below.',partial:result[1]??'Resolve the 7–9 result in the source rules below.',failure:result[2]??'Resolve the 6 or lower result in the source rules below.',snakeEyes:result[3]??'Automatic failure. Apply any special snake-eyes consequence in the source rules.'});
});
const powerRows=section('Titan Shifter Table').split(/\r?\n/).filter(l=>/^\|/.test(l)&&!/\|\s*:?-+/.test(l));
const powers=powerRows.map(row=>{const cells=row.split('|').slice(1,-1);const name=clean(cells[0]);return item(name,'power',{key:slug(name),description:md.makeHtml(cells[1].trim()),source:'Titan Shifter Table',equipped:true});});
if(powers.length!==9)throw new Error('Expected 9 Titan powers');
const gearNames=['ODM Gear','Gas Canister','Titan-Slaying Blade','Water Canteen','Tactical Knife','Bandages','Compass','Satchel','Lantern','Full First-Aid Kit','Flare Gun','Green Flare','Red Flare','Black Flare','Rations','Full Backpack','Area Map','Rifle','Rifle Magazine','AHSS Gear','Shell','Disinfectant','Semi-Automatic Pistol','Pistol Magazine','Short-Range Radio','Flashlight','Musket','Semi-Automatic Rifle','Dynamite','Cannon','Advanced Artillery','Splint or Cast','Titan Serum','Spinal Fluid','Extra Gas Canisters'];
const gear=gearNames.map(name=>item(name,'gear',{key:slug(name),quantity:1,equipped:true,uses:name==='Full First-Aid Kit'?3:0,
 source:'Equipment',description:html(name==='Titan Serum'?'Players becoming Mindless Titans':name==='Spinal Fluid'?'Titan Shifter Table':name==='Splint or Cast'?'Healing Injuries':name==='Dynamite'?'Explosives':['Cannon','Advanced Artillery'].includes(name)?'Firing Cannons':['Rifle','Musket','Semi-Automatic Rifle','Semi-Automatic Pistol'].includes(name)?'Firefights':'Equipment'),
 bonusStat:name==='Extra Gas Canisters'?'agility':'',bonus:name==='Extra Gas Canisters'?-1:0}));
const kit=(...entries)=>entries.map(e=>typeof e==='string'?{name:e,quantity:1}:{name:e[0],quantity:e[1]});
const loadoutData=[
 {name:'Scout / Garrison Pack',base:kit('ODM Gear',['Gas Canister',2],['Titan-Slaying Blade',6],'Water Canteen','Tactical Knife','Bandages','Compass','Satchel','Lantern'),choices:[{label:'Full first-aid kit',items:kit('Full First-Aid Kit')},{label:'Flare gun and three colors',items:kit('Flare Gun','Green Flare','Red Flare','Black Flare')},{label:'Extra gas canisters (−1 Agility)',items:kit('Extra Gas Canisters')},{label:'Five days of rations',items:kit(['Rations',5])},{label:'Full backpack replaces satchel',items:kit('Full Backpack'),remove:['Satchel']}]},
 {name:'Interior Police Pack',base:kit('Water Canteen','Tactical Knife','Bandages','Area Map','Rifle',['Rifle Magazine',5],'Satchel'),choices:[{label:'ODM gear (GM discretion)',items:kit('ODM Gear',['Titan-Slaying Blade',2],['Gas Canister',2])},{label:'AHSS gear (GM discretion)',items:kit('AHSS Gear',['Shell',6],['Gas Canister',2])},{label:'Four extra rifle magazines',items:kit(['Rifle Magazine',4])},{label:'Full first-aid kit',items:kit('Full First-Aid Kit')}]},
 {name:'Marleyan Infiltrator Pack',base:kit('Water Canteen','Tactical Knife','Bandages','Disinfectant','Semi-Automatic Pistol',['Pistol Magazine',10],'Compass','Short-Range Radio','Flashlight'),choices:[]}
];
const loadouts=loadoutData.map(l=>item(l.name,'loadout',{key:slug(l.name),description:html('Equipment'),source:'Equipment',loadout:JSON.stringify(l)}));
const wounds=[];
for(const [region,label] of Object.entries(REGIONS))for(const severity of ['minor','major','crippling'])for(const injuryType of ['blunt','cutting','piercing','burn']) {
 wounds.push(item(`${label} · ${severity} ${injuryType}`,'wound',{region,severity,injuryType,consciousnessLoss:severity==='minor'?0:region==='head'?2:1,description:html('Injuries'),source:'Injuries'}));
}
const rewards=['Increase one stat','Military promotion','Reattribute stats','Extra gear or reinforcements'].map(name=>item(name,'advancement',{description:html('Post-Game Rewards'),source:'Post-Game Rewards'}));
const rulings=`<h1>System guide and GM rulings</h1><p>The supplied rulebook is reproduced in full. Roll cards include the complete relevant source section. This system automates arithmetic and records GM-approved consequences. Narrative positioning, bleeding intervals, death, regeneration timing, gear destruction, and conflicting rules remain GM decisions.</p><h2>Controls</h2><p>Create a Soldier, Mindless Titan, or Party actor. Use Create character to assign a stat package, and Equip loadout to choose starting gear. Click a stat or a field action to roll. Drag compendium items onto a sheet. Wounds are embedded Items: add, edit, treat, downgrade, or remove them in the injury ledger. An injury's consciousness loss is editable independently. The GM can use the consequence controls on roll cards to add a wound, change consciousness, or flag the next roll difficult.</p><h2>Shared luck</h2><p>Create one Party actor and select it in system settings. The GM sets its maximum to one or two points per player. Players request a +1 or reroll from their own roll card; a GM approves the spend. The GM processes requests serially to avoid double spending. A mission reset refills the pool. No automatic ammunition or gas expenditure is imposed because the rules use abstract supplies.</p><h2>Explicit interpretations</h2><ul><li>Wound penalties default to once per affected region. Enable cumulative wound penalties in settings if your table stacks them.</li><li>Maximum consciousness uses Body before wound penalties by default, avoiding double-counting chest damage. A setting permits wounded Body instead. Permanent maximum reductions are GM-entered.</li><li>Crippling wounds default to major-wound consciousness loss. Edit this to fit the ruling at your table.</li><li>The death threshold is shown for GM review at current consciousness ≤ negative maximum; death is never applied automatically.</li><li>Unprepared nape attacks cite Agility +3 in the main rules, Agility and Technique +3 for explosives, and Technique +3 in the Jaw entry. The workflow prompts the GM to determine eligibility.</li><li>Shifting with a crippling wound is allowed as a partial form in one passage and forbidden in another. Cart explicitly permits one. The GM confirms the resulting form.</li><li>Natural snake-eyes remains an automatic roll failure; the experienced transformation table also describes an exceptional weak form at 2 or less. The roll card preserves this conflict.</li><li>Opposed-roll ties and early absorption failure are unspecified. The GM resolves them.</li><li>Firearm evasion says both difficult and above 10. The card highlights this discrepancy.</li><li>Armoured, Colossal, Jaw, Cart and selected Beast/Female stat changes apply only while transformed and that power is enabled. Multi-power combinations and exceptional forms require GM review.</li></ul><h2>Combat</h2><p>Use the normal Foundry combat tracker with Agility initiative for individuals. In a group firefight, add one representative per group to the tracker and choose a group member to act each turn. Group reloads and ODM move-plus-attack remain narrative decisions. Opposed rolls are compared from chat cards; the system does not roll another user's character without their participation.</p><h2>Content notes</h2><p>Character templates assign source arrays in the listed stat order as editable examples. The source does not assign those arrays to specific stats. Generic Titan templates set Body +3; other values are editable placeholders, not published NPC statblocks. Equipment has no invented prices, damage dice, or per-shot fuel costs.</p>`;
const journal=(name,content)=>{const key=id('journal:'+name);return {_id:key,name,pages:[{_id:id('page:'+name),name,type:'text',text:{content,format:1},title:{show:true,level:1},sort:0}],ownership:{default:0}};};
const journals=[journal('Titan World: Complete Third Edition',md.makeHtml(source)),journal('Start here: System guide and GM rulings',rulings),...headings.map(h=>journal(h.name,html(h.name)))];
const actors=Object.entries(ARRAYS).map(([key,array])=>({_id:id('actor:'+key),name:key==='specialist'?'Expert · specialist array':key[0].toUpperCase()+key.slice(1)+' · stat template',type:'soldier',img:'icons/svg/mystery-man.svg',system:{stats:Object.fromEntries(Object.keys(STATS).map((k,i)=>[k,array[i]])),notes:'Source array assigned in listed stat order as an editable example. Use character creation to assign it freely.'},items:[],effects:[]}));
for(const name of ['Mindless Titan','Abnormal Titan'])actors.push({_id:id('actor:'+name),name,type:'titan',img:'icons/svg/terror.svg',system:{stats:{agility:0,technique:0,mind:0,body:3,heart:0,duty:0},height:10,notes:'Generic editable template. The source fixes Body +3; choose all other stats and behavior as GM. Abnormal Titans use the same mechanics.'},items:[],effects:[]});
const packs=[['rules','Rules and GM guide','JournalEntry',journals],['moves','Field actions','Item',moves],['equipment','Equipment and loadouts','Item',[...gear,...loadouts]],['powers','Nine Titan powers','Item',powers],['injuries','Injury templates','Item',wounds],['advancement','Advancement','Item',rewards],['templates','Character and Titan templates','Actor',actors]];
const collection={Actor:'actors',Item:'items',JournalEntry:'journal'};
await fs.mkdir(path.join(root,'packs'),{recursive:true});await fs.mkdir(path.join(root,'data'),{recursive:true});
for(const [name,,type,docs] of packs) {
 const db=new ClassicLevel(path.join(root,'packs',name),{keyEncoding:'utf8',valueEncoding:'json'});
 try {
  await db.open();await db.clear();
  const opts={keyEncoding:'utf8',valueEncoding:'json'};
  async function put(doc,coll,ancestors=[]) {
   const d=structuredClone(doc);
   for(const [field,sub] of [['pages','pages'],['items','items'],['effects','effects']])if(Array.isArray(d[field])) {
    const embedded=d[field];d[field]=embedded.map(e=>e._id);
    for(const e of embedded)await put(e,coll+'.'+sub,[...ancestors,d._id]);
   }
   await db.sublevel(coll,opts).put([...ancestors,d._id].join('.'),d);
  }
  for(const doc of docs)await put(doc,collection[type]);
 }finally{await db.close();}
 console.log(`${name}: ${docs.length} ${type} documents`);
}
await fs.writeFile(path.join(root,'data/content.mjs'),'// Generated by scripts/build-packs.mjs.\nexport const CONTENT = '+JSON.stringify({moves,gear,loadouts,powers,rewards},null,2)+';\n');
const manifest={id:'gluniverse-titan-world',title:'Titan World · Third Edition',description:'Private Titan World Third Edition system with full source compendiums and GM-assisted rules. Foundry v14 only.',version:'1.0.0',compatibility:{minimum:'14',verified:'14.363',maximum:'14'},relationships:{recommends:[{id:'dice-so-nice',type:'module',compatibility:{minimum:'6.2.9'}}]},authors:[{name:'Private game system implementation'}],esmodules:['module/main.mjs'],styles:['styles/titan-world.css'],languages:[{lang:'en',name:'English',path:'lang/en.json'}],documentTypes:{Actor:{soldier:{},titan:{},party:{}},Item:Object.fromEntries(['gear','move','power','wound','loadout','advancement'].map(t=>[t,{htmlFields:['description']}]))},packs:packs.map(([name,label,type])=>({name,label,type,path:'packs/'+name,system:'gluniverse-titan-world',ownership:{PLAYER:'OBSERVER',ASSISTANT:'OWNER'}})),packFolders:[{name:'Titan World · Third Edition',color:'#354d3e',packs:packs.map(p=>p[0])}],initiative:'2d6 + @stats.agility',grid:{distance:1,units:'m'}};
const existingManifest=JSON.parse(await fs.readFile(path.join(root,'system.json'),'utf8'));
for(const key of ['version','url','manifest','download'])if(existingManifest[key])manifest[key]=existingManifest[key];
await fs.writeFile(path.join(root,'system.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(root,'docs/content-audit.json'),JSON.stringify({sourceFile:'docs/Titan World_ 3rd Edition.md',sha256:createHash('sha256').update(source).digest('hex'),sourceSections:headings.length,packs:packs.map(([name,,type,docs])=>({name,type,count:docs.length,names:docs.map(d=>d.name)}))},null,2)+'\n');
