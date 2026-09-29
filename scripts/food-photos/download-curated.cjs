const fs=require('node:fs');
const selected=require('./curated-overrides.json');
const clean=s=>(s??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
(async()=>{
 const params=new URLSearchParams({action:'query',titles:Object.values(selected).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|size',iiurlwidth:'1280',format:'json'});
 const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params);
 if(!response.ok)throw new Error('HTTP '+response.status);
 const data=await response.json(), result=fs.existsSync('scripts/food-photos/curated-sources.json')?JSON.parse(fs.readFileSync('scripts/food-photos/curated-sources.json')):{};
 for(const [key,title] of Object.entries(selected)){
  if(result[key]?.title===title)continue;
  const p=Object.values(data.query.pages).find(p=>p.title.replaceAll('_',' ')===title.replaceAll('_',' ')), i=p?.imageinfo?.[0];
  if(!i){console.log('MISSING',key);continue;}
  const license=clean(i.extmetadata.LicenseShortName?.value);
  if(!/CC BY|CC0|Public domain/i.test(license))throw new Error('License needs review '+key+' '+license);
  const url=(i.thumburl??i.url).split('?')[0], r=await fetch(url);
  if(!r.ok){console.log('DOWNLOAD FAILED',key,r.status);continue;}
  const file='/menu/online/'+key+'-curated.'+(/png/.test(r.headers.get('content-type'))?'png':'jpg');
  fs.writeFileSync('public'+file,Buffer.from(await r.arrayBuffer()));
  result[key]={title:p.title,source:i.descriptionurl,url,author:clean(i.extmetadata.Artist?.value),license,licenseUrl:i.extmetadata.LicenseUrl?.value??'',originalWidth:i.width,originalHeight:i.height,file,downloadedAt:'2026-09-29'};
  console.log(key,p.title);
 }
 fs.writeFileSync('scripts/food-photos/curated-sources.json',JSON.stringify(result,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
