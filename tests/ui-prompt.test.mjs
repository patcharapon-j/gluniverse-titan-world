import test from 'node:test';
import assert from 'node:assert/strict';
import {prompt} from '../module/ui.mjs';

// Mirrors DialogV2.wait: a pressed button resolves its callback's value, or its action name when that is nullish; dismissing resolves null.
const dialog=(action,form={})=>{globalThis.foundry={applications:{api:{DialogV2:{wait:async({buttons})=>{
 if(!action)return null;
 const button=buttons.find(b=>b.action===action);
 return (await button.callback?.(new Event('submit'),{form}))??button.action;
}}}}};};

test('pressing Cancel on a prompt is not a submission',async()=>{
 dialog('cancel');
 assert.equal(await prompt('Record a GM-assigned injury','','Record injury'),null);
});

test('closing a prompt from its header is not a submission',async()=>{
 dialog(null);
 assert.equal(await prompt('Record a GM-assigned injury','','Record injury'),null);
});

test('applying a prompt returns its form fields',async()=>{
 const original=globalThis.FormData;
 globalThis.FormData=class{constructor(form){return new Map(Object.entries(form));}};
 try {
  dialog('apply',{region:'head',severity:'major',injuryType:'cutting'});
  assert.deepEqual(await prompt('Record a GM-assigned injury','','Record injury'),{region:'head',severity:'major',injuryType:'cutting'});
 } finally {globalThis.FormData=original;}
});
