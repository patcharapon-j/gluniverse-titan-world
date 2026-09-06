import fs from 'node:fs';
export function nextVersion(version,bump) {
 if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Expected major.minor.patch version');
 const parts=version.split('.').map(Number),index=['major','minor','patch'].indexOf(bump);
 if(index<0)throw new Error('Choose patch, minor, or major');
 parts[index]++;for(let i=index+1;i<3;i++)parts[i]=0;
 return parts.join('.');
}
if(process.env.GITHUB_ACTIONS==='true' && process.argv[1]?.endsWith('release.mjs')){
 const manifest=JSON.parse(fs.readFileSync('system.json','utf8'));
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 if(pkg.version!==manifest.version)throw new Error('Package and manifest versions differ');
 const version=nextVersion(manifest.version,process.env.BUMP);
 const url='https://github.com/'+process.env.GITHUB_REPOSITORY;
 Object.assign(manifest,{version,url,manifest:url+'/releases/latest/download/system.json',download:url+'/releases/download/v'+version+'/gluniverse-titan-world.zip'});
 pkg.version=version;
 for(const [file,data] of [['system.json',manifest],['package.json',pkg]])fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
 fs.appendFileSync(process.env.GITHUB_OUTPUT,'version='+version+'\n');
}
