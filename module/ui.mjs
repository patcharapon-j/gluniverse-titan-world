export const ID='gluniverse-titan-world';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const options=(entries,selected)=>Object.entries(entries).map(([value,label])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`).join('');
export const field=(label,name,value='',type='text')=>`<label class="field">${esc(label)}<input type="${type}" name="${esc(name)}" value="${esc(value)}"></label>`;
export const select=(label,name,entries,value)=>`<label class="field">${esc(label)}<select name="${name}">${options(entries,value)}</select></label>`;
export async function prompt(title,content,label='Apply') {
 return foundry.applications.api.DialogV2.wait({window:{title},classes:['tw'],content:`<div style="padding:16px">${content}</div>`,buttons:[{action:'apply',label,default:true,callback:(_event,button)=>Object.fromEntries(new FormData(button.form))},{action:'cancel',label:'Cancel',callback:()=>null}]},{rejectClose:false});
}
export async function confirm(title,content) {return foundry.applications.api.DialogV2.confirm({window:{title},content:`<p>${esc(content)}</p>`});}
export function requireOwner(actor) {if(!actor?.isOwner)throw new Error('You must own this actor.');}
export function requireGM() {if(!game.user.isGM)throw new Error('A GM must apply this change.');}
export function report(error) {console.error('Titan World',error);ui.notifications.error(error.message??String(error));}
export const guard=fn=>async function(...args){try{return await fn.apply(this,args);}catch(error){report(error);}};
