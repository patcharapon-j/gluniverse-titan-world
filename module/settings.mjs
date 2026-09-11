// Per-viewer intensity: motion, GPU effects and gore. The OS reduced-motion preference is
// deliberately not consulted — each player chooses here instead. Outside Foundry (the
// preview harness) the values fall back to full intensity, or to globalThis.__twSettings.
import {ID} from './ui.mjs';

function read(key,fallback) {
 const override=globalThis.__twSettings?.[key];
 if(override!==undefined)return override;
 try {return globalThis.game?.settings?.get(ID,key)??fallback;} catch {return fallback;}
}
export const motionLevel=()=>read('motion','full');
export const gpuMode=()=>read('gpu','auto');
export function goreLevel() {
 const own=read('gore','default');
 return own==='default'?read('goreDefault','graphic'):own;
}

/** Body classes let the stylesheet follow the same choices without asking JavaScript. */
export function applyBodyClasses() {
 const body=globalThis.document?.body;if(!body)return;
 for(const name of [...body.classList])if(/^tw-(motion|gore)-/.test(name))body.classList.remove(name);
 body.classList.add(`tw-motion-${motionLevel()}`,`tw-gore-${goreLevel()}`);
}

function refresh() {
 applyBodyClasses();
 for(const app of foundry.applications.instances.values())if(app.options?.classes?.includes('tw')&&app.rendered)app.render();
}

export function registerFxSettings() {
 const client=(key,name,hint,choices,initial)=>game.settings.register(ID,key,{name,hint,scope:'client',config:true,type:String,choices,default:initial,onChange:refresh});
 client('motion','Motion','How much the sheets, dice cards and effects move on your screen.',
  {full:'Full — every animation and effect',subtle:'Subtle — short animations, no particles or loops',off:'Off — no animation'},'full');
 client('gpu','GPU effects','Sparks, blood, flares and steam are drawn on one WebGL layer. Auto falls back to lighter effects if frames drop.',
  {auto:'Auto',on:'On',off:'Off — lighter page effects only'},'auto');
 client('gore','Gore','How wounds are drawn on the body diagram, and how wound effects look, for you only.',
  {default:'World default',graphic:'Graphic',restrained:'Restrained',clinical:'Clinical — diagram marks only'},'default');
 game.settings.register(ID,'goreDefault',{name:'Default gore level',hint:'Used by every player who leaves their own Gore setting on World default.',
  scope:'world',config:true,type:String,choices:{graphic:'Graphic',restrained:'Restrained',clinical:'Clinical'},default:'graphic',onChange:refresh});
}
