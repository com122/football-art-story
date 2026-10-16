/* Shared by compiler, film and studio. Fixed seed keeps export frames reproducible. */
const ART_PRESETS={
 'colored-pencil':{label:'彩色铅笔',thickness:1,detail:85,grain:.35,roughness:.12,saturation:1,opacity:1,contourFraction:.22},
 graphite:{label:'石墨素描',thickness:.95,detail:85,grain:.45,roughness:.12,saturation:0,opacity:1.1,contourFraction:.26},
 watercolor:{label:'水彩',thickness:1,detail:65,grain:.18,roughness:.28,saturation:.95,opacity:.85,contourFraction:.16},
 crayon:{label:'蜡笔',thickness:1.4,detail:65,grain:.7,roughness:.38,saturation:1.15,opacity:.85,contourFraction:.18},
 ink:{label:'钢笔线描',thickness:.8,detail:75,grain:.05,roughness:.05,saturation:0,opacity:1.15,contourFraction:.32}
};
const ART_RANGES={thickness:[.4,3],detail:[10,100],grain:[0,1],roughness:[0,1],saturation:[0,1.5],opacity:[.3,1.5],contourFraction:[.1,.4],drawMs:[2000,12000],holdMs:[0,2500]};
function normalizeArt(input={}){
 const medium=input.medium||'colored-pencil';if(!Object.hasOwn(ART_PRESETS,medium))throw Error('Unknown art medium: '+medium);
 const result={medium,...ART_PRESETS[medium],drawingMode:'detailed',drawMs:6800,holdMs:1000,paper:'gray',showTool:true,seed:73,...input};delete result.label;
 for(const [key,[min,max]] of Object.entries(ART_RANGES)){if(!Number.isFinite(result[key])||result[key]<min||result[key]>max)throw Error('art.'+key+' must be between '+min+' and '+max);}
 if(!['gray','ivory','white'].includes(result.paper))throw Error('Unknown art.paper');
 if(!['detailed','sketch'].includes(result.drawingMode))throw Error('Unknown art.drawingMode');
 if(typeof result.showTool!=='boolean'||!Number.isInteger(result.seed)||result.seed<0||result.seed>2147483647)throw Error('Invalid art.showTool or art.seed');
 for(const key of Object.keys(input))if(!['medium','drawingMode','paper','showTool','seed',...Object.keys(ART_RANGES)].includes(key))throw Error('Unknown art option: '+key);
 return result;
}
function artForKey(profile,key,override={}){
 const originalKey=Object.entries(profile.artVariants||{}).find(([base,variants])=>Object.values(variants).includes(key))?.[0]||key;
 const role=profile.career.rows.some(r=>r.crest===originalKey)?'crests':profile.chapters.some(c=>c.visual==='trophies'&&c.drawing===originalKey)?'trophies':'portraits';
 return normalizeArt({...profile.art,...profile.artRoles?.[role],...profile.artAssets?.[originalKey],...profile.artAssets?.[key],...override});
}
