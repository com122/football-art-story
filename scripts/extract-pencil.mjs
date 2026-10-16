import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
const [manifestFile,outputFile,...options]=process.argv.slice(2);
if(!outputFile)throw Error('Usage: node extract-pencil.mjs assets.json pencil-data.json [--sharp-root NODE_MODULES_DIRECTORY]');
const rootFlag=options.indexOf('--sharp-root');let sharp;
try{sharp=(await import('sharp')).default;}catch{
 if(rootFlag<0||!options[rootFlag+1])throw Error('sharp unavailable. Locate bundled Node packages with load_workspace_dependencies and pass --sharp-root, or install sharp in the output project.');
 sharp=createRequire(path.join(path.resolve(options[rootFlag+1]),'__pencil_loader__.cjs'))('sharp');
}
const base=path.dirname(path.resolve(manifestFile));
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
if(!Array.isArray(manifest)||!manifest.length)throw Error('Asset manifest must be a nonempty array');
const seen=new Set();
for(const item of manifest){
 if(!/^[a-z][a-z0-9_-]{0,63}$/.test(item.key)||seen.has(item.key))throw Error('Invalid or duplicate asset key: '+item.key);seen.add(item.key);
 if(!['portrait','crest','trophies'].includes(item.kind))throw Error('Asset kind must be portrait, crest or trophies: '+item.key);
 if(typeof item.path!=='string'||!item.path)throw Error('Missing source asset: '+item.key);
 item.path=path.resolve(base,item.path);if(!fs.existsSync(item.path))throw Error('Source asset not found: '+item.path);
 item.medium||='colored-pencil';if(!['colored-pencil','graphite','watercolor','crayon','ink'].includes(item.medium))throw Error('Invalid asset medium: '+item.medium);
 item.crest=item.kind==='crest';item.height||=item.crest?220:item.kind==='trophies'?760:1000;
 if(!Number.isInteger(item.height)||item.height<120||item.height>1600)throw Error('Asset height out of range: '+item.key);
}
const cacheDir=path.join(path.dirname(path.resolve(outputFile)),'pencil-cache');
fs.mkdirSync(cacheDir,{recursive:true});
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
const sketches={};

for(const item of manifest){

 const digest=createHash('sha256').update(fs.readFileSync(item.path)).update('v5:'+item.height+':'+item.crest+':'+item.medium).digest('hex');
 const cachePath=path.join(cacheDir,item.key+'-'+digest+'.json');
 if(fs.existsSync(cachePath)){sketches[item.key]=JSON.parse(fs.readFileSync(cachePath,'utf8'));console.log(item.key,'cached');continue;}
 const {data,info}=await sharp(item.path).resize({height:item.height||1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const smooth=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).blur(1.2).raw().toBuffer();
 const w=info.width,h=info.height,r=rng(73),N=w*h;
 if(w>8190||h>8190)throw Error('Geometry coordinates exceed format bounds: '+item.key);
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<175)transparent++;
 if(transparent/N<.01)throw Error('Asset background must be transparent before extracting strokes: '+item.key);

 const lum=new Float32Array(N),opacity=new Float32Array(N);
 for(let i=0;i<N;i++){
  const a=data[i*4+3]/255;
  // Soft semitransparent background haze is not a pencil mark.
  opacity[i]=item.medium==='watercolor'?Math.max(0,Math.min(1,(a-.03)/.85)):Math.max(0,Math.min(1,(a-.68)/.26));
  lum[i]=(smooth[i*4]*.2126+smooth[i*4+1]*.7152+smooth[i*4+2]*.0722)/255;
 }
 const sample=(x,y)=>Math.max(0,Math.min(N-1,(Math.round(y)*w+Math.round(x))|0));
 const marks=[],stages=[],edges=new Uint8Array(N),paths=[],silhouettePaths=[];
 function mark(x,y,dx,dy,width,alpha,rgb,stage){
  if(alpha<.013)return;
  marks.push([x,y,x+dx,y+dy,width,alpha,...rgb]);stages.push(stage);
 }
 // Strong gradients become actual short contour strokes, tangent to the edge.
 for(let y=2;y<h-2;y+=1.8)for(let x=2;x<w-2;x+=1.8){
  let i=sample(x,y);if(opacity[i]<.25)continue;
  const dL=j=>(1-lum[j])*opacity[j];
  const gx=(dL(i+1)-dL(i-1)),gy=(dL(i+w)-dL(i-w));
  const g=Math.hypot(gx,gy);
  if(g<.11)continue;
  edges[i]=1;
  const len=2.2+r()*3.3,angle=Math.atan2(gy,gx)+Math.PI/2;
  mark(x,y,Math.cos(angle)*len,Math.sin(angle)*len,.48+r()*.24,Math.min(.65,g*.7)*opacity[i],[43,45,49],0);
 }

 // Join sampled edge pixels into real, continuous pencil paths.
 const visited=new Uint8Array(N);
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const start=y*w+x;if(!edges[start]||visited[start])continue;
  const points=[];let cx=x,cy=y;
  for(let steps=0;steps<110;steps++){
   const id=cy*w+cx;if(visited[id])break;visited[id]=1;points.push([cx,cy]);
   let next=null,best=99;
   for(let yy=-3;yy<=3;yy++)for(let xx=-3;xx<=3;xx++){
    const nx=cx+xx,ny=cy+yy,ni=ny*w+nx;if(nx<2||nx>=w-2||ny<2||ny>=h-2||visited[ni]||!edges[ni])continue;
    const score=xx*xx+yy*yy;
    if(score<best){best=score;next=[nx,ny];}
   }
   if(!next)break;[cx,cy]=next;
  }
  if(points.length>=9)paths.push(points);
 }
 const outlineMask=new Uint8Array(N),outlineSeen=new Uint8Array(N);
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x;if(opacity[i]>.66&&[i-1,i+1,i-w,i+w].some(j=>opacity[j]<=.66))outlineMask[i]=1;
 }
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=y*w+x;if(!outlineMask[i]||outlineSeen[i])continue;
  let cx=x,cy=y;const ps=[];
  for(let k=0;k<6000;k++){
   const id=cy*w+cx;if(outlineSeen[id])break;outlineSeen[id]=1;ps.push([cx,cy]);
   let next=null,best=99;
   for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++){
    const nx=cx+xx,ny=cy+yy,ni=ny*w+nx;
    if(nx<2||nx>=w-2||ny<2||ny>=h-2||!outlineMask[ni]||outlineSeen[ni])continue;
    const score=xx*xx+yy*yy;if(score<best){best=score;next=[nx,ny];}
   }
   if(!next)break;[cx,cy]=next;
  }
  if(ps.length>35)silhouettePaths.push(ps);
 }
 silhouettePaths.sort((a,b)=>b.length-a.length);const outlinePieces=[];
 for(const p of silhouettePaths.slice(0,5))for(let i=0;i<p.length-1;i+=65)outlinePieces.push(p.slice(i,i+66));
 paths.sort((a,b)=>b.length-a.length);const face=paths.filter(p=>p.some(q=>q[1]<h*.18));
 const others=paths.filter(p=>!face.includes(p));
 const detail=[...face.slice(0,160),...others.slice(0,140)].sort((a,b)=>a[0][1]-b[0][1]);
 // Three passes of real, individual colored pencil hatch strokes.
 for(let pass=0;pass<3;pass++){
  const step=(item.crest?[2.6,1.6,1.05]:[3.5,2.15,1.45])[pass];
  for(let y=2;y<h-2;y+=step)for(let x=2;x<w-2;x+=step){
   const xx=x+(r()-.5)*step,yy=y+(r()-.5)*step,i=sample(xx,yy),a=opacity[i];
   if(a<.08)continue;
   const d=1-lum[i],color=[data[i*4],data[i*4+1],data[i*4+2]];
   const saturation=Math.max(...color)-Math.min(...color);
   if(item.medium==='ink'&&d<.12&&saturation<12)continue;
   if(d<.035&&saturation<12&&r()>.4)continue;
   const angle=pass===1?.77+(r()-.5)*.22:-.86+(r()-.5)*.24;
   const length=(pass===0?7:pass===1?4.5:2.5)*(0.6+r()*.6);
   const dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
   if(opacity[sample(xx+dx,yy+dy)]<.1)continue;
   const width=pass===0?.65:pass===1?.72:.7;
   // Ink is deposited only in proportion to actual source darkness. Turning
   // every pale grey source pixel into an opaque black hatch destroys faces.
   const inkAmount=item.medium==='ink'?Math.pow(Math.max(0,(d-.10)/.90),1.7):1;
   const alpha=(pass===0?.35:pass===1?.55:.65)*a*inkAmount;
   mark(xx,yy,dx,dy,width,alpha,color,pass+1);
  }
 }
 // Draw local groups like a hand working on one area, without a reveal wipe.
 const ordered=marks.map((m,i)=>({m,s:stages[i],rank:Math.floor(m[1]/68)*12+Math.floor(m[0]/70)}));
 ordered.sort((a,b)=>a.s-b.s||a.rank-b.rank);
 const buffer=Buffer.alloc(ordered.length*13);
 for(let i=0;i<ordered.length;i++){
  const m=ordered[i].m,o=i*13;
  for(let j=0;j<4;j++)buffer.writeUInt16LE(Math.max(0,Math.min(65535,Math.round(m[j]*8))),o+j*2);
  buffer[o+8]=Math.round(m[4]*100);buffer[o+9]=Math.round(m[5]*255);
  buffer[o+10]=m[6];buffer[o+11]=m[7];buffer[o+12]=m[8];
 }
 const counts=[0,1,2,3].map(s=>ordered.filter(v=>v.s===s).length);
 sketches[item.key]={w,h,medium:item.medium,counts,outlineCount:outlinePieces.length,paths:[...outlinePieces,...detail],packed:buffer.toString('base64')};
 fs.writeFileSync(cachePath,JSON.stringify(sketches[item.key]));

 console.log(item.key,ordered.length,counts);
}

fs.writeFileSync(outputFile,JSON.stringify(sketches));
console.log('Embedded pencil geometry ready.');
