(function(root){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=n=>1-Math.pow(1-clamp(n),3);
 const fonts={serif:'"SimSun", "Songti SC", serif',sans:'"Microsoft YaHei", sans-serif',digits:'Arial, "Microsoft YaHei", sans-serif'};
 function createRenderer(story,geometries,createCanvas){
  let current=-1,painter=null,last=-1;const chapters=story.chapters,crests={};
  for(const [key,c]of Object.entries(story.nativeCrests||{}))crests[key]={...c,paths:c.paths.map(p=>({...p,path:new root.Path2D(p.d)}))};
  function transform(c,parts){for(const str of parts||[])for(const m of str.matchAll(/(matrix|translate|scale|rotate)\s*\(([^)]+)\)/g)){const a=m[2].trim().split(/[ ,]+/).map(Number);if(m[1]==='matrix')c.transform(...a);else if(m[1]==='translate')c.translate(a[0],a[1]||0);else if(m[1]==='scale')c.scale(a[0],a[1]??a[0]);else{if(a.length===3)c.translate(a[1],a[2]);c.rotate(a[0]*Math.PI/180);if(a.length===3)c.translate(-a[1],-a[2])}}}
  function crest(c,key,x,y,size){const v=crests[key];if(!v)return;const b=v.box,s=Math.min(size/b[2],size/b[3]);c.save();c.translate(x+(size-b[2]*s)/2,y+(size-b[3]*s)/2);c.scale(s,s);c.translate(-b[0],-b[1]);for(const p of v.paths){c.save();transform(c,p.transforms);if(p.fill!=='none'){c.fillStyle=p.fill;c.fill(p.path,p.rule||'nonzero')}if(p.stroke&&p.stroke!=='none'){c.strokeStyle=p.stroke;c.lineWidth=p.width||1;c.stroke(p.path)}c.restore()}c.restore()}
  function symbol(c,v,x,y,size){if(v?.kind!=='saltire')return;c.save();c.translate(x,y+size*.2);c.scale(size/100,size/100);c.beginPath();c.rect(0,0,100,60);c.clip();c.fillStyle=v.field;c.fillRect(0,0,100,60);c.strokeStyle=v.cross;c.lineWidth=12;c.beginPath();c.moveTo(0,0);c.lineTo(100,60);c.moveTo(0,60);c.lineTo(100,0);c.stroke();c.restore()}
  function locate(ms){let offset=0;for(let i=0;i<chapters.length;i++){const duration=chapters[i].drawMs+chapters[i].holdMs;if(ms<offset+duration||i===chapters.length-1)return{i,t:clamp(ms-offset,0,duration),offset};offset+=duration}}
  function text(c,value,x,y,size,color,weight='600',font='sans'){c.fillStyle=color;c.font=`${weight} ${size}px ${fonts[font]||fonts.sans}`;c.fillText(String(value),x,y)}
  function enter(c,p,at,span,draw){const f=ease((p-at)/span);if(!f)return;c.save();c.globalAlpha=f;c.translate(0,(1-f)*12);draw();c.restore()}
  function line(c,x,y,width,f,color){c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.lineTo(x+width*ease(f),y);c.stroke()}
  function overlay(c,ch,t){
   const p=t/ch.drawMs,dark=ch.theme==='dark',palette={ink:dark?'#f5ecda':'#080f14',body:dark?'#eee7d5':'#101b21',muted:dark?'#dbe4e6':'#30434d',accent:dark?'#e3c48c':'#967953',...story.palette,...ch.palette};
   if(ch.eyebrow)enter(c,p,.03,.09,()=>{text(c,ch.eyebrow,90,112,40,palette.muted);line(c,90,146,130,(p-.03)/.1,palette.accent)});
   if(ch.dateLine)enter(c,p,.12,.09,()=>text(c,ch.dateLine,94,222,46,palette.body));
   if(ch.title)enter(c,p,.08,.1,()=>{const title=Array.isArray(ch.title)?ch.title:[ch.title],size=ch.titleSize||80;title.forEach((s,i)=>text(c,s,ch.titleX??90,(ch.titleY??330)+i*(ch.titleLineHeight||size+25),size,palette.ink,'700',ch.titleFont||'serif'))});
   for(const b of ch.blocks||[]){const at=b.at??.18,span=b.duration??.12;enter(c,p,at,span,()=>{
    if(b.type==='metric'){text(c,Math.round(b.value*ease((p-at)/span)),b.x,b.y,b.size||100,b.color||palette.ink,'700','digits');text(c,b.label,b.x,b.y+(b.labelOffset||59),b.labelSize||42,b.labelColor||palette.muted)}
    else if(b.type==='line')line(c,b.x,b.y,b.width,(p-at)/span,b.color||palette.accent);
    else{const size=b.size||42;for(const [i,s]of (b.lines||[b.text]).entries())text(c,s,b.x,b.y+i*(b.lineHeight||size*1.5),size,b.color||palette.body,b.weight||'600',b.font||'sans')}
   })}
   if(ch.kind==='career'){
    const rows=ch.rows,compact=rows.length>3,top=compact?475:520,step=compact?145:190,head=compact?410:438,max=Math.max(...rows.map(r=>r.apps),1);
    enter(c,p,.1,.08,()=>{text(c,ch.summary||'生涯数据',94,348,42,palette.body);if(ch.countLabel){text(c,rows.length,1690,274,154,palette.ink,'700','digits');text(c,ch.countLabel,1595,338,40,palette.muted)}});
    enter(c,p,.11,.08,()=>{for(const [s,x]of [['球队 / 统计范围',240],['出场对比',800],['出场',1280],['进球',1500],['代表成就',1675]])text(c,s,x,head,40,palette.muted)});
    rows.forEach((r,i)=>{const y=top+i*step,at=.14+i*.06,f=ease((p-at)/.3);
     if(p>at){if(r.crest)crest(c,r.crest,90,y-23,105);if(r.symbol)symbol(c,r.symbol,90,y-23,105)}
     enter(c,p,at,.09,()=>{text(c,r.club,240,y+30,compact?50:56,palette.ink,'700','serif');text(c,r.scope,240,y+(compact?82:91),40,palette.muted,'500');text(c,r.highlight||'',1670,y+42,40,palette.body);c.strokeStyle='#adbac0';c.lineWidth=1.6;c.beginPath();c.moveTo(90,y+(compact?117:124));c.lineTo(1830,y+(compact?117:124));c.stroke()});
     if(f){c.save();c.strokeStyle=r.accent||palette.accent;c.lineWidth=14;c.beginPath();c.moveTo(800,y+22);c.lineTo(800+420*r.apps/max*f,y+22);c.stroke();c.lineWidth=3;c.globalAlpha=.65;c.beginPath();c.moveTo(800,y+37);c.lineTo(800+420*r.apps/max*f,y+37);c.stroke();c.restore()}
     enter(c,p,at,.09,()=>{text(c,Math.round(r.apps*f),1280,y+53,compact?72:84,palette.ink,'700','digits');text(c,Math.round(r.goals*f),1500,y+53,compact?72:84,palette.ink,'700','digits')});
    });
   }
   if(ch.kind==='honors'){
    enter(c,p,.09,.1,()=>{if(ch.asOfLabel)text(c,ch.asOfLabel,1350,112,40,palette.muted,'500');text(c,ch.teamHeading||'团队冠军',94,396,56,palette.body,'700','serif');text(c,ch.individualHeading||'主要个人荣誉',970,396,56,palette.body,'700','serif');line(c,94,428,740,(p-.09)/.1,'#a72a35');line(c,970,428,850,(p-.09)/.1,'#1c8cae')});
    (ch.team||[]).forEach((r,i)=>{const y=517+i*142;enter(c,p,.17+i*.08,.09,()=>{text(c,r.year,94,y,52,'#a31d2c','700','digits');text(c,r.title,271,y,52,palette.body,'700','serif');if(r.club)text(c,r.club,273,y+57,40,palette.muted,'500')})});
    (ch.individual||[]).forEach((r,i)=>{const y=494+i*112;enter(c,p,.24+i*.09,.09,()=>{text(c,r.period,974,y,40,'#186487','700');text(c,r.title,974,y+54,46,palette.body)})});
   }
  }
  function render(ctx,ms){const loc=locate(ms),ch=chapters[loc.i],data=geometries[ch.art];if(current!==loc.i||ms<last){current=loc.i;painter=root.GouacheCover.createRenderer(data,createCanvas)}last=ms;const s=painter.render(ctx,loc.t*data.drawMs/ch.drawMs);overlay(ctx,ch,loc.t);return{...s,chapter:current,chapterId:ch.id,chapterTime:loc.t,drawMs:ch.drawMs,finished:loc.t>=ch.drawMs,elapsed:ms}}
  return{render,locate,reset(){current=-1;painter=null;last=-1},duration:chapters.reduce((sum,c)=>sum+c.drawMs+c.holdMs,0)};
 }
 root.FootballGouacheStory={createRenderer};
})(globalThis);
