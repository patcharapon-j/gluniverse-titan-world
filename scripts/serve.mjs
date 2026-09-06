// Static file server for the preview harness.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const TYPES={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png'};
http.createServer(async (req,res)=>{
 const url=decodeURIComponent(req.url.split('?')[0]);
 const file=path.join(root,url==='/'?'preview/overview.html':url);
 if(!file.startsWith(root)){res.writeHead(403).end('forbidden');return;}
 try{
  const body=await fs.readFile(file);
  res.writeHead(200,{'content-type':TYPES[path.extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end('not found');}
}).listen(8123,()=>console.log('preview server on http://localhost:8123'));
