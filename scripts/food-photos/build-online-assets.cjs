// Resize without enlargement, keep sharp WebP assets, and generate mappings/credits.
const fs=require('node:fs');
const {createRequire}=require('node:module');
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const plan=require('./online-plan.json');
const sources={...require('./online-sources.json'),...require('./curated-sources.json')};
(async()=>{
 const map={}, credits=[];
 for(const [key,item] of Object.entries(plan)){
  const source=sources[key];
  if(!source)throw new Error('Missing photo: '+key);
  const file=`/menu/online/${key}.webp`;
  const input='public'+source.file;
  const info=await sharp(input).metadata();
  if(info.width<900||info.height<600)throw new Error('Insufficient resolution: '+key+' '+info.width+'x'+info.height);
  if(!fs.existsSync('public'+file)||fs.statSync(input).mtimeMs>fs.statSync('public'+file).mtimeMs) {
    await sharp(input).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:88,effort:5}).toFile('public'+file);
  }
  for(const n of item.ids)map[`menu-${n<=46?'a':'b'}-${String(n).padStart(3,'0')}`]=[file];
  credits.push({key,title:source.title.replace(/^File:/,''),author:source.author,source:source.source,license:source.license,licenseUrl:source.licenseUrl,file,width:info.width,height:info.height,changes:'Resized and converted to WebP; cropped to fit menu cards. No AI generation or enlargement.'});
 }
 fs.writeFileSync('src/lib/menu-photo-map.json',JSON.stringify(map,null,2)+'\n');
 fs.writeFileSync('src/lib/menu-photo-credits.json',JSON.stringify(credits,null,2)+'\n');
 console.log(`Built ${credits.length} photographs for ${Object.keys(map).length} menu items.`);
})();
