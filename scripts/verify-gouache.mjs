import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {readStory,option,loadRenderer,complete} from './gouache-utils.mjs';
const a=process.argv.slice(2);if(a.length<2)throw Error('Usage: node verify-gouache.mjs story.json report.json [--deps-root node_modules] [--frames dir]');
const {story,geometries}=readStory(a[0]),{createCanvas}=await loadRenderer(option(a,'--deps-root'));
const canvas=createCanvas(1920,1080),ctx=canvas.getContext('2d'),renderer=FootballGouacheStory.createRenderer(story,geometries,createCanvas),frameDir=option(a,'--frames');if(frameDir)fs.mkdirSync(frameDir,{recursive:true});
const hash=()=>crypto.createHash('sha256').update(ctx.getImageData(0,0,1920,1080).data).digest('hex');
const sample=t=>({state:renderer.render(ctx,t),hash:hash()});let start=0;const chapters=[];
for(const ch of story.chapters){
 const zero=sample(start),mid=sample(start+ch.drawMs*.42),end=sample(start+ch.drawMs),hold=sample(start+ch.drawMs+Math.max(0,ch.holdMs-1));
 if(frameDir)fs.writeFileSync(path.join(frameDir,ch.id+'-complete.png'),canvas.toBuffer('image/png'));
 sample(start+ch.drawMs*.1);const replay=sample(start+ch.drawMs),g=geometries[ch.art];
 const marks=[...g.strokes.map(s=>s[0]+s[1]),...g.letterStrokes.map(s=>s[0]+s[1]),...(g.finishPatches||[]).map(s=>s.t+s.d),...(g.facePigment||[]).map(s=>s.t+s.d)],lastMs=marks.reduce((n,v)=>Math.max(n,v),0)*1000*ch.drawMs/g.drawMs;
 const checks={progressive:zero.hash!==mid.hash&&mid.hash!==end.hash,allPaintComplete:complete(end.state),stableHold:hold.hash===end.hash,replayIdentical:replay.hash===end.hash,endsAtFinalMark:Math.abs(lastMs-ch.drawMs)<.1};
 chapters.push({id:ch.id,drawMs:ch.drawMs,holdMs:ch.holdMs,checks});start+=ch.drawMs+ch.holdMs;
}
const end=sample(renderer.duration),clean=hash();renderer.reset();sample(0);sample(renderer.duration*.2);const rewind=sample(renderer.duration);
const checks={chaptersComplete:chapters.every(c=>Object.values(c.checks).every(Boolean)),crossChapterReset:clean===rewind.hash,stopsAtLastChapter:end.state.chapter===story.chapters.length-1&&complete(end.state)};
const report={checks,durationMs:renderer.duration,chapters};fs.mkdirSync(path.dirname(path.resolve(a[1])),{recursive:true});fs.writeFileSync(a[1],JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(Object.values(checks).some(x=>!x))process.exitCode=1;
