# 输入格式与构建

生成任务使用两个 JSON 文件。`assets.json` 内的路径相对该文件所在目录，也支持绝对路径。CLI 的输出路径由当前任务提供；缓存写在笔触 JSON 旁的 `pencil-cache/`。

## assets.json

数组中的 `key` 唯一，用小写字母、数字、下划线或短横线，必须以字母开头。`kind` 为 `portrait`、`crest`、`trophies`；`path` 指向已经检查过的透明底彩铅 PNG 或真实队徽 SVG。`height` 可选，默认分别 1000、220、760 像素，用于提取几何精度。

```json
[
  {"key":"period_a","kind":"portrait","path":"assets/period-a-pencil.png","period":"实际参考赛季","source":"参考照片URL"},
  {"key":"crest_a","kind":"crest","path":"assets/club-a.svg","period":"徽章有效年代","source":"真实标志来源"}
]
```

`period`、`source` 和生成提示词等元数据用于审查，不会自动出现在画面里。原始 JPEG 照片用于研究与图像编辑，不能直接交给笔触提取器。

## story.json

```json
{
  "schemaVersion":1,
  "player":{"name":"示例球员","latinName":"Example Player","intro":"经核实的开场叙述。","asOf":"截至实际统计日期","accent":"#6CABDD"},
  "intro":{"drawing":"period_a"},
  "timing":{"startMs":120,"portraitMs":6800,"introMs":3800,"ballMs":2300,"holdMs":1000},
  "career":{
    "summary":"按真实球队数量填写总览说明",
    "total":{"value":0,"label":"已核实的总进球指标"},
    "note":"写明统计来源和口径。",
    "rows":[{"club":"示例球队","period":"实际效力年份","crest":"crest_a","accent":"#6CABDD","appearances":0,"goals":0,"highlights":"已核实的亮点","national":false}]
  },
  "chapters":[{
    "year":"实际年份","title":"时期标题","subtitle":"球队外文名","accent":"#6CABDD","body":"经核实的短叙事。",
    "facts":[{"value":"真实数值或日期","label":"指标含义"}],
    "visual":"portrait","drawing":"period_a","caption":"照片实际参考赛季","age":"照片对应的年龄"
  }],
  "stats":{
    "metrics":[{"value":0,"label":"已核实的统计指标"}],
    "honors":[],"individual":[],"note":"注明实际截止日期、赛事范围和数据来源。"
  }
}
```

这是字段格式示例，零值和示例名字不能当作真实球员资料。研究后的所有数据须填写为真实值；确实未知的指标不加入数组，不用零伪装未知。

`stats.metrics` 可加 `prefix`/`suffix`，例如排名使用 `prefix:"No."`；默认动画数字为非负整数计数。含小数的指标应作为事实卡文本，或按实际需要扩展数字格式后检查最终值。事实卡的 `value` 可以是日期、文本或数字，不局限于纯计数。

## 章节的 visual

- `portrait`：完整人物图，默认右侧区域 `[100,5,790,775]`。
- `ball`：用于出生/青训等足球起点，采用程序化球体逐笔绘制，不需要人物素材。底部文字来自 `caption`，未提供时组合该章副标题与年份，不固定任何具体球员出生地。
- `bench`：有真实替补经历时使用。提供 `drawing`、已核实的 `shirtNumber` 和可选 `benchAppearances`；板凳与人物同时绘制，不默认任何具体球员号码。
- `trophies`：提供实际奖杯组合的 `drawing` 和 `caption`。可设置 `trophyLabels:[{"text":"实际奖项","x":195}]`，横向位置依据图中杯子决定；不强制三座奖杯。

`drawingBox:[x,y,width,height]` 可调整某幅姿态特别宽的图片，但必须浏览器检查身体完整及留白。`durationScale` 可对关键章节做少量节奏调整，整个作品仍需满足用户总时长要求。

## 时长与布局

`portraitMs` 等表示从章节开始算起的绘制终点，非纯绘制耗时；默认起笔 120 毫秒。所有正文与数字动画结束也计入时长。总时长由 `verify-story.mjs` 写入报告。改变 `portraitMs` 后重新构建、验证；根据实际报告逼近目标，不仅靠章节数乘固定秒数估算。

默认排版按参考页的 7 个队徽行、8 个数据指标和适量荣誉设计。数据数量可以改变；球队很多时先调整页面密度或将生涯表分段，浏览器检查全部内容和长姓名。不要宣称模板已经自动支持尚未实现的分页。

HTML 内嵌压缩后的笔触和文本，保留查询参数用于检查：`?chapter=索引&at=毫秒` 冻结到某一帧；`?chapter=索引&demo=1` 循环该章；无参数时从头自动播放，结束后暂停。字体可能需联网。查询参数检查后交付正常播放的无参数地址。验证脚本会执行生成的页面代码，只用于本 Skill 构建产物，不用于任意第三方 HTML。
