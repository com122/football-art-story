import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {readStory,option,skillRoot,safeJson} from './gouache-utils.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function buildGouache(profile,output,{chapter=null}={}){
 const {story,geometries}=readStory(profile,chapter),embedded={...story};delete embedded.geometry;
 const payload=Object.fromEntries(Object.entries(geometries).map(([key,data])=>[key,gzipSync(JSON.stringify(data)).toString('base64')]));
 const engine=['gouache-runtime.js','gouache-story-runtime.js'].map(f=>fs.readFileSync(path.join(skillRoot,'assets',f),'utf8')).join('\n');
 const app=`(async()=>{
 const story=${safeJson(embedded)},payload=${safeJson(payload)},geometries={};
 const q=new URLSearchParams(location.search),stage=document.getElementById('stage'),ctx=stage.getContext('2d'),play=document.getElementById('play'),select=document.getElementById('chapter'),seek=document.getElementById('seek');
 if(q.get('controls')==='0')document.body.classList.add('film');
 for(const [key,value]of Object.entries(payload)){const b=Uint8Array.from(atob(value),c=>c.charCodeAt(0));geometries[key]=JSON.parse(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text());delete payload[key]}
 await document.fonts.ready;
 const renderer=FootballGouacheStory.createRenderer(story,geometries,(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})),starts=[];let total=0;
 story.chapters.forEach((c,i)=>{starts.push(total);total+=c.drawMs+c.holdMs;const o=document.createElement('option');o.value=i;o.textContent=String(i+1).padStart(2,'0')+' '+c.label;select.append(o)});
 const index=Math.max(0,Math.min(story.chapters.length-1,Number(q.get('chapter')||0))),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let time=starts[index]+(q.has('at')?Math.max(0,Math.min(story.chapters[index].drawMs+story.chapters[index].holdMs,Number(q.get('at')))):reduce?story.chapters[index].drawMs:0),playing=!q.has('at')&&!reduce,previous=0,rate=1;
 seek.max=total;
 function draw(){const s=renderer.render(ctx,time);for(const k of Object.keys(stage.dataset))delete stage.dataset[k];for(const [k,v]of Object.entries(s))stage.dataset[k]=String(v);stage.dataset.playing=String(playing);stage.dataset.duration=total;select.value=s.chapter;seek.value=time;play.textContent=playing?'暂停':'播放';document.getElementById('clock').textContent=(time/1000).toFixed(1)+' / '+(total/1000).toFixed(1)+' 秒';document.getElementById('status').textContent=story.chapters[s.chapter].label+' · '+(s.finished?'已画完':'正在绘画');document.getElementById('prev').disabled=s.chapter===0;document.getElementById('next').disabled=s.chapter===story.chapters.length-1}
 function jump(t){playing=false;time=Math.max(0,Math.min(total,t));previous=0;draw()}
 function chapter(i,run=false){i=Math.max(0,Math.min(story.chapters.length-1,i));renderer.reset();time=starts[i];playing=run;previous=0;draw()}
 play.onclick=()=>{if(time>=total){renderer.reset();time=0}playing=!playing;previous=0;draw()};
 document.getElementById('replay').onclick=()=>chapter(0,true);document.getElementById('repaint').onclick=()=>chapter(renderer.locate(time).i,true);
 document.getElementById('prev').onclick=()=>chapter(renderer.locate(time).i-1,playing);document.getElementById('next').onclick=()=>chapter(renderer.locate(time).i+1,playing);
 document.getElementById('end').onclick=()=>{const i=renderer.locate(time).i;jump(starts[i]+story.chapters[i].drawMs)};
 select.onchange=()=>chapter(Number(select.value),true);seek.oninput=()=>jump(Number(seek.value));document.getElementById('speed').onchange=e=>{rate=Number(e.target.value);previous=0;draw()};
 document.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();play.click()}else if(e.code==='ArrowRight'||e.code==='ArrowLeft'){e.preventDefault();jump(time+(e.code==='ArrowRight'?500:-500))}});
 document.addEventListener('visibilitychange',()=>previous=0);
 function tick(now){if(playing){if(previous){time=Math.min(total,time+(now-previous)*rate);if(time>=total)playing=false}draw()}previous=now;requestAnimationFrame(tick)}
 document.getElementById('loading').hidden=true;document.getElementById('controls').hidden=false;draw();requestAnimationFrame(tick);
 })().catch(e=>{document.getElementById('loading').textContent='加载失败：'+e.message;console.error(e)});`;
 new vm.Script(engine);new vm.Script(app);
 const sources=(story.sources||[]).filter(s=>/^https?:\/\//.test(s.url)).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)}</a>${s.scope?' · '+esc(s.scope):''}</li>`).join('');
 const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(story.player.name)} · ${esc(chapter?story.chapters[0].label:'生涯涂绘')}</title><style>
 *{box-sizing:border-box}html{color-scheme:dark}body{margin:0;padding:24px;background:#111c24;color:#ede9df;font:15px/1.65 system-ui,"Microsoft YaHei",sans-serif;min-height:100vh;display:grid;place-content:center}main{width:min(1500px,calc(100vw - 48px))}canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#f0eee5}button,select{font:inherit;color:inherit;background:#172934;border:1px solid #516571;border-radius:3px;min-height:42px;padding:7px 13px}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #e8c983;outline-offset:3px}.toolbar,.timeline{display:flex;align-items:center;gap:8px;margin-top:13px}.timeline input{flex:1;min-width:60px;accent-color:#dfbf79}.timeline output{min-width:132px;text-align:right;font-variant-numeric:tabular-nums}.toolbar span{margin-left:auto;color:#becad0}.note{color:#a9b9c3;margin-top:15px}a{color:#dfcc9c;text-underline-offset:4px}details{font-size:14px;margin-top:12px;color:#b3c1c9}summary{cursor:pointer}[hidden]{display:none!important}.film{padding:0;background:#111}.film main{width:100vw}.film canvas{max-height:100vh;object-fit:contain}.film #controls,.film .note,.film details,.film #loading{display:none}@media(max-width:700px){body{padding:10px}main{width:calc(100vw - 20px)}.toolbar{flex-wrap:wrap}.toolbar span{margin-left:0}button,select{padding:6px 9px}}
 </style></head><body><main><canvas id="stage" width="1920" height="1080" aria-label="${esc(story.player.name)}横版逐笔厚涂动画"></canvas><p id="loading" role="status">正在准备绘画笔触…</p><div id="controls" hidden><div class="toolbar"><button id="play">播放</button><button id="replay">从头播放</button><button id="prev">上一章</button><button id="next">下一章</button><select id="chapter" aria-label="选择章节"></select><button id="repaint">本章重画</button><button id="end">完成态</button><select id="speed" aria-label="播放速度"><option value="0.75">0.75倍</option><option value="1" selected>1倍</option><option value="1.25">1.25倍</option><option value="1.5">1.5倍</option><option value="2">2倍</option></select><span id="status" aria-live="polite"></span></div><div class="timeline"><input id="seek" type="range" min="0" step="1" value="0" aria-label="动画进度"><output id="clock"></output></div></div><div class="note">1920 × 1080 横版 · 大面积厚涂　<a href="?controls=0" target="_blank">纯画面播放</a></div><details><summary>资料来源与统计范围</summary><ul>${sources}</ul>${(story.notes||[]).map(s=>'<p>'+esc(s)+'</p>').join('')}</details></main><script>${engine}</script><script>${app}</script></body></html>`;
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,html);return{file:path.resolve(output),chapters:story.chapters.length,bytes:Buffer.byteLength(html)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const a=process.argv.slice(2);if(a.length<2)throw Error('Usage: node build-gouache.mjs story.json output.html [--chapter id]');console.log(JSON.stringify(buildGouache(a[0],a[1],{chapter:option(a,'--chapter')})))}
