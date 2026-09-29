// Reusable Commons photographs with source and license metadata. Run from app root.
const fs = require('node:fs');
const path = require('node:path');
const plan = require('./online-plan.json');
const output = 'public/menu/online';
const metadata = 'scripts/food-photos/online-sources.json';
fs.mkdirSync(output, { recursive: true });
const sources = fs.existsSync(metadata) ? JSON.parse(fs.readFileSync(metadata)) : {};
const clean = text => (text ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
async function run(key, item) {
  if (sources[key]) return;
  const params = new URLSearchParams({ action:'query', generator:'search', gsrsearch:item.query+' filetype:bitmap', gsrnamespace:'6', gsrlimit:'8', prop:'imageinfo', iiprop:'url|extmetadata|size', iiurlwidth:'1280', format:'json' });
  let response = await fetch('https://commons.wikimedia.org/w/api.php?'+params);
  if(response.status===429){console.log('Rate limit: waiting before retry');await new Promise(r=>setTimeout(r,65000));response=await fetch('https://commons.wikimedia.org/w/api.php?'+params);}
  if(!response.ok) throw new Error('Search HTTP '+response.status);
  const data = await response.json();
  const candidates = Object.values(data.query?.pages ?? {}).sort((a,b)=>a.index-b.index).filter(p=>{
    const i=p.imageinfo?.[0], license=i?.extmetadata?.LicenseShortName?.value ?? '';
    return i && i.width>=1000 && i.height>=700 && /CC BY|CC0|Public domain/i.test(license) && !/drawing|illustration|logo|map of|menu|packaging/i.test(p.title);
  });
  if (!candidates.length) { console.log('NO MATCH',key); return; }
  const p=candidates[item.choice ?? 0] ?? candidates[0], i=p.imageinfo[0];
  const url=(i.thumburl ?? i.url).split('?')[0];
  const image=await fetch(url);
  if (!image.ok) throw new Error(key+' download '+image.status);
  const buffer=Buffer.from(await image.arrayBuffer());
  const ext=/png/i.test(image.headers.get('content-type')??'')?'png':'jpg';
  const file=path.join(output,key+'.'+ext);
  fs.writeFileSync(file,buffer);
  sources[key]={title:p.title,source:i.descriptionurl,url,author:clean(i.extmetadata.Artist?.value),license:clean(i.extmetadata.LicenseShortName?.value),licenseUrl:i.extmetadata.LicenseUrl?.value ?? '',originalWidth:i.width,originalHeight:i.height,file:'/'+file.replaceAll('\\','/').replace(/^public\//,''),alternatives:candidates.map(c=>c.title),downloadedAt:'2026-09-29'};
  fs.writeFileSync(metadata,JSON.stringify(sources,null,2)+'\n');
  console.log(key,p.title);
}
(async()=>{for(const [key,item] of Object.entries(plan)){if(sources[key])continue;try{await run(key,item);}catch(e){console.log('FAILED',key,e.message);}await new Promise(r=>setTimeout(r,6500));}})();
