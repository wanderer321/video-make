# Seedance 2.0 视频提示词资源补充
> 收集整理：2026-04-23 | GitHub搜索发现的资源

## 🎬 Seedance 2.0 介绍

**Seedance 2.0** 是字节跳动（抖音）推出的多模态AI视频生成模型，支持：
- 图生视频 (I2V)
- 文生视频 (T2V)
- 音频输入
- 运动控制
- 分镜脚本

---

## 📊 GitHub发现的提示词库资源

### 高质量提示词库 (搜索发现)

根据GitHub搜索结果，以下仓库包含高质量视频提示词：

| 仓库描述 | 特点 | 内容 |
|----------|------|------|
| **500+ Seedance 2.0视频提示词** | 电影、动漫、UGC、广告、Meme | 500+精选模板 |
| **Ultimate Collection** | 高保真Seedance 2.0提示词 | 电影级场景 |
| **100+ Seedance 2提示词** | 示例和指南 | AI视频生成 |
| **Seedance 2.0 Prompt Vault** | 资源中心 | 模板+工作流 |
| **中文精选模板库** | 20+模板，完整分镜脚本 | GitHub直接预览 |
| **Seedance 2.0 × Higgsfield** | 15个Claude提示词技能 | 电影/3D CGI/动漫/电商广告/音乐视频 |

### 视频分镜相关仓库

| 仓库描述 | 特点 |
|----------|------|
| **AIYOU短剧平台** | 36天VibeCoding构建，概念→脚本→分镜→视频自动化 |
| **Kling AI视频提示词插件** | Claude插件，I2V/T2V/运动控制/分镜 |
| **AI视频导演Skill** | 创意想法→专业分镜→Seedance 2.0提示词 |
| **AI视频分镜Skill** | 简报→多镜头制作计划+电影提示词 |
| **AI视频提示词规划Web应用** | 视频提示词规划工具 |
| **AI生成视频分镜JSON** | 电影项目角色/风格/地点 |
| **桌面Python应用** | LM Studio生成脚本/提示词/分镜/MP4 |
| **提示词视频生成工作室** | 分镜+渲染队列 |

### 中文提示词资源

| 仓库描述 | 特点 |
|----------|------|
| **一句话Seedance2结构化** | 16+模板，8+示例，带货广告模板 |
| **AI短剧一站式** | 小说/剧本/分镜/提示词/关键帧/视频/剪辑 |
| **酷模Cumob AI** | Sora API分镜/提示词辅助工具 |
| **AI提示词扩展工具** | 文生视频/图生视频扩展 |
| **视频画面→提示词反推** | 一键反推视频提示词 |
| **全自动AI视频生成工作流** | LibLib/即梦/豆包集成 |

---

## 🎯 Seedance 2.0 提示词结构

### 结构化提示词模板

```yaml
# Seedance 2.0 结构化提示词模板

提示词结构:
  主体描述:
    - 角色/人物
    - 外观特征
    - 服装
  
  动作描述:
    - 主要动作
    - 运动轨迹
    - 运动强度
  
  场景描述:
    - 地点
    - 时间
    - 光线
    - 氛围
  
  技术参数:
    - 摄像机角度
    - 摄像机运动
    - 画面比例
    - 风格类型
  
  运动控制:
    - 运动类型
    - 运动速度
    - 运动方向
```

### 场景类型模板

```markdown
## 电影场景 (Cinematic)

模板: "cinematic, [场景], [角色], [动作], [光线], [镜头参数]"

示例:
- "cinematic, city street at night, a man walking alone, 
  street lights creating dramatic shadows, tracking shot, 
  16:9 aspect ratio, film noir style"

- "cinematic, mountain landscape at sunset, a woman hiking, 
  golden hour lighting, wide establishing shot, epic scenery"

## 动漫场景 (Anime)

模板: "anime style, [角色], [场景], [动作], [情绪], [镜头]"

示例:
- "anime style, young girl with blue hair, school rooftop at sunset, 
  standing alone looking at sky, peaceful melancholic mood, 
  wide shot with slow push in"

- "anime style, high school student, classroom during break, 
  laughing with friends, joyful energetic atmosphere, 
  medium shot, bright lighting"

## UGC风格 (User Generated Content)

模板: "UGC style, [场景], [视角], [动作], [自然感]"

示例:
- "UGC style, home kitchen, POV shot, cooking demonstration, 
  natural handheld feel, everyday lifestyle"

- "UGC style, street food stall, close up, vendor preparing food, 
  authentic documentary feel, vibrant colors"

## 广告场景 (E-commerce/Ads)

模板: "product showcase, [产品], [场景], [展示方式], [光线]"

示例:
- "product showcase, luxury watch, clean white studio background, 
  rotating display with soft lighting, premium feel, close up details"

- "product showcase, smartphone, lifestyle scene, person using device, 
  natural lighting, warm colors, medium shot"

## 音乐视频 (Music Video)

模板: "music video style, [场景], [角色], [舞蹈动作], [视觉风格]"

示例:
- "music video style, neon-lit dance floor, dancer performing, 
  dynamic choreography, colorful lighting effects, quick cuts"

- "music video style, outdoor concert stage, band performing, 
  energetic crowd interaction, dramatic lighting, wide shot"
```

---

## 📐 运动控制参数

### Seedance 2.0 运动类型

| 运动类型 | 英文关键词 | 中文描述 |
|----------|-----------|---------|
| 静态 | `static, no movement` | 无运动 |
| 轻微 | `subtle movement, gentle` | 小幅度 |
| 中等 | `moderate movement, natural` | 自然运动 |
| 强烈 | `dynamic movement, intense` | 大幅度 |
| 快速 | `fast movement, rapid` | 高速度 |
| 慢速 | `slow movement, gradual` | 低速度 |

### 运动方向

| 方向 | 英文关键词 | 描述 |
|------|-----------|------|
| 左移 | `move left, pan left` | 向左运动 |
| 右移 | `move right, pan right` | 向右运动 |
| 上移 | `move up, tilt up` | 向上运动 |
| 下移 | `move down, tilt down` | 向下运动 |
| 前移 | `move forward, push in` | 向前推进 |
| 后移 | `move backward, pull out` | 向后拉远 |
| 旋转 | `rotate, spin, orbit` | 围绕旋转 |
| 环绕 | `circle around, orbit shot` | 360度环绕 |

---

## 🎨 风格关键词库

### 电影风格

| 风格 | 关键词 | 特点 |
|------|-------|------|
| 电影感 | `cinematic, film look` | 专业构图 |
| 黑色电影 | `film noir, dramatic shadows` | 高对比阴影 |
| 动作电影 | `action movie, dynamic` | 快节奏运动 |
| 科幻电影 | `sci-fi cinematic, futuristic` | 科技感 |
| 恐怖电影 | `horror film, eerie atmosphere` | 诡异氛围 |
| 爱情电影 | `romantic film, soft lighting` | 柔和浪漫 |

### 动画风格

| 风格 | 关键词 | 特点 |
|------|-------|------|
| 日系动漫 | `anime style, Japanese animation` | 标准动漫 |
| 新海诚风 | `Makoto Shinkai style, atmospheric` | 天空光影 |
| 宫崎骏风 | `Ghibli style, hand-drawn feel` | 自然童趣 |
| 3D CGI | `3D CGI animation, Pixar style` | 三维动画 |
| 低多边形 | `low poly style, geometric` | 几何简化 |

### 商业风格

| 风格 | 关键词 | 特点 |
|------|-------|------|
| 产品展示 | `product showcase, commercial` | 专业拍摄 |
| 生活化 | `lifestyle, natural, authentic` | 自然真实 |
| 高端质感 | `premium, luxury, high-end` | 高级感 |
| 社交媒体 | `social media style, trendy` | 流行感 |

---

## 📝 提示词生成技巧

### Nano Banana Pro 关帧提示词

```markdown
## Nano Banana Pro 技术要点

关键帧描述结构:
1. **画面主体** - 焦点对象
2. **画面构图** - 位置/比例
3. **光影效果** - 光线描述
4. **动作提示** - 运动建议
5. **风格定义** - 视觉风格

示例关键帧提示词:
"Frame 1: Establishing shot of modern city skyline at dawn, 
golden light reflecting on glass buildings, slow aerial movement, 
cinematic style with warm color palette"

"Frame 2: Medium close-up of protagonist looking at horizon, 
profile composition, dramatic backlighting creating silhouette, 
subtle head turn to left, emotional moment captured"
```

### TVC广告创意总监模板

```yaml
# TVC广告提示词模板

brief_analysis:
  product: [产品类型]
  target_audience: [目标受众]
  key_message: [核心信息]
  tone: [调性]

creative_direction:
  visual_style: [视觉风格]
  color_palette: [色彩倾向]
  music_mood: [音乐情绪]

keyframes:
  - frame_1:
    shot: "opening hook"
    description: "[开场吸引画面]"
    duration: "3s"
    
  - frame_2:
    shot: "product reveal"
    description: "[产品展示画面]"
    duration: "5s"
    
  - frame_3:
    shot: "call to action"
    description: "[结尾号召画面]"
    duration: "3s"
```

---

## 🔧 Claude Code Skill集成

### Seedance 2.0 Skill模板

```markdown
## Claude Code Skill: Seedance Video Generator

Purpose: Generate cinematic, compliant video prompts for Seedance 2.0

Skill Structure:
```
Name: seedance-video-generator
Description: AI video prompt generation skill for Seedance 2.0
Version: 2.0

Parameters:
- style: cinematic | anime | ugc | commercial | music_video
- duration: 3s | 5s | 10s | custom
- aspect_ratio: 16:9 | 9:16 | 1:1 | 2.39:1
- motion_control: static | subtle | moderate | dynamic

Output Format:
{
  "prompt": "[generated prompt]",
  "keyframes": [
    {
      "frame_number": 1,
      "description": "[frame description]",
      "camera": "[camera specification]",
      "duration": "[time]"
    }
  ],
  "style_parameters": {
    "color_palette": "[colors]",
    "lighting": "[lighting type]",
    "mood": "[emotional tone]"
  }
}
```

### 分镜Skill模板

```markdown
## Claude Code Skill: AI Video Storyboard

Purpose: Turn briefs into multi-shot production plans

Skill Structure:
```
Name: video-storyboard-planner
Description: Generate professional storyboards from creative briefs

Input:
- brief: [creative brief text]
- num_shots: [number of shots]
- style: [visual style reference]

Output:
- Scene breakdown with shot specifications
- Cinematic prompts for each shot
- Visual reference suggestions
- Production notes and timing
```

---

## 📚 资源链接汇总

### GitHub仓库 (搜索发现)

> ⚠️ 注：以下仓库URL可能已变更，建议在GitHub搜索关键词获取最新地址

**Seedance 2.0提示词库：**
- 搜索关键词: `seedance 2.0 prompts`
- 搜索关键词: `seedance video generation`
- 搜索关键词: `AI视频提示词`

**分镜相关：**
- 搜索关键词: `AI video storyboard`
- 搜索关键词: `video prompts storyboard`
- 搜索关键词: `AI短剧 分镜`

### 相关技术

| 技术 | 用途 | 链接 |
|------|------|------|
| Nano Banana | 关键帧提示词 | 搜索 Nano Banana Pro |
| 即梦/Seedance | 视频生成 | 字节跳动产品 |
| 可灵AI/Kling | 视频生成 | 快手产品 |
| LibLib | 文生图 | AI图像生成平台 |

---

## 💡 使用建议

### 提示词优化流程

```
1. 确定视频类型 → 选择对应风格模板
2. 描述场景细节 → 使用五维架构
3. 设置运动参数 → 根据叙事需要
4. 添加风格关键词 → 视觉风格统一
5. 测试迭代 → 调整参数优化效果
```

### 与DramaForge集成建议

```
集成方案:
1. 添加Seedance 2.0提示词模板到prompt_templates/
2. 开发视频生成服务调用Seedance API
3. 实现分镜脚本→视频提示词转换
4. 支持批量关键帧生成
5. 集成运动控制参数配置
```

---

## 📊 资源价值评估

| 资源类型 | 提示词数量 | 质量评估 | 推荐度 |
|----------|-----------|----------|--------|
| 500+视频提示词库 | 500+ | 高保真精选 | ⭐⭐⭐⭐⭐ |
| 100+示例指南 | 100+ | 实用性强 | ⭐⭐⭐⭐ |
| Claude Skills | 15+ | 自动化生成 | ⭐⭐⭐⭐⭐ |
| 中文模板库 | 20+ | 本地化好 | ⭐⭐⭐⭐ |
| 结构化提示词 | 16+模板 | 规范化高 | ⭐⭐⭐⭐⭐ |

---

*本文件根据GitHub搜索结果整理，建议在GitHub搜索关键词获取最新仓库地址*

*收集时间：2026-04-23*