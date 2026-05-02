# 提示词工程完整指南
> 收集整理：2026-04-23 | 用于DramaForge项目

## 🎯 提示词工程基础

### 核心概念

提示词工程(Prompt Engineering)是一门设计和优化AI输入的艺术和科学，目的是让AI模型产生更准确、更有用的输出。

### 提示词三要素

1. **指令(Instruction)** - 你想让AI做什么
2. **上下文(Context)** - 相关背景信息
3. **格式(Format)** - 输出的结构和风格

---

## 📐 结构化提示词模板

### CRISPE框架

```
- **C**apacity and Role (能力与角色): AI应该扮演什么角色
- **R**elevant Information (相关信息): 需要提供的背景
- **I**nsight (洞察): 核心任务和目标
- **S**tatement (陈述): 具体的指令要求  
- **P**ersonality (个性): 输出的风格和语气
- **E**xperiment (实验): 尝试不同的迭代

示例：
[C] 你是一位专业的电影分镜师
[R] 项目是一部现代都市爱情短片
[I] 需要将文字剧本转化为视觉分镜
[S] 为以下场景设计5个镜头的完整分镜描述
[P] 使用专业电影术语，简洁明了
[E] 每个镜头包含景别、角度、运镜、时长
```

### CO-STAR框架

```
- **C**ontext (背景): 任务相关的情境
- **O**bjective (目标): 明确要达成的目的
- **S**tyle (风格): 输出的语言风格
- **T**one (语气): 传达的态度和情感
- **A**udience (受众): 目标读者群体
- **R**esponse (响应): 输出格式要求

示例：
[C] 这是一部悬疑网剧的分镜设计
[O] 创造紧张氛围，揭示关键线索
[S] 电影工业标准术语
[T] 专业冷静的分析语气
[A] 摄影师和导演阅读
[R] YAML格式的分镜表，包含技术参数
```

---

## 🎬 动画/视频专用提示词模板

### 场景描述模板

```markdown
## 场景提示词结构

**时间**: [时间设定]
**地点**: [地点描述]  
**氛围**: [氛围关键词]
**光线**: [光线条件]
**主体**: [主体描述]
**动作**: [动作描述]
**镜头**: [镜头参数]

完整示例：
"""
时间: 黄昏时分，金色夕阳
地点: 城市天台，远处是朦胧的城市轮廓
氛围: 宁静、略带忧郁
光线: 逆光，剪影效果，金色边缘光
主体: 一位长发女孩，穿着白色连衣裙
动作: 独自站立，望向远方，轻轻叹气
镜头: 远景固定镜头，2.39:1宽银幕，慢速拉远

生成提示词：
"A lone girl with long flowing hair wearing white dress, 
standing on urban rooftop at sunset golden hour, 
silhouette against dramatic city skyline backlighting, 
peaceful melancholic atmosphere, wide establishing shot, 
cinemascope 2.39:1, slow pull out camera movement, 
cinematic lighting, anime art style, high quality 8k"
"""
```

### 人物描述模板

```markdown
## 人物提示词结构

**外貌**: [面部特征/发型/体型]
**服装**: [服装细节]
**姿态**: [身体姿态]
**表情**: [情绪状态]
**年龄**: [年龄段]
**气质**: [气质关键词]

固定角色描述示例：
"""
固定角色标签: [角色ID_CHARACTER]

外貌: 
- 短发黑色，蓝色眼睛
- 纳米香蕉(Nano Banana)面部特征
- 18岁青年女性体型

服装:
- 红色卫衣，黑色牛仔裤
- 白色运动鞋
- 樱花发夹

气质: 活泼开朗，略带调皮

锁定提示词(用于角色一致性)：
"[CHARACTER_ID], short black hair, blue eyes, 18 years old, 
wearing red hoodie and black jeans, white sneakers, 
sakura hair clip, energetic cheerful personality, 
anime style character design, consistent face features"
"""
```

### 动作描述模板

```markdown
## 动态镜头提示词

**类型**: [动作类型]
**强度**: [强度等级 1-10]
**方向**: [运动方向]
**速度**: [速度描述]
**焦点**: [焦点位置]

动作示例库：

1. **奔跑镜头**
"running at full speed, dynamic motion blur, 
sprinting forward, intense action shot, 
low angle following shot, fast paced movement"

2. **战斗镜头**
"combat scene, martial arts fighting pose, 
mid-air spinning kick action shot, 
dynamic camera angle, impact moment, 
dramatic lighting, high tension"

3. **舞蹈镜头**
"graceful dance movement, elegant ballet pose, 
flowing dress swirling, spinning motion, 
stage performance lighting, 
medium tracking shot, artistic composition"

4. **对话镜头**
"two people conversation, facing each other, 
natural dialogue pose, warm indoor lighting, 
over the shoulder shot alternating, 
intimate atmosphere, close up reactions"
```

---

## 🔧 高级提示词技巧

### 权重控制

```
语法: (关键词:权重值)

权重范围: 0.1 - 2.0
- 默认值: 1.0
- 增强效果: 1.1 - 1.5 (常用)
- 强烈强调: 1.5 - 2.0
- 降低影响: 0.5 - 0.9
- 几乎忽略: 0.1 - 0.4

示例：
"(close up shot:1.3), (emotional expression:1.2), 
(cinematic lighting:1.1), (detailed background:0.8)"

括号嵌套增强：
"((very important element)), (((critical feature)))"
```

### 动态提示词

```
语法: [开始词:结束词:切换步数]

示例：
"[blue sky:red sky:10]" - 在第10步从蓝色天空切换到红色天空
"[happy:sad:15]" - 情绪从中性过渡

组合使用：
"[wide shot:close up:12], [calm:stormy:8]"
```

### 组合提示词 (Composable Diffusion)

```
语法: 概念A AND 概念B AND 概念C

权重组合：
"a forest landscape :1.5 AND a mystical castle :1.2 AND golden sunset :1.0"

场景组合：
"urban street scene AND rainy atmosphere AND neon lights AND night time"

注意：AND组合适用于SD系列，Midjourney使用逗号分隔即可
```

### 负向提示词 (Negative Prompt)

```
通用负向提示词模板：
"low quality, blurry, distorted, deformed, 
disfigured, bad anatomy, watermark, signature, 
text, logo, cropped, worst quality, 
jpeg artifacts, ugly, duplicate, morbid, 
mutilated, extra limbs, missing limbs, 
floating limbs, disconnected limbs, 
mutation, mutated, poor lighting, 
out of frame, extra fingers, 
missing fingers, fused fingers, 
too many fingers, long neck, 
bad proportions, gross proportions, 
tilted frame, rotated frame"

动画专用负向：
"realistic photo, photorealistic, 3d render, 
western art style, detailed skin texture, 
realistic eyes, photography style"

真人风格负向：
"anime, cartoon, illustration, 3d render, 
painting, drawing, sketch, anime style, 
flat color, cel shading"
```

---

## 🎨 风格提示词库

### 动画风格

| 风格 | 提示词 | 特点 |
|------|-------|------|
| 日系动画 | `anime style, anime art, japanese animation` | 大眼、简化线条、鲜艳色 |
| 新海诚风 | `makoto shinkai style, atmospheric anime` | 天空、光影、细腻背景 |
| 宫崎骏风 | `hayao miyazaki style, ghibli style` | 自然、童趣、手绘感 |
| 赛博朋克 | `cyberpunk style, neon lights, futuristic` | 霓虹、科技、暗色调 |
| 萌系 | `kawaii style, cute anime, moe` | 圆润、粉色、可爱元素 |

### 电影风格

| 风格 | 提示词 | 特点 |
|------|-------|------|
| 电影感 | `cinematic, film look, movie quality` | 专业构图、调色 |
| 银黑白 | `black and white, noir style, monochrome` | 高对比、戏剧感 |
| 老电影 | `vintage film, retro cinema, film grain` | 褪色、颗粒感 |
| 科幻电影 | `sci-fi movie style, futuristic cinematic` | 高科技、冷色调 |
| 悬疑电影 | `thriller style, suspenseful atmosphere, dark mood` | 低调照明、阴影 |

### 艺术风格

| 风格 | 提示词 | 特点 |
|------|-------|------|
| 水彩 | `watercolor painting, watercolor style` | 柔和、流动、透明 |
| 油画 | `oil painting, classical art style` |厚重、质感、肌理 |
| 漫画 | `manga style, comic book art` | 线条、网点、分镜感 |
| 插画 | `digital illustration, concept art` | 现代、设计感 |
| 线稿 | `line art, sketch, drawing style` | 纯线条、无上色 |

---

## 📊 提示词评估与优化

### 评估维度

1. **准确性** - 是否生成了期望的内容
2. **一致性** - 多次生成是否稳定
3. **细节度** - 是否包含足够的细节
4. **可控性** - 是否能精确控制输出
5. **效率性** - 提示词长度是否合理

### 优化流程

```
步骤:
1. 基础提示词 - 写出核心要求
2. 添加风格 - 加入风格关键词
3. 添加细节 - 补充具体描述
4. 调整权重 - 使用权重优化重要元素
5. 添加负向 - 排除不想要的元素
6. 测试迭代 - 多次测试调整
7. 固化模板 - 形成可复用模板

示例优化过程：

版本1 (基础):
"一个女孩站在屋顶上"

版本2 (添加风格):
"一个女孩站在屋顶上，动漫风格"

版本3 (添加细节):
"一个长发女孩穿着白色连衣裙，站在城市屋顶上，黄昏时分"

版本4 (完整版):
"A girl with long flowing hair wearing white dress, 
standing on urban rooftop at sunset golden hour, 
dramatic backlighting silhouette effect, 
peaceful melancholic atmosphere, 
wide establishing shot cinemascope 2.39:1, 
anime art style, makoto shinkai inspired, 
cinematic lighting, high quality 8k, 
masterpiece, detailed background"
```

---

## 🌐 中英文提示词对照

### 常用关键词对照表

| 中文 | 英文 | 使用场景 |
|------|------|---------|
| 镜头 | shot, camera angle | 镜头类型 |
| 景别 | framing, shot size | 远景/中景/近景 |
| 角度 | angle, perspective | 拍摄角度 |
| 运镜 | camera movement | 镜头运动 |
| 光线 | lighting, illumination | 光照效果 |
| 氛围 | atmosphere, mood, ambiance | 情绪基调 |
| 动态 | dynamic, motion, movement | 动作状态 |
| 细节 | detailed, intricate, elaborate | 精细程度 |
| 风格 | style, aesthetic, art style | 艺术风格 |
| 高质量 | high quality, masterpiece, best quality | 画质要求 |

---

## 📚 学习资源推荐

### 官方文档
- Prompting Guide: https://promptingguide.ai
- Anthropic Claude Guide: https://docs.anthropic.com
- OpenAI Prompt Guide: https://platform.openai.com/docs/guides/prompt-engineering

### 中文资源
- WayToAGI提示词库: https://www.waytoagi.com/prompts
- AIGC导航: https://www.aigc.cn
- DeepLearning.AI中文课程: https://learn.deeplearning.ai

### 社区资源
- prompts.chat开源库: https://prompts.chat (160k+ GitHub Stars)
- PromptBase市场: https://promptbase.com
- HuggingFace数据集: https://huggingface.co/datasets/fka/prompts.chat

---

## 💡 最佳实践总结

### 通用原则
1. **明确具体** - 避免模糊描述，使用精确词汇
2. **结构清晰** - 使用模板结构，便于维护
3. **权重合理** - 关键元素用权重强调
4. **负向完备** - 排除常见问题元素
5. **迭代优化** - 持续测试改进

### 动画/视频专用建议
1. **镜头先行** - 先确定镜头类型再添加细节
2. **参考风格** - 使用知名作品风格作为参考
3. **序列一致** - 批量生成时保持参数一致
4. **技术参数** - 明确分辨率、帧率等技术要求
5. **脚本分离** - 将对话和视觉描述分开处理

---

*此指南将持续更新，建议结合实际项目需求灵活应用*