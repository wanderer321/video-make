# 社区与教程平台实战经验汇编
> 收集整理：2026-04-23 | 含金量高的实战经验

---

## 🎯 核心发现：Replicate官方博客 (⭐ 含金量最高)

### 📊 博客文章统计

| 类别 | 数量 | 核心价值 |
|------|------|----------|
| **视频模型指南** | 5+ | Seedance 2.0/Veo 3.1详细提示词技巧 |
| **图像模型指南** | 6+ | Seedream 5.0/Nano Banana Pro实战技巧 |
| **模型对比文章** | 3+ | AI视频模型对比、角色一致性对比 |
| **工作流教程** | 10+ | ComfyUI、LoRA、Fine-tune教程 |

---

## 🎬 Seedance 2.0实战指南 (2026-04-15发布)

### 核心发现：时间码多镜头提示词技巧

```
# 时间码格式：
[0-4s]: wide establishing shot, static camera, misty bamboo forest at dawn
[4-8s]: medium shot, slow push-in, the fighter steps forward
[8-12s]: close-up, orbit shot, the fighter strikes, slow motion
[12-15s]: extreme close-up, the samurai's hand grips the katana hilt
```

### 4大实战示例

| 场景 | 时间结构 | 风格参考 |
|------|----------|----------|
| **武士日落** | Wide → Dolly zoom → Crane shot → Extreme close-up | Akira Kurosawa / Hans Zimmer |
| **香水广告** | Macro → Glide → Spray → Hero frame | Fashion commercial |
| **火星着陆** | Wide → Push-in → Close-up → Visor reflection | Interstellar / Gravity |
| **霓虹东京** | Wide → Dolly → Tracking → Raindrop close-up | Blade Runner 2049 / Roger Deakins |

### 参考输入技巧

```markdown
## 多模态参考格式：
- [Image1] - 第一张参考图
- [Image2] - 第二张参考图
- [Audio1] - 参考音频
- [Video1] - 参考视频

## 示例提示词：
[Image2] is in the interior of [Image1] where he is kept the style of [Image2], 
but the realism of [Image1] remains. He says [Audio1].

## 最大输入限制：
- 最多9张图片
- 最多3个视频片段
- 最多3个音频文件
```

### 提示词技巧总结

```
1. 过度描述 (Overdescribe)
   ❌ "a car chase"
   ✅ "a high-speed night pursuit through rain-slicked Tokyo streets, 
      neon reflections streaking across wet asphalt, headlights cutting through mist"

2. 描述音频 (Describe audio)
   ✅ "The screaming roar of twin turbofan engines and the metallic slam of the catapult"

3. 质量锚点 (Quality anchors)
   ✅ "Hyper-realistic, 8k" → 最高保真输出

4. 描述摄像机 (Describe camera)
   ✅ "The camera is mounted on the hood of the lead car"
   ✅ "swift dolly zoom"
   ✅ "the camera is at ground level"

5. 组合参考类型 (Combine references)
   ✅ 图片(角色外观) + 视频(运动风格) + 音频(节奏)
```

---

## 📊 AI视频模型全面对比 (2025-07-07更新)

### 24个模型规格对比表

| 模型 | 价格/视频 | 分辨率 | 时长 | FPS | 速度 | 日期 |
|------|-----------|--------|------|-----|------|------|
| **Google Veo 3** | $6 | 720p/1080p | 8s | 24 | 92s | 2025-05 |
| **Google Veo 3 Fast** | $3.20 | 720p/1080p | 8s | 24 | 59s | 2025-07 |
| **Bytedance Seedance 1 Pro** | $0.15-$1.50 | 480p/720p/1080p | 5s/10s | 24 | 31-95s | 2025-06 |
| **Minimax Hailuo 02** | $0.10-$0.50 | 768p/512p/1080p | 6s/10s | 24 | 41-400s | 2025-06 |
| **Kuaishou Kling 2.1 Master** | $1.40-$2.80 | 1080p | 5s/10s | 24 | 218-570s | 2025-06 |
| **Alibaba Wan 2.2 5b fast** | **$0.01-$0.02** | 480p/720p | 5s | 16 | **6-16s** | 2025-08 |
| **Runway Gen-4 Turbo** | $0.25-$0.50 | 720p | 5s/10s | 24 | 22-32s | 2025-04 |
| **Pixverse v4.5** | $0.30-$0.80 | 360p/540p/720p/1080p | 5s/8s | 30 | 17-60s | 2025-05 |

### 功能支持对比

| 功能 | 模型 | 特点 |
|------|------|------|
| **文本生成视频** | 全部 | 基础能力 |
| **原生音频** | Veo 3, Seedance 2.0 | 音视频同步生成 |
| **首尾帧控制** | Seedance 1 Lite, Luma Ray 2 | 变换序列 |
| **角色参考** | Veo 3.1, Kling 1.6, Nano Banana Pro | 最多14张参考图 |
| **图像生成视频** | 全部 | 基础能力 |

---

## 🎨 Seedream 5.0实战指南 (2026-02-24发布)

### 核心发现：示例编辑技巧

```markdown
## 示例编辑格式：
> Reference the change from Image 1 to Image 2, apply the same operation to Image 3

工作原理：
1. 输入 Image 1 (原始状态)
2. 输入 Image 2 (目标状态)
3. 输入 Image 3 (新对象)
4. 模型自动学习变换并应用到新对象

示例：
- 白色杯子 → 金缮杯子 → 白色花瓶 → 金缮花盆 ✅
- 木头 → 大理石 → 新对象 → 大理石版本 ✅
- 白天 → 夜晚 → 新场景 → 夜晚版本 ✅
```

### 逻辑推理能力

```markdown
## Rube Goldberg机器示例：
> A Rube Goldberg machine: a marble rolls down a wooden ramp, hits a row of dominoes, 
the last domino pulls a string that tips a watering can, the water fills a small cup 
on a balance scale, which lowers and pulls a lever that rings a tiny brass bell.

模型理解：
- 物理正确性：每个组件投射正确的阴影
- 机械关系：齿轮、弹簧、擒纵轮正确位置
- 多步骤推理：花朵分类并分配到指定容器
```

### 文本渲染技巧

```
使用双引号包裹要渲染的文本：
✅ "BLUE NOTE SESSIONS" → 精确渲染
✅ "Tickets at bluenote.nyc — All ages welcome." → 多字体混合

支持多语言：
- 中文 ✅
- 日文 ✅
- 韩文 ✅
```

### 多图生成技巧

```markdown
## Storyboard格式：
> A cinematic 2x2 storyboard grid. Panel 1: ... Panel 2: ... Panel 3: ... Panel 4: ...
Consistent character design, anamorphic lens flare, Ridley Scott color palette.

## 品牌套件格式：
> A comprehensive brand identity flat-lay for "ALTITUDE" coffee roaster...
Arranged on dark slate: matte black coffee bags, business cards, ceramic dripper...
```

---

## 👤 角色一致性模型对比 (2025-07-21发布)

### 6个模型对比

| 模型 | 价格 | 速度 | 优势 | 局限 |
|------|------|------|------|------|
| **Runway Gen-4** | $0.05-$0.08 | 20-27s | 照片相似度最高 | 复杂场景肢体错误 |
| **FLUX Kontext Pro** | $0.04 | **5s** | 多用途、快速 | 面部伪影 |
| **gpt-image-1** | $0.04-$0.17 | 16-59s | 复杂任务 | 黄色色调、身份变化 |
| **SeedEdit 3** | $0.03 | 13s | 经济实惠 | 限于初始构图 |
| **Ideogram Character** | 新发布 | - | - | - |
| **Nano Banana Pro** | - | - | 最多14张参考图 | - |

### 实战建议

```markdown
照片场景：
✅ 首选 Runway Gen-4 Image → 最高相似度
✅ 备选 FLUX Kontext Pro → 快速/经济
✅ 修复 Gen-4 肢体错误 → 用 Kontext Pro

创意场景：
✅ 首选 FLUX Kontext Pro → 风格转换
✅ 复杂任务 → gpt-image-1
✅ 经济选择 → SeedEdit 3

❌ 不要用 Gen-4 做风格转换
```

---

## 🍌 Nano Banana Pro实战指南 (2025-11-20发布)

### 核心发现：逻辑推理能力

```markdown
## 作业求解：
> write the answers to the questions in pencil. show your work

输入：带作业题的图片
输出：带答案和解题步骤的图片 ✅

## PDF摘要：
> Take papers or really long articles and turn them into a detailed whiteboard photo

输入：92页PDF论文
输出：白板摘要图 ✅

## 代码渲染：
> render this: [完整的React + WebGL shader代码]

输入：代码文本
输出：可视化渲染图 ✅
```

### 文本设计能力

```markdown
## 杂志封面：
> Put this whole text, verbatim, into a photo of a glossy magazine article

✅ 精确文本渲染
✅ 多字体混合
✅ 多语言支持（印尼语测试通过）

## 应用设计：
> Generate an app design mock up for a tower defense game

✅ 完整UI布局
✅ 多屏幕设计
```

### 角色一致性（最多14张参考图）

```markdown
## 多角色合成：
> Turn these photos into one cinematic visual

✅ 25个物品合成到一张图（社区记录）

## 角色跨场景：
> Make him [insert scenario here]. Keep his whiteboard style, but make the surroundings realistic.

✅ 保持角色风格
✅ 改变周围环境
```

---

## ✏️ FLUX Kontext实战指南 (2025-05-29发布)

### 图像编辑技巧

```markdown
## 快速编辑：
✅ "give her a gold necklace" → 添加项链
✅ "give her a Pixie haircut" → 改变发型
✅ "Make the woman's blue headscarf into a green headscarf" → 改颜色

## 风格转换：
✅ "Convert to quick pencil sketch"
✅ "Convert to colorful gouache painting"
✅ "Make this a 90s cartoon"

## 文本编辑：
✅ "Change the text in the sunglasses to be 'FLUX' and 'Kontrast'"

技巧：用引号包裹要编辑的文本
```

### 提示词技巧总结

```
1. 具体 (Be specific)
   ✅ "give her a gold necklace"
   ❌ "make it better"

2. 简单开始 (Start simple)
   ✅ 先测试小改动，再逐步增加复杂度

3. 明确保留 (Preserve intentionally)
   ✅ "while keeping the same facial features"
   ✅ "maintain the original composition"

4. 直接命名 (Name subjects)
   ✅ "the woman with short black hair"
   ❌ 避免代词

5. 用引号编辑文本 (Use quotation marks)
   ✅ "replace 'x' with 'y'"

6. 明确构图 (Control composition)
   ✅ "Change the background to a beach while keeping the person in the exact same position"

7. 选择动词 (Choose verbs carefully)
   ✅ "change the clothes" → 控制性改动
   ❌ "transform" → 完全重做
```

---

## 🎥 Veo 3.1实战指南 (2025-10-16发布)

### 参考图生成视频

```javascript
// API调用示例
const output = await replicate.run("google/veo-3.1", {
  input: {
    reference_images: [
      "https://example.com/character.jpg",
      "https://example.com/product.jpg",
      "https://example.com/background.jpg"
    ],
    prompt: "Create a product review video with the character showcasing the product",
    duration: 8,
    resolution: "1080p"
  }
});
```

### 首尾帧控制

```markdown
## 变换序列：
输入：羊羔图 (首帧) + 老虎图 (尾帧)
输出：羊 → 老虎 变换动画 ✅

输入：房间前图 + 房间后图
输出：房间改造动画 ✅

提示词：A smooth transformation sequence
```

### Veo提示词通用指南

```
镜头构图：
✅ "single shot", "two shot", "over-the-shoulder shot"

焦点效果：
✅ "shallow focus", "deep focus", "soft focus", "macro lens", "wide-angle lens"

风格：
✅ "sci-fi", "romantic comedy", "action movie", "animation"

摄像机位置：
✅ "eye level", "high angle", "worm's eye"
✅ "dolly shot", "zoom shot", "pan shot", "tracking shot"
```

---

## 📺 YouTube频道资源

### Replicate官方频道 (@replicatehq)

| 视频标题 | 时长 | 核心内容 |
|----------|------|----------|
| Run Replicate models using Cloudflare Workers | 7分钟 | 60秒部署全栈应用 |
| Create stylized videos using pre-trained HuggingFace LoRAs | 3分钟 | Hunyuan + LoRA视频 |
| FLUX.1 Schnell vs FLUX.1 Dev | 6分钟 | Flux模型对比 |
| David Attenborough narrating my life | 2分钟 | GPT-4-vision + ElevenLabs |
| Write shell commands in English | - | 自然语言命令 |

---

## 🔗 直接访问链接

### Replicate博客高价值文章

| 文章 | 链接 | 核心价值 |
|------|------|----------|
| Seedance 2.0实战 | replicate.com/blog/seedance-2 | 时间码多镜头技巧 |
| AI视频模型对比 | replicate.com/blog/compare-ai-video-models | 24模型规格表 |
| Veo 3.1指南 | replicate.com/blog/veo-3-1 | 参考图/首尾帧 |
| Seedream 5.0指南 | replicate.com/blog/how-to-prompt-seedream-5 | 示例编辑技巧 |
| 角色一致性对比 | replicate.com/blog/generate-consistent-characters | 6模型对比 |
| Nano Banana Pro | replicate.com/blog/how-to-prompt-nano-banana-pro | 逻辑推理技巧 |
| FLUX Kontext | replicate.com/blog/flux-kontext | 图像编辑技巧 |

### Replicate文档

| 文档 | 链接 |
|------|------|
| Node.js快速开始 | replicate.com/docs/get-started/nodejs |
| Python快速开始 | replicate.com/docs/get-started/python |
| ComfyUI指南 | replicate.com/docs/guides/extend/comfyui |
| LoRA工作流 | replicate.com/docs/guides/extend/working-with-loras |
| Discord机器人 | replicate.com/docs/guides/run/discord-bot |

---

## 💡 DramaForge整合建议

### 高优先级实战技巧导入

```markdown
1️⃣ Seedance时间码技巧
   → PromptGenerator服务直接支持
   
2️⃣ 参考输入格式 ([Image1]/[Audio1])
   → 分镜脚本结构化输出
   
3️⃣ FLUX Kontext编辑技巧
   → 图像编辑模块
   
4️⃣ 角色一致性建议
   → Gen-4 + Kontext组合方案
   
5️⃣ 示例编辑功能
   → Seedream 5.0集成
```

### API集成方案

```javascript
// Seedance 2.0 API调用
import Replicate from "replicate";
const replicate = new Replicate();

const output = await replicate.run("bytedance/seedance-2.0", {
  input: {
    prompt: "...",
    duration: 10,
    resolution: "720p",
    aspect_ratio: "16:9",
    generate_audio: true,
    reference_images: ["https://..."],
    reference_videos: ["https://..."],
    reference_audios: ["https://..."]
  }
});
```

---

## 📊 资源价值评级

| 资源类型 | 数量 | 含金量 | 获取难度 |
|----------|------|--------|----------|
| **Replicate博客实战指南** | 60+ | ⭐⭐⭐⭐⭐ | 直接访问 |
| **视频模型对比表** | 24模型 | ⭐⭐⭐⭐⭐ | 直接访问 |
| **角色一致性对比** | 6模型 | ⭐⭐⭐⭐⭐ | 直接访问 |
| **API示例代码** | JS/Python | ⭐⭐⭐⭐⭐ | 直接复制 |
| **YouTube视频教程** | 5+ | ⭐⭐⭐⭐ | 直接观看 |

---

## 🎯 核心价值总结

**Replicate博客是AI视频/图像实战经验的顶级资源库！**

- ✅ 官方验证的提示词技巧
- ✅ 多模型对比数据
- ✅ API调用示例
- ✅ 社区创作案例
- ✅ 定期更新

**直接访问链接：**
- 博客：https://replicate.com/blog
- 文档：https://replicate.com/docs
- 模型库：https://replicate.com/explore
- YouTube：https://www.youtube.com/@replicatehq

---

*本文件整理了Replicate官方博客和社区的实战经验*

*收集时间：2026-04-23*

*含金量：⭐⭐⭐⭐⭐ 官方验证实战技巧*