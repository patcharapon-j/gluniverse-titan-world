// Development harness: renders the real Handlebars templates against a fabricated
// actor so the dossier can be inspected in a browser without launching Foundry.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {STATS,REGIONS,derive} from '../module/rules.mjs';
import {CONTENT} from '../data/content.mjs';
import {SPRITE,STAT_ICON} from '../module/icons.mjs';
import {icon as iconMarkup} from '../module/icons.mjs';
import {injuryLedger,fieldKit,actionGroups,actionCategories,actionStats,actionRow,gearRow,
 consciousnessFormula,consciousnessTrack,statCards,reachRuler,biteTrack,FEAR} from '../module/dossier.mjs';

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

const item=(type,name,system={},id=Math.random().toString(36).slice(2,10))=>({type,name,id,img:'icons/svg/item-bag.svg',system});
const gear=(name,key,quantity,capacity,extra={})=>item('gear',name,{key,quantity,capacity,equipped:true,uses:0,bonusStat:'',bonus:0,...extra});
const wound=(region,severity,injuryType,loss,extra={})=>
 item('wound',`${REGIONS[region]} · ${severity} ${injuryType}`,{region,severity,injuryType,consciousnessLoss:loss,formScope:'human',treated:false,healed:false,fromMajor:false,...extra});

const ITEMS=[
 gear('Gas Canister','gas-canister',1,2),
 gear('Titan-Slaying Blade','titan-slaying-blade',2,6),
 gear('Green Flare','green-flare',2,3),
 gear('Bandages','bandages',3,3),
 gear('ODM Gear','odm-gear',1,1),
 gear('Water Canteen','water-canteen',0,1),
 gear('Tactical Knife','tactical-knife',1,1),
 gear('Extra Gas Canisters','extra-gas-canisters',1,1,{bonusStat:'agility',bonus:-1}),
 wound('leftArm','minor','piercing',0),
 wound('rightLeg','minor','blunt',0,{fromMajor:true,treated:true}),
 wound('chest','major','cutting',1),
 item('move','Cover the retreat',{key:'cover-the-retreat',stat:'duty',category:'Custom',source:'House rule',
  success:'Everyone behind you disengages cleanly.',difficult:false,combat:true})
];
const SYSTEM={
 stats:{agility:1,technique:1,mind:0,body:0,heart:1,duty:1},
 regiment:'Survey Corps',rank:'Private',origin:'Wall Rose · Trost',height:1.68,
 anchor:'Her brother Tomas, eleven, who still thinks she is stationed on the Wall.',
 drive:'She froze on the roof in Trost while a neighbour was taken.',
 background:'Born in the outer district of Trost to a cooper and a laundress.',notes:'',
 consciousness:{loss:1,titanLoss:0,maxAdjustment:-1,titanMaxAdjustment:0},
 fatigue:1,nextDifficult:true,dead:false,fear:'shaken',bites:2,
 advanced:{agility:true,technique:false,mind:false,body:false,heart:false,duty:false},
 shift:{active:false,experienced:false,armourIntact:true,weak:false,height:15,absorption:0,yearsRemaining:13,notes:''},
 luck:{value:3,max:5}
};

function buildContext(tab,{type='soldier',category='',stat=''}={}) {
 const SYS=type==='titan'?{...SYSTEM,height:7}:SYSTEM;
 const d=derive(SYS,ITEMS,type,{});
 const statRows=statCards(SYSTEM,ITEMS,d,{});
 const isParty=type==='party',isTitan=type==='titan';
 const definitions=isTitan
  ? [['record','Overview','hunting'],['injuries','Wounds','drop'],['background','Record','note']]
  : [['record','Overview','shield'],['actions','Actions','combat'],['injuries','Wounds','drop'],['equipment','Gear','pack'],['powers','Shifter','shifting'],['background','Record','note']];
 const warnings=[];
 if(d.combatDifficult)warnings.push({icon:'combat',tone:'warn',text:'Below half consciousness: every combat roll is difficult.'});
 if(d.restBlocked)warnings.push({icon:'bandage',tone:'warn',text:'Rest automatically fails while a major or untreated crippling wound stands.'});
 if(SYSTEM.nextDifficult)warnings.push({icon:'stamp',tone:'warn',text:'The next roll is marked difficult.'});
 if(!isTitan&&SYSTEM.fear==='shaken')warnings.push({icon:'wind',tone:'warn',text:'Shaken. Roll + Heart at every Titan sighting until you make a 10+.'});
 const bc=biteTrack(SYSTEM,d);
 if(bc.bites>0)warnings.push({icon:'drop',tone:bc.severity==='crippling'?'grave':bc.severity==='major'?'warn':'ok',text:bc.bites+' Titan bite'+(bc.bites===1?'':'s')+' recorded — '+bc.label.toLowerCase()+'. '+bc.hint});
 return {
  sprite:new hb.SafeString(SPRITE),
  actor:{name:'Ilse Weyland',img:'',id:'abcdef0123456789'},system:SYS,d,
  editable:true,isGM:true,isParty,isTitan,
  tabs:definitions.map(([key,label,icon],i)=>({key,label,icon,index:String(i+1).padStart(2,'0'),active:key===tab})),
  record:tab==='record',actions:tab==='actions',equipment:tab==='equipment',
  injuries:tab==='injuries',powers:tab==='powers',background:tab==='background',
  stats:statRows,anyModifier:statRows.some(row=>row.anyReason),
  ledger:injuryLedger(ITEMS,d.titan,false),
  kit:fieldKit(ITEMS),serial:'SC1040417',portraitAvailable:false,
  luckPips:Array.from({length:5},(_,i)=>({filled:i<3})),
  gear:ITEMS.filter(i=>i.type==='gear').map(gearRow),loadouts:[],
  ownedPowers:[],ownedMoves:ITEMS.filter(i=>i.type==='move').map(i=>actionRow(i,d,{owned:true})),
  quickActions:[['face-fear','eye','Titan sighted',true],
   ['line-up-a-nape-strike','target'],['strike-the-nape','blade'],['evade-a-titan-s-grasp','agility'],
   ['rally-a-comrade','flag'],['first-aid','recovery']]
   .map(([key,icon,alias,primary])=>{const m=CONTENT.moves.find(x=>x.system.key===key);return m?actionRow(m,d,{icon,alias,primary}):null;}).filter(Boolean),
  actionCategories:actionCategories(CONTENT.moves,category),
  actionStats:actionStats(CONTENT.moves,d,stat),
  actionGroups:actionGroups(CONTENT.moves,d,{category,stat}),actionCount:CONTENT.moves.length,
  party:{id:'p',name:'Party luck',value:3,max:5},
  roster:[{id:'a',name:'Ilse Weyland',img:'',value:2,max:3,status:'Conscious',tone:'warn'},
   {id:'b',name:'Cpl. M. Adler',img:'',value:5,max:5,status:'Conscious',tone:'ok'},
   {id:'c',name:'Recruit Faust',img:'',value:0,max:4,status:'Unconscious',tone:'grave'}],
  lossPath:'system.consciousness.loss',loss:SYSTEM.consciousness.loss,
  maxPath:'system.consciousness.maxAdjustment',maxAdjustment:SYSTEM.consciousness.maxAdjustment,
  formula:consciousnessFormula(SYSTEM,d,false),warnings,
  track:consciousnessTrack(SYSTEM,d,false),
  reach:reachRuler(SYS,d),
  bites:biteTrack(SYSTEM,d),
  fear:{...FEAR[SYSTEM.fear],states:Object.values(FEAR).map(f=>({...f,on:f.key===SYSTEM.fear}))},
  critical:!d.mindless&&d.max>0&&d.value<=Math.ceil(d.max/3),
  statusTone:SYSTEM.dead?'grave':d.mindless?'ok':d.value<=0?'grave':d.combatDifficult?'warn':'ok'
 };
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

function page(title,body,width=980,height=860){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>
${fontFaces}
${css.replace(/@font-face\{[^}]*\}/g,'')}
html,body{margin:0;background:radial-gradient(ellipse at 50% 0%,rgba(120,90,50,.16),transparent 60%),radial-gradient(ellipse at 50% 100%,rgba(0,0,0,.6),transparent 60%),#100e0c;min-height:100%;padding:26px;display:flex;flex-wrap:wrap;gap:26px;justify-content:center;align-items:flex-start;font-family:sans-serif}
.frame{width:${width}px;height:${height}px;display:flex;flex-direction:column;position:relative}
.frame>.bar{height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font:11px "TW Archive",monospace;letter-spacing:.16em;text-transform:uppercase;color:#d9c8a6;position:relative;z-index:2}
.frame>.content{flex:1;min-height:0;background:#ece2cb;position:relative;overflow:hidden;container-type:inline-size}
.caption{color:#6a6058;font:11px "TW Archive",monospace;letter-spacing:.14em;text-transform:uppercase;width:100%;text-align:center;margin:0}
</style></head><body>${body}
<script>
 const q=new URLSearchParams(location.search);
 if(q.get('zoom'))document.body.style.zoom=q.get('zoom');
 if(q.get('pan'))(document.querySelector('.sheet-body')||document.querySelector('.frame .content')).scrollTop=Number(q.get('pan'));
</script></body></html>`;
}
const frame=(label,html,width=980,height=860)=>
 `<div class="tw tw-actor application frame" style="width:${width}px;height:${height}px">
  <div class="bar"><span>${label}</span><span>Sheet · Token · ✕</span></div>
  <div class="content window-content">${html}</div></div>`;

const out=path.join(root,'preview');
await fs.mkdir(out,{recursive:true});
const views=[
 ['overview','record',{}],['actions','actions',{}],['wounds','injuries',{}],
 ['gear','equipment',{}],['shifter','powers',{}],['record','background',{}]
];
for(const [name,tab,options] of views){
 const html=templates['actor.hbs'](buildContext(tab,options));
 await fs.writeFile(path.join(out,`${name}.html`),page(`Dossier · ${name}`,frame(`Ilse Weyland — ${name}`,html)),'utf8');
}
// The unlocked Shifter branch, which only appears once a power is on file.
{
 const ctx=buildContext('powers');
 ctx.ownedPowers=[
  {id:'p1',name:'Attack Titan',system:{equipped:true,bonusStat:''}},
  {id:'p2',name:'Founding Titan',system:{equipped:false,bonusStat:''}},
  {id:'p3',name:'War Hammer Titan',system:{equipped:false,bonusStat:'technique'}}
 ];
 await fs.writeFile(path.join(out,'shifter-open.html'),
  page('Dossier · shifter open',frame('Ilse Weyland — shifter',templates['actor.hbs'](ctx))),'utf8');
}
// The consciousness track has four box states and a below-zero row; show them side by side.
{
 const variants=[
  ['Untouched',{loss:0,maxAdjustment:0},[]],
  ['Wounded, maximum reduced',{loss:1,maxAdjustment:-1},ITEMS],
  ['Past the death threshold',{loss:7,maxAdjustment:0},ITEMS]
 ];
 const blocks=variants.map(([label,consciousness,items])=>{
  const system={...SYSTEM,consciousness:{...SYSTEM.consciousness,...consciousness}};
  const d=derive(system,items,'soldier',{});
  const ctx={...buildContext('record'),system,d,
   track:consciousnessTrack(system,d,false),
   reach:reachRuler(system,d),
   bites:biteTrack(system,d),
   formula:consciousnessFormula(system,d,false),
   critical:d.max>0&&d.value<=Math.ceil(d.max/3),
   statusTone:d.value<=0?'grave':d.combatDifficult?'warn':'ok'};
  return `<div><p class="caption" style="text-align:left;margin:0 0 8px">${label}</p>${
   frame(label,templates['dossier-header.hbs'](ctx),980,180)}</div>`;
 }).join('');
 await fs.writeFile(path.join(out,'states.html'),
  page('Dossier · consciousness states',`<div style="display:flex;flex-direction:column;gap:20px">${blocks}</div>
  <div style="position:absolute;width:0;height:0;overflow:hidden">${SPRITE}</div>`,1040,700),'utf8');
}
// A narrow window and the mindless-Titan actor take different layout branches.
await fs.writeFile(path.join(out,'narrow.html'),
 page('Dossier · narrow',frame('Ilse Weyland — narrow',templates['actor.hbs'](buildContext('record')),660,800),660,800),'utf8');
await fs.writeFile(path.join(out,'titan.html'),
 page('Dossier · titan',frame('Abnormal, 12 m',templates['actor.hbs'](buildContext('record',{type:'titan'})))),'utf8');
// Party sheet
const partyContext={...buildContext('record',{type:'party'}),isParty:true};
partyContext.actor={name:'Party luck',img:'',id:'partyid0000'};
await fs.writeFile(path.join(out,'party.html'),
 page('Dossier · party',frame('Party luck',templates['actor.hbs'](partyContext),820,620),820,620),'utf8');
// Item sheet
const move=CONTENT.moves.find(m=>m.system.key==='strike-the-nape');
const itemContext={sprite:new hb.SafeString(SPRITE),item:{name:move.name,img:'icons/svg/d20.svg',type:'move'},
 system:move.system,editable:true,kind:'Field action',stats:STATS,regions:REGIONS,
 isMove:true,isWound:false,isGear:false,isPower:false,statLabel:STATS[move.system.stat],
 description:new hb.SafeString(move.system.description),
 severity:{minor:'Minor',major:'Major',crippling:'Crippling'},
 injuryTypes:{blunt:'Blunt',cutting:'Cutting',piercing:'Piercing / ballistic',burn:'Burn'},
 formScopes:{human:'Human body',titan:'Titan body'},bonusStats:{'':'None',...STATS}};
await fs.writeFile(path.join(out,'item.html'),
 page('Dossier · item',`<div class="tw tw-item application frame" style="width:660px;height:760px">
  <div class="bar"><span>Strike the nape</span><span>✕</span></div>
  <div class="content window-content">${templates['item.hbs'](itemContext)}</div></div>`,660,760),'utf8');
// The roll dialog, built from the same helpers the system uses at runtime.
const {field:dlgField,select:dlgSelect,check:dlgCheck}=await import('../module/ui.mjs');
const dialogBody=`${dlgSelect('Stat','stat',STATS,'technique')}
<div class="grid2">${dlgField('Advantage (0 to 3)','advantage',0,'number')}${dlgField('Other modifier','modifier',0,'number')}</div>
<div class="checks">${dlgCheck('Difficult roll — below 10 always fails','difficult')}${dlgCheck('Combat roll — apply low-consciousness difficulty','combat',true)}</div>
${dlgSelect('Visibility','messageMode',{public:'Public',gm:'GM and me',blind:'GM only',self:'Only me'},'public')}
<p class="note">Advantage is capped at +3. Agility includes dodge fatigue. The GM decides when a roll is possible.</p>`;
await fs.writeFile(path.join(out,'dialog.html'),page('Dossier · dialog',
 `<div class="tw application frame" style="width:420px;height:auto;min-height:0">
   <div class="bar"><span>Strike the nape</span><span>✕</span></div>
   <div class="content window-content" style="flex:0 0 auto">
    <div class="tw-dialog"><p class="warning">This character is unconscious; only roll if the GM allows it.</p>${dialogBody}</div>
    <footer class="form-footer"><button type="button" class="default">Roll 2d6</button><button type="button">Cancel</button></footer>
   </div></div>
  <div style="position:absolute;width:0;height:0;overflow:hidden">${SPRITE}</div>`,420,520),'utf8');
// Chat cards, rendered through the real builder with the Foundry surfaces it touches stubbed out.
globalThis.foundry={applications:{ux:{TextEditor:{enrichHTML:async html=>html}}}};
const {rollContent}=await import('../module/rolls.mjs');
const fakeRoll=(a,b,mod)=>({total:a+b+mod,dice:[{results:[{active:true,result:a},{active:true,result:b}]}]});
// A stand-in portrait, so the hero band can be judged with and without a photograph.
const PORTRAIT='data:image/svg+xml;utf8,'+encodeURIComponent(
 `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140"><rect width="120" height="140" fill="#b9a882"/>`+
 `<circle cx="60" cy="52" r="27" fill="#5d4b36"/><path d="M14 140c0-30 20-46 46-46s46 16 46 46z" fill="#4a3b2a"/>`+
 `<path d="M33 44c4-22 50-26 55-2 2 10-2 14-4 6-4-14-40-14-46 2-2 6-6 2-5-6z" fill="#31261a"/></svg>`);
const meta=(name,stat,mods,extra={})=>({name,stat,actorName:extra.actorName??'Ilse Weyland',actorImg:extra.actorImg,
 modifiers:{stat:mods.stat??0,advantage:mods.advantage??0,modifier:mods.modifier??0,fatigue:mods.fatigue??0},
 difficult:!!extra.difficult,moveKey:extra.moveKey??'',moveData:null,luckBonus:extra.luckBonus??0,revision:0});
const cards=[
 ['Success with a source move',await rollContent(meta('Strike the nape','technique',{stat:1,advantage:1},{moveKey:'strike-the-nape',actorImg:PORTRAIT}),fakeRoll(5,4,2))],
 ['Partial result',await rollContent(meta('Face fear','heart',{stat:0,modifier:-1},{moveKey:'face-fear',actorImg:PORTRAIT}),fakeRoll(4,4,-1))],
 ['Snake eyes on a difficult roll',await rollContent(meta('Dodge a bullet','agility',{stat:2,fatigue:-1},{difficult:true,moveKey:'dodge-a-bullet',actorImg:PORTRAIT}),fakeRoll(1,1,1))],
 ['No photograph on file, after a luck spend',await rollContent(meta('Rally a comrade','duty',{stat:1},{luckBonus:1,actorName:'Recruit Faust'}),fakeRoll(6,3,1),'Previous total 10. Party luck spent for +1.')]
];
await fs.writeFile(path.join(out,'chat.html'),page('Dossier · chat',
 `<div style="display:flex;flex-direction:column;gap:22px;width:440px">${
  cards.map(([label,html])=>`<div><p class="caption" style="text-align:left;margin:0 0 8px">${label}</p>${html}</div>`).join('')
 }</div><div style="position:absolute;width:0;height:0;overflow:hidden">${SPRITE}</div>`),'utf8');
console.log('Preview written to preview/: '+[...views.map(v=>v[0]),'party','item','chat','narrow','titan','dialog','shifter-open','states'].join(', '));
