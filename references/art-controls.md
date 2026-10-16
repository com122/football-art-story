# 参数与人工调控

本页仅适用于旧彩铅／线条引擎：在 schemaVersion 1 的 story.json 添加 `art`。只传 medium 即使用该媒介默认值；显示用的 label 不是有效输入。大面积厚涂是独立的 `football-gouache/1` 格式，见 [厚涂流程](gouache-workflow.md)，不在这个 medium 列表中伪造一个未接通的选项。

```json
"art":{"medium":"colored-pencil","detail":85,"thickness":1,"grain":0.35,"roughness":0.12,"saturation":1,"opacity":1,"contourFraction":0.22,"drawMs":5200,"holdMs":1000,"paper":"gray","showTool":true,"seed":73}
```

| 字段 | 范围 | 实际作用 |
|---|---|---|
| medium | colored-pencil / graphite / watercolor / crayon / ink | 选择不同标记绘制引擎 |
| drawingMode | detailed / sketch | detailed 为分层刻画，sketch 为独立的简洁观察速写画稿 |
| detail | 10–100 | 选择细节路径和排线密度；外轮廓完整，人物上部保留更多细节 |
| thickness | 0.4–3 | 乘以当前媒介基准线宽，不是像素值 |
| grain | 0–1 | 彩铅浓淡、水彩颜料边缘、蜡笔断续颗粒、钢笔微小浓淡 |
| roughness | 0–1 | 标记端点轻微偏移，保持人物体形 |
| saturation | 0–1.5 | 原颜色围绕亮度值调整饱和度；石墨／钢笔单色时界面隐藏此项 |
| opacity | 0.3–1.5 | 落笔浓度，不是整图透明度 |
| contourFraction | 0.1–0.4 | 连续轮廓所占时间，随后三遍标记 |
| drawMs | 2000–12000 | 人物／奖杯名义绘制终点，毫秒；整章还包含文字数字和停留 |
| holdMs | 0–2500 | 实际最后动画之后停留，毫秒 |
| paper | gray / ivory / white | 纸张底色；未模拟物理纸纤维 |
| showTool | true / false | 跟随当前标记的笔尖提示 |
| seed | 0–2147483647 整数 | 可复现的粒度与偏移 |

art.drawMs 与 holdMs 优先于 timing 同义字段。选高精细度不会自动延长动画，而是在同样时间画更多标记。加快动画不会少画选定标记。

## 将口头选择转成预设

| 用户表达 | 建议配置 | 验收重点 |
|---|---|---|
| 原版同款 | 彩铅，detail 85–100，thickness 1 | 身份、全身、时期细节 |
| 概括，类似简洁铅笔速写 | drawingMode sketch，专用线稿，thickness 1–1.2 | 自然长线、留白、完整体形、明确眉眼鼻口 |
| 精画 | detail 100，thickness 回到基准 | 细节全画完，避免过度噪点 |
| 短视频更快 | drawMs 3500–5200，holdMs 1000 | 不漏画，文字仍读得清 |
| 淡水彩 | watercolor，opacity 0.55–0.8，暖白纸 | 主体有完整色块 |
| 颗粒蜡笔 | crayon，grain 0.65–0.85，thickness 1.3–1.8 | 颗粒不淹没五官 |
| 钢笔线描 | ink，detail 60–85，thickness 0.7–1 | 肤色留白，暗部密排线，不能整人涂黑 |

“概括速写”使用独立画稿与连续曲线。发型用少量流动长线，体形和衣褶用简洁的观察线，五官保留辨识点，纸面留白。它不等同于在精画素材上减少排线、增加线宽，也不采用照片感脸部加密集身体排线。

工作台只提供“概括”和“精画”：概括选择 drawingMode sketch，精画回到 detailed。旧参数中的数值 detail 仍兼容，界面不再提供细节密度滑块或中间档。速写的时间覆盖全部连续笔画；contourFraction 和 roughness 不控制这组已创作的曲线，概括时隐藏这些滑块，仍可调粗细、浓度、色彩、纸色、颗粒与速度。切换媒介保留当前表现方式。粗线简笔画是独立风格，先准备和确认画稿，再接入对应逐笔数据，不能只新增无对应素材的按钮。

## 角色与素材覆盖

```json
"artRoles":{"crests":{"medium":"colored-pencil","detail":100,"thickness":1,"saturation":1},"trophies":{"medium":"watercolor","detail":80,"thickness":0.9}},
"artAssets":{"portrait_late":{"detail":100,"thickness":0.85}}
```

优先级：全局 art → artRoles → artAssets。角色可为 portraits、crests、trophies。覆盖字段仍须是有效 art 参数；drawMs、holdMs、paper 只能全局配置。覆盖 medium 后其余字段仍继承全局，要完整采用另一个媒介默认值时同时明确其他字段。未传 artRoles 时队徽默认精细彩铅，保留官方颜色。

章节速度使用原 profile 的 durationScale。章节画法可用不同素材 key 与 artAssets 覆盖。工作台调全局参数，保留角色和素材覆盖；不生成新画像。

## 对应画法专用素材

用 artVariants 指定同一人物在不同画法下的独立素材：

```json
"artVariants":{"portrait_late":{"ink":"portrait_late_ink","sketch":"portrait_late_sketch"}}
```

两组 key 均须在笔触数据中存在。编译器将它们一起嵌入，工作台按媒介选择，人物的实际画法参数仍继承原素材的角色和覆盖。这样切换到钢笔时可使用已画好五官的钢笔源图，不依赖彩铅像素转黑线。不存在该媒介的专用素材时才采用通用笔触模拟；不能把低辨识度模拟当作已验收人物。

专用钢笔 assets.json 用 medium ink。观察速写用 extract-sketch.mjs 提取连续彩色曲线及笔画样式，再在 artVariants 添加 sketch key。画稿须已经具备正确的人物与简洁画法，不能把提取器当成资料或肖像生成器。

速写源可为透明线稿，或纯白底线稿并显式设置 whitePaper true。白底只用于读取线条，输出网页只画曲线，不显示纸张矩形或源图。可选 preserveBlueEyes true 用于确实画有蓝色瞳孔的样本，保留实际蓝色笔迹；不要给其他眼色的人套用。提取器保留线条的原始粗细及强烈小笔画，避免把瞳孔和眉眼一起简化掉。

```text
node <本Skill>/scripts/extract-sketch.mjs <速写assets.json> <sketch-data.json> --sharp-root <已有Node包目录>
```

将 sketch-data 的对象合入普通笔触数据，然后照常运行 build-story 或 build-studio。纯曲线速写允许 packed 为空、counts 为四个零，必须有非空 paths 和一一匹配的 pathStyles；全部彩色笔画在整段时间逐笔落下，而不是仅在开场画完轮廓后等待。

概括模式没有对应 sketch 画稿时会明确报错，不再回退到精画密集排线。先准备所选媒介的概括画稿，再建立映射；不能把错误提示当作用户已看到了概括效果。完整演示旧稿中的其他时期须各自补齐概括素材后才能使用概括。

## 工作台

build-studio.mjs 接受与 build-story.mjs 相同输入。画面固定 16:9、等比缩放，参数面板位于影片外层。更换画法清空缓存并重画所选章。进度 100% 是实际完整绘制，倒退须恢复正确中间帧。

保存参数得到 `{schemaVersion:1,art:{...}}`，导入严格验证。保存动画将当前参数写入新 HTML，去除工作台，从开场正常播放。HTML 内嵌笔触，运行不需素材目录；字体断网后备。视频是额外交付。

## 扩展

新增媒介同时更新 art-settings.js 预设与校验、art-runtime.js 标记绘制、studio-template.html 选项，以同一输入检查帧。不能只添加名字。水彩目前是宽笔与半透明颜料叠加，未实现物理水分扩散。需要更强媒介造型时生成匹配素材，见 medium-prompts.md。
