/* Vectorise a purpose-made loose sketch into continuous coloured pencil lines. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const [manifestFile,outputFile,...flags]=process.argv.slice(2);
if(!outputFile)throw Error('Usage: node extract-sketch.mjs assets.json sketch-data.json [--sharp-root NODE_MODULES]');
let sharp;try{sharp=(await import('sharp')).default;}catch{
 const i=flags.indexOf('--sharp-root');if(i<0||!flags[i+1])throw Error('Locate an existing sharp installation and pass --sharp-root');
 sharp=createRequire(path.join(path.resolve(flags[i+1]),'__sketch_loader.cjs'))('sharp');
}
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),base=path.dirname(path.resolve(manifestFile)),result={};
if(!Array.isArray(manifest)||!manifest.length)throw Error('Expected a nonempty asset array');
for(const item of manifest){
 if(!/^[a-z][a-z0-9_-]{0,63}$/.test(item.key)||result[item.key])throw Error('Invalid or duplicate key');
 const height=item.height||1200;if(!Number.isInteger(height)||height<200||height>1600)throw Error('Invalid extraction height');
 const {data,info}=await sharp(path.resolve(base,item.path)).resize({height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const blurred=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).blur(Math.max(2.5,height/350)).raw().toBuffer();
 const w=info.width,h=info.height,N=w*h,mask=new Uint8Array(N),candidates=[],strength=new Float32Array(N);
 let transparent=0;
 for(let i=0;i<N;i++){
  const o=i*4,a=data[o+3]/255,l=(.2126*data[o]+.7152*data[o+1]+.0722*data[o+2])/255;
  if(a<.6)transparent++;
  strength[i]=(1-l)*Math.max(0,Math.min(1,(a-.45)/.45));
  const face=Math.floor(i/w)<h*.19;
  const blurredL=(.2126*blurred[o]+.7152*blurred[o+1]+.0722*blurred[o+2])/255;
  const border=a>.7&&[i-1,i+1,i-w,i+w].some(j=>j>=0&&j<N&&data[j*4+3]<150);
  const contrast=blurredL-l;
  const drawn=item.whitePaper?strength[i]>(face?.13:.18):((strength[i]>(face?.14:.2)&&contrast>(face?.024:.063))||(!face&&l>.72&&-contrast>.11)||border);
  if(a>.7&&drawn){mask[i]=1;candidates.push(i);}
 }
 if(transparent/N<.01&&!item.whitePaper)throw Error('Use a transparent source, or explicitly set whitePaper for plain white line art: '+item.key);
 const radius=new Float32Array(N);for(let i=0;i<N;i++)radius[i]=mask[i]?50:0;
 for(let y=1;y<h;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(radius[i])radius[i]=Math.min(radius[i],radius[i-1]+1,radius[i-w]+1,radius[i-w-1]+1.414,radius[i-w+1]+1.414);}
 for(let y=h-2;y>=0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;if(radius[i])radius[i]=Math.min(radius[i],radius[i+1]+1,radius[i+w]+1,radius[i+w-1]+1.414,radius[i+w+1]+1.414);}
 // Zhang–Suen thinning follows the existing drawn strokes instead of tracing both edges.
 const offsets=[-w,-w+1,1,w+1,w,w-1,-1,-w-1];
 for(let round=0;round<100;round++){
  let changed=0;
  for(let phase=0;phase<2;phase++){
   const remove=[];
   for(const i of candidates){
    if(!mask[i]||i<w+1||i>N-w-2||i%w<1||i%w>w-2)continue;
    const p=offsets.map(o=>mask[i+o]),count=p.reduce((a,b)=>a+b,0);if(count<2||count>6)continue;
    let transitions=0;for(let j=0;j<8;j++)if(!p[j]&&p[(j+1)%8])transitions++;
    if(transitions!==1)continue;
    const blocked=phase===0?p[0]*p[2]*p[4]||p[2]*p[4]*p[6]:p[0]*p[2]*p[6]||p[0]*p[4]*p[6];
    if(!blocked)remove.push(i);
   }
   for(const i of remove)mask[i]=0;changed+=remove.length;
  }
  if(!changed)break;
 }
 const pixels=candidates.filter(i=>mask[i]),neighbours=new Map();
 for(const i of pixels){const ns=[];for(let k=0;k<8;k++){
  const j=i+offsets[k];if(!mask[j])continue;
  // Avoid tiny triangular detours around a diagonal junction.
  if(k%2===1&&(mask[i+offsets[(k+7)%8]]||mask[i+offsets[(k+1)%8]]))continue;
  ns.push(j);
 }neighbours.set(i,ns);}
 const seen=new Set(),traces=[];
 const edge=(i,j)=>Math.min(i,j)*N+Math.max(i,j);
 function walk(start,next){
  const ps=[start];let previous=start,current=next;
  for(let guard=0;guard<N;guard++){
   const e=edge(previous,current);if(seen.has(e))break;seen.add(e);ps.push(current);
   const ns=(neighbours.get(current)||[]).filter(j=>j!==previous&&!seen.has(edge(current,j)));if(!ns.length)break;
   const before=ps[Math.max(0,ps.length-5)],dx=current%w-before%w,dy=Math.floor(current/w)-Math.floor(before/w);
   const score=j=>{const xx=j%w-current%w,yy=Math.floor(j/w)-Math.floor(current/w);return (xx*dx+yy*dy)/(Math.hypot(xx,yy)*Math.max(.1,Math.hypot(dx,dy)));};
   ns.sort((a,b)=>score(b)-score(a));if(score(ns[0])<-.2)break;
   const after=ns[0];previous=current;current=after;
  }if(ps.length>1)traces.push(ps);
 }
 for(const i of pixels)if(neighbours.get(i).length!==2)for(const j of neighbours.get(i))if(!seen.has(edge(i,j)))walk(i,j);
 for(const i of pixels)for(const j of neighbours.get(i))if(!seen.has(edge(i,j)))walk(i,j);
 function simplify(ps,epsilon){
  if(ps.length<=2)return ps;const a=ps[0],b=ps.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
  let far=0,at=0;
  for(let i=1;i<ps.length-1;i++){const p=ps[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;
   const dist=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(dist>far){far=dist;at=i;}}
  return far>epsilon?[...simplify(ps.slice(0,at+1),epsilon).slice(0,-1),...simplify(ps.slice(at),epsilon)]:[a,b];
 }
 function smooth(ps){
  if(ps.length<3)return ps;const out=[ps[0]];
  for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];out.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}
  out.push(ps.at(-1));return out;
 }
 const lines=[];
 if(item.preserveBlueEyes){
  const blue=new Set();for(let y=2;y<h*.13;y++)for(let x=2;x<w-2;x++){const i=y*w+x,o=i*4;if(data[o+3]>200&&data[o+2]-data[o]>14&&data[o+1]-data[o]>8&&data[o+2]<235)blue.add(i);}
  const groups=[];
  while(blue.size){const first=blue.values().next().value,queue=[first];blue.delete(first);
   for(let q=0;q<queue.length;q++)for(const d of [-1,1,-w,w])if(blue.delete(queue[q]+d))queue.push(queue[q]+d);
   if(queue.length>=4&&queue.length<160)groups.push(queue);
  }
  groups.sort((a,b)=>b.length-a.length);
  for(const ids of groups.slice(0,2)){
   const x=ids.reduce((s,i)=>s+i%w,0)/ids.length,y=ids.reduce((s,i)=>s+Math.floor(i/w),0)/ids.length,r=Math.min(3.1,Math.max(1.2,Math.sqrt(ids.length/Math.PI)*.65));
   lines.push({points:[[x-r*.2,y],[x+r*.2,y]],rgb:[40,76,100],width:r*2,opacity:.96,face:true,feature:true,length:9999});
  }
 }
 // A filled pupil often thins to one pixel. Preserve it as a short round pencil mark.
 for(const i of pixels){
  const y=Math.floor(i/w);if(neighbours.get(i).length||y<h*.065||y>h*.18||strength[i]<.6)continue;
  const x=i%w,rgb=[data[i*4],data[i*4+1],data[i*4+2]];
  lines.push({points:[[x-.55,y],[x+.55,y]],rgb,width:1.8,opacity:.96,face:true,feature:true,length:999});
 }
 for(const ids of traces){
  const points=ids.map(i=>[i%w,Math.floor(i/w)]),face=points.some(p=>p[1]<h*.19);
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
  if(length<(face?4.5:9))continue;
  const rgb=[0,0,0];let weight=0,ink=0,thickness=0;
  for(const i of ids){const a=data[i*4+3]/255;for(let c=0;c<3;c++)rgb[c]+=data[i*4+c]*a;weight+=a;ink+=strength[i];thickness+=radius[i];}
  const color=rgb.map(c=>Math.round(c/weight)),meanInk=ink/ids.length;
  if(face&&points.reduce((sum,p)=>sum+p[1],0)/points.length>h*.075){color[0]=Math.min(85,color[0]);color[1]=Math.min(72,color[1]);color[2]=Math.min(65,color[2]);}
  if(!face&&color.every(c=>c>200)){color[0]=90;color[1]=108;color[2]=130;}
  const averageY=points.reduce((sum,p)=>sum+p[1],0)/points.length;
  const feature=face&&averageY>h*.075&&meanInk>.32;
  lines.push({points:smooth(simplify(points,face?.42:.7)),rgb:color,width:Math.min(face?4.2:3.6,Math.max(face?1.1:1.45,thickness/ids.length*1.65)),opacity:face?.92:.86,face,feature,length});
 }
 // Principal body lines first, followed by the deliberate hair and facial strokes.
 lines.sort((a,b)=>Number(a.face)-Number(b.face)||Number(b.feature)-Number(a.feature)||b.length-a.length);
 const body=lines.filter(p=>!p.face).slice(0,item.whitePaper?650:150),face=lines.filter(p=>p.face).slice(0,item.whitePaper?400:180);
 // Preserve the complete silhouette using light, open coloured contour pieces.
 const edges=new Map(),stride=w+1;const opaque=i=>i>=0&&i<N&&data[i*4+3]>225;
 const add=(a,b)=>{if(!edges.has(a))edges.set(a,[]);edges.get(a).push(b);};
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!opaque(i))continue;const a=y*stride+x;
  if(!opaque(i-w))add(a,a+1);if(!opaque(i+1))add(a+1,a+1+stride);
  if(!opaque(i+w))add(a+1+stride,a+stride);if(!opaque(i-1))add(a+stride,a);
 }
 const loops=[];
 while(edges.size){const start=edges.keys().next().value,ps=[];let current=start;
  for(let guard=0;guard<N*4;guard++){ps.push([current%stride,Math.floor(current/stride)]);const ns=edges.get(current);if(!ns?.length)break;const next=ns.pop();if(!ns.length)edges.delete(current);current=next;if(current===start)break;}
  if(ps.length>100)loops.push(ps);
 }
 loops.sort((a,b)=>b.length-a.length);const outer=[];
 for(const ps of loops.slice(0,1)){
  const curve=simplify(ps,1.6);
  for(let from=0;from<curve.length-1;from+=12){const piece=curve.slice(from,from+13);if(piece.length<2)continue;
   const rgb=[0,0,0];let n=0;
   for(const p of piece){const x=Math.min(w-2,Math.max(1,Math.round(p[0]))),y=Math.min(h-2,Math.max(1,Math.round(p[1])));let i=y*w+x;
    if(!opaque(i)){const j=[i-1,i+1,i-w,i+w].find(opaque);if(j!==undefined)i=j;}
    if(opaque(i)){for(let c=0;c<3;c++)rgb[c]+=data[i*4+c];n++;}
   }
   outer.push({points:smooth(piece),rgb:n?rgb.map(c=>Math.round(c/n)):[90,104,117],width:1.45,opacity:.76,face:false});
  }
 }
 const selected=[...outer,...face,...body];
 if(selected.length<20||face.length<10)throw Error('Not enough coherent body or facial lines: '+item.key);
 result[item.key]={w,h,medium:'colored-pencil',representation:'loose-sketch',counts:[0,0,0,0],packed:'',outlineCount:outer.length,paths:selected.map(p=>p.points),pathStyles:selected.map(({rgb,width,opacity,face})=>({rgb,width,opacity,role:face?'face':'body'}))};
 console.log(item.key,JSON.stringify({paths:selected.length,contours:outer.length,body:body.length,face:face.length}));
}
fs.mkdirSync(path.dirname(path.resolve(outputFile)),{recursive:true});fs.writeFileSync(outputFile,JSON.stringify(result));
