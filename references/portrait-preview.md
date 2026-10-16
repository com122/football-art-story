# 单张试画与逐笔小样

只要求其他球员画法样稿时，交付源画稿和全身／面部对照即可，不虚构生涯表和统计。先看本人的照片与 style-gallery.md 中所选媒介图例，以本人照片固定动作与五官。

可用图像工具时，直接编辑已查看的本人参考图；另一张风格参考只借笔法，不借身份。缺少图像生成时应报告能力限制。明确选择纯矢量手绘工作流时，可以创作有实际人物辨识点的 SVG／连续笔画数据，仍须检查形似与自然笔法；几何线条数量不是质量证明。不能换标签复用德布劳内画像。

需要逐笔小样时，先按素材类型运行 extract-pencil.mjs 或 extract-sketch.mjs，取得原始笔触 JSON。再写简化预览配置：

    {
      "schemaVersion": 1,
      "player": {"name":"球员中文名","latinName":"Player name","period":"明确的照片时期"},
      "drawing":"portrait",
      "art":{"medium":"colored-pencil","drawingMode":"sketch","detail":25,"thickness":1.1,"drawMs":4200,"holdMs":1000},
      "notes":["原动作与原五官作参照","本页是画法试验，不是生涯统计"]
    }

    node <本Skill>/scripts/build-portrait-preview.mjs <preview.json> <strokes.json或.json.gz> <预览.html>

脚本复用相同逐笔引擎，以固定 1920×1080、灰纸、左文右画展示一个完整人物。它只生成肖像小样，不是完整生涯片。源 PNG 不嵌入，暂停、重画、拖动进度和完成态可查看；正常播放画完后停 holdMs。可用查询参数 controls=0 隐藏控制条。

先将完成态与原画稿并排检查：发顶、双手双脚是否完整，脸能否认出，概括是否仅减少次要刻画。然后检查 15%、50%、100%、重画和倒退。若提取后丢五官、线条机械、出现纸面噪声，修正素材或提取参数，不能把源稿质量当成动画质量。

新球员试验暴露了两项易错点：钢笔源图的浅灰不能直接变成等量黑排线，extract-pencil 已按源图墨量衰减；细腻的彩色成稿不能靠骨架提取自动变成优质简笔画，缺少粗线少笔的源稿就报告未达标。黑白线稿可显式设置 whitePaper:true，让提取器按真实深色线条取样，保留衣褶、号码与手部线条；不要将灰纸图误当纯白纸。

简笔画可将独立粗线画稿提取为 loose-sketch，渲染参数用 medium colored-pencil、drawingMode sketch，保留源笔画实际粗细。纯单色线稿也可以逐笔，不要求其中必须存在彩色像素。
