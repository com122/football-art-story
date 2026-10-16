import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {buildGouache} from './build-gouache.mjs';
import {readStory,option,loadRenderer,complete,slug,safeJson} from './gouache-utils.mjs';
const a=process.argv.slice(2);if(a.length<2)throw Error('Usage: node export-gouache.mjs story.json directory [--format html|mp4|both] [--chapter id] [--deps-root node_modules] [--ffmpeg executable] [--ffprobe executable] [--fps 30]');
const {story,geometries}=readStory(a[0],option(a,'--chapter')),out=path.resolve(a[1]),format=option(a,'--format','html'),fps=Number(option(a,'--fps','30'));
if(!['html','mp4','both'].includes(format)||!Number.isInteger(fps)||fps<1||fps>60)throw Error('Invalid export format or frame rate');
const video=format!=='html',ffmpeg=option(a,'--ffmpeg','ffmpeg'),probeDefault=ffmpeg==='ffmpeg'?'ffprobe':path.join(path.dirname(ffmpeg),'ffprobe'+(ffmpeg.endsWith('.exe')?'.exe':'')),ffprobe=option(a,'--ffprobe',probeDefault),entries=[];
fs.mkdirSync(out,{recursive:true});let createCanvas;
if(video){({createCanvas}=await loadRenderer(option(a,'--deps-root')));for(const bin of [ffmpeg,ffprobe]){const r=spawnSync(bin,['-version'],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error('Executable unavailable: '+bin)}}
for(const [i,ch]of story.chapters.entries()){
 const name=String(i+1).padStart(2,'0')+'-'+slug(ch.label),entry={number:i+1,id:ch.id,label:ch.label,drawMs:ch.drawMs,holdMs:ch.holdMs,durationSeconds:(ch.drawMs+ch.holdMs)/1000};
 if(format!=='mp4'){entry.html=name+'.html';buildGouache(a[0],path.join(out,entry.html),{chapter:ch.id})}
 if(video){
  const count=entry.durationSeconds*fps;if(Math.abs(count-Math.round(count))>.0001||Math.abs(ch.drawMs*fps/1000-Math.round(ch.drawMs*fps/1000))>.0001)throw Error('Chapter timing must align with requested frame rate: '+ch.id);
  entry.video=name+'.mp4';entry.fps=fps;entry.frames=Math.round(count);entry.size=[1920,1080];
  const renderer=FootballGouacheStory.createRenderer({...story,chapters:[ch]},geometries,createCanvas),canvas=createCanvas(1920,1080),ctx=canvas.getContext('2d');
  const ff=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,entry.video)],{stdio:['pipe','ignore','pipe'],windowsHide:true});
  let error='';ff.stderr.on('data',v=>error+=v);ff.stdin.on('error',()=>{});const done=once(ff,'close');let state;
  for(let frame=0;frame<entry.frames;frame++){state=renderer.render(ctx,frame*1000/fps);const rgba=ctx.getImageData(0,0,1920,1080).data;if(!ff.stdin.write(Buffer.from(rgba.buffer,rgba.byteOffset,rgba.byteLength)))await Promise.race([once(ff.stdin,'drain'),done.then(([code])=>{throw Error('Encoder stopped: '+code+' '+error)})]);if(frame%fps===0)console.log(name+' '+frame+'/'+entry.frames)}
  ff.stdin.end();const [code]=await done;if(code!==0)throw Error('Encoder failed: '+error);if(!complete(state))throw Error('Painting unfinished at export end: '+ch.id);
  const probe=spawnSync(ffprobe,['-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,codec_name,pix_fmt:format=duration,size','-of','json',path.join(out,entry.video)],{encoding:'utf8',windowsHide:true});if(probe.status!==0)throw Error(probe.stderr||'Video probe failed');const info=JSON.parse(probe.stdout),s=info.streams[0];
  if(s.width!==1920||s.height!==1080||+s.nb_frames!==entry.frames||Math.abs(+info.format.duration-entry.durationSeconds)>.001)throw Error('Export timing or dimensions incorrect: '+ch.id);
  entry.codec=s.codec_name;entry.pixelFormat=s.pix_fmt;entry.bytes=+info.format.size;entry.paintingComplete=true;
 }
 entries.push(entry);fs.writeFileSync(path.join(out,'chapters.json'),JSON.stringify(entries,null,2));console.log('Saved '+name);
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rows=entries.map((c,i)=>`<li>${c.video?'<button data-i="'+i+'">':'<strong>'}${String(c.number).padStart(2,'0')} ${esc(c.label)} · ${c.durationSeconds.toFixed(1)}秒${c.video?'</button>':'</strong>'}<div>${c.video?'<a download href="'+encodeURIComponent(c.video)+'">下载视频</a>　':''}${c.html?'<a target="_blank" href="'+encodeURIComponent(c.html)+'">网页动画</a>':''}</div></li>`).join('');
const preview=video?`<video id="player" controls playsinline preload="metadata" src="${encodeURIComponent(entries[0].video)}" aria-label="分章视频"></video><p id="title">${esc(entries[0].label)}</p>`:'';
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(story.player.name)} · 分章动画</title><style>*{box-sizing:border-box}body{margin:24px auto;padding:0 16px;max-width:1280px;background:#111c24;color:#ece9df;font:16px/1.6 system-ui,"Microsoft YaHei",sans-serif}h1{font-size:28px}video{width:100%;aspect-ratio:16/9;background:#f0eee5}ol{padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}li{padding:16px;border:1px solid #506573}button{font:inherit;color:inherit;background:#233f50;border:1px solid #607583;padding:8px;cursor:pointer}a{color:#e4cc96;text-underline-offset:4px}li div{margin-top:10px}button:focus-visible,a:focus-visible{outline:2px solid #e4cc96;outline-offset:3px}@media(max-width:700px){ol{grid-template-columns:1fr}}</style><h1>${esc(story.player.name)} · 分章动画</h1><p>${entries.length}章 · ${entries.reduce((s,c)=>s+c.durationSeconds,0).toFixed(1)}秒 · 1920×1080${video?' · '+fps+'fps · 无音轨':''}</p>${preview}<ol>${rows}</ol><script>const chapters=${safeJson(entries)};document.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{const c=chapters[Number(b.dataset.i)],v=document.getElementById('player');v.src=encodeURIComponent(c.video);document.getElementById('title').textContent=c.label+' · '+c.durationSeconds.toFixed(1)+'秒';v.play().catch(()=>{})});</script></html>`);
console.log(JSON.stringify({directory:out,chapters:entries.length,seconds:entries.reduce((s,c)=>s+c.durationSeconds,0),format}));
