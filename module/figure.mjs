// The body diagram: a uniformed Survey Corps soldier (or a Titan) drawn front-on, with the
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

// Drawn on a 200 x 400 grid. Each limb splits at the elbow or knee, which is where a stump sits.
const HUMAN={
 head:{upper:[
  ['skin','M92 58h16v12l-8 4-8-4z'],
  ['skin','M80 31c-3-1-5 1-5 5s2 7 5 7z'],['skin','M120 31c3-1 5 1 5 5s-2 7-5 7z'],
  ['skin','M100 14c-12 0-20 9-20 22c0 9 3 15 6 19c4 4 9 6 14 6s10-2 14-6c3-4 6-10 6-19c0-13-8-22-20-22z'],
  ['hair','M79 34c-1-14 8-24 21-24s23 9 21 24c-3-6-7-9-11-10-5 3-12 4-20 2-5 1-9 4-11 8z'],
  ['line','M89 38.5h6M105 38.5h6M88 33.5l7-1.2M105 32.3l7 1.2M100 40v7l-2 1M95.5 52.5q4.5 1.4 9 0']
 ]},
 chest:{upper:[
  ['shirt','M66 76c6-6 22-10 34-10s28 4 34 10l2 40-4 38 2 32c-10 8-24 10-34 10s-24-2-34-10l2-32-4-38z'],
  ['jacket','M66 76c8-6 18-8 28-8l-4 24 2 56-24 4-4-36z'],['jacket','M134 76c-8-6-18-8-28-8l4 24-2 56 24 4 4-36z'],
  ['strap','M70 78l4-2 50 78-4 3z'],['strap','M130 78l-4-2-50 78 4 3z'],
  ['belt','M68 160h64v7H68z'],['belt','M68 182h64v6H68z'],['brass','M96 160h8v7h-8z'],
  ['patch','M111 96h10v9l-5 4-5-4z'],['line','M113 101l3 3 3-3'],
  ['metal','M58 174h9v16h-9z'],['metal','M133 174h9v16h-9z'],
  ['line','M94 68l-6 16 6 8M106 68l6 16-6 8M100 94v64M76 130q4 2 10 1M124 130q-4 2-10 1']
 ]},
 rightArm:{cut:[55,141,7],upper:[['jacket','M66 78c-8 4-12 14-13 26l-4 36 12 2 6-34 3-22z'],['line','M58 108l5 3']],
  lower:[['jacket','M49 140l-4 44 11 2 5-44z'],['shirt','M45 180l11 2-.4 5-11-2z'],['skin','M45 186c-3 6-4 14-2 20 2 4 7 5 10 2 3-4 4-12 3-20z'],['line','M47 206l1-6M51 208l.5-7']]},
 leftArm:{cut:[145,141,7],upper:[['jacket','M134 78c8 4 12 14 13 26l4 36-12 2-6-34-3-22z'],['line','M142 108l-5 3']],
  lower:[['jacket','M151 140l4 44-11 2-5-44z'],['shirt','M155 180l-11 2 .4 5 11-2z'],['skin','M155 186c3 6 4 14 2 20-2 4-7 5-10 2-3-4-4-12-3-20z'],['line','M153 206l-1-6M149 208l-.5-7']]},
 rightLeg:{cut:[86,278,11],upper:[['trousers','M68 188c0 10 0 20 2 32l6 58h20l2-58 2-24c-10 0-22-2-32-8z'],['strap','M69 207h31v3.5H69z'],['strap','M72 240h26v3H72z'],['line','M86 248v26M78 214q2 14 6 22']],
  lower:[['trousers','M76 278h20v14H77z'],['boot','M77 292h19l1 66 4 22c1 5-1 8-6 8H74c-4 0-6-3-5-7l7-23z'],['strap','M76 292h21v5H76z'],['line','M80 370h14']]},
 leftLeg:{cut:[114,278,11],upper:[['trousers','M132 188c0 10 0 20-2 32l-6 58h-20l-2-58-2-24c10 0 22-2 32-8z'],['strap','M100 207h31v3.5h-31z'],['strap','M102 240h26v3h-26z'],['line','M114 248v26M122 214q-2 14-6 22']],
  lower:[['trousers','M124 278h-20v14h19z'],['boot','M123 292h-19l-1 66-4 22c-1 5 1 8 6 8h21c4 0 6-3 5-7l-7-23z'],['strap','M103 292h21v5h-21z'],['line','M106 370h14']]}
};
// A Titan: an oversized grinning head, a narrow ribbed trunk and arms that hang past the knee.
const TITAN={
 head:{upper:[
  ['tskin','M93 68h14l2 12H91z'],
  ['tskin','M100 6c-17 0-29 13-29 33 0 17 11 31 29 31s29-14 29-31c0-20-12-33-29-33z'],
  ['tskin','M71 34c-4-1-6 2-6 6s3 8 6 8zM129 34c4-1 6 2 6 6s-3 8-6 8z'],
  ['mouth','M80 48c6 10 34 10 40 0-3 12-37 12-40 0z'],['teeth','M84 51v4M88 53v4M92 54v4M96 55v4M100 55v4M104 55v4M108 54v4M112 53v4M116 51v4'],
  ['eye','M84 33a6 5 0 1 0 12 0a6 5 0 1 0-12 0zM104 33a6 5 0 1 0 12 0a6 5 0 1 0-12 0z'],['pupil','M89 33.5a1.6 1.6 0 1 0 2 0zM109 33.5a1.6 1.6 0 1 0 2 0z'],
  ['tline','M100 38v7M79 22q8-6 16-3M121 22q-8-6-16-3']
 ]},
 chest:{upper:[
  ['tskin','M72 84c8-6 20-8 28-8s20 2 28 8l-2 30c-2 20-6 36-6 52l2 26c-8 6-16 8-22 8s-14-2-22-8l2-26c0-16-4-32-6-52z'],
  ['muscle','M76 88l-6 22M82 86l-4 26M124 88l6 22M118 86l4 26'],
  ['tline','M82 104q18 6 36 0M80 117q20 7 40 0M82 130q18 6 36 0M100 140v34M90 184q10 3 20 0']
 ]},
 rightArm:{cut:[51,176,6],upper:[['tskin','M72 86c-10 6-16 18-18 34l-8 56 10 2 10-54 10-24z'],['muscle','M62 100l-6 30']],
  lower:[['tskin','M46 176l-6 70 10 2 6-70z'],['tskin','M40 246c-4 8-5 18-2 24 3 4 9 4 12 0 3-6 3-16 0-24z'],['muscle','M48 190l-4 40']]},
 leftArm:{cut:[149,176,6],upper:[['tskin','M128 86c10 6 16 18 18 34l8 56-10 2-10-54-10-24z'],['muscle','M138 100l6 30']],
  lower:[['tskin','M154 176l6 70-10 2-6-70z'],['tskin','M160 246c4 8 5 18 2 24-3 4-9 4-12 0-3-6-3-16 0-24z'],['muscle','M152 190l4 40']]},
 rightLeg:{cut:[85,290,11],upper:[['tskin','M78 208l-4 82h22l4-80z'],['muscle','M84 222l-2 50']],
  lower:[['tskin','M74 290l-2 74c-1 10 2 16 10 16h8c6 0 8-6 7-12l-1-78z'],['tline','M80 300q6 3 12 0']]},
 leftLeg:{cut:[115,290,11],upper:[['tskin','M122 208l4 82h-22l-4-80z'],['muscle','M116 222l2 50']],
  lower:[['tskin','M126 290l2 74c1 10-2 16-10 16h-8c-6 0-8-6-7-12l1-78z'],['tline','M120 300q-6 3-12 0']]}
};
const SPOTS={head:[[100,28],[89,46],[111,46],[100,57]],chest:[[86,104],[114,116],[100,140],[90,172]],
 rightArm:[[58,98],[54,124],[51,160],[48,176]],leftArm:[[142,98],[146,124],[149,160],[152,176]],
 rightLeg:[[84,212],[86,252],[87,312],[86,346]],leftLeg:[[116,212],[114,252],[113,312],[114,346]]};
const TITAN_SPOTS={...SPOTS,head:[[100,24],[86,44],[114,44],[100,62]],rightArm:[[62,104],[56,140],[46,200],[44,232]],leftArm:[[138,104],[144,140],[154,200],[156,232]],
 rightLeg:[[86,230],[86,262],[84,318],[84,350]],leftLeg:[[114,230],[114,262],[116,318],[116,350]]};
const LABELS={head:{x:166,y:30,from:[122,34]},chest:{x:166,y:124,from:[137,122]},leftArm:{x:166,y:176,from:[156,172]},
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
const DRESSING={
 wrap:limb=>limb
  ?`<rect class="dressing" x="-9" y="-6" width="18" height="12" rx="1.5"/><path class="dressing-line" d="M-9-2h18M-9 2h18"/><ellipse class="seep" rx="4" ry="2.6" cy="-1"/>`
  :`<g transform="rotate(-8)"><rect class="dressing" x="-12" y="-8" width="24" height="16" rx="1.5"/><path class="dressing-line" d="M-12-2h24M-12 3h24"/></g><ellipse class="seep" rx="5" ry="3"/>`,
 splint:()=>`<rect class="splint" x="-9" y="-16" width="3" height="32" rx=".8"/><rect class="splint" x="6" y="-16" width="3" height="32" rx=".8"/><path class="tie" d="M-10-9h20M-10 9h20"/>`
};
const SCAR=`<path class="scar" d="M-9-2L9 2"/><path class="stitch" d="M-6-3.6l1 3.2M-2-2.6l1 3.2M2-1.6l1 3.2M6-.6l1 3.2"/>`;
const GLYPH={blunt:'<rect x="-3" y="-3" width="6" height="6"/>',cutting:'<path d="M-4 4L4-4"/>',piercing:'<circle r="3"/>',burn:'<path d="M0-4l4 7H-4z"/>'};

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

const paths=list=>list.map(([cls,d])=>`<path class="${cls}" d="${d}"/>`).join('');
const drip=(x,y,i)=>`<g class="drip" transform="translate(${x} ${y})"><path class="drop" style="animation-delay:${((i*.73)%2.2).toFixed(2)}s" d="M0 0q-1.8 2.8 0 4.6 1.8-1.8 0-4.6z"/></g>`;

function stumpArt([x,y,w],state,key,titan) {
 // Blood runs from the stump and pools on the ground beside the feet.
 const leg=key.endsWith('Leg'),ground=392,side=key.startsWith('left')?1:-1;
 const zig=Array.from({length:6},(_,i)=>`l${(w*2/6).toFixed(1)} ${i%2?-2.4:2.4}`).join('');
 if(state==='bleeding')return `<g class="stump bleeding" data-stump="${key}"><path class="torn" d="M${x-w} ${y-1}${zig}"/><ellipse class="flesh" cx="${x}" cy="${y+1}" rx="${w}" ry="${(w*.36).toFixed(1)}"/><circle class="bone" cx="${x}" cy="${y+1}" r="${(w*.3).toFixed(1)}"/>`
  +`<path class="blood run" d="M${x-w*.5} ${y+2}q1 ${leg?30:18} 0 ${leg?58:36}M${x+w*.3} ${y+3}q-1 ${leg?20:12} 1 ${leg?42:26}"/><ellipse class="pool" cx="${x+side*(leg?6:16)}" cy="${ground}" rx="${(w*2.4).toFixed(1)}" ry="3.2"/></g>${drip(x,y+5,1)}`;
 if(state==='dressed')return `<g class="stump dressed" data-stump="${key}"><path class="dressing" d="M${x-w-1} ${y-5}h${w*2+2}v5q-${w+1} ${(w*.9).toFixed(1)}-${w*2+2} 0z"/><path class="dressing-line" d="M${x-w-1} ${y-2}h${w*2+2}"/><ellipse class="seep" cx="${x}" cy="${y+2}" rx="${(w*.55).toFixed(1)}" ry="${(w*.26).toFixed(1)}"/></g>`;
 return `<g class="stump healed" data-stump="${key}"><path class="healed-cap ${leg?'leg':'arm'}" d="M${x-w} ${y-1}q${w} ${(w*.8).toFixed(1)} ${w*2} 0z"/><path class="stitch" d="M${x-w*.5} ${y+1}l1 2.4M${x} ${y+2}l1 2.4M${x+w*.5} ${y+1}l1 2.4"/></g>`;
}

function regionBase(art,key,st) {
 const a=art[key];
 if(st.decapitated)return `<g class="rg rg-head" data-region="head"><g class="part upper lost">${paths(a.upper)}</g></g>`;
 const lower=a.lower?`<g class="part lower${st.lost?' lost':''}${st.crushed?' crushed':''}">${paths(a.lower)}</g>`:'';
 return `<g class="rg rg-${key}${st.severity?` w-${st.severity}`:''}" data-region="${key}"><g class="part upper">${paths(a.upper)}</g>${lower}</g>`;
}
function clinicalLayer(art,key,st,u,spots) {
 if(!st.severity&&!st.lost&&!st.decapitated)return '';
 const a=art[key],severity=st.severity??'crippling',type=(st.worst??st.lostBy)?.system.injuryType??'cutting';
 const [x,y]=st.decapitated?[100,74]:spots[key][0];
 const shape=st.decapitated?'':[...a.upper,...(st.lost?[]:a.lower??[])].filter(([cls])=>!/line|teeth|pupil|muscle/.test(cls)).map(([,d])=>`<path d="${d}"/>`).join('');
 return `<g class="hatch h-${severity}" fill="url(#${u}-h-${severity})">${shape}</g><g class="glyph h-${severity}" transform="translate(${x} ${y})">${GLYPH[type]}</g>`;
}
function visceralLayer(art,key,st,u,spots,titan) {
 const limb=st.limb;let inside='',outside='',drips='';
 st.wounds.forEach((wound,i)=>{
  if(wound===st.lostBy||st.decapitated)return;
  const s=wound.system,turn=(hash(wound.id??`${key}${i}`)%32)-16,scale=limb?.82:1;
  // A blown-open jaw sits on the jaw, whichever spot the wound would otherwise take.
  const jaw=key==='head'&&s.injuryType==='piercing'&&s.severity!=='minor'&&!s.treated&&!s.healed;
  const [x,y]=jaw?[100,titan?60:53]:spots[key][i%4];
  let body;
  if(s.healed)body=SCAR;
  else if(s.treated)body=s.injuryType==='blunt'&&s.severity!=='minor'&&limb?DRESSING.splint():DRESSING.wrap(limb);
  else {
   body=ART[s.injuryType]?.[s.severity]?.(u,limb,key)??'';
   // Open wounds soak the uniform around them and throw droplets across the cloth.
   if(body&&(s.injuryType==='cutting'||s.injuryType==='piercing')&&s.severity!=='minor') {
    let seed=hash(wound.id??`${key}${i}`)||1;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
    const drops=Array.from({length:7},()=>{const a=rnd()*Math.PI*2,r=9+rnd()*12;return `<circle cx="${(Math.cos(a)*r).toFixed(1)}" cy="${(Math.sin(a)*r).toFixed(1)}" r="${(.5+rnd()*1.5).toFixed(1)}"/>`;}).join('');
    body=`<ellipse class="stain" rx="15" ry="19" cy="7" fill="url(#${u}-stain)"/>${body}<g class="spatter">${drops}</g>${s.injuryType==='cutting'?'<path class="gloss" d="M-8-4.6Q0-7.4 7.5 1.5"/>':'<path class="gloss" d="M-1.6-1.8a2.4 2.4 0 0 1 2.6-.4"/>'}`;
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
  inside=`<g class="crush-limb">${paths(a.lower.filter(([cls])=>!/line/.test(cls))).replace(/class="[^"]*"/g,'class="crush-fill"')}<path class="torn" d="M${cx-6} ${cy+4}l3 3 2-2 3 3 2-2 3 3"/><path class="blood run" d="M${cx-2} ${cy+6}q1 10-1 20M${cx+3} ${cy+10}q0 8 1 14"/></g>`+inside;
 }
 if(st.charred) {
  const a=art[key];
  const [cx,cy]=a.cut;
  inside=`<g class="char-limb">${paths(a.lower.filter(([cls])=>!/line/.test(cls))).replace(/class="[^"]*"/g,'class="char-fill"')}<path class="ember" d="M${cx-4} ${cy+10}l3 5-2 6 4 5-1 6M${cx+2} ${cy+22}l4 3M${cx-1} ${cy+34}l-4 4 1 5M${cx+3} ${cy+50}l-3 5 3 4M${cx-2} ${cy+66}l3 4"/></g>`+inside;
 }
 if(st.lost) {
  const stump=stumpArt(art[key].cut,st.stump,key,titan),at=stump.indexOf('<g class="drip"');
  outside+=at<0?stump:stump.slice(0,at);drips+=at<0?'':stump.slice(at);
 }
 if(st.decapitated)outside+=`<g class="stump ${titan?'titan-neck':'bleeding'}" data-stump="head"><ellipse class="flesh" cx="100" cy="72" rx="9" ry="3.4"/><circle class="bone" cx="100" cy="72" r="2.6"/><path class="steam-wisp" d="M94 64c-6-8 5-12-1-22M104 62c5-7-4-12 2-20"/></g>`;
 return {paint:(inside?`<g class="wounds" data-wounds="${key}" clip-path="url(#${u}-clip-${key})">${inside}</g>`:'')+outside,drips};
}
function label(key,st) {
 if(!st.live.length&&!st.lost)return '';
 const at=LABELS[key],anchor=at.end?'end':'start',w=st.worst;
 const detail=st.lost?(st.stump==='healed'?'Amputated':'Severed'):`${w.system.severity} · ${TYPE_NAME[w.system.injuryType]}`;
 return `<g class="flabel l-${st.severity??'crippling'}"><path class="lead" d="M${at.from[0]} ${at.from[1]}L${at.end?at.x+3:at.x-3} ${at.y-3}"/><text x="${at.x}" y="${at.y-4}" text-anchor="${anchor}">${REGION_NAME[key]}</text><text class="sub" x="${at.x}" y="${at.y+5}" text-anchor="${anchor}">${detail}</text></g>`;
}
function titanExtras({mini,bites,armour}) {
 let out=`<g class="nape"><circle cx="100" cy="76" r="6.5"/><path d="M92 76h-5M108 76h5M100 69v-4"/>${mini?'':'<text x="100" y="93" text-anchor="middle">Nape</text>'}</g>`;
 if(bites?.bites) {
  const spots=[[100,82,0],[78,90,-30],[122,90,30],[89,84,-14],[111,84,14],[70,104,-50],[130,104,50],[100,96,0]];
  out+=spots.slice(0,Math.min(bites.bites,spots.length)).map(([x,y,r],i)=>
   `<g class="bite${i+1>=bites.major?' deep':''}${i+1>=bites.crippling?' gore':''}" transform="translate(${x} ${y}) rotate(${r})"><path d="M-7 0a7 5 0 0 0 14 0"/><path class="fang" d="M-6 1v2.4M-3 3v2.6M0 3.6v2.6M3 3v2.6M6 1v2.4"/></g>`).join('');
 }
 if(armour)out+=`<g class="armour${armour.intact?'':' broken'}"><path d="M78 94l22-6 22 6-4 40-18 8-18-8z"/><path d="M62 86l14-4 4 14-14 8z"/><path d="M138 86l-14-4-4 14 14 8z"/><path d="M76 284l20-2 1 16-20 2z"/><path d="M124 284l-20-2-1 16 20 2z"/>${armour.intact?'':'<path class="crackline" d="M92 98l6 14-4 10 6 12M66 88l6 8"/>'}</g>`;
 return out;
}
function defs(u,art,state) {
 const hatch=(severity,color,gap)=>`<pattern id="${u}-h-${severity}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${gap}" height="${gap}" fill="${color}" fill-opacity=".16"/><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="1.5" stroke-opacity=".9"/></pattern>`;
 const region=key=>{const a=art[key],st=state[key];return [...a.upper,...(st.lost?[]:a.lower??[])].filter(([cls])=>!/line|teeth|pupil|muscle/.test(cls));};
 return `<radialGradient id="${u}-bruise"><stop offset="0" stop-color="#4a1f3f" stop-opacity=".62"/><stop offset=".55" stop-color="#6b3d2a" stop-opacity=".34"/><stop offset="1" stop-color="#6b3d2a" stop-opacity="0"/></radialGradient>`
  +`<radialGradient id="${u}-bruise-deep"><stop offset="0" stop-color="#2d0c22" stop-opacity=".82"/><stop offset=".5" stop-color="#5a1f30" stop-opacity=".54"/><stop offset="1" stop-color="#5a1f30" stop-opacity="0"/></radialGradient>`
  +`<radialGradient id="${u}-scorch"><stop offset="0" stop-color="#120a06" stop-opacity=".94"/><stop offset=".55" stop-color="#5a3314" stop-opacity=".62"/><stop offset="1" stop-color="#8a5a2a" stop-opacity="0"/></radialGradient>`
  +`<radialGradient id="${u}-stain"><stop offset="0" stop-color="#4a0404" stop-opacity=".62"/><stop offset=".6" stop-color="#6a0a0a" stop-opacity=".3"/><stop offset="1" stop-color="#6a0a0a" stop-opacity="0"/></radialGradient>`
  +`<linearGradient id="${u}-char" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23160e"/><stop offset="1" stop-color="#080403"/></linearGradient>`
  +`<linearGradient id="${u}-light" x1="0" y1="0" x2="1" y2=".7"><stop offset=".4" stop-color="#3a2410" stop-opacity="0"/><stop offset="1" stop-color="#3a2410" stop-opacity=".32"/></linearGradient>`
  +hatch('minor','#b0842f',6)+hatch('major','#8e2323',5)+hatch('crippling','#241f1b',4)
  // Ink and wash: each part is hatched along its own shadow side, and the lines wander like a pen.
  +`<linearGradient id="${u}-edge" x1="0" y1="0" x2="1" y2="0"><stop offset=".48" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient>`
  +`<pattern id="${u}-shade" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><line x1="0" y1="0" x2="0" y2="2.4" stroke="#24160a" stroke-width=".5" stroke-opacity=".55"/></pattern>`
  +`<mask id="${u}-shade-mask" maskUnits="userSpaceOnUse" x="-46" y="0" width="292" height="400">${ORDER.flatMap(region).map(([,d])=>`<path d="${d}" fill="url(#${u}-edge)"/>`).join('')}</mask>`
  +`<filter id="${u}-ink" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G"/></filter>`
  +`<filter id="${u}-rough" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>`
  +`<clipPath id="${u}-clip-body">${ORDER.flatMap(region).map(([,d])=>`<path d="${d}"/>`).join('')}</clipPath>`
  +ORDER.map(key=>`<clipPath id="${u}-clip-${key}">${region(key).map(([,d])=>`<path d="${d}"/>`).join('')}</clipPath>`).join('');
}

/** The whole diagram as SVG markup. `uid` keeps pattern and clip ids unique per sheet. */
export function bodyFigure(items,{titan=false,uid='tw-fig',mini=false,dead=false,coma=false,bites=null,armour=null}={}) {
 const u=String(uid).replace(/[^\w-]/g,''),art=titan?TITAN:HUMAN,spots=titan?TITAN_SPOTS:SPOTS;
 const state=figureState(items,{titan});
 const summary=ORDER.map(key=>{const st=state[key];if(st.lost)return `${REGION_NAME[key]} amputated`;if(!st.worst)return '';return `${REGION_NAME[key]} ${st.worst.system.severity} ${st.worst.system.injuryType}`;}).filter(Boolean);
 const view=mini?'28 2 144 396':'-46 0 292 400';
 return `<svg class="fig ${titan?'titan':'human'}${mini?' mini':''}${dead?' dead':''}${coma?' coma':''}" viewBox="${view}" role="img" aria-label="${esc(`${titan?'Titan':'Soldier'} body diagram: ${summary.join('; ')||'uninjured'}`)}">`
  +`<defs>${defs(u,art,state)}</defs>`
  +`<g class="fig-base"><g${mini?'':` filter="url(#${u}-ink)"`}>${ORDER.map(key=>regionBase(art,key,state[key])).join('')}`
  +`<rect class="light" x="-46" y="0" width="292" height="400" fill="url(#${u}-light)" clip-path="url(#${u}-clip-body)"/>`
  +(mini?'':`<rect class="shade" x="-46" y="0" width="292" height="400" fill="url(#${u}-shade)" mask="url(#${u}-shade-mask)"/>`)+'</g></g>'
  +`<g class="fig-clinical">${ORDER.map(key=>clinicalLayer(art,key,state[key],u,spots)).join('')}</g>`
  +(()=>{const layers=ORDER.map(key=>visceralLayer(art,key,state[key],u,spots,titan));
   return `<g class="fig-visceral"><g${mini?'':` filter="url(#${u}-rough)"`}>${layers.map(l=>l.paint).join('')}</g>${layers.map(l=>l.drips).join('')}</g>`;})()
  +(titan?titanExtras({mini,bites,armour}):'')
  +(mini?'':`<g class="fig-labels">${ORDER.map(key=>label(key,state[key])).join('')}</g>`)
  +'</svg>';
}
/** Crippling blunt or burn limbs are finished by amputation, so their treatment is named for it. */
export const needsAmputation=wound=>wound.system.severity==='crippling'&&LIMB.has(wound.system.region)&&['blunt','burn'].includes(wound.system.injuryType)&&!wound.system.treated&&!wound.system.healed;
