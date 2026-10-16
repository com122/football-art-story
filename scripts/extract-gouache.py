"""Convert painted assets to deterministic brush paths, never a raster reveal.

The PNG is read only while extracting colors and geometry. Delivery contains
independent opaque gestures, pigment contours and small facial paint marks.
"""
from pathlib import Path
import sys, json, gzip, math, argparse, re
parser=argparse.ArgumentParser(description='Extract opaque painted scenes as timed brush geometry')
parser.add_argument('assets',type=Path)
parser.add_argument('output',type=Path)
parser.add_argument('--only',nargs='*',default=[])
parser.add_argument('--python-path',type=Path)
args=parser.parse_args()
if args.python_path: sys.path.insert(0,str(args.python_path.resolve()))
try:
    import numpy as np
    from PIL import Image
    import cv2
except ImportError as error:
    raise SystemExit('Need numpy, Pillow and opencv-python in the selected Python runtime: '+str(error))
base=args.assets.resolve().parent
cfg=json.loads(args.assets.read_text('utf8'))
selected=set(args.only)
if selected-set(spec['id'] for spec in cfg): raise SystemExit('Unknown selected asset id')
output=args.output.resolve()
for spec in cfg:
    key=spec['id']
    if not re.fullmatch(r'[a-z0-9-]+',key): raise SystemExit('Invalid asset id: '+key)
    if selected and key not in selected: continue
    source=base/spec['source']
    if not source.exists():
        raise SystemExit('Missing painted source: '+str(source))
    image=Image.open(source)
    if 'A' in image.getbands() and image.getchannel('A').getextrema()[0]<255: raise SystemExit('Compose the gouache scene on its selected opaque background before extraction')
    rgb=np.asarray(image.convert('RGB')).copy()
    h,w=rgb.shape[:2]; rng=np.random.default_rng(spec.get('seed',7315))
    paper=np.array(spec.get('paper',[238,237,229]),np.uint8)
    canvas=np.full_like(rgb,paper)
    draw=spec.get('drawMs',4200)/1000
    stages=[[],[],[],[]]; stats=[]
    face_rects=spec.get('faces',[])
    for box in face_rects:
        if len(box)!=4 or not all(0<=n<=1 for n in box) or box[0]>=box[2] or box[1]>=box[3]: raise SystemExit('Invalid normalized face box: '+key)
    if draw<=0: raise SystemExit('drawMs must be positive')
    def face(x,y):return any(a*w<=x<=c*w and b*h<=y<=d*h for a,b,c,d in face_rects)
    def person(x,y):return x>w*spec.get('personLeft',.44)
    widths=spec.get('brushWidths',[106,58,31,16])
    if len(widths)!=4 or not all(n>0 for n in widths): raise SystemExit('brushWidths needs four positive widths')
    for layer,width in enumerate(widths):
        target=cv2.GaussianBlur(rgb,(0,0),max(.7,width*.13))
        gray=cv2.cvtColor(target,cv2.COLOR_RGB2GRAY).astype(np.float32)
        gx=cv2.Sobel(gray,cv2.CV_32F,1,0,ksize=3);gy=cv2.Sobel(gray,cv2.CV_32F,0,1,ksize=3)
        error=np.mean(np.abs(canvas.astype(np.float32)-target),axis=2)
        spacing=width*.7;cells=[]
        for y in np.arange(spacing*.4,h,spacing):
            for x in np.arange(spacing*.4,w,spacing):
                xx=int(np.clip(x+rng.uniform(-.23,.23)*spacing,0,w-1));yy=int(np.clip(y+rng.uniform(-.23,.23)*spacing,0,h-1))
                if layer and error[yy,xx]<[0,11,11,13][layer]:continue
                cells.append((xx,yy))
        rng.shuffle(cells);order=rng.permutation(48)
        cells.sort(key=lambda q:int(order[min(5,int(q[1]/(h/6)))*8+min(7,int(q[0]/(w/8)))]))
        for x,y in cells:
            color=target[y,x].astype(int);gradient=math.hypot(float(gx[y,x]),float(gy[y,x]))
            theta=math.atan2(float(gy[y,x]),float(gx[y,x]))+math.pi/2 if gradient>7 else float(rng.choice([-.78,-.38,.12,.72,1.44]))
            if rng.random()<.5:theta+=math.pi
            length=width*rng.uniform(1.45,2.7);pts=[]
            for direction in [-1,1]:
                local=[];px=float(x);py=float(y);last=theta
                for k in range(5):
                    if not(0<=px<w and 0<=py<h):break
                    ix=int(px);iy=int(py)
                    if k and np.linalg.norm(target[iy,ix].astype(float)-color)>max(32,width*.75):break
                    local.append([round(px,2),round(py,2)])
                    a=math.atan2(float(gy[iy,ix]),float(gx[iy,ix]))+math.pi/2
                    if math.hypot(float(gx[iy,ix]),float(gy[iy,ix]))>8:
                        if math.cos(a-last)<0:a+=math.pi
                        last=last*.7+a*.3
                    px+=math.cos(last)*length/8*direction;py+=math.sin(last)*length/8*direction
                if direction<0:pts=list(reversed(local))
                else:pts+=local[1:]
            if len(pts)<2:pts=[[max(0,x-width*.25),y],[min(w-1,x+width*.25),y+width*.03]]
            bw=round(width*float(rng.uniform(.88,1.12)),2)
            stage=0 if layer==0 else (2 if person(x,y) else 1)
            stages[stage].append([bw,*map(int,color),*[q for p in pts for q in p]])
            cv2.polylines(canvas,[np.rint(pts).astype(np.int32)],False,tuple(map(int,color)),max(1,round(bw)),cv2.LINE_AA)
        stats.append({'width':width,'marks':len(cells)})
    paint=[]
    for seq,(start,end,duration) in zip(stages,[(0,draw*.22,.11),(draw*.22,draw*.48,.065),(draw*.48,draw*.76,.055),(draw*.76,draw,.025)]):
        paint += [[round(start+(end-start-duration)*i/max(1,len(seq)-1),6),duration,*s] for i,s in enumerate(seq)]
    # Preserve the approved irregular bristle shapes in a flat-color vector pass.
    quant=Image.fromarray(rgb).quantize(colors=176,dither=Image.Dither.NONE)
    indices=np.asarray(quant);palette=np.asarray(quant.getpalette(),np.uint8).reshape(-1,3)
    groups={}
    for color_id,color in enumerate(palette[:176]):
        mask=(indices==color_id).astype(np.uint8)*255
        cs,hi=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
        if hi is None:continue
        hi=hi[0]
        for i,c in enumerate(cs):
            if hi[i][3]!=-1:continue
            x,y,bw,bh=cv2.boundingRect(c)
            if bw*bh<2:continue
            paths=[c.reshape(-1,2)];child=hi[i][2]
            while child!=-1:paths.append(cs[child].reshape(-1,2));child=hi[child][0]
            flat=[]
            for p in paths:
                if len(p)>5:p=cv2.approxPolyDP(p,.25,True).reshape(-1,2)
                flat.append(p.flatten().tolist())
            cx=x+bw*.5;cy=y+bh*.5;k=(*map(int,color),int(cx/112),int(cy/112))
            if k not in groups:groups[k]={'rgb':list(map(int,color)),'paths':[],'cx':cx,'cy':cy}
            groups[k]['paths']+=flat
    patches=list(groups.values());rng.shuffle(patches)
    patches.sort(key=lambda p:(person(p['cx'],p['cy']),int(p['cy']/160)%3))
    for i,p in enumerate(patches):
        p['t']=round(draw*.65+(draw*.35-.045)*i/max(1,len(patches)-1),6);p['d']=.045
        p.pop('cx');p.pop('cy')
    # Facial marks are local colored geometry, deposited in non-scan order.
    colors=np.minimum(255,((rgb.astype(np.uint16)+4)//8)*8).astype(np.uint8);fg={}
    for a,b,c,d in face_rects:
        x0,y0,x1,y1=round(a*w),round(b*h),round(c*w),round(d*h)
        for y in range(y0,min(h,y1)):
            x=x0
            while x<min(w,x1):
                color=tuple(map(int,colors[y,x]));start=x;x+=1
                while x<min(w,x1) and tuple(colors[y,x])==color:x+=1
                k=(*color,int(start/24),int(y/24))
                if k not in fg:fg[k]={'rgb':list(color),'runs':[]}
                fg[k]['runs'] += [start,y,x-start]
    pigment=list(fg.values());rng.shuffle(pigment)
    for i,p in enumerate(pigment):p['t']=round(draw*.87+(draw*.13-.02)*i/max(1,len(pigment)-1),6);p['d']=.02
    data={'schemaVersion':1,'medium':'gouache-graffiti','w':w,'h':h,'drawMs':round(draw*1000),'holdMs':1000,'paper':paper.tolist(),'strokes':paint,'letterStrokes':[],'letterShapes':[],'finishPatches':patches,'facePigment':pigment,'stats':stats,'seed':spec.get('seed',7315),'source':key,'noSourceBitmap':True}
    out=output;out.mkdir(parents=True,exist_ok=True)
    blob=json.dumps(data,separators=(',',':')).encode();(out/(key+'.json')).write_bytes(blob);(out/(key+'.json.gz')).write_bytes(gzip.compress(blob))
    print(key,'saved',len(paint),'gestures',len(patches),'patches',len(pigment),'face groups',len(blob),'bytes',flush=True)
