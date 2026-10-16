import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import vm from 'node:vm';
const skillRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const artSettings=fs.readFileSync(path.join(skillRoot,'assets/art-settings.js'),'utf8');
const {normalizeArt}=vm.runInNewContext(artSettings+'\n({normalizeArt})');
const hex=/^#[0-9a-fA-F]{6}$/;
const number=(v,label)=>{if(!Number.isFinite(v)||v<0)throw Error(label+' must be a nonnegative number');};
const text=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(label+' must be a nonempty string');};
const array=(v,label)=>{if(!Array.isArray(v))throw Error(label+' must be an array');};
export function normalizeProfile(input,drawings){
 const p=structuredClone(input);if(p.schemaVersion!==1)throw Error('Unsupported profile schemaVersion');
 text(p.player?.name,'player.name');text(p.player?.latinName,'player.latinName');text(p.player?.asOf,'player.asOf');text(p.player?.intro,'player.intro');
 p.player.accent||='#6CABDD';if(!hex.test(p.player.accent))throw Error('player.accent must be a hex color');
 p.timing={startMs:120,portraitMs:6800,introMs:3800,ballMs:2300,holdMs:1000,...p.timing};
 p.art=normalizeArt(p.art||{drawMs:p.timing.portraitMs,holdMs:p.timing.holdMs});
 p.timing.portraitMs=p.art.drawMs;p.timing.holdMs=p.art.holdMs;
 p.timing.introMs=Math.min(p.timing.introMs,p.art.drawMs);
 p.artRoles||={crests:{medium:"colored-pencil",drawingMode:'detailed',thickness:1,detail:100,grain:.25,roughness:.05,saturation:1,opacity:1,contourFraction:.22}};
 for(const [label,group] of [['artRoles',p.artRoles],['artAssets',p.artAssets]])if(group){
  if(typeof group!=='object'||Array.isArray(group))throw Error(label+' must be an object');
  for(const [key,override] of Object.entries(group)){
   if(label==='artRoles'&&!['portraits','crests','trophies'].includes(key))throw Error('Invalid art role: '+key);
   if(label==='artAssets'&&!Object.hasOwn(drawings,key))throw Error('Missing art asset: '+key);
   if(['drawMs','holdMs','paper'].some(k=>Object.hasOwn(override,k)))throw Error('Timing and paper must be set globally in art');
   normalizeArt({...p.art,...override});
  }
 }
 for(const [key,value] of Object.entries(p.timing)){if(key==='targetMs')continue;number(value,'timing.'+key);}
 if(p.timing.portraitMs<=p.timing.startMs||p.timing.introMs<=p.timing.startMs||p.timing.ballMs<=p.timing.startMs)throw Error('Drawing endpoints must be after startMs');
 const checkDrawing=(key,label)=>{text(key,label);if(!Object.hasOwn(drawings,key))throw Error('Missing pencil geometry for '+label+': '+key);};
 if(p.artVariants)for(const [base,variants] of Object.entries(p.artVariants)){
  checkDrawing(base,'artVariants base');
  for(const [medium,key] of Object.entries(variants)){if(medium!=='sketch')normalizeArt({medium});checkDrawing(key,'artVariants '+medium);}
 }
 checkDrawing(p.intro?.drawing,'intro.drawing');
 array(p.career?.rows,'career.rows');if(!p.career.rows.length)throw Error('career.rows is empty');number(p.career?.total?.value,'career.total.value');text(p.career?.total?.label,'career.total.label');
 p.career.summary||='俱乐部与国家队生涯';p.career.note||='';
 for(const [i,r] of p.career.rows.entries()){text(r.club,'career.rows.club');text(r.period,'career.rows.period');number(r.appearances,'appearances');number(r.goals,'goals');if(!Number.isInteger(r.appearances)||!Number.isInteger(r.goals))throw Error('Appearances and goals must be integer counts');checkDrawing(r.crest,'career.rows['+i+'].crest');r.accent||=p.player.accent;if(!hex.test(r.accent))throw Error('Invalid career accent');r.highlights||='';r.appearancesSuffix||='';}
 array(p.chapters,'chapters');if(!p.chapters.length)throw Error('chapters is empty');
 for(const [i,c] of p.chapters.entries()){
  text(c.year,'chapters.year');text(c.title,'chapters.title');text(c.body,'chapters.body');array(c.facts,'chapters.facts');
  if(!['portrait','ball','bench','trophies'].includes(c.visual))throw Error('Unsupported chapter visual: '+c.visual);
  if(c.visual!=='ball')checkDrawing(c.drawing,'chapters['+i+'].drawing');
  if(c.visual==='bench'&&c.shirtNumber==null)throw Error('A bench chapter needs its verified shirtNumber');
  if(c.durationScale!=null&&(!Number.isFinite(c.durationScale)||c.durationScale<=0))throw Error('Invalid chapter durationScale');
  if(c.drawingBox!=null&&(!Array.isArray(c.drawingBox)||c.drawingBox.length!==4||!c.drawingBox.every(Number.isFinite)||c.drawingBox[2]<=0||c.drawingBox[3]<=0))throw Error('drawingBox needs [x,y,width,height]');
  if(c.accent&&!hex.test(c.accent))throw Error('Invalid chapter accent');
  for(const f of c.facts){text(String(f.value??''),'facts.value');text(f.label,'facts.label');}
  if(c.trophyLabels){array(c.trophyLabels,'trophyLabels');for(const l of c.trophyLabels){text(l.text,'trophyLabels.text');number(l.x,'trophyLabels.x');}}
 }
 array(p.stats?.metrics,'stats.metrics');if(!p.stats.metrics.length)throw Error('stats.metrics is empty');
 array(p.stats.honors,'stats.honors');array(p.stats.individual,'stats.individual');p.stats.note||='';
 for(const m of p.stats.metrics){number(m.value,'stats.metrics.value');if(!Number.isInteger(m.value))throw Error('Default animated metrics require integer counts; put decimal values in facts or extend numeric formatting');text(m.label,'stats.metrics.label');}
 for(const h of p.stats.honors){text(h.name,'honors.name');number(h.count,'honors.count');if(!Number.isInteger(h.count))throw Error('Honor counts must be integers');}
 for(const h of p.stats.individual){text(h.period,'individual.period');text(h.name,'individual.name');}
 return p;
}
export function encodeDrawings(input){
 const drawings=structuredClone(input);if(!Object.keys(drawings).length)throw Error('No pencil drawings');
 for(const [key,d] of Object.entries(drawings)){
  if(d.encoding)throw Error('Input must be raw extractor geometry, not already encoded: '+key);
  const raw=Buffer.from(d.packed,'base64'),count=raw.length/13;
  if(!Number.isInteger(count)||(!count&&d.representation!=='loose-sketch')||!Array.isArray(d.counts)||d.counts.length!==4||d.counts.reduce((a,b)=>a+b,0)!==count)throw Error('Invalid stroke counts: '+key);
  if(!Array.isArray(d.paths)||!d.paths.length||!d.paths.every(p=>p.length>=2))throw Error('No continuous contours: '+key);
  if(d.representation==='loose-sketch'&&(!Array.isArray(d.pathStyles)||d.pathStyles.length!==d.paths.length))throw Error('Sketch paths need matching styles: '+key);
  const lane=Buffer.alloc(raw.length);let previousX=0,previousY=0;
  for(let i=0;i<count;i++){const o=i*13,x=raw.readUInt16LE(o),y=raw.readUInt16LE(o+2),xx=raw.readUInt16LE(o+4),yy=raw.readUInt16LE(o+6);
   raw.writeUInt16LE((x-previousX)&65535,o);raw.writeUInt16LE((y-previousY)&65535,o+2);raw.writeUInt16LE((xx-x)&65535,o+4);raw.writeUInt16LE((yy-y)&65535,o+6);previousX=x;previousY=y;
   for(let j=0;j<13;j++)lane[j*count+i]=raw[o+j];
  }
  d.packed=lane.toString('base64');d.encoding='delta-lanes-v1';
 }
 return gzipSync(JSON.stringify(drawings),{level:9}).toString('base64');
}
const safeJSON=v=>JSON.stringify(v).replaceAll('<','\\u003c');
export function buildStory(profile,rawDrawings){
 const p=normalizeProfile(profile,rawDrawings);
 const usedKeys=new Set([p.intro.drawing,...p.career.rows.map(r=>r.crest),...p.chapters.filter(c=>c.visual!=='ball').map(c=>c.drawing)]);
 for(const base of [...usedKeys])for(const key of Object.values(p.artVariants?.[base]||{}))usedKeys.add(key);
 const usedDrawings=Object.fromEntries([...usedKeys].map(key=>[key,rawDrawings[key]]));
 let inner=fs.readFileSync(path.join(skillRoot,'assets/story-template.html'),'utf8');
 inner=inner.replace('__PROFILE_JSON__',()=>safeJSON(p)).replace('__PENCIL_PAYLOAD__',()=>encodeDrawings(usedDrawings)).replace('__PENCIL_RUNTIME__',()=>artSettings+'\n'+fs.readFileSync(path.join(skillRoot,'assets/art-runtime.js'),'utf8'));
 if(/__PROFILE_JSON__|__PENCIL_PAYLOAD__|__PENCIL_RUNTIME__/.test(inner))throw Error('An unfilled template token remains');
 new vm.Script(inner.match(/<script>([\s\S]*?)<\/script>/)[1]);
 inner=inner.replace('new URLSearchParams(location.search)','new URLSearchParams(parent.location.search)');
 const srcdoc=inner.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const title=p.player.name.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'：一支铅笔画完的生涯</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#D7DADC}iframe{position:fixed;left:50%;top:50%;width:1920px;height:1080px;border:0;transform:translate(-50%,-50%) scale(var(--scale,1));transform-origin:center}</style></head><body><iframe title="球员生涯横版素描动画" srcdoc="'+srcdoc+'"></iframe><script>function fit(){document.documentElement.style.setProperty("--scale",Math.min(innerWidth/1920,innerHeight/1080))}addEventListener("resize",fit);fit();</script></body></html>';
 return {profile:p,html,inner};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [profileFile,strokesFile,outputFile]=process.argv.slice(2);if(!outputFile)throw Error('Usage: node build-story.mjs story.json pencil-data.json player.html');
 const bytes=fs.readFileSync(strokesFile),drawings=JSON.parse((strokesFile.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 const {html}=buildStory(JSON.parse(fs.readFileSync(profileFile,'utf8')),drawings);
 fs.mkdirSync(path.dirname(path.resolve(outputFile)),{recursive:true});fs.writeFileSync(outputFile,html);console.log('Created '+path.resolve(outputFile));
}
