import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CONTENT} from '../data/content.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(process.env.FOUNDRY_APP??'C:/Program Files/Foundry Virtual Tabletop/resources/app','package.json'));const hb=require('handlebars');
for(const folder of ['module','data','scripts','tests'])for(const file of await fs.readdir(path.join(root,folder))){if(!file.endsWith('.mjs'))continue;const r=spawnSync(process.execPath,['--preserve-symlinks','--preserve-symlinks-main','--check',path.join(root,folder,file)],{encoding:'utf8'});if(r.status)throw new Error(r.stderr);}
for(const file of (await fs.readdir(path.join(root,'templates'))).filter(f=>f.endsWith('.hbs')))hb.precompile(await fs.readFile(path.join(root,'templates',file),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'system.json'),'utf8'));
if(manifest.compatibility.minimum!=='14'||manifest.compatibility.maximum!=='14')throw new Error('v14-only gate missing');
for(const rel of [...manifest.esmodules,...manifest.styles,...manifest.languages.map(l=>l.path),...manifest.packs.map(p=>p.path)])await fs.access(path.join(root,rel));
if(CONTENT.moves.length!==77||CONTENT.powers.length!==9||CONTENT.loadouts.length!==3)throw new Error('Incomplete catalog');
for(const move of CONTENT.moves)if(!move.system.description||!move.system.source)throw new Error('Missing move source '+move.name);
console.log('Syntax, templates, manifest, and content checks passed.');
