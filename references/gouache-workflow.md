# 宽笔厚涂／油漆涂鸦

用于参考画面的大块不透明颜料、可见刷毛和刮刀纹理。它与旧五媒介工作台是独立引擎。画稿本身应已经呈现所选笔法；不能把普通照片填进提取器后宣称它自动完成了优质厚涂创作。

## 画稿

参考 `assets/style-reference/gouache.png` 与 `mixed-white-paint.png`。画面固定16:9，通常左侧约35–42%供文字，右侧为人物；允许依原图调整。不要纵向压缩人物。此流程输入一张已经组合好背景的不透明场景，透明抠像须先按所选背景完成构图。

可改写的生成／编辑提示词：

> Edit the supplied photograph of {player}, period {verified period}. Keep the same real identity, facial structure, age, hairstyle, expression, pose, limb ownership and natural body proportions. Retain {verified kit details}. Create a wide 16:9 opaque acrylic/gouache painting with large confident brush and palette-knife marks, broken bristle edges and distinct planes of skin color. Preserve recognizable facial features inside the painted treatment. Compose {chosen subjects} on the right and reserve {chosen text area} on the left. Background: {specific selected wall or paint composition}. Paint the whole scene in the same medium. No written captions or invented people. Crop only {authorized crop}; do not squeeze the figure to fit.

背景可选，不混成一个默认：

- 深色人物封面：保留参考建筑／壁画等具体内容，以深蓝、炭灰等大块颜料统一，文字处留足对比。
- 白墙合影：与照片后方白墙延续，用暖白和浅灰构建厚涂，不用深蓝盖住墙面。
- 白底混色数据／奖项：大面积白色为主，少量两队颜色夹在白色刷痕、刮刀纹和颜料叠层里，散落分布；避免两个角的纯红／纯蓝大块。

人物辨识度优先于颜料噪点。依照片核对每只手／手臂与躯干的连接，特别是多人遮挡、倒钩和举杯。用户最后一次更正优先，不能只凭之前错误描述删手。检查本人、两臂两腿、球与鞋、奖杯盖／底座／缎带。文字、球衣号码和标志需要再次视觉确认。

## 提取几何

依赖：Python的 `numpy`、`Pillow`、`opencv-python`。先使用已有依赖；可通过 `--python-path` 指向现有包目录，不要求用户换电脑路径。

```json
[
  {"id":"portrait","source":"art/portrait.png","drawMs":5200,"paper":[242,240,231],"faces":[[0.61,0.02,0.78,0.35]],"personLeft":0.44,"brushWidths":[106,58,31,16],"seed":7315},
  {"id":"background","source":"art/background.png","drawMs":4500,"paper":[244,243,237],"faces":[],"personLeft":1}
]
```

source相对这份配置。脸部框为0–1归一化 `[left,top,right,bottom]`，按实际人物位置标，不套用示例。每个人、奖牌卡上的第二张脸都可独立列框。`personLeft` 只影响落笔排序，不是自动语义抠图。四个 brushWidths 为源图像素；上例对应约1672px宽场景。粗细改变不等于重新创作概括画稿。

```text
python <Skill>/scripts/extract-gouache.py <assets.json> <geometry目录> [--only portrait] [--python-path <已有Python包目录>]
```

输出每项的JSON和JSON.gz：宽笔路径、平色不规则轮廓、局部面部颜料短标记。最后一遍沿画稿颜料形状落下，不整体显示源PNG。提取是确定性的；源稿、配置或seed变化时重新提取并清除旧缓存。

## 排版与回放

按 [格式](gouache-format.md) 写 profile，四类章节为cover、portrait、career、honors。日期、标题、数字、奖项来自配置，不写死在引擎中。

```text
node <Skill>/scripts/build-gouache.mjs <story.json> <完整动画.html>
node <Skill>/scripts/build-gouache.mjs <story.json> <独立章.html> --chapter <id>
node <Skill>/scripts/verify-gouache.mjs <story.json> <检查.json> --deps-root <node_modules> --frames <检查帧目录>
```

HTML打包只用Node内置模块。检查帧和视频使用 `@napi-rs/canvas`。Codex桌面可通过 workspace dependencies 工具找到运行时；其他环境可传正常Node包目录。不要把本机路径复制到通用脚本。

完成画面应仍像原来的绘画，而非过细的照片拼片。浏览器查看实际中段与完成态，确认皮肤、衣服、颜料边缘，源图片不闪回，正文不被人物或颜料抢掉。默认4.5–5.5秒画完，再停1秒；白底背景可共享一份几何，但须按各章drawMs重映射，不能按共享数据原时长提前停住。

示例 `assets/gouache-demo/story.json` 有4章，可直接验收整个渲染链路；其中人物与事实是冻结样本，不是新球员素材。视频和分章见 [分章交付](chapter-delivery.md)。
