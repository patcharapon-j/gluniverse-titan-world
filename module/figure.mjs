// The body diagram: an appearance-neutral anatomical study drawn front-on, with the
// character's right side on the viewer's left, and every recorded wound painted onto the
// region it struck. Gore is chosen per viewer, so all three treatments are in the markup
// and the stylesheet shows the one this viewer asked for.
const SEVERITY={minor:1,major:2,crippling:3};
const SEVERITY_NAME=[null,'minor','major','crippling'];
const LIMB=new Set(['leftArm','rightArm','leftLeg','rightLeg']);
const REGION_NAME={head:'Head',chest:'Chest',leftArm:'L. arm',rightArm:'R. arm',leftLeg:'L. leg',rightLeg:'R. leg'};
const TYPE_NAME={blunt:'blunt',cutting:'cut',piercing:'pierced',burn:'burn'};
// Paint order: legs behind the torso, arms over its sides, the head over the collar.
const ORDER=['rightLeg','leftLeg','chest','rightArm','leftArm','head'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=text=>[...String(text)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);

// Anatomical partitions of the rendered 200 x 400 plate. All regions share one image,
// so their boundaries are invisible until an injury removes or deforms a limb.
const ASSET='systems/gluniverse-titan-world/assets/anatomy/';
const BODY=ASSET+'body-cadet-mask.png';
const CADET_BODY=ASSET+'body-cadet.png';
const ARMOURED_BODY=ASSET+'titan-armoured.png';
const BROKEN_BODY=ASSET+'titan-armoured-broken.png';
const TITAN_BODY=ASSET+'titan-render.png';
const ORDINARY_BODY=ASSET+'titan-ordinary.png';
export const titanFigureVariant=items=>{const powers=Array.from(items??[]).filter(i=>i.type==='power'&&i.system.equipped);return powers.some(i=>i.system.key==='armoured-titan')?'armoured':powers.some(i=>i.system.key==='colossal-titan')?'colossal':'ordinary';};
const ATLAS=ASSET+'wound-atlas.png';
const TREATMENT=ASSET+'treatment-painted.png';
const TREATMENT_ALPHA=ASSET+'treatment-atlas.png';
const HUMAN={
 head:{upper:[['surface','M0 0H200V72H0Z']]},
 chest:{upper:[['surface','M65 72H135L128 110 128 140 140 180 145 200H55L60 180 72 140 72 110Z']]},
 rightArm:{cut:[53,141,9],upper:[['surface','M0 72H65L72 110V141H0Z']],lower:[['surface','M0 141H72L60 180 55 200V236H0Z']]},
 rightLeg:{cut:[77,278,13],upper:[['surface','M55 200H100V278H55Z']],lower:[['surface','M50 278H100V400H50Z']]}
};
const mirror=list=>list.map(([cls,d])=>[cls,d,'mirror']);
HUMAN.leftArm={cut:[147,141,9],upper:mirror(HUMAN.rightArm.upper),lower:mirror(HUMAN.rightArm.lower)};
HUMAN.leftLeg={cut:[123,278,13],upper:mirror(HUMAN.rightLeg.upper),lower:mirror(HUMAN.rightLeg.lower)};
const TITAN={
 head:{upper:[['surface','M0 0H200V57H0Z']]},
 chest:{upper:[['surface','M53 57H147L133 97 130 125 148 170 152 190H48L52 170 70 125 67 97Z']]},
 rightArm:{cut:[43,130,13],upper:[['surface','M0 57H53L67 97 70 130H0Z']],lower:[['surface','M0 130H70L52 170 48 190V236H0Z']]},
 rightLeg:{cut:[72,260,18],upper:[['surface','M48 190H100V260H35Z']],lower:[['surface','M20 260H100V400H20Z']]}
};
TITAN.leftArm={cut:[157,130,13],upper:mirror(TITAN.rightArm.upper),lower:mirror(TITAN.rightArm.lower)};
TITAN.leftLeg={cut:[128,260,18],upper:mirror(TITAN.rightLeg.upper),lower:mirror(TITAN.rightLeg.lower)};
const SPOTS={head:[[100,28],[89,46],[111,46],[100,57]],chest:[[86,104],[114,116],[100,140],[90,172]],
 rightArm:[[58,98],[54,124],[51,160],[48,176]],leftArm:[[142,98],[146,124],[149,160],[152,176]],
 rightLeg:[[84,212],[86,252],[87,312],[86,346]],leftLeg:[[116,212],[114,252],[113,312],[114,346]]};
const TITAN_SPOTS={...SPOTS,head:[[100,24],[89,36],[111,36],[100,45]],
 rightArm:[[54,88],[44,119],[35,157],[30,183]],leftArm:[[146,88],[156,119],[165,157],[170,183]],
 rightLeg:[[75,213],[71,244],[66,294],[58,340]],leftLeg:[[125,213],[129,244],[134,294],[142,340]]};
const LABELS={head:{x:166,y:30,from:[122,34]},chest:{x:34,y:124,from:[86,104],end:true},leftArm:{x:166,y:176,from:[156,172]},
 leftLeg:{x:166,y:314,from:[124,312]},rightArm:{x:34,y:176,from:[44,172],end:true},rightLeg:{x:34,y:314,from:[76,312],end:true}};

// Wound art by type and severity, drawn around 0,0 at the spot it landed.
const ART={
 blunt:{
  minor:u=>`<ellipse class="bruise" rx="9" ry="7" fill="url(#${u}-bruise)"/>`,
  major:(u,limb)=>`<ellipse class="bruise" rx="13" ry="10" fill="url(#${u}-bruise-deep)"/>${limb
   ?'<path class="bone" d="M-5 1q5-9 10 0q-5-3-10 0z"/><path class="crack" d="M-2-4l2 3 2-2 1 3"/>'
   :'<path class="crack" d="M-9-4l4 2 3-3 4 4 5-1M-8 4l5-1 4 3 6-2"/>'}`,
  crippling:(u,limb,region)=>limb
   ?`<ellipse class="bruise" rx="15" ry="13" fill="url(#${u}-bruise-deep)"/><path class="blood" d="M-8 2c3 5 12 5 16 0-2 7-14 8-16 0z"/><path class="torn" d="M-9-6l3 2 2-3 3 3 2-2 3 3"/>`
   :region==='head'
    ?`<path class="cave" d="M-12-4c4-6 20-6 24 0-2 10-22 10-24 0z"/><path class="crack" d="M-12-4l-4-6M12-4l5-7M0-7v-6"/><path class="blood run" d="M-9 4c2 8 3 14 1 20M6 5c1 6 0 12 2 18"/>`
    :`<ellipse class="bruise" rx="18" ry="24" fill="url(#${u}-bruise-deep)"/><path class="crack spine" d="M0-30l3 8-4 7 4 8-3 8 4 9-3 9"/>`
 },
 cutting:{
  minor:()=>`<path class="torn" d="M-11-5L9 1"/><path class="cut" d="M-10-3L10 3"/><path class="blood thin" d="M-2 0q1 5 0 10M4 2q0 4 1 7"/>`,
  major:()=>`<path class="gash" d="M-13-5Q0-9 13 5Q0 2-13-5z"/><path class="gash-in" d="M-9-3Q0-5 9 3Q0 1-9-3z"/><path class="blood run" d="M-4 1q2 11 0 22M3 3q-1 9 1 16M-8-2q-1 6 0 10"/><circle class="blood" cy="23" r="1.6" cx="-.5"/>`,
  crippling:(_u,limb,region)=>limb?'':region==='head'
   ?`<path class="blood coat" d="M-20-20c10-8 30-8 40 0 4 14 2 30-6 38-8 4-20 4-28 0-8-8-10-24-6-38z"/><path class="gash" d="M-14-12L14 10L10 14L-16-8z"/>`
   :`<path class="gash open" d="M-20-18Q-2 0 20 22L14 26Q-4 6-24-12z"/><path class="rib" d="M-12-10l6 2M-6-4l7 2M0 2l7 2M6 8l7 2"/><path class="blood run" d="M-8 6q2 14 0 30M6 14q-1 12 1 22M14 24q0 8 2 14"/>`
 },
 piercing:{
  minor:()=>`<circle class="hole-ring" r="4.2"/><circle class="hole" r="2.2"/><path class="blood thin" d="M0 2q1 5-.5 9"/>`,
  major:(_u,_limb,region)=>region==='head'
   ?`<path class="jaw" d="M-12-2l5 4 4-3 5 5 4-4 6 3-2 8-10 4-10-3z"/><path class="blood run" d="M-6 8q1 10-1 18M4 10q1 8 0 16"/>`
   :`<circle class="hole-ring" r="6"/><circle class="hole" r="3.2"/><g class="blood spray"><circle cx="7" cy="-5" r="1"/><circle cx="10" cy="-1" r=".8"/><circle cx="-8" cy="-6" r=".9"/><circle cx="-5" cy="7" r="1.1"/></g><path class="blood run" d="M-1 3q2 10 0 19"/>`,
  crippling:(_u,_limb,region)=>region==='head'
   ?`<path class="blood coat" d="M-20-20c10-8 30-8 40 0 4 14 2 30-6 38-8 4-20 4-28 0-8-8-10-24-6-38z"/><circle class="hole" r="5"/><path class="bone" d="M-8-8l3-3 2 3-3 2zM6-6l3-1 1 3-3 1z"/>`
   :`<path class="hole" d="M-9-6l5-3 6 2 5 4-1 7-6 5-7-1-4-6z"/><path class="bone" d="M-3-2l3-3 2 3-3 2zM3 2l3-1 1 3-3 1z"/><path class="blood run" d="M-4 6q2 14 0 26M4 7q-1 10 1 20"/>`
 },
 burn:{
  minor:u=>`<path class="scorch" d="M-11-6c4-4 10-5 16-2 6 1 8 7 5 11-3 5-11 6-17 3-6-3-8-8-4-12z" fill="url(#${u}-scorch)"/><g class="blister"><circle cx="-3" cy="-1" r="1.4"/><circle cx="3" cy="2" r="1.1"/><circle cx="1" cy="-4" r=".9"/></g>`,
  major:u=>`<path class="scorch" d="M-13-8c6-5 16-5 22 0 6 5 6 13 0 17-7 5-18 4-23-2-4-5-4-11 1-15z" fill="url(#${u}-scorch)"/><path class="raw" d="M-8-4c4-3 10-3 13 0 4 3 3 8-1 10-5 2-11 1-13-2-2-3-2-6 1-8z"/><path class="torn" d="M-12-7l3 2 2-2 3 2"/>`,
  crippling:(u,limb)=>limb?'':`<path class="char" d="M-20-16c10-8 30-8 40 2 6 12 2 26-10 30-12 4-26 0-32-10-4-8-4-16 2-22z" fill="url(#${u}-char)"/><path class="ember" d="M-10-4l6 3 4-4 7 5M-6 8l5-2 6 3"/><path class="smoke" d="M-4-18c-4-6 4-10 0-16M6-16c3-5-3-9 1-14"/>`
 }
};
const GLYPH={blunt:'<rect x="-3" y="-3" width="6" height="6"/>',cutting:'<path d="M-4 4L4-4"/>',piercing:'<circle r="3"/>',burn:'<path d="M0-4l4 7H-4z"/>'};

// Crop the four transparent decals in SVG, preserving their original pixels and alpha.
const DECALS={cutting:[0,0],piercing:[1,0],blunt:[0,1],burn:[1,1]};
function woundDecal(type,severity,width,height) {
 const tile=DECALS[type];if(!tile)return '';
 const size={minor:17,major:30,crippling:44}[severity]??17;
 const w=width??size,h=height??size;
 return `<svg class="wound-decal decal-${type}" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" viewBox="${tile[0]*627} ${tile[1]*627} 627 627" preserveAspectRatio="none" overflow="hidden"><image href="${ATLAS}" width="1254" height="1254"/></svg>`;
}
const TREATMENT_CROPS={wrap:'0 0 700 640',splint:'760 0 494 650',stump:'0 700 680 554',scar:'730 700 524 554'};
function treatmentDecal(type,w,h,u) {
 return `<svg class="wound-decal treatment-${type}" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" viewBox="${TREATMENT_CROPS[type]}" preserveAspectRatio="none" overflow="hidden"><image href="${TREATMENT}" width="1254" height="1254" mask="url(#${u}-treatment-alpha)"/></svg>`;
}

/** What each region looks like now: its wounds in paint order, and whether a limb is gone. */
export function figureState(items,{titan=false}={}) {
 const scope=titan?'titan':'human';
 const all=items.filter(i=>i.type==='wound'&&(i.system.formScope??'human')===scope);
 return Object.fromEntries(ORDER.map(key=>{
  const here=all.filter(w=>w.system.region===key)
   .sort((a,b)=>(b.system.healed?1:0)-(a.system.healed?1:0)||(SEVERITY[a.system.severity]??0)-(SEVERITY[b.system.severity]??0));
  const live=here.filter(w=>!w.system.healed),limb=LIMB.has(key);
  const level=Math.max(0,...live.map(w=>SEVERITY[w.system.severity]??0));
  const crippling=here.filter(w=>w.system.severity==='crippling');
  // A crippling cut takes the limb at once; crushed or charred limbs go when treatment amputates them.
  // Titan flesh regrows once the wound heals; a soldier's stump stays.
  const lostBy=limb?crippling.find(w=>(w.system.injuryType==='cutting'||(['blunt','burn'].includes(w.system.injuryType)&&w.system.treated))&&!(titan&&w.system.healed)):null;
  const decapitated=titan&&key==='head'&&live.some(w=>w.system.severity==='crippling');
  return [key,{key,limb,wounds:here.slice(-4),live,lostBy,lost:!!lostBy,decapitated,
   severity:SEVERITY_NAME[level],worst:live.at(-1)??null,
   stump:lostBy?(lostBy.system.healed?'healed':lostBy.system.treated?'dressed':'bleeding'):null,
   crushed:limb&&!lostBy&&live.some(w=>w.system.severity==='crippling'&&w.system.injuryType==='blunt'),
   charred:limb&&!lostBy&&live.some(w=>w.system.severity==='crippling'&&w.system.injuryType==='burn')}];
 }));
}

const transform=reflection=>reflection?' transform="translate(200 0) scale(-1 1)"':'';
const silhouette=list=>list.filter(([cls])=>cls.startsWith('surface'));
const outlines=list=>silhouette(list).map(([,d,reflection])=>`<path d="${d}"${transform(reflection)}/>`).join('');
const drip=(x,y,i)=>`<g class="drip" transform="translate(${x} ${y})"><path class="drop" style="animation-delay:${((i*.73)%2.2).toFixed(2)}s" d="M0 0q-1.8 2.8 0 4.6 1.8-1.8 0-4.6z"/></g>`;

function stumpArt([x,y,w],state,key,titan,u) {
 // Blood runs from the stump and pools on the ground beside the feet.
 const leg=key.endsWith('Leg'),ground=392,side=key.startsWith('left')?1:-1;
 const zig=Array.from({length:6},(_,i)=>`l${(w*2/6).toFixed(1)} ${i%2?-2.4:2.4}`).join('');
 if(state==='bleeding')return `<g class="stump bleeding" data-stump="${key}"><g class="wound-detail" transform="translate(${x} ${y})">${treatmentDecal('stump',w*2.5,w*.9,u)}</g><g class="wound-symbol"><path class="torn" d="M${x-w} ${y-1}${zig}"/><ellipse class="flesh" cx="${x}" cy="${y+1}" rx="${w}" ry="${(w*.36).toFixed(1)}"/><circle class="bone" cx="${x}" cy="${y+1}" r="${(w*.3).toFixed(1)}"/></g>`
  +`<path class="blood run" d="M${x-w*.5} ${y+2}q1 ${leg?30:18} 0 ${leg?58:36}M${x+w*.3} ${y+3}q-1 ${leg?20:12} 1 ${leg?42:26}"/><ellipse class="pool" cx="${x+side*(leg?6:16)}" cy="${ground}" rx="${(w*2.4).toFixed(1)}" ry="3.2"/></g>${drip(x,y+5,1)}`;
 if(state==='dressed')return `<g class="stump dressed" data-stump="${key}" transform="translate(${x} ${y})">${treatmentDecal('wrap',w*2.6,w*.8,u)}</g>`;
 return `<g class="stump healed" data-stump="${key}" transform="translate(${x} ${y})">${treatmentDecal('scar',w*2.2,w*.65,u)}</g>`;
}

function regionBase(art,key,st,u,bodyAsset) {
 const a=art[key];
 const image=part=>`<image class="body-render" href="${bodyAsset}" width="200" height="400" clip-path="url(#${u}-${key}-${part})"/>`;
 if(st.decapitated)return `<g class="rg rg-head" data-region="head"><g class="part upper lost">${image('upper')}</g></g>`;
 const lower=a.lower?`<g class="part lower${st.lost?' lost':''}${st.crushed?' crushed':''}">${image('lower')}</g>`:'';
 return `<g class="rg rg-${key}${st.severity?` w-${st.severity}`:''}" data-region="${key}"><g class="part upper">${image('upper')}</g>${lower}</g>`;
}
function clinicalLayer(art,key,st,u,spots) {
 if(!st.severity&&!st.lost&&!st.decapitated)return '';
 const a=art[key],severity=st.severity??'crippling',type=(st.worst??st.lostBy)?.system.injuryType??'cutting';
 const [x,y]=st.decapitated?[100,74]:spots[key][0];
 const shape=st.decapitated?'':outlines([...a.upper,...(st.lost?[]:a.lower??[])]);
 return `<g class="hatch h-${severity}" fill="url(#${u}-h-${severity})">${shape}</g><g class="glyph h-${severity}" transform="translate(${x} ${y})">${GLYPH[type]}</g>`;
}
function visceralLayer(art,key,st,u,spots,titan) {
 const limb=st.limb;let inside='',outside='',drips='';
 st.wounds.forEach((wound,i)=>{
  if(wound===st.lostBy||st.decapitated)return;
  const s=wound.system,turn=(hash(wound.id??`${key}${i}`)%32)-16,scale=limb?.82:1;
  // A blown-open jaw sits on the jaw, whichever spot the wound would otherwise take.
  const jaw=key==='head'&&s.injuryType==='piercing'&&s.severity!=='minor'&&!s.treated&&!s.healed;
  const [x,y]=jaw?[100,53]:spots[key][i%4];
  let body;
  if(s.healed)body=treatmentDecal('scar',18,12,u);
  else if(s.treated)body=`<g class="dressing-pad"><rect x="-12" y="-8" width="24" height="16" rx="2"/><path d="M-11-4H11M-11 0H11M-11 4H11M-7-7V7M0-7V7M7-7V7"/></g>`+(s.injuryType==='blunt'&&s.severity!=='minor'&&limb?treatmentDecal('splint',24,42,u):treatmentDecal('wrap',limb?30:34,limb?23:27,u));
  else {
   body=`<g class="wound-detail">${woundDecal(s.injuryType,s.severity)}</g><g class="wound-symbol">${ART[s.injuryType]?.[s.severity]?.(u,limb,key)??''}</g>`;
   // A diffuse rim separates the injury from the study; fine edges stay undistorted.
   if(body&&(s.injuryType==='cutting'||s.injuryType==='piercing')&&s.severity!=='minor') {
    let seed=hash(wound.id??`${key}${i}`)||1;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
    const drops=Array.from({length:4},()=>{const a=rnd()*Math.PI*2,r=6+rnd()*7;return `<circle cx="${(Math.cos(a)*r).toFixed(1)}" cy="${(Math.sin(a)*r).toFixed(1)}" r="${(.25+rnd()*.55).toFixed(1)}"/>`;}).join('');
    body=`<ellipse class="stain" rx="14" ry="12" cy="2" fill="url(#${u}-stain)"/>${body}<g class="spatter">${drops}</g>${s.injuryType==='cutting'?'<path class="gloss" d="M-8-4.6Q0-7.4 7.5 1.5"/>':'<path class="gloss" d="M-1.6-1.8a2.4 2.4 0 0 1 2.6-.4"/>'}`;
   }
  }
  if(!body)return;
  inside+=`<g class="wound t-${s.injuryType} s-${s.severity}${s.treated?' treated':''}${s.healed?' healed':''}"${wound.id?` data-wound-id="${esc(wound.id)}"`:''} transform="translate(${x} ${y}) rotate(${jaw?0:turn}) scale(${scale})">${body}</g>`;
  // Only an untreated major wound keeps bleeding on the page.
  if(!s.healed&&!s.treated&&s.severity==='major'&&s.injuryType!=='blunt')drips+=drip(x,y+(limb?14:18),i);
  if(titan&&!s.healed)outside+=`<path class="steam-wisp" d="M${x-3} ${y-8}c-5-6 4-10-1-17M${x+4} ${y-9}c4-5-3-9 1-15"/>`;
 });
 if(st.crushed) {
  const a=art[key],[cx,cy]=a.cut;
  inside=`<g class="crush-limb wound-detail" transform="translate(${cx} ${cy+27})">${woundDecal('blunt','crippling',30,66)}</g><g class="wound-symbol">${outlines(a.lower).replaceAll('<path ','<path class="crush-fill" ')}</g>`+inside;
 }
 if(st.charred) {
  const a=art[key];
  const [cx,cy]=a.cut;
  inside=`<g class="char-limb wound-detail" transform="translate(${cx} ${cy+35})">${woundDecal('burn','crippling',38,86)}</g><g class="wound-symbol">${outlines(a.lower).replaceAll('<path ','<path class="char-fill" ')}</g>`+inside;
 }
 if(st.lost) {
  const stump=stumpArt(art[key].cut,st.stump,key,titan,u),at=stump.indexOf('<g class="drip"');
  outside+=at<0?stump:stump.slice(0,at);drips+=at<0?'':stump.slice(at);
 }
 if(st.decapitated)outside+=`<g class="stump ${titan?'titan-neck':'bleeding'}" data-stump="head"><g class="wound-detail" transform="translate(100 57)">${treatmentDecal('stump',26,9,u)}</g><path class="steam-wisp" d="M94 49c-6-8 5-12-1-22M104 47c5-7-4-12 2-20"/></g>`;
 return {paint:(inside?`<g class="wounds" data-wounds="${key}" clip-path="url(#${u}-clip-${key})" mask="url(#${u}-body-alpha)">${inside}</g>`:'')+outside,drips};
}
function label(key,st,spots,art) {
 if(!st.live.length&&!st.lost)return '';
 const source=st.lost?art[key].cut:spots[key][Math.max(0,st.wounds.indexOf(st.worst))%4];
 const at={...LABELS[key],from:source,y:Math.min(376,source[1]+(key==='rightArm'?36:6))},anchor=at.end?'end':'start',w=st.worst;
 const detail=st.lost?(st.stump==='healed'?'Healed stump':st.stump==='dressed'?'Dressed stump':'Severed'):w.system.treated?'Treated · dressed':`${w.system.severity} · ${TYPE_NAME[w.system.injuryType]}`;
 return `<g class="flabel l-${st.severity??'crippling'}"><path class="lead" d="M${at.from[0]} ${at.from[1]}L${at.end?at.x+3:at.x-3} ${at.y-3}"/><text x="${at.x}" y="${at.y-4}" text-anchor="${anchor}">${REGION_NAME[key]}</text><text class="sub" x="${at.x}" y="${at.y+5}" text-anchor="${anchor}">${detail}</text></g>`;
}
function titanExtras({mini,bites,armour}) {
 let out=`<g class="nape"><circle cx="100" cy="57" r="6.5"/><path d="M92 57h-5M108 57h5M100 50v-4"/>${mini?'':'<text x="100" y="74" text-anchor="middle">Nape</text>'}</g>`;
 if(bites?.bites) {
  const spots=[[100,82,0],[78,90,-30],[122,90,30],[89,84,-14],[111,84,14],[70,104,-50],[130,104,50],[100,96,0]];
  out+=spots.slice(0,Math.min(bites.bites,spots.length)).map(([x,y,r],i)=>
   `<g class="bite${i+1>=bites.major?' deep':''}${i+1>=bites.crippling?' gore':''}" transform="translate(${x} ${y}) rotate(${r})"><path d="M-7 0a7 5 0 0 0 14 0"/><path class="fang" d="M-6 1v2.4M-3 3v2.6M0 3.6v2.6M3 3v2.6M6 1v2.4"/></g>`).join('');
 }
 return out;
}
function defs(u,art,state,bodyAsset) {
 const hatch=(severity,color,gap)=>`<pattern id="${u}-h-${severity}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${gap}" height="${gap}" fill="${color}" fill-opacity=".16"/><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="1.5" stroke-opacity=".9"/></pattern>`;
 const region=key=>{const a=art[key],st=state[key];return [...a.upper,...(st.lost?[]:a.lower??[])].filter(([cls])=>!/line|teeth|pupil|muscle/.test(cls));};
 return `<radialGradient id="${u}-bruise"><stop offset="0" stop-color="#4a1f3f" stop-opacity=".62"/><stop offset=".55" stop-color="#6b3d2a" stop-opacity=".34"/><stop offset="1" stop-color="#6b3d2a" stop-opacity="0"/></radialGradient>`
  +`<radialGradient id="${u}-bruise-deep"><stop offset="0" stop-color="#2d0c22" stop-opacity=".82"/><stop offset=".5" stop-color="#5a1f30" stop-opacity=".54"/><stop offset="1" stop-color="#5a1f30" stop-opacity="0"/></radialGradient>`
  +`<radialGradient id="${u}-scorch"><stop offset="0" stop-color="#120a06" stop-opacity=".94"/><stop offset=".55" stop-color="#5a3314" stop-opacity=".62"/><stop offset="1" stop-color="#8a5a2a" stop-opacity="0"/></radialGradient>`
  +`<radialGradient id="${u}-stain"><stop offset="0" stop-color="#4a0404" stop-opacity=".62"/><stop offset=".6" stop-color="#6a0a0a" stop-opacity=".3"/><stop offset="1" stop-color="#6a0a0a" stop-opacity="0"/></radialGradient>`
  +`<linearGradient id="${u}-char" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23160e"/><stop offset="1" stop-color="#080403"/></linearGradient>`
  +hatch('minor','#b0842f',6)+hatch('major','#8e2323',5)+hatch('crippling','#241f1b',4)
  +`<mask id="${u}-body-alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="400" style="mask-type:${bodyAsset===BODY?'luminance':'alpha'}"><image href="${bodyAsset}" width="200" height="400"/></mask>`
  +`<mask id="${u}-treatment-alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254" style="mask-type:alpha"><image href="${TREATMENT_ALPHA}" width="1254" height="1254"/></mask>`
  +ORDER.map(key=>`<clipPath id="${u}-clip-${key}">${state[key].decapitated?'':outlines(region(key))}</clipPath>`).join('')
  +ORDER.map(key=>['upper','lower'].filter(part=>art[key][part]).map(part=>`<clipPath id="${u}-${key}-${part}">${outlines(art[key][part])}</clipPath>`).join('')).join('');
}
/** The whole diagram as SVG markup. `uid` keeps pattern and clip ids unique per sheet. */
export function bodyFigure(items,{titan=false,titanVariant=titanFigureVariant(items),uid='tw-fig',mini=false,dead=false,coma=false,bites=null,armour=null}={}) {
 const u=String(uid).replace(/[^\w-]/g,''),art=titan?TITAN:HUMAN,spots=titan?TITAN_SPOTS:SPOTS;
 const armoured=titan&&(!!armour||titanVariant==='armoured');
 const bodyAsset=titan?(armoured?(armour?.intact===false?BROKEN_BODY:ARMOURED_BODY):titanVariant==='colossal'?TITAN_BODY:ORDINARY_BODY):CADET_BODY;
 const state=figureState(items,{titan});
 const summary=ORDER.map(key=>{const st=state[key];if(st.lost)return `${REGION_NAME[key]} amputated`;if(!st.worst)return '';return `${REGION_NAME[key]} ${st.worst.system.severity} ${st.worst.system.injuryType}`;}).filter(Boolean);
 const view=mini?'28 2 144 396':'-24 0 248 400';
 return `<svg class="fig ${titan?'titan':'human'}${mini?' mini':''}${dead?' dead':''}${coma?' coma':''}" viewBox="${view}" role="img" aria-label="${esc(`${titan?'Titan':'Soldier'} body diagram: ${summary.join('; ')||'uninjured'}`)}">`
  +`<defs>${defs(u,art,state,titan?TITAN_BODY:BODY)}</defs>`
  +`<g class="fig-base" mask="url(#${u}-body-alpha)">${ORDER.map(key=>regionBase(art,key,state[key],u,bodyAsset)).join('')}</g>`
  +`<g class="fig-clinical" mask="url(#${u}-body-alpha)">${ORDER.map(key=>clinicalLayer(art,key,state[key],u,spots)).join('')}</g>`
  +(()=>{const layers=ORDER.map(key=>visceralLayer(art,key,state[key],u,spots,titan));
   return `<g class="fig-visceral">${layers.map(l=>l.paint).join('')}${layers.map(l=>l.drips).join('')}</g>`;})()
  +(titan?titanExtras({mini,bites,armour}):'')
  +(mini?'':`<g class="fig-labels">${ORDER.map(key=>label(key,state[key],spots,art)).join('')}</g>`)
  +'</svg>';
}
/** Crippling blunt or burn limbs are finished by amputation, so their treatment is named for it. */
export const needsAmputation=wound=>wound.system.severity==='crippling'&&LIMB.has(wound.system.region)&&['blunt','burn'].includes(wound.system.injuryType)&&!wound.system.treated&&!wound.system.healed;
