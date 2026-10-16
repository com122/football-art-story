import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {buildStory} from './build-story.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function buildStudio(profile,drawings){
 const {inner,profile:p}=buildStory(profile,drawings);
 const attr=inner.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const safe=v=>JSON.stringify(v).replaceAll('<','\\u003c');
 return fs.readFileSync(path.join(root,'assets/studio-template.html'),'utf8')
  .replace('__FILM_SRCDOC__',attr).replace('__INITIAL_PROFILE__',safe(p))
  .replace('__ART_SETTINGS__',fs.readFileSync(path.join(root,'assets/art-settings.js'),'utf8'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [profileFile,dataFile,outputFile]=process.argv.slice(2);if(!outputFile)throw Error('Usage: node build-studio.mjs story.json strokes.json[.gz] studio.html');
 const bytes=fs.readFileSync(dataFile),data=JSON.parse((dataFile.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 const html=buildStudio(JSON.parse(fs.readFileSync(profileFile,'utf8')),data);fs.mkdirSync(path.dirname(path.resolve(outputFile)),{recursive:true});fs.writeFileSync(outputFile,html);console.log('Created '+path.resolve(outputFile));
}
