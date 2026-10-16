# 厚涂配置 football-gouache/1

这是独立格式，不与旧彩铅 `schemaVersion:1` 混用。可直接复制 `assets/gouache-demo/story.json` 作为可运行的结构示例，再替换人物、事实、几何与队徽。

## 最小结构

```json
{
  "schemaVersion":"football-gouache/1",
  "player":{"name":"球员中文名","latinName":"ENGLISH NAME","asOf":"YYYY-MM-DD"},
  "geometry":{"portrait":"geometry/portrait.json.gz"},
  "chapters":[
    {
      "id":"opening","label":"封面","kind":"cover","art":"portrait",
      "drawMs":5200,"holdMs":1000,
      "eyebrow":"PLAYER / STORY",
      "title":["球员中文名"],"titleY":327,"titleSize":76,
      "blocks":[
        {"type":"text","lines":["ENGLISH","NAME"],"x":94,"y":468,"size":54,"font":"digits","lineHeight":65},
        {"type":"metric","value":12,"label":"已核实指标","x":94,"y":800,"at":0.25,"duration":0.25}
      ]
    }
  ],
  "sources":[{"title":"官方来源","url":"https://example.org/source","scope":"数据口径及核验日期"}],
  "notes":["说明和来源位于影片外，不绘入影片。"]
}
```

geometry路径相对这份配置；JSON或JSON.gz均可。每章用art选择一份几何，共享背景允许多个章节引用同一key。打包只内嵌所需数据，不加载源PNG。`id` 使用小写字母、数字与短横线；不重复。

## 章节与文字

kind支持cover、portrait、career、honors。cover和portrait用相同通用文字块机制，不自动添加球员或固定年代。`theme:"dark"`表示深色背景、浅色文字，默认浅底深字。可选palette的ink、body、muted、accent覆盖颜色；章节palette再覆盖全局palette。

eyebrow在左上方；dateLine在222px基线；title为一行或多行文本，默认左90、基线330、80px中文衬线。可用titleX/titleY/titleSize/titleLineHeight/titleFont调整。封面通常用blocks设置中文名、英文名和短叙事，源画稿不要烧录姓名，避免换球员留下旧字。

blocks的坐标为1920×1080画布像素，y为文字基线：

| type | 主要字段 |
|---|---|
| text | text或lines、x/y、size、lineHeight、weight、font、color |
| metric | value、label、x/y、size、labelSize、labelOffset、color、labelColor |
| line | x/y、width、color |

font可为serif/sans/digits，均有中文系统字体后备。`at`和`duration`为整段绘画时长的比例，默认0.18和0.12；两者之和须≤1。所有叙事动画跟随章内drawMs；不会因提速而把数字尾巴留到停留段。

drawMs为实际全部绘画结束时间，holdMs为其后停留。引擎把几何本身的时间映射到本章drawMs。共用背景时仍以本章绘画终点为准。

## 生涯表

career章设置titleY约278，summary、countLabel可选；rows每页1–4行，更多球队拆页以保持字体大小：

```json
{"club":"球队名","scope":"2017—2024 · 一线队正式比赛","apps":255,"goals":29,"crest":"team-key","accent":"#c51928","highlight":"代表成就"}
```

apps/goals为非负整数，缺失值不要伪造为0。范围不同的行可以分别呈现，不生成相加总计。横条按本页最大出场数缩放；数字和原队徽分别绘制。

`nativeCrests`为顶层原始矢量数据，原例中包含曼联、那不勒斯真实轮廓，仅用于相应球队与已核实版本。新球队须替换：

```json
"nativeCrests":{
  "team-key":{
    "box":[0,0,100,100],
    "paths":[{"d":"原SVG路径","fill":"#真实颜色","stroke":"none","width":1,"rule":"nonzero","transforms":[]}]
  }
}
```

paths来自干净的官方／可信SVG，保留路径、颜色、填充规则与父级变换。transforms支持matrix/translate/scale/rotate。不能把包含未解析gradient、文字、裁切或use节点的SVG直接当成已转换；需先正确展开并视觉比对，或在项目中扩展支持。此模块仅承诺绘制提供的矢量，不自动验证它是不是正确历史队徽。无需手绘时不走图像模型或照片边缘抠图。

可用symbol表示已核实的简单图形，例如苏格兰旗 `{"kind":"saltire","field":"#0759a4","cross":"#ffffff"}`；它不是缺队徽时的自动回退，不给其他国家套用。

## 奖项总览

honors章设置titleY约282，asOfLabel在右上标明范围。team最多4项，每项year/title/club；individual最多5项，每项period/title。两栏分别为团队冠军、主要个人荣誉，可用teamHeading/individualHeading调整。

这是主要奖项概览。未核实的荣誉省略，未知不是零。完整清单超出可读空间时拆页，不继续缩小成脚注。同一个奖不同报道合并，官方赛季MVP与另一主办方年度最佳等真实不同奖分开。画稿中的游戏能力值不当成生涯统计。
