import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
function unwrap(html){const attr=html.match(/srcdoc="([\s\S]*?)"><\/iframe>/);return attr?attr[1].replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'):html;}
export async function verifyStory(html){
 const inner=unwrap(html);let code=inner.match(/<script>([\s\S]*?)<\/script>/)?.[1];if(!code)throw Error('Composition script not found');
 new vm.Script(code);
 const profile=JSON.parse(code.match(/const PROFILE=([\s\S]*?);\nconst esc=/)[1]);
 const packed=JSON.parse(gunzipSync(Buffer.from(code.match(/const packedPencil=atob\('([^']+)'\)/)[1],'base64')));
 const style=()=>({setProperty(){}});
 class Element{
  constructor(){this.dataset={};this.style=style();this.classList={add(){},remove(){},toggle(){}};this.hidden=true;this.innerHTML='';this.textContent='';this.offsetWidth=1920;this.offsetHeight=500;this.width=1920;this.height=1080;}
  setAttribute(k,v){this[k]=v;}appendChild(){}addEventListener(){}
  getContext(){if(!this.ctx){const node=this;this.ctx=new Proxy({canvas:node,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:s=>({width:String(s).length*18}),getImageData:()=>({data:new Uint8ClampedArray(4)}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(()=>{})});}return this.ctx;}
 }
 const ids=new Map(),lists=new Map();const get=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id)};
 const document={documentElement:new Element(),getElementById:get,createElement:()=>new Element(),querySelectorAll(selector){
  const id=selector==='[data-crest]'?'career':selector.match(/^#(\w+) \[data-n\]$/)?.[1];if(!id)return [];
  const content=get(id).innerHTML,old=lists.get(selector);if(old&&old.content===content)return old.nodes;
  const pattern=selector==='[data-crest]'?/data-crest="([^"]+)"/g:/data-n="(\d+(?:\.\d+)?)"/g;
  const nodes=[...content.matchAll(pattern)].map(m=>{const n=new Element();n.dataset[selector==='[data-crest]'?'crest':'n']=m[1];return n});lists.set(selector,{content,nodes});return nodes;
 }};
 let now=1000;const window={};
 const startup=/\(document\.fonts[^\n]+\.then\(begin\);/;
 if(!startup.test(code))throw Error('Runtime startup boundary not found');
 code=code.replace(startup,"window.__test={scenes,go,frame,getCur:()=>cur,getPaused:()=>paused,drawingFor,crestPlans};");
 const context={document,window,parent:{location:{search:''},postMessage(){}},matchMedia:()=>({matches:false,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:n=>n==='--graphite'?'#2A2D32':n==='--lead'?'#666B73':'#D7DADC'}),innerWidth:1920,innerHeight:1080,devicePixelRatio:1,performance:{now:()=>now},requestAnimationFrame(){},addEventListener(){},MutationObserver:class{observe(){}},location:{search:''},setTimeout,clearTimeout,URLSearchParams,atob,Uint8Array,DataView,Blob,Response,DecompressionStream};
 await vm.runInNewContext(code,context);const app=window.__test;
 assert.equal(app.scenes.length,profile.chapters.length+3,'Scene count must follow the input profile');
 const chapters=[];
 for(let i=0;i<app.scenes.length;i++){
  now+=100000;app.go(i);const sc=app.scenes[i],started=now;
  assert.equal(sc.dur-sc.drawEnd,profile.timing.holdMs,'Hold must start after the final stroke');
  assert(sc.strokes.length>0||sc.career,'No empty visual chapter: '+sc.id);
  const pencil=sc.strokes.find(s=>s.type==='pencil');
  if(pencil){
   const e=app.drawingFor(pencil.key);now=started+pencil.t0+(pencil.t1-pencil.t0)*e.settings.contourFraction*.5;app.frame(now);
   assert(e.pathDone>0&&e.pathDone<e.d.paths.length,'Contours must draw progressively: '+sc.id);
   now=started+pencil.t0+(pencil.t1-pencil.t0)*(e.settings.contourFraction+(1-e.settings.contourFraction)*.2);app.frame(now);
   if(e.d.representation==='loose-sketch'){
    assert(e.pathDone>0&&e.pathDone<e.d.paths.length,'Sketch lines must remain progressive: '+sc.id);
    if(!['graphite','ink'].includes(e.settings.medium)&&e.d.pathStyles.some(s=>Math.max(...s.rgb)-Math.min(...s.rgb)>8))assert(e.d.pathStyles.slice(0,e.pathDone).some(s=>Math.max(...s.rgb)-Math.min(...s.rgb)>8),'Colored sketch lines should already appear: '+sc.id);
   }else assert(e.done>e.d.counts[0]&&e.done<e.count,'Color must start early and remain progressive: '+sc.id);
  }
  if(profile.timing.holdMs>0){now=started+sc.dur-1;app.frame(now);assert.equal(app.getCur(),i,'Final picture must remain during the hold');}
  now=started+sc.dur;app.frame(now);
  if(i<app.scenes.length-1)assert.equal(app.getCur(),i+1,'Advance after hold: '+sc.id);
  else assert.equal(app.getPaused(),true,'Playback must stop after the final chapter');
  chapters.push({id:sc.id,label:sc.label,drawEndMs:sc.drawEnd,durationMs:sc.dur,holdMs:sc.dur-sc.drawEnd});
 }
 const usedKeys=new Set([...app.scenes.flatMap(sc=>sc.strokes.filter(s=>s.type==='pencil').map(s=>s.key)),...app.crestPlans.map(p=>p.stroke.key)]);
 for(const key of usedKeys){const e=app.drawingFor(key);assert.equal(e.done,e.count,'All color strokes must complete: '+key);assert.equal(e.pathDone,e.d.paths.length,'All contour paths must complete: '+key);assert.equal(e.view.byteLength,e.count*13);assert(e.view.byteLength<=Buffer.from(packed[key].packed,'base64').length,'Selected geometry exceeds source');}
 assert(!/function figure\(|function jersey\(|prevStrokes=o\.strokes/.test(inner),'Legacy player, jersey or crossfade renderer remains');
 return {player:profile.player.name,sceneCount:chapters.length,drawingCount:usedKeys.size,totalDurationMs:chapters.reduce((sum,c)=>sum+c.durationMs,0),checks:{progressiveContours:true,earlyProgressiveColor:true,allStrokesComplete:true,correctHold:true,cleanTransitions:true,stopsAtEnd:true},chapters};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [htmlFile,reportFile]=process.argv.slice(2);if(!htmlFile)throw Error('Usage: node verify-story.mjs player.html [report.json]');
 const report=await verifyStory(fs.readFileSync(htmlFile,'utf8'));if(reportFile){fs.mkdirSync(path.dirname(path.resolve(reportFile)),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report,null,2));
}
