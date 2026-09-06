// Inline SVG icon set. One sprite is emitted per sheet; {{icon "name"}} references it.
// Geometry is drawn on a 24x24 grid, stroked with currentColor unless a path opts into fill.
const F = 'fill="currentColor" stroke="none"';
export const ICONS = {
 // ── Statistics ───────────────────────────────────────────────────────────
 agility:'<path d="M13.5 4.6a1.7 1.7 0 1 0 0-.02"/><path d="M9.8 21l1.9-5.3 3-1.8-1-4.6-3.4 1.7-1.3 3"/><path d="M14.7 9.3l3 1.5 2.3-.4"/><path d="M11.7 15.7l3.4 2 .6 3.3"/><path d="M2 8.5h4.5M2 12.5h3M2 16.5h4"/>',
 technique:'<path d="M14.6 2.8 21 9.2l-9.4 9.4-2.6-.6-.6-2.6z"/><path d="m9.4 15.4-6 6"/><path d="m4.6 17.6 1.8 1.8"/><path d="m17.2 5.4 1.4 1.4"/>',
 mind:'<path d="M2.5 12S6 6.2 12 6.2 21.5 12 21.5 12 18 17.8 12 17.8 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/>',
 body:'<path d="M12 2.6 19.4 5.4v6.2c0 4.8-3 7.8-7.4 9.8-4.4-2-7.4-5-7.4-9.8V5.4z"/><path d="M8.8 12.4h6.4M12 9.2v6.4"/>',
 heart:'<path d="M12 20.4C12 20.4 3.4 14.9 3.4 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.6 2.2c0 5.7-8.6 11.2-8.6 11.2Z"/>',
 duty:'<path d="m4 9.6 8-5 8 5"/><path d="m4 14.4 8-5 8 5"/><path d="m4 19.2 8-5 8 5"/>',
 // ── Action categories ────────────────────────────────────────────────────
 hunting:'<path d="M6.4 21v-3.6C4.9 16.1 4 14 4 11.4 4 6.9 7.6 3.4 12 3.4s8 3.5 8 8c0 2.6-.9 4.7-2.4 6v3.6"/><path d="M9 10.6h1.6M13.4 10.6H15"/><path d="M8.4 14.6h7.2l-1 2.2H9.4z"/>',
 combat:'<path d="M4 3.4 14.6 14"/><path d="M20 3.4 9.4 14"/><path d="m2.8 20.6 3-3 1.6 1.6-3 3z"/><path d="m21.2 20.6-3-3-1.6 1.6 3 3z"/>',
 resolve:'<path d="M12 21.4c-3.3 0-6-2.5-6-5.6 0-3.6 3.4-5.2 3.4-8.8 0-1.3-.4-2.4-.9-3.2 3.4.5 6 3.4 6 6.2 0 1.6-.8 2.6-.8 3.6 0 1 .8 1.6 1.5 1.6.9 0 1.6-.7 1.8-1.8.7 1 1 2.2 1 3.4 0 3.1-2.7 4.6-6 4.6Z"/>',
 recovery:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6v8.8M7.6 12h8.8"/>',
 duties:'<path d="M5 21.4V3"/><path d="M5 3.6h13l-2.8 4.4L18 12.6H5z"/>',
 shifting:'<path d="M13.4 2.4 4.6 13.8h5.6L9.4 21.6l9.2-11.8h-6z"/>',
 // ── Body regions ─────────────────────────────────────────────────────────
 head:'<path d="M12 3c3.3 0 5.6 2.5 5.6 6.2 0 2.8-1.2 5.6-3 6.6V18h-5.2v-2.2c-1.8-1-3-3.8-3-6.6C6.4 5.5 8.7 3 12 3Z"/><path d="M9.4 20.8h5.2"/>',
 chest:'<path d="M7.4 4.4c2.4-1 6.8-1 9.2 0l-.8 6.2c-.4 2 -.4 4 0 6l.8 4.6c-3 1-6.2 1-9.2 0l.8-4.6c.4-2 .4-4 0-6z"/><path d="M12 5.2v14"/>',
 arm:'<path d="M9.4 3.4c-2 1.4-3.2 3.8-3.6 7l-.8 6.4-1.4 6c-.3 1.2 2 1.6 2.4 0l1.8-6 1.6-6.4"/><path d="M14.6 3.4c2 1.4 3.2 3.8 3.6 7l.8 6.4 1.4 6c.3 1.2-2 1.6-2.4 0l-1.8-6-1.6-6.4"/>',
 leg:'<path d="M8.8 3.2c1.8.8 3.6 1 5.4.4L13.4 12l-.6 6 .4 5.6"/><path d="M15.2 3.6 17 12l.6 6-.4 5.6"/>',
 // ── Field kit ────────────────────────────────────────────────────────────
 gas:'<rect x="7" y="6" width="10" height="15.2" rx="2.4"/><path d="M10 6V4.2h4V6"/><path d="M8.8 10.4h6.4"/>',
 blade:'<path d="M12 2.4 14.4 9v10.2h-4.8V9z"/><path d="M9.6 15.6h4.8"/><path d="M12 19.2v2.4"/>',
 flare:'<path d="m14.4 3.6 6 6-2.6 2.6-6-6z"/><path d="m11.2 8.8-7 7"/><path d="M3.4 20.6 5 19"/><path d="M17.6 3.2 19 1.8M20.8 6.4l1.4-1.4M21.6 10.6h1.8"/>',
 bandage:'<rect x="2.4" y="8.6" width="19.2" height="6.8" rx="3.4" transform="rotate(-32 12 12)"/><path d="M10.2 10.2h.02M13.4 11.6h.02M10.8 14.2h.02M14 15.6h.02"/>',
 pack:'<path d="M5.4 8.4h13.2v12.2H5.4z"/><path d="M9 8.4V6a3 3 0 0 1 6 0v2.4"/><path d="M5.4 13.4h13.2"/>',
 rifle:'<path d="M2.6 8.6h13.6l3 3.2h4.2"/><path d="M6.2 8.6v3.2"/><path d="M9.4 11.8 7 18"/><path d="M12.4 11.8h4"/>',
 lantern:'<path d="M9.4 2.8h5.2M12 2.8v3"/><path d="M7.4 6.4h9.2l1.2 11.4a2 2 0 0 1-2 2.2H8.2a2 2 0 0 1-2-2.2z"/><path d="M12 9.6v7"/>',
 knife:'<path d="M15.4 2.6 18 5.2 9.6 13.6l-2.6-2.6z"/><path d="m7 11 -3.4 3.4a2 2 0 0 0 0 2.8l2.8 2.8a2 2 0 0 0 2.8 0L12.6 16.6"/>',
 canteen:'<rect x="6" y="6.6" width="12" height="14.4" rx="3.4"/><path d="M9.6 6.6V4h4.8v2.6"/><path d="M9 10.6h6"/>',
 map:'<path d="m2.8 6.4 6-2.6 6.4 2.6 6-2.6v14l-6 2.6-6.4-2.6-6 2.6z"/><path d="M8.8 3.8v14M15.2 6.4v14"/>',
 compass:'<circle cx="12" cy="12" r="8.6"/><path d="m15.2 8.8-2 4.4-4.4 2 2-4.4z"/>',
 serum:'<path d="m9.6 2.6 4.8 4.8"/><path d="m12 5 -6.6 6.6a3.4 3.4 0 0 0 0 4.8l1.2 1.2a3.4 3.4 0 0 0 4.8 0L18 11z"/><path d="m6.4 14.6 6.6-1.6"/><path d="M18.6 16.6c0 1.2-.9 2-2 2s-2-.8-2-2 2-3.6 2-3.6 2 2.4 2 3.6Z"/>',
 explosive:'<circle cx="11" cy="14.6" r="6.4"/><path d="M15.4 9.8 17.6 7.6"/><path d="M17.6 7.6c1-1 2.4-1 3.4 0"/><path d="M14.6 6.6h2.6v2.6"/>',
 gear:'<path d="m12 2.6 7.4 3.8v11.2L12 21.4 4.6 17.6V6.4z"/><path d="m4.6 6.4 7.4 3.8 7.4-3.8M12 10.2v11.2"/>',
 horse:'<path d="M4 20.6c0-4.4 2.4-7.6 6-9l1.6-3.6L9.4 5l3.4-1.4 1.6 2.4 3.6 1.6c1.6.8 2.2 2.6 2.2 4.4v8.6"/><path d="M9.4 5 8 3.4"/><path d="M12.8 3.6 12 1.8"/>',
 cannon:'<path d="M3.4 15.4h6.2l9.6-5.2 1.8 3.2-9.6 5.2v2.8H3.4z"/><circle cx="6" cy="19.4" r="2.2"/><path d="m19.4 8.6 2.2-1.2"/>',
 // ── Interface ────────────────────────────────────────────────────────────
 dice:`<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.2"/><circle cx="8.4" cy="8.4" r="1.35" ${F}/><circle cx="15.6" cy="15.6" r="1.35" ${F}/><circle cx="12" cy="12" r="1.35" ${F}/>`,
 search:'<circle cx="10.8" cy="10.8" r="6.4"/><path d="m20.4 20.4-5-5"/>',
 plus:'<path d="M12 5.4v13.2M5.4 12h13.2"/>',
 minus:'<path d="M5.4 12h13.2"/>',
 chevron:'<path d="m9.4 5.4 6.6 6.6-6.6 6.6"/>',
 caret:'<path d="m6 9.4 6 6 6-6"/>',
 arrowUp:'<path d="M12 19.4V4.6M6 10.6 12 4.6l6 6"/>',
 external:'<path d="M14 3.6h6.4V10"/><path d="m20.4 3.6-8.6 8.6"/><path d="M18.4 14v5.4a1.4 1.4 0 0 1-1.4 1.4H5a1.4 1.4 0 0 1-1.4-1.4V7.4A1.4 1.4 0 0 1 5 6h5.4"/>',
 lock:'<rect x="4.4" y="10" width="15.2" height="10.6" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2.6"/>',
 edit:'<path d="M4 20h4.2L20.4 7.8 16.2 3.6 4 15.8z"/><path d="m14.4 5.4 4.2 4.2"/>',
 trash:'<path d="M4 6.6h16"/><path d="M9.4 6.6V4.4h5.2v2.2"/><path d="m6.4 6.6 1 14h9.2l1-14"/><path d="M10.4 10.4v6.4M13.6 10.4v6.4"/>',
 check:'<path d="m4.6 12.6 4.8 4.8 10-11"/>',
 close:'<path d="m5.4 5.4 13.2 13.2M18.6 5.4 5.4 18.6"/>',
 book:'<path d="M3.6 4.4h7.2a2.8 2.8 0 0 1 2.8 2.8v13a2.4 2.4 0 0 0-2.4-2.4H3.6z"/><path d="M20.4 4.4h-5.6a2.8 2.8 0 0 0-2.8 2.8v13a2.4 2.4 0 0 1 2.4-2.4h6z"/>',
 luck:'<path d="M12 12.6c-.4-2.6-1.8-4-3.4-3.6-1.7.4-2 2.6-.3 3.4-2.3-1-4 .4-3.8 2.2.2 1.8 2.6 2.4 3.8.6-.5 2.6.8 4.2 2.6 4.2s3.1-1.6 2.6-4.2c1.2 1.8 3.6 1.2 3.8-.6.2-1.8-1.5-3.2-3.8-2.2 1.7-.8 1.4-3-.3-3.4-1.6-.4-3 1-3.4 3.6"/><path d="M12 12.6V4.4"/>',
 wind:'<path d="M2.6 8.4h9.8a3 3 0 1 0-3-3"/><path d="M2.6 12.4h13a3 3 0 1 1-3 3"/><path d="M2.6 16.4h7"/>',
 feather:'<path d="M20.4 3.6C10 3.6 5.4 8.6 5.4 15v5.4"/><path d="M20.4 3.6c0 8.4-5 12.4-11.4 12.4H5.4"/><path d="M9.6 12.4h5.6"/>',
 moon:'<path d="M20.4 14.6A8.6 8.6 0 1 1 10.4 3.6a7 7 0 0 0 10 11Z"/>',
 skull:'<path d="M6.4 16.6c-1.6-1.4-2.6-3.4-2.6-5.8C3.8 6.4 7.4 3 12 3s8.2 3.4 8.2 7.8c0 2.4-1 4.4-2.6 5.8v3.2a1.2 1.2 0 0 1-1.2 1.2H7.6a1.2 1.2 0 0 1-1.2-1.2z"/><circle cx="9" cy="11.4" r="1.8"/><circle cx="15" cy="11.4" r="1.8"/><path d="M10.6 17.4h2.8"/>',
 drop:'<path d="M12 3.2s6.2 6.8 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 10 12 3.2 12 3.2Z"/>',
 flame:'<path d="M12 21.4c-3.2 0-5.6-2.2-5.6-5.4 0-4.6 5.6-8 4.6-13 3.4 1.8 5.6 5.4 5.6 8 0 1.2 1.2 1.6 1.8.2 1 1.6 1.2 3.2 1.2 4.8 0 3.2-2.4 5.4-7.6 5.4Z"/>',
 hammer:'<path d="m13.4 2.6 8 8-2.8 2.8-8-8z"/><path d="m11.4 8.6-8.8 8.8 2.8 2.8 8.8-8.8"/>',
 pierce:'<path d="m3.6 20.4 6.8-6.8"/><path d="m13.4 3.6 7 7-4 .8-.8 4z"/><path d="m10.4 6.6 7 7"/>',
 stamp:'<path d="M4.6 20.4h14.8"/><path d="M6.4 17.4h11.2v-2.2c0-1-.8-1.8-1.8-1.8h-1.4l.6-6a2.4 2.4 0 0 0-2.4-2.8h-1.2a2.4 2.4 0 0 0-2.4 2.8l.6 6H8.2c-1 0-1.8.8-1.8 1.8z"/>',
 wings:`<path ${F} d="M12 20.4 3.6 12c2.4-1.2 4.8 0 6 1.8-.6-3-3-5.4-6-6 3.6-1.2 7.2.6 8.4 3.6 1.2-3 4.8-4.8 8.4-3.6-3 .6-5.4 3-6 6 1.2-1.8 3.6-3 6-1.8z"/>`,
 shield:'<path d="M12 2.8 19.6 6v6.4c0 4.6-3.2 7.4-7.6 8.8-4.4-1.4-7.6-4.2-7.6-8.8V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
 target:'<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4"/><path d="M12 1.6v3.2M12 19.2v3.2M1.6 12h3.2M19.2 12h3.2"/>',
 users:'<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c0-3.6 2.8-6 6.2-6s6.2 2.4 6.2 6"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.4"/><path d="M17.6 14.6c2.2.8 3.6 2.8 3.6 5.4"/>',
 refresh:'<path d="M20.4 12a8.4 8.4 0 1 1-2.6-6"/><path d="M20.4 3.6V9h-5.4"/>',
 eye:'<path d="M2.6 12S6 6.4 12 6.4 21.4 12 21.4 12 18 17.6 12 17.6 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.4"/>',
 clock:'<circle cx="12" cy="12" r="8.6"/><path d="M12 6.8V12l3.4 2.2"/>',
 crown:'<path d="m3.4 6.6 3.4 4 5.2-6.6 5.2 6.6 3.4-4-1.6 12.8H5z"/><path d="M5 19.4h14"/>',
 flag:'<path d="M5.4 21.4V3.6"/><path d="M5.4 4.4c4-1.6 8 1.6 12 0v8.4c-4 1.6-8-1.6-12 0z"/>',
 anchor:'<circle cx="12" cy="5.4" r="2.4"/><path d="M12 7.8v13"/><path d="M7.6 11h8.8"/><path d="M3.6 15.4c0 3.4 3.8 5.4 8.4 5.4s8.4-2 8.4-5.4"/>',
 note:'<path d="M5 3.6h10l4 4v12.8H5z"/><path d="M14.6 3.6v4.2h4.2"/><path d="M8 12h8M8 15.6h5.6"/>',
 plusSquare:'<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="2.4"/><path d="M12 8v8M8 12h8"/>',
 filter:'<path d="M3.6 5.4h16.8l-6.6 7.6v6l-3.6 2v-8z"/>'
};
export const STAT_ICON = {agility:'agility', technique:'technique', mind:'mind', body:'body', heart:'heart', duty:'duty'};
export const CATEGORY_ICON = {'Titan hunting':'hunting', Combat:'combat', Resolve:'resolve', Recovery:'recovery', 'Soldier duties':'duties', Shifting:'shifting'};
export const REGION_ICON = {head:'head', chest:'chest', leftArm:'arm', rightArm:'arm', leftLeg:'leg', rightLeg:'leg'};
export const INJURY_ICON = {blunt:'hammer', cutting:'blade', piercing:'pierce', burn:'flame'};
// Field-kit rows are matched by key, then by name fragment, so custom gear still resolves.
const KIT_MATCH = [
 [/gas|canister/i,'gas'],[/blade|sword/i,'blade'],[/flare/i,'flare'],[/bandage|first-aid|first aid|disinfect|splint|cast/i,'bandage'],
 [/knife/i,'knife'],[/rifle|musket|pistol|magazine|shell/i,'rifle'],[/canteen|water/i,'canteen'],[/lantern|flashlight|torch/i,'lantern'],
 [/map/i,'map'],[/compass/i,'compass'],[/serum|spinal/i,'serum'],[/dynamite|explos/i,'explosive'],[/cannon|artillery/i,'cannon'],
 [/satchel|backpack|ration/i,'pack'],[/odm|ahss|maneuver/i,'agility'],[/horse/i,'horse'],[/radio/i,'note']
];
export function gearIcon(name='',key='') {
 const subject = `${key} ${name}`;
 return KIT_MATCH.find(([pattern])=>pattern.test(subject))?.[1] ?? 'gear';
}
export const SPRITE = `<svg class="tw-sprite" aria-hidden="true" focusable="false" width="0" height="0">${
 Object.entries(ICONS).map(([name,body])=>`<symbol id="tw-i-${name}" viewBox="0 0 24 24">${body}</symbol>`).join('')
}</svg>`;
export const icon = (name,extra='') => `<svg class="i${extra?' '+extra:''}" aria-hidden="true" focusable="false"><use href="#tw-i-${ICONS[name]?name:'gear'}"/></svg>`;
