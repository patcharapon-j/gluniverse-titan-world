// Development harness: renders the real Handlebars templates against a fabricated
// actor so the dossier can be inspected in a browser without launching Foundry.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {STATS,REGIONS,derive,meleeReach} from '../module/rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {SPRITE,icon as iconMarkup} from '../module/icons.mjs';
import {bodyFigure} from '../module/figure.mjs';
import {KIT,fieldKitLayout,kitContainer} from '../module/kit.mjs';
import {KIT_SPRITE} from '../module/kit-art.mjs';
import {esc} from '../module/ui.mjs';
import {flareCard,woundCard,deathCard,shiftCard,luckRequestCard,luckApprovedCard,luckDeclinedCard} from '../module/cards.mjs';
import {packageContent,assignContent,loadoutContent,loadoutChoiceContent,advanceContent,woundContent,treatContent,
 consequenceContent,consciousnessContent,restContent,shiftContent,partyLuckContent} from '../module/dialogs.mjs';
import {injuryLedger,actionGroups,actionCategories,actionStats,actionRow,growthRecord,gearRow,requisitionSlip,powerCard,shiftPlate,
 consciousnessFormula,consciousnessTrack,statCards,reachRuler,biteTrack,notches,tally,FEAR,SEVERITY_LABEL,INJURY_LABEL,
 SHEET_TABS as TABS,QUICK_ACTIONS as QUICK,unitCard} from '../module/dossier.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(process.env.FOUNDRY_APP??'C:/Program Files/Foundry Virtual Tabletop/resources/app','package.json'));
const hb=require('handlebars');

hb.registerHelper('twIcon',(name,options)=>new hb.SafeString(iconMarkup(String(name??'gear'),options?.hash?.class??'')));
hb.registerHelper('checked',value=>value?'checked':'');
hb.registerHelper('selectOptions',(choices,options)=>{
 const selected=String(options.hash.selected??'');
 return new hb.SafeString(Object.entries(choices).map(([value,label])=>
  `<option value="${value}"${String(value)===selected?' selected':''}>${label}</option>`).join(''));
});

// A stand-in portrait, so the hero band can be judged with and without a photograph.
const PORTRAIT='data:image/svg+xml;utf8,'+encodeURIComponent(
 `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140"><rect width="120" height="140" fill="#b9a882"/>`+
 `<circle cx="60" cy="52" r="27" fill="#5d4b36"/><path d="M14 140c0-30 20-46 46-46s46 16 46 46z" fill="#4a3b2a"/>`+
 `<path d="M33 44c4-22 50-26 55-2 2 10-2 14-4 6-4-14-40-14-46 2-2 6-6 2-5-6z" fill="#31261a"/></svg>`);

// The data model defaults (models.mjs), so every fabricated document carries the fields a real one would.
const SOLDIER={stats:Object.fromEntries(Object.keys(STATS).map(k=>[k,0])),regiment:'Survey Corps',rank:'Recruit',origin:'',anchor:'',drive:'',background:'',
 consciousness:{loss:0,titanLoss:0,maxAdjustment:0,titanMaxAdjustment:0},fatigue:0,nextDifficult:false,dead:false,height:1.7,bites:0,notes:'',fear:'steady',
 advanced:Object.fromEntries(Object.keys(STATS).map(k=>[k,false])),
 shift:{active:false,experienced:false,armourIntact:true,weak:false,height:15,absorption:0,yearsRemaining:13,notes:''},luck:{value:0,max:0}};
const ITEM={description:'',source:'',key:'',category:'',stat:'technique',difficult:false,combat:false,success:'',partial:'',failure:'',snakeEyes:'',doubleSix:'',
 quantity:1,capacity:0,uses:0,equipped:true,bonusStat:'',bonus:0,loadout:'',region:'chest',severity:'minor',injuryType:'blunt',consciousnessLoss:0,
 treated:false,healed:false,fromMajor:false,formScope:'human'};
const sys=(base,patch={})=>({...base,...patch,...Object.fromEntries(['stats','consciousness','advanced','shift','luck'].map(k=>[k,{...base[k],...patch[k]}]))});

let seq=0;
const item=(type,name,system={},id=`5c1040${(++seq*2654435761%4294967296).toString(16).padStart(10,'0')}`)=>({type,name,id,img:'icons/svg/item-bag.svg',system:{...ITEM,...system}});
const doc=(list,key,patch={})=>{const d=list.find(x=>x.system.key===key);return {...d,id:d._id,system:{...ITEM,...d.system,...patch}};};
const gear=(name,key,quantity,capacity,extra={})=>item('gear',name,{key,quantity,capacity,...extra});
const wound=(region,severity,injuryType,loss,extra={})=>
 item('wound',`${REGIONS[region]} · ${severity} ${injuryType}`,{region,severity,injuryType,consciousnessLoss:loss,...extra});
const power=(key,equipped,extra={})=>doc(CONTENT.powers,key,{equipped,...extra});

const ITEMS=[
 gear('Gas Canister','gas-canister',1,2),
 gear('Titan-Slaying Blade','titan-slaying-blade',2,6),
 gear('Green Flare','green-flare',2,3),
 gear('Bandages','bandages',3,3),
 gear('ODM Gear','odm-gear',1,1),
 gear('Water Canteen','water-canteen',0,1),
 gear('Tactical Knife','tactical-knife',1,1),
 gear('Extra Gas Canisters','extra-gas-canisters',1,1,{bonusStat:'agility',bonus:-1}),
 gear('Satchel','satchel',1,1),gear('Red Flare','red-flare',1,1),gear('Rations','rations',4,5),gear('Rifle Magazine','rifle-magazine',3,5),
 wound('leftArm','minor','piercing',0),
 wound('rightLeg','minor','blunt',0,{fromMajor:true,treated:true}),
 wound('chest','major','cutting',1),
 item('move','Cover the retreat',{key:'cover-the-retreat',stat:'duty',category:'Custom',source:'House rule',
  success:'Everyone behind you disengages cleanly.',difficult:false,combat:true}),
 ...CONTENT.loadouts.map(l=>({...l,id:l._id,system:{...ITEM,...l.system}}))
];
// Agility advanced, Technique at the +3 ceiling without an advance, and an experienced shifter's stamp.
const SYSTEM=sys(SOLDIER,{
 stats:{agility:1,technique:3,mind:0,body:0,heart:1,duty:1},
 regiment:'Survey Corps',rank:'Private',origin:'Wall Rose · Trost',height:1.68,
 anchor:'Her brother Tomas, eleven, who still thinks she is stationed on the Wall.',
 drive:'She froze on the roof in Trost while a neighbour was taken.',
 background:'Born in the outer district of Trost to a cooper and a laundress.',
 consciousness:{loss:1,maxAdjustment:-1},
 fatigue:1,nextDifficult:true,fear:'shaken',bites:2,
 advanced:{agility:true},
 shift:{experienced:true},
 luck:{value:3,max:5}
});
const TITAN=sys(SOLDIER,{stats:{mind:-3,body:3},regiment:'',rank:'Abnormal',origin:'Trost district, south gate',height:12,bites:2,
 background:'Sighted twice near the breach. Runs on all fours and ignores the bait wagons.'});
const TITAN_ITEMS=[wound('leftArm','minor','cutting',0,{formScope:'titan'}),wound('rightLeg','minor','cutting',0,{formScope:'titan'}),wound('chest','major','cutting',0,{formScope:'titan'})];
const PARTY=sys(SOLDIER,{rank:'',luck:{value:3,max:5},notes:'Hold the Trost gate until the supply cart is through.'});

// Below half, transformed, killed in action, and out cold below zero.
const ROSTER=[
 {id:'a',name:'Ilse Weyland',img:PORTRAIT,system:SYSTEM,items:ITEMS},
 {id:'b',name:'Cpl. M. Adler',system:sys(SOLDIER,{rank:'Corporal',stats:{body:1,heart:1},shift:{active:true}}),
  items:[power('attack-titan',true),wound('rightArm','major','cutting',1,{formScope:'titan'})]},
 {id:'c',name:'Recruit Faust',system:sys(SOLDIER,{dead:true}),items:[wound('head','crippling','cutting',2)]},
 {id:'d',name:'Sgt. H. Brandt',img:PORTRAIT,system:sys(SOLDIER,{rank:'Sergeant',stats:{body:1},fatigue:3,consciousness:{loss:5}}),
  items:[wound('leftLeg','major','blunt',1),wound('head','minor','cutting',0)]}
].map(a=>unitCard({...a,d:derive(a.system,a.items,'soldier',{})}));

/** Mirrors TitanActorSheet._prepareContext over fabricated documents. */
function buildContext(tab,{type='soldier',category='',stat='',system=SYSTEM,items=ITEMS,luck=3,roster=[],uid=tab,actor={name:'Ilse Weyland',img:'',id:'abcdef0123456789'}}={}) {
 const d=derive(system,items,type,{}),isParty=type==='party',isTitan=type==='titan',shifted=!!system.shift?.active;
 const definitions=TABS[isTitan?'titan':'soldier'];
 const current=definitions.some(([key])=>key===tab)?tab:definitions[0][0];
 const catalogue=CONTENT.moves,statRows=statCards(system,items,d,{});
 const warnings=[];
 if(d.deathReview)warnings.push({icon:'skull',tone:'grave',text:'Death threshold reached. GM review required before this character acts again.'});
 if(!d.mindless&&d.value<=0&&!system.dead)warnings.push({icon:'moon',tone:'grave',text:'Unconscious. Rolls need GM permission.'});
 if(d.combatDifficult)warnings.push({icon:'combat',tone:'warn',text:'Below half consciousness: every combat roll is difficult.'});
 if(d.restBlocked)warnings.push({icon:'bandage',tone:'warn',text:'Rest automatically fails while a major or untreated crippling wound stands.'});
 if(system.nextDifficult)warnings.push({icon:'stamp',tone:'warn',text:'The next roll is marked difficult.'});
 if(!isTitan&&system.fear==='frozen')warnings.push({icon:'skull',tone:'grave',text:'Frozen in fear. You cannot act until a comrade rolls + Duty to snap you out of it.'});
 if(!isTitan&&system.fear==='shaken')warnings.push({icon:'wind',tone:'warn',text:'Shaken. Roll + Heart at every Titan sighting until you make a 10+.'});
 const biteCall=biteTrack(system,d);
 if(biteCall.bites>0)warnings.push({icon:'drop',tone:biteCall.severity==='crippling'?'grave':biteCall.severity==='major'?'warn':'ok',text:biteCall.bites+' Titan bite'+(biteCall.bites===1?'':'s')+' recorded — '+biteCall.label.toLowerCase()+'. '+biteCall.hint});
 if(shifted&&system.shift.absorption>0)warnings.push({icon:'clock',tone:'warn',text:`Absorption penalty −${system.shift.absorption} on resistance rolls.`});
 const figure={titan:d.titan,dead:!!system.dead,coma:!d.mindless&&!isParty&&d.max<=0,
  bites:d.titan&&system.bites?biteCall:null,
  armour:d.titan&&items.some(i=>i.type==='power'&&i.system.equipped&&i.system.key==='armoured-titan')?{intact:!!system.shift?.armourIntact}:null};
 const regrowing=isTitan?items.filter(i=>i.type==='wound'&&!i.system.healed&&i.system.formScope==='titan'):[];
 const titanRail=isTitan?{steam:regrowing.length,armour:figure.armour,nape:system.dead?'severed':'intact',
  regen:Object.entries({minor:'in seconds',major:'in minutes',crippling:'at GM ruling'}).map(([key,pace])=>({key,pace,label:SEVERITY_LABEL[key],count:regrowing.filter(w=>w.system.severity===key).length})).filter(r=>r.count)}:null;
 const party={id:'p',name:'Party luck',value:luck,max:5};
 return {actor,system,d,editable:true,isGM:true,isParty,isTitan,
  sprite:SPRITE+KIT_SPRITE,
  tabs:definitions.map(([key,label,icon],index)=>({key,label,icon,index:String(index+1).padStart(2,'0'),active:key===current})),
  record:current==='record',actions:current==='actions',equipment:current==='equipment',injuries:current==='injuries',powers:current==='powers',background:current==='background',
  stats:statRows,anyModifier:statRows.some(row=>row.anyReason),
  ledger:injuryLedger(items,d.titan,false),
  figure:isParty?'':bodyFigure(items,{...figure,uid:`tw-fig-${uid}`}),
  figureDetailId:`tw-anatomy-${uid}`,
  figureDetail:isParty?'':bodyFigure(items,{...figure,uid:`tw-detail-${uid}`}),
  miniFigure:isParty?'':bodyFigure(items,{...figure,uid:`tw-mini-${uid}`,mini:true}),
  kit:fieldKitLayout(items),serial:actor.id?.slice(-8).toUpperCase(),
  portraitAvailable:actor.img&&!actor.img.includes('mystery-man')&&!actor.img.includes('assets/crest.svg'),
  luckPips:Array.from({length:Math.max(0,Math.min(14,party.max))},(_,i)=>{
   const n=i+1;
   return {filled:i<party.value,to:n===party.value?n-1:n,label:n===party.value?`Spend down to ${n-1}`:`Set the pool to ${n}`};
  }),
  yearTally:tally(system.shift?.yearsRemaining??13),
  gear:items.filter(i=>i.type==='gear').map(gearRow),
  loadouts:items.filter(i=>i.type==='loadout').map(requisitionSlip),wounds:items.filter(i=>i.type==='wound'),
  ownedPowers:items.filter(i=>i.type==='power').map(powerCard),shiftPlate:shiftPlate(system,items),
  ownedMoves:items.filter(i=>i.type==='move').map(i=>actionRow(i,d,{owned:true})),
  quickActions:QUICK.map(([key,icon,alias,primary])=>{const move=catalogue.find(m=>m.system.key===key);return move?actionRow(move,d,{icon,alias,primary}):null;}).filter(Boolean),
  actionCategories:actionCategories(catalogue,category),
  actionStats:actionStats(catalogue,d,stat),
  actionGroups:actionGroups(catalogue,d,{category,stat}),
  actionCount:catalogue.length,
  growth:growthRecord(system,{settable:!isTitan&&!isParty}),
  party,
  roster,squad:{count:roster.length,fallen:roster.filter(u=>u.dead).length,down:roster.filter(u=>!u.dead&&u.value<=0).length},
  figureFlags:{dead:figure.dead,coma:figure.coma&&!figure.dead},titanRail,
  lossPath:shifted?'system.consciousness.titanLoss':'system.consciousness.loss',loss:shifted?system.consciousness.titanLoss:system.consciousness.loss,
  maxPath:shifted?'system.consciousness.titanMaxAdjustment':'system.consciousness.maxAdjustment',maxAdjustment:shifted?system.consciousness.titanMaxAdjustment:system.consciousness.maxAdjustment,
  formula:consciousnessFormula(system,d,shifted),warnings,
  track:consciousnessTrack(system,d,shifted),
  reach:reachRuler(system,d),
  bites:biteTrack(system,d),
  fatigueNotches:notches(system.fatigue),
  fear:{...FEAR[system.fear??'steady'],states:Object.values(FEAR).map(f=>({...f,on:f.key===(system.fear??'steady')}))},
  critical:!d.mindless&&d.max>0&&d.value<=Math.ceil(d.max/3),
  statusTone:system.dead?'grave':d.mindless?'ok':d.value<=0?'grave':d.combatDifficult?'warn':'ok',
  severityLabels:SEVERITY_LABEL,injuryLabels:INJURY_LABEL,regionLabels:REGIONS};
}
/** Mirrors TitanItemSheet._prepareContext; description enrichment is the identity outside Foundry. */
function itemContext(item) {
 const system=item.system,plain={...item,id:item.id};
 const kinds={gear:'Equipment',move:'Field action',power:'Titan power',wound:'Injury',loadout:'Loadout',advancement:'Advancement'};
 return {item,system,editable:true,sprite:SPRITE+KIT_SPRITE,
  kitChoices:{'':'Automatic',none:'Not a consumable',...Object.fromEntries(Object.entries(KIT).map(([key,def])=>[key,def.label]))},
  kitPreview:item.type==='gear'?kitContainer(plain):null,
  slip:item.type==='loadout'?requisitionSlip(plain):null,serial:item.id?.slice(-6).toUpperCase(),
  kindIcon:{gear:'gear',move:'dice',power:'shifting',wound:'drop',loadout:'pack',advancement:'arrowUp'}[item.type]??'wings',
  woundFigure:item.type==='wound'?bodyFigure([plain],{mini:true,uid:`tw-item-${item.id}`,titan:system.formScope==='titan'}):'',
  kind:kinds[item.type]??item.type,
  stats:STATS,regions:REGIONS,
  isMove:item.type==='move',isWound:item.type==='wound',isGear:item.type==='gear',isPower:item.type==='power',isLoadout:item.type==='loadout',
  hasChecks:['move','gear','power','wound'].includes(item.type),
  statLabel:STATS[system.stat],
  description:system.description,
  severity:SEVERITY_LABEL,injuryTypes:{...INJURY_LABEL,piercing:'Piercing / ballistic'},
  formScopes:{human:'Human body',titan:'Titan body'},bonusStats:{'':'None',...STATS}};
}

const templates={};
for(const file of (await fs.readdir(path.join(root,'templates'))).filter(f=>f.endsWith('.hbs'))){
 const source=await fs.readFile(path.join(root,'templates',file),'utf8');
 hb.registerPartial(`systems/gluniverse-titan-world/templates/${file}`,source);
 templates[file]=hb.compile(source);
}

const css=await fs.readFile(path.join(root,'styles','titan-world.css'),'utf8');
const fonts=Object.fromEntries(await Promise.all(
 [['display','PlayfairDisplay.ttf'],['archive','SpecialElite.ttf'],['body','NotoSerif.ttf']].map(async ([key,file])=>{
  try{return [key,(await fs.readFile(path.join(root,'assets','fonts',file))).toString('base64')];}
  catch{return [key,null];}
 })));
const fontFaces=[['TW Display',fonts.display],['TW Archive',fonts.archive],['TW Serif',fonts.body]]
 .filter(([,data])=>data)
 .map(([family,data])=>`@font-face{font-family:"${family}";src:url(data:font/ttf;base64,${data}) format("truetype");font-weight:100 900}`).join('\n');

function page(title,body,width=860,height=760){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>
${fontFaces}
${css.replace(/@font-face\{[^}]*\}/g,'')}
html,body{margin:0;background:radial-gradient(ellipse at 50% 0%,rgba(120,90,50,.16),transparent 60%),radial-gradient(ellipse at 50% 100%,rgba(0,0,0,.6),transparent 60%),#100e0c;min-height:100%;padding:26px;display:flex;flex-wrap:wrap;gap:26px;justify-content:center;align-items:flex-start;font-family:sans-serif}
.frame{width:${width}px;height:${height}px;display:flex;flex-direction:column;position:relative}
.frame>.bar{height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font:11px "TW Archive",monospace;letter-spacing:.16em;text-transform:uppercase;color:#d9c8a6;position:relative;z-index:2}
.frame>.content{flex:1;min-height:0;background:#ece2cb;position:relative;overflow:hidden;container-type:inline-size}
.caption{color:#6a6058;font:11px "TW Archive",monospace;letter-spacing:.14em;text-transform:uppercase;width:100%;text-align:center;margin:0}
</style></head><body>${body.replaceAll('systems/gluniverse-titan-world/assets/','../assets/')}
<script>
 const q=new URLSearchParams(location.search);
 if(q.get('zoom'))document.body.style.zoom=q.get('zoom');
 if(q.get('pan'))(document.querySelector('.sheet-body')||document.querySelector('.frame .content')).scrollTop=Number(q.get('pan'));
</script></body></html>`;
}
const frame=(label,html,width=860,height=760,cls='tw-actor',controls='Sheet · Token · ✕')=>
 `<div class="tw ${cls} application frame" style="width:${width}px;height:${height}px">
  <div class="bar"><span>${label}</span><span>${controls}</span></div>
  <div class="content window-content">${html}</div></div>`;
// The live behaviour (card deal, ladders, growth marks, the 3D rig, drag-out, wheel steppers) runs here too, with no Foundry behind it.
const wire=(id,{deal=false}={})=>`<script type="module">import {wireSheet} from '../module/sheet-fx.mjs';import {wireActions} from '../module/actions-fx.mjs';const frame=document.querySelector('.frame');window.twApp={document:{id:'${id}'},element:frame,options:{actions:{}}${deal?',_twDeal:true':''}};wireActions(window.twApp,frame);wireSheet(window.twApp,frame.querySelector('.window-content'));</script>`;
const hidden=html=>`<div style="position:absolute;width:0;height:0;overflow:hidden">${html}</div>`;

const out=path.join(root,'preview');
await fs.mkdir(out,{recursive:true});
const pages=[];
const write=async(name,caption,html)=>{pages.push([name,caption]);await fs.writeFile(path.join(out,`${name}.html`),html,'utf8');};

// Every sheet surface, each through the same context builder the sheet uses.
const TITAN_ACTOR={name:'Abnormal, 12 m',img:'',id:'7a1e5c0de0b5e12a'};
const views=[
 ['overview','record','Soldier overview',{}],
 ['actions','actions','Actions tab, unfiltered',{}],
 ['actions-combat','actions','Actions filtered to Combat, dealt in, one result ladder open',{category:'Combat',deal:true,ladder:true}],
 ['wounds','injuries','Wounds tab',{}],
 ['wounds-narrow','injuries','Wounds tab · 660 px layout',{size:[660,800]}],
 ['wounds-coma','injuries','Wounds tab · maximum consciousness 0, coma plate',{system:sys(SYSTEM,{consciousness:{maxAdjustment:-4}})}],
 ['wounds-kia','injuries','Wounds tab · killed in action',{system:sys(SYSTEM,{dead:true}),items:[...ITEMS,wound('head','crippling','cutting',2)]}],
 ['gear','equipment','Gear tab · kit, ledger rows and requisition slips',{}],
 ['shifter','powers','Shifter tab, sealed',{}],
 ['shifter-open','powers','Shifter tab · one power in use, two sealed',{system:sys(SYSTEM,{bites:4,shift:{yearsRemaining:9,absorption:1}}),
  items:[...ITEMS,power('attack-titan',true),power('warhammer-titan',false),power('beast-titan',false,{bonusStat:'technique'})]}],
 ['record','background','Record tab · growth marks and milestone stamps',{}],
 ['narrow','record','The 660 px layout',{size:[660,800]}],
 ['titan','record','Mindless Titan · regrowing, bare hide',{type:'titan',system:TITAN,items:TITAN_ITEMS,actor:TITAN_ACTOR}],
 ['titan-wounds','injuries','Titan wounds · painted creature study',{type:'titan',system:TITAN,items:TITAN_ITEMS,actor:TITAN_ACTOR}],
 ['titan-armoured','record','Armoured Titan · plating broken, seven bites',{type:'titan',system:sys(TITAN,{bites:7,shift:{armourIntact:false}}),
  items:[...TITAN_ITEMS,power('armoured-titan',true)],actor:TITAN_ACTOR}],
 ['armour-intact','injuries','Armoured Titan · intact anatomical plating',{type:'titan',system:sys(TITAN,{shift:{armourIntact:true}}),items:[power('armoured-titan',true)],actor:{...TITAN_ACTOR,name:'Armoured Titan'}}],
 ['armour-broken','injuries','Armoured Titan · broken plating and lost arm',{type:'titan',system:sys(TITAN,{shift:{armourIntact:false}}),items:[power('armoured-titan',true),wound('leftArm','crippling','cutting',0,{formScope:'titan'})],actor:{...TITAN_ACTOR,name:'Armoured Titan'}}],
 ['titan-killed','injuries','Titan wounds · nape severed',{type:'titan',system:sys(TITAN,{dead:true}),items:[...TITAN_ITEMS,wound('head','crippling','cutting',0,{formScope:'titan'})],actor:TITAN_ACTOR}],
 ['party','record','Party sheet · squad board with KIA, shifted, below half and below zero',{type:'party',system:PARTY,items:[],roster:ROSTER,
  actor:{name:'Party luck',img:'',id:'9a47c0ffee000042'},size:[820,620]}]
];
for(const [name,tab,caption,{size=[860,760],deal=false,ladder=false,...options}] of views){
 let html=templates['actor.hbs'](buildContext(tab,{uid:name,...options}));
 if(ladder)html=html.replace(/(data-move-cluster[\s\S]*?)<details class="aout">/,'$1<details class="aout" open>');
 const [width,height]=size;
 await write(name,caption,page(`Dossier · ${name}`,frame(`${options.actor?.name??'Ilse Weyland'} — ${name}`,html,width,height)+wire(name,{deal}),width,height));
}
// The consciousness track has four box states and a below-zero row; show them side by side.
{
 const variants=[
  ['Untouched',{loss:0,maxAdjustment:0},[]],
  ['Wounded, maximum reduced',{loss:1,maxAdjustment:-1},ITEMS],
  ['Past the death threshold',{loss:7,maxAdjustment:0},ITEMS]
 ];
 const blocks=variants.map(([label,consciousness,items],i)=>{
  const ctx=buildContext('record',{system:sys(SYSTEM,{consciousness}),items,uid:`state-${i}`});
  return `<div><p class="caption" style="text-align:left;margin:0 0 8px">${label}</p>${
   frame(label,templates['dossier-header.hbs'](ctx),860,130)}</div>`;
 }).join('');
 await write('states','Consciousness header states',page('Dossier · consciousness states',
  `<div style="display:flex;flex-direction:column;gap:20px">${blocks}</div>${hidden(SPRITE)}`,1040,700));
}
// Item sheets: an action, a consumable drawn as its kit object, a wound on its figure, a loadout slip, and plain gear.
{
 const items=[
  ['item','Item sheet · field action',doc(CONTENT.moves,'strike-the-nape')],
  ['item-consumable','Item sheet · consumable with its kit preview',doc(CONTENT.gear,'titan-slaying-blade',{quantity:4,capacity:6})],
  ['item-wound','Item sheet · wound with its figure',wound('leftLeg','major','cutting',1,{source:'Injuries',description:'<p>Consult the Injuries and The Four Types of Injuries rules journals for consequences and treatment.</p>'})],
  ['item-loadout','Item sheet · loadout requisition slip',doc(CONTENT.loadouts,'scout-garrison-pack')],
  ['item-plain','Item sheet · gear that is not a consumable',doc(CONTENT.gear,'odm-gear')]
 ];
 for(const [name,caption,it] of items)
  await write(name,caption,page(`Dossier · ${name}`,frame(it.name,templates['item.hbs'](itemContext(it)),560,640,'tw-item','✕'),560,640));
}
// The roll dialog, built from the same helpers the system uses at runtime.
const {rollDialogContent,reachNote}=await import('../module/roll-dialog.mjs');
const dialogDerived=derive(SYSTEM,ITEMS,'soldier',{});
const dialogBody=rollDialogContent({stat:'technique',stats:dialogDerived.stats,fatigue:SYSTEM.fatigue,lowConsciousness:!!dialogDerived.combatDifficult,
 warning:'This character is unconscious; only roll if the GM allows it.',difficult:SYSTEM.nextDifficult,combat:true,messageMode:'public',
 note:reachNote(meleeReach(dialogDerived,SYSTEM))});
await write('dialog','Roll dialog',page('Dossier · dialog',
 `<div class="tw tw-roll application frame" style="width:350px;height:auto;min-height:0">
   <div class="bar"><span>Strike the nape</span><span>✕</span></div>
   <div class="content window-content" style="flex:0 0 auto">
    <form class="dialog-form"><div class="dialog-content"><div class="tw-dialog">${dialogBody}</div></div>
    <footer class="form-footer"><button type="submit" class="" data-action="apply"><span>Roll 2d6</span></button><button type="button" class="" data-action="cancel"><span>Cancel</span></button></footer></form>
   </div></div>
  ${hidden(SPRITE)}
  <script type="module">import {wireRollDialog} from '../module/roll-dialog.mjs';const d=document.querySelector('.tw-roll');wireRollDialog(d);d.querySelector('form').addEventListener('submit',e=>e.preventDefault());</script>`,350,520));
// Every other system dialog, in the same DialogV2 frame, with the window class and width actions.mjs gives it.
{
 const dialog=(caption,cls,width,title,body,buttons=[['apply','Apply'],['cancel','Cancel']])=>
  `<div><p class="caption" style="text-align:left;margin:0 0 8px">${caption}</p><div class="tw ${cls} application frame" style="width:${width}px;height:auto;min-height:0">
   <div class="bar"><span>${esc(title)}</span><span>✕</span></div>
   <div class="content window-content" style="flex:0 0 auto">
    <form class="dialog-form"><div class="dialog-content"><div class="tw-dialog">${body}</div></div>
    <footer class="form-footer">${buttons.map(([action,label],i)=>`<button type="${i?'button':'submit'}" class="" data-action="${action}"><span>${esc(label)}</span></button>`).join('')}</footer></form>
   </div></div></div>`;
 const pack=CONTENT.loadouts[0];
 const panels=[
  dialog('packageContent','tw-slips',380,'Character stat package',packageContent('rookie'),[['apply','Choose'],['cancel','Cancel']]),
  dialog('assignContent · soldier','tw-assign',380,'Assign your six stats',assignContent('soldier'),[['apply','Assign'],['cancel','Cancel']]),
  dialog('loadoutContent','tw-slips',430,'Equip a starting loadout',loadoutContent(CONTENT.loadouts),[['apply','Requisition'],['cancel','Cancel']]),
  dialog('loadoutChoiceContent','tw-slips',430,pack.name,loadoutChoiceContent(pack),[['apply','Equip'],['cancel','Cancel']]),
  dialog('advanceContent · one advanced, one at +3','tw-advance',330,'GM-awarded advancement',advanceContent(SYSTEM.stats,SYSTEM.advanced),[['apply','Increase'],['cancel','Cancel']]),
  dialog('woundContent','tw-wound',400,'Record a GM-assigned injury',woundContent(),[['apply','Record injury'],['cancel','Cancel']]),
  dialog('treatContent · treatment','tw-treat',380,'Apply GM-approved treatment',treatContent(wound('chest','major','cutting',1),false),[['apply','Apply treatment'],['cancel','Cancel']]),
  dialog('treatContent · amputation','tw-treat',380,'Amputate and dress the stump',treatContent(wound('leftLeg','crippling','blunt',1),true),[['apply','Apply treatment'],['cancel','Cancel']]),
  dialog('consequenceContent','tw-consequence',380,'Apply a GM consequence',consequenceContent({targets:[{uuid:'Actor.a',name:'Ilse Weyland',tag:'rolled'},
   {uuid:'Actor.b',name:'Cpl. M. Adler',tag:'targeted'},{uuid:'Actor.c',name:'Recruit Faust'},{uuid:'Actor.t',name:'Abnormal, 12 m'}],selected:'Actor.b'}),[['apply','Continue'],['cancel','Cancel']]),
  dialog('consciousnessContent','tw-stepper',300,'Change consciousness',consciousnessContent({value:2,max:4,loss:1})),
  dialog('restContent','tw-rest',340,'Apply overnight rest',restContent()),
  dialog('shiftContent · entering','tw-shift',380,'Enter Titan form',shiftContent({active:false}),[['apply','Apply form'],['cancel','Cancel']]),
  dialog('shiftContent · leaving','tw-shift',380,'Leave Titan form',shiftContent({active:true}),[['apply','Apply form'],['cancel','Cancel']]),
  dialog('partyLuckContent','tw-luck',330,'Create shared party luck',partyLuckContent({players:3,max:3}),[['apply','Create'],['cancel','Cancel']]),
  dialog('confirm','tw-confirm',320,'Equip loadout',`<div class="cf-slip"><i class="cf-mark" aria-hidden="true">Confirm</i><p>${esc(`Add ${pack.name} to Ilse Weyland? Existing equipment will remain.`)}</p></div>`,[['yes','Confirm'],['no','Cancel']])
 ];
 await write('dialogs','Every system dialog, wired',page('Dossier · dialogs',
  `${panels.join('')}${hidden(SPRITE)}
  <script type="module">import {wireDialog} from '../module/dialogs.mjs';import {dialogIntro} from '../module/fx.mjs';
for(const d of document.querySelectorAll('.application.frame')){wireDialog(d);d.querySelector('form').addEventListener('submit',e=>e.preventDefault());dialogIntro(d);}</script>`,380,520));
}
// Chat cards, rendered through the real builder with the Foundry surfaces it touches stubbed out.
globalThis.foundry={applications:{ux:{TextEditor:{enrichHTML:async html=>html}}}};
const {rollContent}=await import('../module/rolls.mjs');
const fakeRoll=(a,b,mod)=>({total:a+b+mod,dice:[{results:[{active:true,result:a},{active:true,result:b}]}]});
const meta=(name,stat,mods,extra={})=>({name,stat,actorName:extra.actorName??'Ilse Weyland',actorImg:extra.actorImg,
 modifiers:{stat:mods.stat??0,advantage:mods.advantage??0,modifier:mods.modifier??0,fatigue:mods.fatigue??0},
 difficult:!!extra.difficult,moveKey:extra.moveKey??'',moveData:null,luckBonus:extra.luckBonus??0,revision:0});
{
 const luck={requester:'Ilse Weyland',actorImg:PORTRAIT,rollName:'Strike the nape',kind:'plus',value:3,max:5};
 const cards=[
  ['Success with a source move',await rollContent(meta('Strike the nape','technique',{stat:1,advantage:1},{moveKey:'strike-the-nape',actorImg:PORTRAIT}),fakeRoll(5,4,2))],
  ['Partial result',await rollContent(meta('Face fear','heart',{stat:0,modifier:-1},{moveKey:'face-fear',actorImg:PORTRAIT}),fakeRoll(4,4,-1))],
  ['Snake eyes on a difficult roll',await rollContent(meta('Dodge a bullet','agility',{stat:2,fatigue:-1},{difficult:true,moveKey:'dodge-a-bullet',actorImg:PORTRAIT}),fakeRoll(1,1,1))],
  ['No photograph on file, after a luck spend',await rollContent(meta('Rally a comrade','duty',{stat:1},{luckBonus:1,actorName:'Recruit Faust'}),fakeRoll(6,3,1),'Previous total 10. Party luck spent for +1.')],
  ['Party luck requested · +1',luckRequestCard(luck)],
  ['Party luck approved · reroll',luckApprovedCard({...luck,kind:'reroll',value:2})],
  ['Party luck declined · no photograph',luckDeclinedCard({...luck,requester:'Recruit Faust',actorImg:'',rollName:'Rally a comrade'})],
  ['Flare fired',flareCard({actorName:'Ilse Weyland',actorImg:PORTRAIT,name:'Green Flare',colour:'#3f9a4a'})],
  ['Injury report',woundCard({actorName:'Ilse Weyland',actorImg:PORTRAIT,wound:wound('leftLeg','major','cutting',1),uid:'card-wound'})],
  ['Killed in action',deathCard({actorName:'Cpl. M. Adler'})],
  ['Titan transformation',shiftCard({actorName:'Ilse Weyland',actorImg:PORTRAIT,power:'Attack Titan'})]
 ];
 await write('chat','Chat cards · rolls, party luck and events',page('Dossier · chat',
  `<div style="display:flex;flex-direction:column;gap:22px;width:290px">${
   cards.map(([label,html])=>`<div><p class="caption" style="text-align:left;margin:0 0 8px">${label}</p>${html}</div>`).join('')
  }</div>${hidden(SPRITE+KIT_SPRITE)}`));
}
// Every wound treatment at all three gore levels, so the diagram can be judged in one place.
{
 const w=(region,severity,injuryType,extra={})=>wound(region,severity,injuryType,0,extra);
 const scenarios=[
  ['Uninjured',[]],
  ['Minor · blunt, cut, pierced, burn',[w('head','minor','blunt'),w('chest','minor','cutting'),w('rightArm','minor','piercing'),w('leftLeg','minor','burn')]],
  ['Major · pierced jaw, gash, broken arm, burn',[w('head','major','piercing'),w('chest','major','cutting'),w('leftArm','major','blunt'),w('rightLeg','major','burn')]],
  ['Crippling, untreated',[w('rightArm','crippling','cutting'),w('leftArm','crippling','blunt'),w('rightLeg','crippling','burn'),w('chest','crippling','piercing')]],
  ['Treated and healed',[w('leftLeg','crippling','blunt',{treated:true}),w('rightArm','major','cutting',{treated:true}),w('leftArm','major','blunt',{treated:true}),w('head','minor','cutting',{healed:true}),w('rightLeg','crippling','cutting',{healed:true})]],
  ['Killed · crippling head wound',[w('head','crippling','cutting'),w('chest','major','piercing')],{dead:true}],
  ['Titan · bitten, armour broken',[w('chest','major','cutting',{formScope:'titan'}),w('leftArm','crippling','cutting',{formScope:'titan'}),w('rightLeg','major','burn',{formScope:'titan'})],{titan:true,bites:{bites:4,major:3,crippling:5},armour:{intact:false}}],
  ['Titan · decapitated',[w('head','crippling','cutting',{formScope:'titan'})],{titan:true,armour:{intact:true}}]
 ];
 const rows=scenarios.map(([caption,items,options={}],i)=>`<div class="fig-row"><p class="caption">${caption}</p>${
  ['graphic','restrained','clinical'].map(gore=>`<div class="tw-gore-${gore}"><figure class="bodyfig">${bodyFigure(items,{...options,uid:`s${i}-${gore}`})}<figcaption><span>${gore}</span><span>R · L</span></figcaption></figure></div>`).join('')
 }<div class="mini-cell"><figure class="bodyfig">${bodyFigure(items,{...options,uid:`s${i}-mini`,mini:true})}</figure></div></div>`).join('');
 await write('figures','Body diagram · every treatment at three gore levels',page('Dossier · body diagram',
  `<style>.fig-board{width:100%;display:flex;flex-direction:column;gap:18px;color:#ece2cb}.fig-row{display:grid;grid-template-columns:repeat(3,210px) 70px;gap:12px;justify-content:center;align-items:end}.fig-row>.caption{grid-column:1/-1;text-align:left}</style>
  <div class="tw fig-board">${rows}</div>`));
}
// The effects lab: the real sheet, cards and effects wired to buttons, so motion can be judged
// without a Foundry world. Sheet states are pre-rendered and swapped the way a re-render would.
{
 const variants={};
 const put=(key,options)=>{variants[key]=templates['actor.hbs'](buildContext('record',{uid:'lab',...options}));};
 for(const loss of [0,1,2,3,5])put(`c${loss}`,{system:sys(SYSTEM,{consciousness:{loss}})});
 for(const fatigue of [0,1,2,3])put(`f${fatigue}`,{system:sys(SYSTEM,{fatigue})});
 for(const luck of [1,2,3,4,5])put(`l${luck}`,{luck});
 for(const fear of ['steady','shaken','frozen'])put(`fear-${fear}`,{system:sys(SYSTEM,{fear})});
 put('dead',{system:sys(SYSTEM,{dead:true})});
 put('wound',{items:[...ITEMS,wound('leftLeg','crippling','cutting',1)]});
 const labCards={
  success:await rollContent(meta('Strike the nape','technique',{stat:1,advantage:1},{moveKey:'strike-the-nape',actorImg:PORTRAIT}),fakeRoll(5,4,2)),
  luck:await rollContent(meta('Strike the nape','technique',{stat:1,advantage:1},{moveKey:'strike-the-nape',actorImg:PORTRAIT,luckBonus:1}),fakeRoll(5,4,2),'Previous total 11. Party luck spent for +1.'),
  partial:await rollContent(meta('Face fear','heart',{stat:0,modifier:-1},{moveKey:'face-fear',actorImg:PORTRAIT}),fakeRoll(4,4,-1)),
  doubleSix:await rollContent(meta('Rally a comrade','duty',{stat:1},{moveKey:'rally-a-comrade',actorImg:PORTRAIT}),fakeRoll(6,6,1)),
  snakeEyes:await rollContent(meta('Dodge a bullet','agility',{stat:2,fatigue:-1},{difficult:true,moveKey:'dodge-a-bullet',actorImg:PORTRAIT}),fakeRoll(1,1,1))
 };
 const button=(lab,label,extra='')=>`<button type="button" data-lab="${lab}"${extra}>${label}</button>`;
 const group=(title,buttons)=>`<div class="lab-group"><b>${title}</b>${buttons.join('')}</div>`;
 const bar=[
  group('Settings',[`<select data-setting="motion"><option value="full">Motion full</option><option value="subtle">Motion subtle</option><option value="off">Motion off</option></select>`,
   `<select data-setting="gpu"><option value="auto">GPU auto</option><option value="on">GPU on</option><option value="off">GPU off</option></select>`]),
  group('Consciousness',[0,1,2,3,5].map(loss=>button(`state:c${loss}`,`Loss ${loss}`))),
  group('Fatigue',[0,1,2,3].map(n=>button(`state:f${n}`,String(n)))),
  group('Luck',[1,2,3,4,5].map(n=>button(`state:l${n}`,String(n)))),
  group('Fear',['steady','shaken','frozen'].map(f=>button(`state:fear-${f}`,f))),
  group('Events',[button('wound','Wound lands'),button('death','Death'),button('shift','Transform')]),
  group('Roll cards',[button('card:success','10+'),button('card:partial','7–9'),button('card:snakeEyes','Snake eyes'),button('card:doubleSix','Double six'),button('luck','Luck +1 on last')]),
  group('Effects',['sparks','shock','embers','spatter','ash','steam','lightning','glint','puff','dust'].map(k=>button(`fx:${k}`,k)).concat(
   [['#4fbf5a','Green flare'],['#d23c2c','Red flare'],['#3b3530','Black flare']].map(([color,label])=>button('fx:flare',label,` data-color="${color}"`))))
 ].join('');
 const script=`import {wireSheet,queueImpact} from '../module/sheet-fx.mjs';
import {revealCard,retally} from '../module/chat-fx.mjs';
import {effect} from '../module/fx.mjs';
import {applyBodyClasses} from '../module/settings.mjs';
const frame=document.querySelector('.lab-stage .frame'),content=frame.querySelector('.window-content'),log=document.getElementById('lab-log');
const app={document:{id:'lab'},element:frame};let current='c1';
function show(key){const t=document.getElementById('v-'+key);if(!t)return;content.innerHTML=t.innerHTML;current=key;wireSheet(app,content,{tabChanged:false});}
function post(kind){const wrap=document.createElement('div');wrap.className='lab-msg';wrap.dataset.kind=kind;wrap.innerHTML=document.getElementById('card-'+kind).innerHTML;log.append(wrap);const card=wrap.querySelector('.tw.chat-card');card.classList.add('tw-pre');log.scrollTop=log.scrollHeight;requestAnimationFrame(()=>revealCard(card));}
function luck(){const wrap=[...log.querySelectorAll('.lab-msg[data-kind=success]')].at(-1);if(!wrap)return post('success');wrap.dataset.kind='luck';wrap.innerHTML=document.getElementById('card-luck').innerHTML;retally(wrap.querySelector('.tw.chat-card'),11,12);}
applyBodyClasses();show('c1');
document.addEventListener('change',event=>{const s=event.target.closest('[data-setting]');if(!s)return;globalThis.__twSettings={...(globalThis.__twSettings??{}),[s.dataset.setting]:s.value};applyBodyClasses();});
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-lab]');if(!b)return;
 const [kind,arg]=b.dataset.lab.split(':');
 if(kind==='state')show(arg);
 if(kind==='wound'){queueImpact('lab',{kind:'wound',severity:'crippling',region:'leftLeg'});show('wound');}
 if(kind==='death'){queueImpact('lab',{kind:'death'});show('dead');}
 if(kind==='shift'){queueImpact('lab',{kind:'shift'});show(current);}
 if(kind==='card')post(arg);
 if(kind==='luck')luck();
 if(kind==='fx')effect(arg,document.getElementById('lab-target'),{color:b.dataset.color});
});`;
 await write('lab','Effects lab · sheet states, events, roll cards and effects on buttons',page('Dossier · effects lab',
  `<style>
   .lab-bar{position:sticky;top:0;z-index:60;width:100%;display:flex;flex-wrap:wrap;gap:6px 14px;padding:8px 10px;background:#1b1714ee;border-bottom:1px solid #3a2a1e}
   .lab-group{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font:10px "TW Archive",monospace;letter-spacing:.12em;text-transform:uppercase;color:#a89878}
   .lab-group b{font-weight:400;margin-right:3px;color:#d9c8a6}
   .lab-bar button,.lab-bar select{font:10px "TW Archive",monospace;letter-spacing:.06em;color:#241f1b;background:#e9dfc6;border:1px solid #6e5325;padding:3px 7px;cursor:pointer}
   .lab-bar button:hover{background:#f4ecd8}
   .lab-stage{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap;justify-content:center}
   .lab-chat{width:290px;display:flex;flex-direction:column;gap:8px}
   #lab-log{display:flex;flex-direction:column;gap:10px;max-height:620px;overflow:auto;padding:4px}
   #lab-target{height:90px;border:1px dashed #6e5325;display:grid;place-items:center;font:10px "TW Archive",monospace;letter-spacing:.2em;text-transform:uppercase;color:#a89878}
  </style>
  <header class="lab-bar">${bar}</header>
  <div class="lab-stage">${frame('Ilse Weyland — overview','')}
   <aside class="lab-chat"><div id="lab-target">Effect target</div><p class="caption" style="text-align:left">Chat log</p><div id="lab-log"></div></aside>
  </div>
  ${Object.entries(variants).map(([key,html])=>`<template id="v-${key}">${html}</template>`).join('')}
  ${Object.entries(labCards).map(([key,html])=>`<template id="card-${key}">${html}</template>`).join('')}
  ${hidden(SPRITE)}
  <script type="module">${script}</script>`));
}
// The page index. An older hand-made index.html is left alone; the list then goes to pages.html.
{
 const existing=await fs.readFile(path.join(out,'index.html'),'utf8').catch(()=>'');
 const file=!existing||existing.includes('data-tw-nav')?'index.html':'pages.html';
 await fs.writeFile(path.join(out,file),page('Dossier · preview pages',
  `<style>.tw-nav{width:620px;color:#d9c8a6;font:12px "TW Archive",monospace;letter-spacing:.06em}.tw-nav h1{font:22px "TW Display",serif;margin:0 0 14px;color:#ece2cb}.tw-nav ol{margin:0;padding:0;list-style:none;display:grid;gap:6px}.tw-nav li{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:6px 0;border-bottom:1px solid #3a2a1e}.tw-nav a{color:#ece2cb}.tw-nav small{color:#a89878}</style>
  <nav class="tw-nav" data-tw-nav><h1>Titan World · preview pages</h1><ol>${pages.map(([name,caption])=>`<li><a href="${name}.html">${name}</a><small>${esc(caption)}</small></li>`).join('')}</ol></nav>`,620,400),'utf8');
 console.log(`Preview written to preview/ (${file} lists them): `+pages.map(p=>p[0]).join(', '));
}
