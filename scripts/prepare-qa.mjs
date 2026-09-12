import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(os.tmpdir(),'titan-world-v14-qa-01a07727');
const dest=path.join(target,'Data/systems/gluniverse-titan-world');
await fs.mkdir(dest,{recursive:true});
const runtime=['module','templates','styles','assets','data','lang','lib','system.json'];
for(const name of runtime)await fs.cp(path.join(root,name),path.join(dest,name),{recursive:true});
await fs.copyFile(path.join(root,'tests/qa-runtime.mjs'),path.join(dest,'module/qa-runtime.mjs'));
await fs.appendFile(path.join(dest,'module/main.mjs'),"\nimport './qa-runtime.mjs';\n");
if(process.argv.includes('--packs')) {
 const packTarget=path.resolve(dest,'packs'),realParent=await fs.realpath(dest),realTemp=await fs.realpath(target);
 if(!realParent.startsWith(realTemp+path.sep)||path.relative(target,packTarget).startsWith('..'))throw new Error('QA pack path escaped the isolated test directory');
 console.log('Replacing isolated QA packs at '+packTarget);
 await fs.rm(packTarget,{recursive:true,force:true});
 await fs.cp(path.join(root,'packs'),packTarget,{recursive:true});
}
if(!process.argv.includes('--sync')) {
 await fs.cp(path.join(root,'packs'),path.join(dest,'packs'),{recursive:true});
 await fs.mkdir(path.join(target,'Config'),{recursive:true});
 await fs.copyFile('C:/Users/frostnoxia/AppData/Local/FoundryVTT/Config/license.json',path.join(target,'Config/license.json'));
 await fs.writeFile(path.join(target,'Config/options.json'),JSON.stringify({port:30001,upnp:false,telemetry:false,noBackups:true,world:'titan-world-qa'}));
 const world=path.join(target,'Data/worlds/titan-world-qa');await fs.mkdir(path.join(world,'data'),{recursive:true});
 await fs.writeFile(path.join(world,'world.json'),JSON.stringify({id:'titan-world-qa',title:'Titan World · Isolated QA',system:'gluniverse-titan-world',coreVersion:'14.363',systemVersion:'1.0.0',description:'Disposable system validation world.'}));
 const require=createRequire('C:/Program Files/Foundry Virtual Tabletop/resources/app/package.json');const {ClassicLevel}=require('classic-level');
 const db=new ClassicLevel(path.join(world,'data/users'),{valueEncoding:'json'});
 const users=db.sublevel('users',{valueEncoding:'json'});
 await users.put('TWQA000000000001',{_id:'TWQA000000000001',name:'QA Gamemaster',role:4,password:'',color:'#354d3e'});
 await users.put('TWQA000000000002',{_id:'TWQA000000000002',name:'QA Player',role:1,password:'',color:'#8a382b'});await db.close();
}
console.log(target);
