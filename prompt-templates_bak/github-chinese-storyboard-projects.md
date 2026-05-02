# GitHub中文分镜/Storyboard开源项目深度探索

> 🔥 **重磅发现**：这些项目比中文技术博客更有价值——完整系统可直接使用！

---

## 🏆 TOP 1: story-shot-agent (PenShot)

**项目地址**: https://github.com/neopen/story-shot-agent
**PyPI包**: `penshot` (可直接安装使用)
**中文README**: 有完整中文文档

### 核心功能

```
剧本/短剧/小说 → 分镜 → 片段 → Prompt
```

**技术架构**:
- 基于 LangGraph + LLM 多Agent协作
- 6个专业Agent链式处理：
  1. Script Parser Agent - 剧本解析
  2. Shot Generator Agent - 分镜生成
  3. Video Splitter Agent - 视频切片
  4. Prompt Converter Agent - Prompt转换
  5. Quality Auditor Agent - 质量审核
  6. Continuity Guardian Agent - 连贯性守护

### 多级记忆系统

| 记忆层 | 功能 |
|--------|------|
| 短期记忆 | 当前片段上下文 |
| 中期记忆 | 场景间关联 |
| 长期记忆 | 角色/剧情全局状态 |
| Chroma向量库 | 语义检索一致性检查 |

### 输出格式示例

```json
{
  "fragment_id": "frag_001",
  "original_text": "深夜11点，城市公寓客厅...",
  "visual_prompt": "Cinematic wide shot: midnight 11 PM...",
  "negative_prompt": "cartoon, anime, 3D render...",
  "duration": 4.2,
  "model": "runway_gen2",
  "style": "cinematic 35mm film, moody realism...",
  "audio_prompt": {
    "audio_id": "audio_001",
    "prompt": "Low-frequency rain ambience...",
    "model_type": "AudioLDM_3"
  }
}
```

### 快速使用

```bash
# 方式A: PyPI安装 (推荐)
pip install penshot

# 方式B: 源码安装
git clone https://github.com/neopen/story-shot-agent.git
cd story-shot-agent
pip install -e .
```

```python
from penshot.api import create_penshot_agent

agent = create_penshot_agent(max_concurrent=5)

script = "清晨，女孩在咖啡馆看书，阳光透过窗户..."
task_id = agent.breakdown_script_async(script)

result = await agent.wait_for_result_async(task_id)
```

### REST API接口

```bash
# 提交分镜任务
curl -X POST 'http://localhost:8000/api/v1/storyboard' \
-H 'Content-Type: application/json' \
-d '{"script": "深夜11点，城市公寓客厅..."}'

# 查询状态
curl 'http://localhost:8000/api/v1/status/{task_id}'

# 获取结果
curl 'http://localhost:8000/api/v1/result/{task_id}'
```

### 支持的下游模型

- OpenAI Sora
- Google Veo
- Runway Gen-2/Gen-3
- 可灵 (Keling)
- SVD

---

## 🏆 TOP 2: sora-prompt-generator

**项目地址**: https://github.com/shijincai/sora-prompt-generator
**在线工具**: https://sora2watermarkremover.net/sora-prompt-generator

### 13种风格预设

| 风格 | 适用场景 | 推荐配置 |
|------|----------|----------|
| Cinematic Realism | 电影/高端广告 | Cinematic → Master |
| Anime Dreamscape | 动漫风格 | 专业灯光控制 |
| Found Footage Horror | 恐怖片 | Raw级别 |
| 90s Sitcom | 经典喜剧 | 亮光 |
| Music Video | MV | 动态运镜 |
| Surreal | 超现实主义 | 抽象视觉 |
| Ring Camera | 门铃监控POV | 固定角度 |
| Bodycam Footage | 警察执法记录 | 手持晃动 |
| CCTV Security | 监控摄像头 | 固定视角 |
| Dashboard Camera | 行车记录仪 | 车载视角 |
| Drone Aerial | 无人机航拍 | 平滑运动 |
| UGC/Influencer | 社交媒体原生 | 自然光 |
| Auto | AI自动选择 | - |

### 参数体系

**基础参数**:
- Scene Description - 场景描述
- Style Preset - 风格预设
- Production Level - 5级制作水准 (Raw→Master)
- Pacing - 节奏 (Slow/Moderate/Fast)

**电影参数**:
- Camera Shot - 镜头类型和运动
- Lens Specification - 焦距和景深
- Lighting Description - 灯光设置和氛围
- Mood - 情绪基调
- Color Palette - 最多3个色彩锚点

**音频参数**:
- Music Style - 音乐风格
- Music Mood - 音乐情绪
- Sound Effects - 环境音效
- Audio Volume - 音量级别

**高级参数**:
- Duration - 5s/10s/15s/25s
- Resolution - 720p/Pro (横竖屏)
- Model Selection - Sora 2/Sora 2 Pro
- Action Beats - 时间码场景推进
- Dialogue - 对话内容

### 时间码格式 (Action Beats)

```
[1-3s] Camera slowly pushes forward
[3-5s] Character enters from left
[5-10s] Focus shifts to background detail
```

### 预置模板

**电影模板**:
- Tokyo Night Street - 霓虹夜景
- Mountain Sunrise - 金色日出
- Portrait Close-up - 人物肖像

**商业模板**:
- Luxury Product Showcase - 高端产品
- Tech Product Demo - 科技产品

**社交媒体模板**:
- TikTok Vertical - 竖屏短视频
- Vlog Style - Vlog风格
- Instagram Reel - 快节奏Reel

**纪录片模板**:
- Nature Documentary - 自然纪录片
- Urban Exploration - 城市探索

### 导出格式

- Plain Text - 直接粘贴到Sora
- JSON - API集成
- Markdown - 文档记录

---

## 🏆 TOP 3: seedance-2-prompt-library

**项目地址**: https://github.com/gracech0322-cmd/seedance-2-prompt-library
**内容量**: 500+精选提示词 + 视频示例

### 六维提示架构 (Core Framework)

| 维度 | 核心问题 | 示例 | 可跳过 |
|------|----------|------|--------|
| **Input** | 用什么素材? | @Image1 as first frame | ✓ |
| **Content** | 发生什么? | 女孩街头跳舞，轻松活力 | ✗ 必填 |
| **Style** | 视觉/音乐风格? | 吉卜力风格，暖色调，钢琴BGM | ✓ |
| **Camera** | 如何拍摄? | 中景，慢推，平视 | ✓ |
| **Structure** | 时间线? | 0-3s开始跳舞，3-6s旋转 | ✓ |
| **Edit** | 编辑修改? | 把@video1中的猫换成狗 | ✓ |

### 多模态输入格式

```
@[Asset A] as [Use Case], @[Asset B] for [Use Case]

示例:
@Image1 as first frame, @Video1 for camera movement, @Video2 for character motion, @Audio1 for background music
```

### 时间码多镜头格式

```
0-4s: 寒冷雨夜，白猫坐在垃圾桶旁...
4-8s: 白猫突然站起，眼神从虚弱转为冷酷...
8-11s: 明亮舞厅，白猫与黑猫王子入场...
11-13s: 暹罗猫假装滑倒泼酒...
13-15s: 白猫冷静转身离开...
```

### 风格层详解

```
• Visual Style: 人像摄影+梦幻奇幻
• Lighting: 灰色侧光+伦勃朗光+上帝之光
• Color Tone: 紫色主调+暗基底+高光过曝
• Texture: 胶片颗粒+柔焦+金银首饰光泽
• Atmosphere: 优雅奢华+神秘+松弛
• Music: 前半段平静古典，后半段强节奏
```

### 镜头语言格式

```
From [Camera Angle], [Movement] to [Shot Size], using [Camera Rules]

示例:
From eye level, slow push-in to close-up, using one-take.
```

**5个核心元素**:

| 元素 | 示例 |
|------|------|
| Shot Size | 远景/中景/特写/大特写 |
| Camera Angle | 平视/高角度/低角度/POV |
| Movement | 静态/推/拉/摇/移/升降 |
| Camera Rules | 一镜到底/无剪辑/匹配剪辑 |
| Movement Speed | 慢到快/稳定/手持晃动 |

### 7种病毒式视频风格模板

1. **电影叙事风格** - 情感驱动剪辑
2. **音乐视频风格** - 节拍同步转场
3. **产品广告风格** - 高端商业质感
4. **社交媒体病毒传播** - 搞笑意外
5. **纪录片风格** - 采访+实景
6. **定格动画风格** - 微缩模型
7. **监控POV风格** - Ring/Bodycam/CCTV

### 角色一致性技巧

**多参考图方案**:
```
@Image1 as character face, @Image2 as character body, @Image3 as outfit
```

**视频参考动作**:
```
@Video1 for character motion, maintain consistent pose from @Image1
```

---

## 🏆 TOP 4: OpenMontage

**项目地址**: https://github.com/calesthio/OpenMontage
**定位**: 世界首个开源agentic视频生产系统

### 系统规模

| 指标 | 数量 |
|------|------|
| Pipelines | 12条 |
| Tools | 52个 |
| Agent Skills | 500+ |

### 核心能力

1. **真实视频创作** (非幻灯片)
   - 从免费素材库剪辑真实动态画面
   - Archive.org + NASA + Wikimedia Commons
   - Pexels + Unsplash + Pixabay

2. **Agent驱动架构**
   - 无代码编排器
   - AI编码助手 = 编排器
   - YAML manifests + Markdown skills

3. **两种渲染引擎**
   - **Remotion** (React): 数据可视化、图表、字幕
   - **HyperFrames** (HTML/GSAP): 动态排版、产品宣传

4. **免费路径**
   - Piper TTS (离线配音)
   - 免费素材库
   - 本地GPU视频生成 (Wan2.1, Hunyuan)

### 工具目录

```
tools/
├── video/        # 13个视频生成工具
├── audio/        # 4个TTS + Suno音乐
├── graphics/     # 9个图像生成工具
├── enhancement/  # 增强/抠图/调色
├── analysis/     # 转录/场景检测
├── avatar/       # Talking Head
└── subtitle/     # SRT/VTT生成
```

### 质量门控

- ffprobe验证
- 帧采样检查
- 音频级别分析
- 交付承诺验证
- 字幕检查

### 使用方式

```bash
git clone https://github.com/calesthio/OpenMontage.git
cd OpenMontage
make setup
```

在AI编码助手(Claude Code/Cursor)中：
```
"Make a 60-second animated explainer about how neural networks learn"

"Make a 75-second documentary montage about city life in the rain. Use real footage only, no narration."
```

---

## 🔧 直接可用资源汇总

### 1. Python包 (pip install)

```bash
pip install penshot          # 剧本→分镜系统
```

### 2. 在线工具

| 工具 | URL |
|------|-----|
| Sora Prompt Generator | https://sora2watermarkremover.net/sora-prompt-generator |
| PenShot Web | https://shot.pengline.cn |

### 3. GitHub仓库

| 仓库 | 用途 |
|------|------|
| story-shot-agent | 分镜生成系统 |
| sora-prompt-generator | Sora提示词模板 |
| seedance-2-prompt-library | Seedance提示词库 |
| OpenMontage | 完整视频生产系统 |

---

## 📊 对比中文技术博客

| 对比项 | 中文博客 | GitHub项目 |
|--------|----------|------------|
| 完整性 | 单篇文章片段 | 完整系统 |
| 可用性 | 需手动整理 | 直接安装使用 |
| API支持 | 无 | REST/MCP/A2A |
| 示例质量 | 理论为主 | 真实视频示例 |
| 更新频率 | 不定期 | 活跃维护 |
| 成本 | 免费 | 开源免费 |

---

## 💡 推荐使用路径

**DramaForge集成建议**:

1. **分镜生成**: 集成 `penshot` 包作为分镜生成引擎
2. **提示词模板**: 使用六维架构作为提示词模板系统
3. **视频生产**: 参考 OpenMontage 的管线架构
4. **风格预设**: 采用13种风格预设作为UI选项

---

## 📝 关键提取模板

### 分镜要素拆解表 (来自PenShot)

```json
{
  "fragment_id": "frag_XXX",
  "scene": "场景描述",
  "shot_type": "镜头类型",
  "camera_movement": "运镜",
  "duration": "时长",
  "character": "角色状态",
  "action": "动作",
  "emotion": "情绪",
  "visual_prompt": "视觉提示词",
  "audio_prompt": "音频提示词"
}
```

### 运镜模块库 (来自Seedance)

| 运镜 | 中文 | 英文 |
|------|------|------|
| Static | 静态 | Static |
| Push | 推镜头 | Zoom in |
| Pull | 拉镜头 | Zoom out |
| Pan | 横摇 | Pan left/right |
| Tilt | 纵摇 | Tilt up/down |
| Dolly | 移镜头 | Dolly in/out |
| Truck | 横移 | Truck left/right |
| Crane | 升降 | Crane up/down |
| Orbit | 环绕 | Orbit around |
| Follow | 跟随 | Follow shot |

### 景别序列模板

```
远景 → 全景 → 中景 → 近景 → 特写 → 大特写

Long Shot → Full Shot → Medium Shot → Close Shot → Close-up → Extreme Close-up
```

---

**生成时间**: 2026-04-23
**数据来源**: GitHub API + 项目README