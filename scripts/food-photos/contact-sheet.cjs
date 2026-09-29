const fs = require('node:fs');
const { createRequire } = require('node:module');
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const sources = {...JSON.parse(fs.readFileSync('scripts/food-photos/online-sources.json')), ...JSON.parse(fs.readFileSync('scripts/food-photos/curated-sources.json'))};
(async()=>{
 const entries=Object.entries(sources);
 for(let start=0;start<entries.length;start+=20){
  const tiles=await Promise.all(entries.slice(start,start+20).map(async([key,s],idx)=>{
   const img=await sharp('public'+s.file).resize(270,190,{fit:'cover'}).toBuffer();
   const label=Buffer.from(`<svg width="270" height="32"><rect width="270" height="32" fill="white"/><text x="8" y="22" font-size="17" fill="black">${key}</text></svg>`);
   return [{input:img,left:(idx%4)*270,top:Math.floor(idx/4)*222},{input:label,left:(idx%4)*270,top:Math.floor(idx/4)*222+190}];
  }));
  await sharp({create:{width:1080,height:Math.ceil(Math.min(20,entries.length-start)/4)*222,channels:3,background:'white'}}).composite(tiles.flat()).png().toFile(`../../analysis/food-sheet-${start/20+1}.png`);
 }
})();
