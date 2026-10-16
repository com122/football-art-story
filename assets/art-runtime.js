/* Every visible mark is drawn here; source images are never composited. */
const pencilCache=new Map();
function pencilScene(K,key,x,y,w,h,t0,t1){const art=artForKey(PROFILE,key),variant=PROFILE.artVariants?.[key]?.[art.drawingMode==='sketch'?'sketch':art.medium];if(art.drawingMode==='sketch'&&!variant&&PENCIL_DATA[key]?.representation!=='loose-sketch')throw Error('缺少 '+key+' 的概括画稿，请先准备对应线稿');key=variant||key;const d=PENCIL_DATA[key],scale=Math.min(w/d.w,h/d.h);K.S.push({type:'pencil',key,x:x+(w-d.w*scale)/2,y:y+(h-d.h*scale)/2,scale,t0,t1,a:1});}
function decodeMarks(d){
 const bytes=Uint8Array.from(atob(d.packed),c=>c.charCodeAt(0));if(d.encoding!=='delta-lanes-v1')return bytes;
 const count=bytes.length/13,out=new Uint8Array(bytes.length);
 for(let i=0;i<count;i++)for(let j=0;j<13;j++)out[i*13+j]=bytes[j*count+i];
 const v=new DataView(out.buffer);let px=0,py=0;
 for(let i=0;i<count;i++){const o=i*13,x=(px+v.getUint16(o,true))&65535,y=(py+v.getUint16(o+2,true))&65535,xx=(x+v.getUint16(o+4,true))&65535,yy=(y+v.getUint16(o+6,true))&65535;v.setUint16(o,x,true);v.setUint16(o+2,y,true);v.setUint16(o+4,xx,true);v.setUint16(o+6,yy,true);px=x;py=y;}
 return out;
}
function noise(i,seed=0){let n=Math.imul((i+seed+1)|0,0x45d9f3b);n=Math.imul(n^n>>>16,0x45d9f3b);return ((n^n>>>16)>>>0)/4294967296;}
function drawingFor(key){
 const settings=artForKey(PROFILE,key),cacheKey=key+css('--graphite')+JSON.stringify(settings);let e=pencilCache.get(cacheKey);if(e)return e;
 const source=PENCIL_DATA[key],raw=decodeMarks(source),v=new DataView(raw.buffer),chunks=[],counts=[];let offset=0;const detail=settings.detail/100;
 for(let pass=0;pass<4;pass++){
  const before=chunks.length,rate=pass===0?1:pass===1?.4+.6*detail:pass===2?.2+.8*detail:.08+.92*detail*detail,step=Math.max(1,Math.round(1/rate)),cells=new Set();
  for(let j=0;j<source.counts[pass];j++){const i=offset+j;
   if(pass>0&&(settings.medium==='watercolor'||detail<.6&&settings.medium==='colored-pencil')){
    const o=i*13,head=v.getUint16(o+2,true)/8<source.h*.18,localDetail=head&&settings.medium!=='watercolor'?Math.max(.75,detail):detail;
    const size=settings.medium==='watercolor'?[0,9,6,3.5][pass]*(1.35-.65*detail):[0,3.5,2.15,1.45][pass]+(1-localDetail)*[0,7,6,5][pass];
    const cell=Math.floor(v.getUint16(o,true)/8/size)+':'+Math.floor(v.getUint16(o+2,true)/8/size);if(cells.has(cell))continue;cells.add(cell);
    if(settings.medium==='colored-pencil'&&detail<=.4&&!head&&noise(i,settings.seed)>.25)continue;
   }
   else if(pass>0){
    const head=v.getUint16(i*13+2,true)/8<source.h*.18;
    if(j%(head?Math.min(2,step):step)!==0)continue;
    if(settings.medium==='ink'&&source.medium!=='ink'){
     const o=i*13,l=(.2126*v.getUint8(o+10)+.7152*v.getUint8(o+11)+.0722*v.getUint8(o+12))/255;
     // Skin keeps paper visible; dark cloth receives more hatch marks.
     if(noise(i,settings.seed)>Math.pow(1-l,1.6)*.08+(head?.025:.007))continue;
    }
   }
   chunks.push(raw.subarray(i*13,i*13+13));
  }counts.push(chunks.length-before);offset+=source.counts[pass];
 }
 const selected=new Uint8Array(chunks.length*13);chunks.forEach((b,i)=>selected.set(b,i*13));
 const paths=source.representation==='loose-sketch'?source.paths:source.paths.filter((p,i)=>i<source.outlineCount||p.some(q=>q[1]<source.h*.18)||i-source.outlineCount<Math.max(20,Math.ceil((source.paths.length-source.outlineCount)*(.2+.8*detail))));
 const d={...source,counts,paths},layer=document.createElement('canvas');layer.width=d.w*1.4|0;layer.height=d.h*1.4|0;const pen=layer.getContext('2d');pen.scale(1.4,1.4);pen.lineCap='round';
 e={d,settings,view:new DataView(selected.buffer),count:chunks.length,done:counts[0],pathDone:0,layer,pen,ink:css('--graphite'),sourceCount:raw.length/13};pencilCache.set(cacheKey,e);return e;
}
function pigment(e,i){
 const o=i*13,v=e.view,a=e.settings;let r=v.getUint8(o+10),g=v.getUint8(o+11),b=v.getUint8(o+12),l=.2126*r+.7152*g+.0722*b;
 if(a.medium==='graphite')r=g=b=Math.max(28,l*.82);else if(a.medium==='ink')r=g=b=30;
 else{r=l+(r-l)*a.saturation;g=l+(g-l)*a.saturation;b=l+(b-l)*a.saturation;}
 return `rgb(${Math.round(Math.max(0,Math.min(255,r)))},${Math.round(Math.max(0,Math.min(255,g)))},${Math.round(Math.max(0,Math.min(255,b)))})`;
}
function strokeOne(e,i,fraction=1){
 const o=i*13,v=e.view,c=e.pen,a=e.settings,x=v.getUint16(o,true)/8,y=v.getUint16(o+2,true)/8;let xx=v.getUint16(o+4,true)/8,yy=v.getUint16(o+6,true)/8;
 const jitter=a.roughness*(a.medium==='crayon'?1.7:.5);xx+=(noise(i,a.seed)-.5)*jitter;yy+=(noise(i+89,a.seed)-.5)*jitter;
 const head=y<e.d.h*.18,loose=1+(1-a.detail/100)*(head?.55:2);
 if(['colored-pencil','graphite','ink'].includes(a.medium)){xx=x+(xx-x)*loose;yy=y+(yy-y)*loose;}
 if(a.medium==='ink'&&e.d.medium!=='ink'){const length=head?2.4:7;xx=x+(xx-x)*length;yy=y+(yy-y)*length;}
 const width=v.getUint8(o+8)/100,opacity=v.getUint8(o+9)/255;c.strokeStyle=pigment(e,i);c.lineWidth=width*a.thickness*loose;c.globalAlpha=Math.min(1,opacity*a.opacity);
 if(a.medium==='watercolor'){
  const pass=i<e.d.counts[0]+e.d.counts[1]?1:i<e.d.counts[0]+e.d.counts[1]+e.d.counts[2]?2:3;
  c.lineWidth=[0,18,12,6.8][pass]*a.thickness*(.8+noise(i,a.seed)*.4);c.globalAlpha=Math.min(.42,opacity*a.opacity*(pass===1?.55:.64));
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+xx)/2+jitter,(y+yy)/2-jitter,x+(xx-x)*fraction,y+(yy-y)*fraction);c.stroke();
  if(a.grain>.03){c.globalAlpha*=a.grain*.3;c.lineWidth*=1.1;c.stroke();}
 }else if(a.medium==='crayon'){
  for(let k=0;k<3;k++){const broad=width*5*a.thickness,shift=(k-1)*broad*.2;c.lineWidth=broad*(.45+noise(i+k,a.seed)*.15);c.globalAlpha=Math.min(1,opacity*a.opacity*(1-a.grain*.35));c.setLineDash([1.6+noise(i+k,a.seed)*3,a.grain*(.4+noise(i+17,a.seed))]);c.lineDashOffset=noise(i+70,a.seed)*4;c.beginPath();c.moveTo(x+shift,y-shift);c.lineTo(x+(xx-x)*fraction+shift,y+(yy-y)*fraction-shift);c.stroke();}c.setLineDash([]);
 }else{
  c.globalAlpha*=1-a.grain*noise(i,a.seed)*.42;if(a.medium==='ink')c.lineWidth*=.85+noise(i,a.seed)*.3;c.beginPath();c.moveTo(x,y);c.lineTo(x+(xx-x)*fraction,y+(yy-y)*fraction);c.stroke();
 }return [x+(xx-x)*fraction,y+(yy-y)*fraction];
}
function sketchPattern(e,rgb){
 e.textures||=new Map();const key=rgb.join(',');if(e.textures.has(key))return e.textures.get(key);
 const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const pc=canvas.getContext('2d'),pixels=pc.createImageData(32,32);
 for(let i=0;i<1024;i++){const o=i*4;pixels.data[o]=rgb[0];pixels.data[o+1]=rgb[1];pixels.data[o+2]=rgb[2];pixels.data[o+3]=Math.round(245*(1-e.settings.grain*noise(i,e.settings.seed)));}
 pc.putImageData(pixels,0,0);const pattern=e.pen.createPattern(canvas,'repeat');e.textures.set(key,pattern);return pattern;
}
function pathStroke(c,e,points,f=1,detail=false){
 const a=e.settings,length=(points.length-1)*f,end=Math.floor(length);c.beginPath();c.moveTo(...points[0]);for(let i=1;i<=end;i++)c.lineTo(...points[i]);
 if(end<points.length-1){const p=points[end],q=points[end+1],n=length-end;c.lineTo(p[0]+(q[0]-p[0])*n,p[1]+(q[1]-p[1])*n);}
 const style=e.d.pathStyles?.[e.d.paths.indexOf(points)];
 if(style){
  const rgb=style.rgb,l=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  const color=['graphite','ink'].includes(a.medium)?[40,42,44]:rgb.map(v=>Math.round(Math.max(0,Math.min(255,l+(v-l)*a.saturation))));
  const texture=1-a.grain*.2*noise(e.d.paths.indexOf(points),a.seed);
  c.lineWidth=style.width*a.thickness*(a.medium==='crayon'?1.6:1);c.globalAlpha=Math.min(1,style.opacity*a.opacity*texture)*(a.medium==='watercolor'?.5:1);c.strokeStyle=sketchPattern(e,color);c.stroke();return;
 }
 const loose=a.medium==='colored-pencil'&&a.detail<=40;
 c.lineWidth=(detail?.75:1.15)*a.thickness*(a.medium==='crayon'?1.8:loose?2.4:1);c.globalAlpha=(detail?.35:.9)*Math.min(1,a.opacity)*(a.medium==='watercolor'?.32:1);c.strokeStyle=e.ink;c.stroke();
}
function drawPencil(ctx,s,t,alpha){
 const p=RM?1:Math.max(0,Math.min(1,(t-s.t0)/(s.t1-s.t0)));if(p<=0)return;
 const e=drawingFor(s.key),counts=e.d.counts,paths=e.d.paths,b=e.d.representation==='loose-sketch'?1:e.settings.contourFraction,bounds=[0,b,b+(1-b)*.36,b+(1-b)*.68,1],outline=Math.min(1,p/b)*paths.length,finished=Math.floor(outline);let n=counts[0];
 if(b<1)for(let j=1;j<4;j++)n+=counts[j]*Math.max(0,Math.min(1,(p-bounds[j])/(bounds[j+1]-bounds[j])));
 const target=p===1?e.count:Math.min(e.count,Math.floor(n));if(target<e.done||finished<e.pathDone){e.pen.clearRect(0,0,e.d.w,e.d.h);e.done=counts[0];e.pathDone=0;}
 for(;e.pathDone<Math.min(paths.length,finished);e.pathDone++)pathStroke(e.pen,e,paths[e.pathDone],1,e.pathDone>=e.d.outlineCount);
 for(;e.done<target;e.done++)strokeOne(e,e.done);e.pen.getImageData(0,0,1,1);
 ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(e.layer,s.x,s.y,e.d.w*s.scale,e.d.h*s.scale);ctx.restore();let tip;
 if(finished<paths.length){const pts=paths[finished],q=outline-finished;ctx.save();ctx.translate(s.x,s.y);ctx.scale(s.scale,s.scale);pathStroke(ctx,e,pts,q,finished>=e.d.outlineCount);ctx.restore();const k=Math.min(pts.length-2,Math.floor((pts.length-1)*q)),f=(pts.length-1)*q-k;tip=[pts[k][0]+(pts[k+1][0]-pts[k][0])*f,pts[k][1]+(pts[k+1][1]-pts[k][1])*f];}
 if(!RM&&p<1&&(tip||target<e.count)&&e.settings.showTool){const o=target*13,v=e.view;tip||=[v.getUint16(o,true)/8,v.getUint16(o+2,true)/8];ctx.save();ctx.translate(s.x+tip[0]*s.scale,s.y+tip[1]*s.scale);ctx.rotate(-.7);ctx.globalAlpha=alpha*.75;ctx.lineWidth=2;ctx.strokeStyle=css('--graphite');ctx.fillStyle=css('--paper2');ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(4,-13);ctx.lineTo(8,-13);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(4,-13);ctx.lineTo(4,-47);ctx.lineTo(8,-47);ctx.lineTo(8,-13);ctx.stroke();ctx.restore();}
 ctx.canvas.dataset.pencilProgress=Math.round(t)+':'+e.pathDone+':'+(e.done-counts[0]);ctx.canvas.dataset.artMedium=e.settings.medium;
}
