import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {encodeDrawings} from './build-story.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function buildPortraitPreview(input,drawings){
 const p=structuredClone(input);if(p.schemaVersion!==1||!p.player?.name||!p.player?.latinName||!p.player?.period)throw Error('Expected schemaVersion 1 and player name, latinName, period');
 if(!drawings[p.drawing])throw Error('Missing portrait drawing: '+p.drawing);
 if((p.notes||[]).some(n=>typeof n!=='string'||n.length>32))throw Error('Preview notes must be short strings, at most 32 characters');
 const settings=fs.readFileSync(path.join(root,'assets/art-settings.js'),'utf8');
 const {normalizeArt}=vm.runInNewContext(settings+'\n({normalizeArt})');p.art=normalizeArt(p.art||{});
 if(p.art.drawingMode==='sketch'&&drawings[p.drawing].representation!=='loose-sketch')throw Error('Sketch preview needs purpose-made continuous sketch geometry');
 p.career={rows:[]};p.chapters=[];
 const safe=v=>JSON.stringify(v).replaceAll('<','\\u003c');
 let html=fs.readFileSync(path.join(root,'assets/portrait-preview.html'),'utf8').replace('__PROFILE__',()=>safe(p)).replace('__PAYLOAD__',()=>encodeDrawings({[p.drawing]:drawings[p.drawing]})).replace('__SETTINGS__',()=>settings).replace('__RUNTIME__',()=>fs.readFileSync(path.join(root,'assets/art-runtime.js'),'utf8'));
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);return html;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [profileFile,dataFile,outputFile]=process.argv.slice(2);if(!outputFile)throw Error('Usage: node build-portrait-preview.mjs preview.json strokes.json[.gz] portrait.html');
 const bytes=fs.readFileSync(dataFile),drawings=JSON.parse((dataFile.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 fs.mkdirSync(path.dirname(path.resolve(outputFile)),{recursive:true});fs.writeFileSync(outputFile,buildPortraitPreview(JSON.parse(fs.readFileSync(profileFile,'utf8')),drawings));console.log(path.resolve(outputFile));
}
