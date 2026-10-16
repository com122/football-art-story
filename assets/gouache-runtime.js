(function(root){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const noise=(i)=>{let n=Math.imul((i+7316)|0,0x45d9f3b);n=Math.imul(n^n>>>16,0x45d9f3b);return ((n^n>>>16)>>>0)/4294967296};
 function paintStroke(c,s,f=1,id=0){
  if(f<=0)return;
  const width=s[2],n=(s.length-6)/2,amount=clamp(f)*(n-1),end=Math.floor(amount);
  if(n<2)return;
  const ps=[];for(let j=0;j<=end;j++)ps.push([s[6+j*2],s[7+j*2]]);
  if(end<n-1){const q=amount-end;ps.push([s[6+end*2]+(s[8+end*2]-s[6+end*2])*q,s[7+end*2]+(s[9+end*2]-s[7+end*2])*q])}
  if(ps.length<2)return;
  c.globalAlpha=1;c.lineJoin='round';c.lineCap='butt';
  c.strokeStyle=`rgb(${s[3]},${s[4]},${s[5]})`;c.lineWidth=width>=25?width*.86:width;
  c.beginPath();c.moveTo(...ps[0]);for(let j=1;j<ps.length;j++)c.lineTo(...ps[j]);c.stroke();
  if(width>=25){
   // Pigment bristles are additional colored paths, not a bitmap texture or mask.
   const dx=ps[1][0]-ps[0][0],dy=ps[1][1]-ps[0][1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
   for(let k=0;k<11;k++){
    const side=(k-5)*width*.094,shift=width*.28*(noise(id*11+k)-.5),light=(noise(id+k+31)-.5)*16;
    c.strokeStyle=`rgb(${clamp(s[3]+light,0,255)},${clamp(s[4]+light,0,255)},${clamp(s[5]+light,0,255)})`;
    c.lineWidth=width*(.055+noise(id*7+k)*.055);c.globalAlpha=k===0||k===10?.74:.90;
    c.beginPath();c.moveTo(ps[0][0]+nx*side+dx/len*shift,ps[0][1]+ny*side+dy/len*shift);
    for(let j=1;j<ps.length;j++){const endShift=j===ps.length-1?width*.22*(noise(id*13+k)-.2):0;c.lineTo(ps[j][0]+nx*side+dx/len*endShift,ps[j][1]+ny*side+dy/len*endShift)}c.stroke();
   }
  }
  c.globalAlpha=1;
 }
 function createRenderer(data,createCanvas){
  const make=()=>createCanvas(data.w,data.h),picture=make(),letters=make(),active=make(),finish=make(),face=make();
  const p=picture.getContext('2d'),l=letters.getContext('2d'),a=active.getContext('2d'),fc=finish.getContext('2d'),head=face.getContext('2d');
  function clipLetters(c){c.beginPath();for(const shape of data.letterShapes){c.moveTo(shape[0],shape[1]);for(let i=2;i<shape.length;i+=2)c.lineTo(shape[i],shape[i+1]);c.closePath()}c.clip('evenodd')}
  l.save();clipLetters(l);
  function paintPatch(c,patch,f=1){
   if(patch.runs){c.globalAlpha=1;c.fillStyle=`rgb(${patch.rgb.join(',')})`;const n=Math.floor(patch.runs.length/3*clamp(f));for(let i=0;i<n;i++)c.fillRect(patch.runs[i*3],patch.runs[i*3+1],patch.runs[i*3+2],1);return}
   c.globalAlpha=1;c.fillStyle=c.strokeStyle=`rgb(${patch.rgb.join(',')})`;c.lineWidth=1.05;c.lineJoin='round';c.lineCap='round';c.beginPath();
   for(const shape of patch.paths){
    if(shape.length<4)continue;c.moveTo(shape[0],shape[1]);
    const count=(shape.length/2-1)*clamp(f),end=Math.floor(count);
    for(let j=1;j<=end;j++)c.lineTo(shape[j*2],shape[j*2+1]);
    if(end<shape.length/2-1){const q=count-end;c.lineTo(shape[end*2]+(shape[end*2+2]-shape[end*2])*q,shape[end*2+1]+(shape[end*2+3]-shape[end*2+1])*q)}
    if(f>=1)c.closePath();
   }
   if(f>=1)c.fill('evenodd');c.stroke();
  }
  let pDone=0,lDone=0,fDone=0,hDone=0,last=-1;
  function reset(){p.clearRect(0,0,data.w,data.h);l.restore();l.clearRect(0,0,data.w,data.h);l.save();clipLetters(l);fc.clearRect(0,0,data.w,data.h);head.clearRect(0,0,data.w,data.h);pDone=0;lDone=0;fDone=0;hDone=0;last=-1}
  function cache(c,strokes,done,t){
   while(done<strokes.length&&strokes[done][0]+strokes[done][1]<=t+1e-8){paintStroke(c,strokes[done],1,done);done++}return done;
  }
  function transient(c,strokes,done,t){for(let i=done;i<strokes.length&&strokes[i][0]<t;i++)paintStroke(c,strokes[i],(t-strokes[i][0])/strokes[i][1],i)}
  function render(ctx,ms){
   const t=clamp(ms,0,data.drawMs+data.holdMs)/1000;
   if(t<last)reset();last=t;
   pDone=cache(p,data.strokes,pDone,t);lDone=cache(l,data.letterStrokes,lDone,t);
   const patches=data.finishPatches||[];
   while(fDone<patches.length&&patches[fDone].t+patches[fDone].d<=t+1e-8){paintPatch(fc,patches[fDone]);fDone++}
   const faceMarks=data.facePigment||[];while(hDone<faceMarks.length&&faceMarks[hDone].t+faceMarks[hDone].d<=t+1e-8){paintPatch(head,faceMarks[hDone]);hDone++}
   a.clearRect(0,0,data.w,data.h);a.drawImage(picture,0,0);transient(a,data.strokes,pDone,t);
   a.drawImage(finish,0,0);for(let i=fDone;i<patches.length&&patches[i].t<t;i++)paintPatch(a,patches[i],(t-patches[i].t)/patches[i].d);
   a.drawImage(face,0,0);for(let i=hDone;i<faceMarks.length&&faceMarks[i].t<t;i++)paintPatch(a,faceMarks[i],(t-faceMarks[i].t)/faceMarks[i].d);
   ctx.save();ctx.clearRect(0,0,1920,1080);ctx.fillStyle=`rgb(${data.paper.join(',')})`;ctx.fillRect(0,0,1920,1080);
   // Only already deposited paint is composited. No source photograph is loaded.
   ctx.drawImage(active,0,0,1920,1080);ctx.drawImage(letters,0,0,1920,1080);
   ctx.scale(1920/data.w,1080/data.h);ctx.save();clipLetters(ctx);transient(ctx,data.letterStrokes,lDone,t);ctx.restore();ctx.restore();
   return {elapsed:ms,completed:pDone,letters:lDone,patches:fDone,face:hDone,total:data.strokes.length,totalLetters:data.letterStrokes.length,totalPatches:patches.length,totalFace:faceMarks.length,progress:clamp(ms/data.drawMs)};
  }
  return {render,reset};
 }
 root.GouacheCover={createRenderer,paintStroke};
})(globalThis);
