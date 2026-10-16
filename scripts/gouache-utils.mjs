import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
export const skillRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function option(args,name,fallback=null){const i=args.indexOf(name);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+name);return args[i+1]}
function assert(ok,message){if(!ok)throw Error(message)}
export function readStory(file,chapterId=null){
 const input=path.resolve(file),s=JSON.parse(fs.readFileSync(input,'utf8'));assert(s.schemaVersion==='football-gouache/1','Use schemaVersion football-gouache/1');assert(typeof s.player?.name==='string'&&typeof s.player?.latinName==='string','Missing player names');assert(s.chapters?.length,'No chapters');
 const ids=new Set();for(const c of s.chapters){assert(typeof c.id==='string'&&/^[a-z0-9-]+$/.test(c.id)&&!ids.has(c.id),'Invalid or duplicate chapter id');ids.add(c.id);assert(typeof c.label==='string'&&c.label,'Missing chapter label');assert(['cover','portrait','career','honors'].includes(c.kind),'Unknown chapter kind');assert(typeof s.geometry?.[c.art]==='string','Missing geometry path: '+c.art);assert(Number.isFinite(c.drawMs)&&c.drawMs>0&&Number.isFinite(c.holdMs)&&c.holdMs>=0,'Invalid chapter timing');
  for(const b of c.blocks||[]){assert(['text','metric','line'].includes(b.type),'Unknown block type');assert(Number.isFinite(b.x)&&Number.isFinite(b.y),'Block needs x/y');const at=b.at??.18,span=b.duration??.12;assert(at>=0&&span>0&&at+span<=1,'Block animation must end by drawMs');if(b.type==='metric')assert(Number.isFinite(b.value),'Metric value missing');if(b.type==='line')assert(b.width>0,'Line width missing');if(b.type==='text')assert(typeof b.text==='string'||Array.isArray(b.lines),'Text missing')}
  if(c.kind==='career'){assert(c.rows?.length>0&&c.rows.length<=4,'Split career tables with more than four rows');for(const r of c.rows){assert(typeof r.club==='string'&&typeof r.scope==='string','Career row needs club and statistical scope');assert(Number.isInteger(r.apps)&&r.apps>=0&&Number.isInteger(r.goals)&&r.goals>=0,'Career figures must be nonnegative integers');if(r.crest)assert(s.nativeCrests?.[r.crest],'Missing original crest: '+r.crest)}}
  if(c.kind==='honors')assert((c.team?.length||0)<=4&&(c.individual?.length||0)<=5,'Split long honors lists into readable pages');
 }
 if(chapterId){s.chapters=s.chapters.filter(c=>c.id===chapterId);assert(s.chapters.length,'Unknown chapter: '+chapterId)}
 const geometries={};for(const key of new Set(s.chapters.map(c=>c.art))){const f=path.resolve(path.dirname(input),s.geometry[key]);const raw=fs.readFileSync(f);const g=JSON.parse((f.endsWith('.gz')?gunzipSync(raw):raw).toString('utf8'));assert(g.medium==='gouache-graffiti'&&g.drawMs>0,'Wrong geometry engine: '+key);assert(g.w>0&&g.h>0&&g.strokes?.length,'Empty geometry: '+key);geometries[key]=g}
 return{story:s,geometries,input};
}
export function loadCanvas(depsRoot){
 const require=depsRoot?createRequire(path.join(path.resolve(depsRoot),'package.json')):createRequire(import.meta.url);
 try{return require('@napi-rs/canvas')}catch{throw Error('Canvas runtime unavailable. Pass --deps-root <existing node_modules directory> containing @napi-rs/canvas. HTML building needs no external package.')}
}
export async function loadRenderer(depsRoot){const canvas=loadCanvas(depsRoot);globalThis.Path2D=canvas.Path2D;await import('../assets/gouache-runtime.js');await import('../assets/gouache-story-runtime.js');return canvas}
export function complete(s){return s.finished&&s.completed===s.total&&s.patches===s.totalPatches&&s.face===s.totalFace&&s.letters===s.totalLetters}
export function slug(value){return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/[ .]+$/,'')||'chapter'}
export function safeJson(value){return JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029')}
