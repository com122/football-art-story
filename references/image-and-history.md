# 肖像、队徽与奖杯核对

每个时期在项目资料保存参考 URL、照片日期/赛季、当时年龄、队伍、号码、制造商、胸前与袖口赞助、徽章版本、球裤、球袜、球鞋与发型说明。页面章节年份可表示生涯阶段起点，但不能把后来的球衣标成早期球衣；需要区分时使用可读的赛季标签。用户不需要照片说明时，不在影片人物旁强行加拍摄日期脚注。

生成前检查照片是否符合所选全身／裁切构图；用户允许鞋子出画时自然裁切，不能压缩身体。需要补画被遮挡部分时说明缺口，不能默默改变主要动作。带多个球员的照片先确认目标人物及肢体归属，再移除无关人物；用户指定的合影或双时期拼接除外。保留足球仅在姿态需要时。半身参考可补充面部与发型，全身构图以全身照片为准。两个来源的脸、头发和球衣不能混成一个不存在的年代。

## 可改写的图像编辑提示词

> Use case: style-transfer. Edit the provided actual photographs of {player} into a lifelike FULL-BODY COLORED PENCIL DRAWING for a stroke-by-stroke animation reference. Period/date: {period}. Preserve this player's recognizable real facial identity, age, hairstyle, proportions, expression and pose. Authentic kit: {manufacturer}, {main sponsor}, {sleeve sponsor if applicable}, {crest version}, {shirt and shorts number}, {shirt/shorts/socks/boots colors and details}. Isolate ONLY the named player and football if present. Show the full figure from hair to both boot tips with about 5% margin. Fully transparent background and gaps between limbs; remove crowds, stadium, other people, borders, watermark and gray halo. Fine directional colored pencil hatch strokes, graphite contours, natural skin colors, layered crosshatching and paper tooth only within pigment. Clearly a hand-drawn pencil study. Do not invent sponsors, alter the period, turn it into a cartoon, or add external labels.

将日期、品牌等填成已核实的具体值，不把花括号模板原样交给生成工具。参考透明底素材也可能存在半透明灰雾；提取器会过滤低透明度，但不负责从不透明照片中自动抠人。

生成后逐个查看结果：人物身份、完整双脚、头发、球衣大字与标志、号码、边缘透明度。生成模型写错品牌或号码时，用图像编辑工具定点修改并再次查看。

队徽直接获取真实标志，使用来源确认的历史版本，不用图像模型重新发明。用户选择绘画队徽时转换为逐笔线条；选择原队徽时直接显示干净的原始矢量，见 [厚涂格式](gouache-format.md)，不执行粗糙照片抠图。铜杯、银杯、金冠、巨耳、杯盖、底座、缎带必须分别匹配对应奖项，不用一只泛化杯子重复表示不同荣誉。

统计需分别记录总正式比赛、指定赛季／赛事、国家队与核验日期，不把不同口径相加。青训入队年龄不等于童年合影拍摄年龄。引语须区分用户指定文案、可核实原话和编辑转述；找不到原始出处时不伪造采访日期、英文原句或逐字引号。

## 已认可的德布劳内参考细节

- 亨克图像使用 2011–12 球衣和效力期蓝色旋涡旧徽，章标题 2008 表示生涯阶段起点，人物标注实际赛季和约 20 岁。
- 2013–14 切尔西是 adidas / SAMSUNG，球裤与板凳席都是 15。
- 2014–15 沃尔夫斯堡是 Kappa / Volkswagen，白色球裤 14；生成模型曾写成 Lotto，需要改回 Kappa。
- 初到曼城用 2015–16 Nike 旧鹰徽；2019–20 用 Puma 紫色肩部细节与短发；2025 年告别用长发后梳、0161 领袖口、深蓝袜。
- 那不勒斯全身参考为 2025 年 9 月 18 日欧冠比赛，EA7 / MSC 深蓝球衣、11 号与大背头，不混用 Lete 或 Kappa。
- 三冠王用英超金冠银杯、欧冠巨耳无盖杯、足总杯带盖与球员顶饰的杯子。

这些仅帮助理解参考效果，不是其他球员的默认生涯、球衣、号码或荣誉。
