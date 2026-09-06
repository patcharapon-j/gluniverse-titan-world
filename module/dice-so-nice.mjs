// Native ChatMessage rolls let DsN handle privacy, synchronization and user preferences.
export function registerDiceSoNice() {
 Hooks.once('diceSoNiceInit',dice3d=>{
  dice3d.setMessageUpdateHideSelector('.dice-roll, .tw.chat-card');
 });
 Hooks.once('diceSoNiceReady',dice3d=>{
  dice3d.addColorset({name:'titan-world-regiment',description:'Titan World · Regimental green',category:'Titan World',foreground:'#eee5ce',background:'#354d3e',outline:'#18251e',edge:'#b6a37a',texture:'none',material:'metal'},'default');
 });
}
