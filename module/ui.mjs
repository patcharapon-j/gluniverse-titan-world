export const ID='gluniverse-titan-world';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const options=(entries,selected)=>Object.entries(entries).map(([value,label])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`).join('');
export const field=(label,name,value='',type='text')=>`<label class="field"><span>${esc(label)}</span><input type="${type}" name="${esc(name)}" value="${esc(value)}"></label>`;
export const select=(label,name,entries,value)=>`<label class="field"><span>${esc(label)}</span><select name="${name}">${options(entries,value)}</select></label>`;
export const check=(label,name,checked=false)=>`<label class="check"><input type="checkbox" name="${esc(name)}" ${checked?'checked':''}><span>${esc(label)}</span></label>`;
export const segments=(name,entries,selected)=>entries.map(([value,label,title])=>
 `<label class="seg"${title?` title="${esc(title)}"`:''}><input type="radio" name="${esc(name)}" value="${esc(value)}"${String(value)===String(selected)?' checked':''}><span>${esc(label)}</span></label>`).join('');
export async function prompt(title,content,label='Apply',{classes=[],width,render}={}) {
 // Every system dialog lands like a slip put down on the table; motion lives in a browser-only module.
 const landed=(event,dialog)=>{render?.(event,dialog);import('./fx.mjs').then(fx=>fx.dialogIntro(dialog.element)).catch(()=>{});};
 const result=await foundry.applications.api.DialogV2.wait({window:{title},classes:['tw',...classes],...(width?{position:{width}}:{}),render:landed,rejectClose:false,content:`<div class="tw-dialog">${content}</div>`,buttons:[{action:'apply',label,default:true,callback:(_event,button)=>Object.fromEntries(new FormData(button.form))},{action:'cancel',label:'Cancel'}]});
 // DialogV2 resolves a button without a result as its action name, so Cancel arrives as the string 'cancel'; only the form object is a submission.
 return result&&typeof result==='object'?result:null;
}
// A yes/no question is a small slip the clerk has already stamped for your signature.
export async function confirm(title,content) {
 return foundry.applications.api.DialogV2.confirm({window:{title},classes:['tw','tw-confirm'],position:{width:320},rejectClose:false,
  yes:{label:'Confirm',icon:''},no:{label:'Cancel',icon:''},
  content:`<div class="tw-dialog"><div class="cf-slip"><i class="cf-mark" aria-hidden="true">Confirm</i><p>${esc(content)}</p></div></div>`,
  render:(_event,dialog)=>import('./fx.mjs').then(fx=>fx.dialogIntro(dialog.element)).catch(()=>{})});
}
export function requireOwner(actor) {if(!actor?.isOwner)throw new Error('You must own this actor.');}
export function requireGM() {if(!game.user.isGM)throw new Error('A GM must apply this change.');}
export function report(error) {console.error('Titan World',error);ui.notifications.error(error.message??String(error));}
export const guard=fn=>async function(...args){try{return await fn.apply(this,args);}catch(error){report(error);}};
