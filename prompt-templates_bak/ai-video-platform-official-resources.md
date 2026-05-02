# AI视频平台官方资源中心汇总

> 来源：Replicate (官方推荐指南) + fal.ai + GitHub
> 整理时间：2026-04-23

---

## 🏆 Replicate官方推荐模型指南

### Text-to-Video（文生视频）推荐

#### 🎬 电影级真实感与物理精度

| 模型 | 排名 | 特点 | 价格参考 |
|------|------|------|----------|
| **Runway Gen-4.5** | #1 (Artificial Analysis榜首) | 真实物理、液体流动、发丝织物连贯 | Premium |
| **Google Veo 3.1** | #2 | 原生音频生成、高质量 | $$ |
| **Veo 3.1 Fast** | - | 快速高质量版本 | $$- |
| **Veo 3.1 Lite** | - | 高量使用便宜选项 | $ |

#### 🎭 多镜头叙事+音频

| 模型 | 最大时长 | 特点 |
|------|----------|------|
| **Kling Video 3.0** | 15s | 原生音频、口型同步、音效、环境音 |
| **Kling 3.0 Omni** | 15s | 参考图保持角色一致、视频编辑、风格迁移 |

**Multi-shot模式**：一次生成最多6个连续场景

#### 🖼️ 多模态参考输入

| 模型 | 输入上限 | 特点 |
|------|----------|------|
| **Seedance 2.0** | 9图+3视频+3音频 | T2V/I2V/视频续写/角色一致/动作迁移/口型同步 |
| **Seedance 2.0 Fast** | 同上 | 速度快、质量略降 |
| **Seedance 1.5 Pro** | - | 电影级输出、多语言口型、镜头运动 |

#### 📱 社媒快速内容

| 模型 | 生成时间 | 比例支持 |
|------|----------|----------|
| **Grok Imagine Video** | ~30s | 16:9, 9:16, 1:1 |

#### 🎯 首尾帧控制

| 模型 | 特点 | 最大时长 |
|------|------|----------|
| **Vidu Q3 Pro** | 首尾帧过渡、1080p+音频 | 16s |
| **Vidu Q3 Turbo** | 快速便宜版本 | 16s |

#### 💰 成本质量平衡

| 模型 | 特点 |
|------|------|
| **Hailuo 2.3** | T2V+I2V、标准/专业双档 |
| **Hailuo 2.3 Fast** | 快速迭代版 |
| **PixVerse v5.6** | 按单位计价 |

#### ⚡ 草稿快速迭代

| 模型 | 草稿模式 |
|------|----------|
| **PrunaAI p-video** | 预览快4×、T2V/I2V/音频生视频、1080p@48FPS |

#### 🔓 开源选项

| 模型 | 参数量 | 特点 |
|------|--------|------|
| **Wan 2.7 T2V** | 27B MoE | 最新开源旗舰 |
| **Wan 2.5 T2V** | - | 稳定版 |
| **Wan 2.5 T2V Fast** | - | 最快开源 |
| **Wan 2.5 I2V Fast** | - | 图生视频最快 |

---

## 📊 Image-to-Video（图生视频）推荐

### 🎬 电影级质量

| 模型 | 特点 |
|------|------|
| **Runway Gen-4.5** | #1排名、真实物理、细节连贯 |
| **Veo 3.1** | 原生音频、角色一致、帧间插值 |
| **Kling 3.0 Omni** | 参考生成、视频编辑、风格迁移 |

### 🖼️ 多模态参考

| 模型 | 输入能力 |
|------|----------|
| **Seedance 2.0** | 9图+3视频+3音频组合 |
| **Seedance 1.5 Pro** | 电影级、多语言口型 |

### ⚡ 速度优先

| 模型 | 生成时间 |
|------|----------|
| **Grok Imagine Video** | ~30s |
| **Hailuo 2.3 Fast** | 快速迭代 |
| **Seedance 1 Pro Fast** | 60%成本、30-60%提速 |

### 🎯 首尾帧控制

| 模型 | 功能 |
|------|------|
| **Vidu Q3 Pro** | 首尾帧过渡、1080p音频、16s |
| **Wan 2.7 I2V** | 首尾帧+续写+音频同步 |

### 🔓 开源最快

| 模型 | 运行次数 |
|------|----------|
| **Wan 2.2 I2V Fast** | 10M+运行（最便宜最快） |
| **Wan 2.5 I2V** | 音频同步 |

---

## 📋 30+视频模型完整清单

### Text-to-Video模型

| 模型 | 厂商 | 时长 | 音频 | 运行量 |
|------|------|------|------|--------|
| pixverse-v6 | PixVerse | - | ✅ | 114 |
| seedance-2.0 | ByteDance | 15s | ✅ | 83.5K |
| p-video | PrunaAI | - | ✅ | 647.9K |
| fabric-1.0 | VEED | - | ✅ | 24.1K |
| veo-3.1 | Google | - | ✅ | 451.8K |
| veo-3.1-fast | Google | - | ✅ | 580.9K |
| grok-imagine-video | xAI | ~30s | ✅ | 571.3K |
| kling-v3-omni-video | Kling | 15s | ✅ | 404.3K |
| gen-4.5 | Runway | - | - | 123.8K |
| kling-v3-video | Kling | 15s | ✅ | 158.4K |
| kling-o1 | Kling | - | - | 9.2K |
| dreamactor-m2.0 | ByteDance | - | - | 10.3K |
| pixverse-v5.6 | PixVerse | - | ✅ | 18.8K |
| sora-2-pro | OpenAI | - | ✅ | 107.9K |
| sora-2 | OpenAI | - | ✅ | 299.7K |
| wan-2.2-t2v-fast | Alibaba | - | ✅ | 266.2K |
| wan-2.5-t2v | Alibaba | - | ✅ | 34.1K |
| veo-3 | Google | - | ✅ | 228.6K |
| veo-3-fast | Google | - | ✅ | 187.1K |
| veo-2 | Google | - | - | 107.7K |
| pixverse-v4 | PixVerse | 5s/8s | - | 44.1K |
| pixverse-v4.5 | PixVerse | 5s/8s | ✅ | 258.3K |
| pixverse-v5 | PixVerse | 5-8s | ✅ | 777.9K |
| wan-2.5-t2v-fast | Alibaba | - | ✅ | 48.5K |

### Image-to-Video模型

| 模型 | 厂商 | 特点 | 运行量 |
|------|------|------|--------|
| wan-2.7-r2v | Alibaba | 参考生视频、保持身份 | 931 |
| wan-2.7-i2v | Alibaba | 首尾帧+续写+音频 | 7.5K |
| fabric-1.0 | VEED | 图片→说话视频 | 24.1K |
| wan-2.2-i2v-fast | Alibaba | 最便宜最快 | 10.4M |
| seedance-1-pro | ByteDance | 5s/10s, 480p/1080p | 1.9M |
| seedance-1-lite | ByteDance | 5s/10s, 480p/720p | 3.2M |
| motion-2.0 | Leonardo | 5s 480p | 11.1K |
| kling-v2.0 | Kling | 5s/10s 720p | 95.7K |
| kling-v1.6-pro | Kling | 5s/10s 1080p | 823.1K |
| kling-v2.1-master | Kling | 1080p高级版 | 98.5K |
| kling-v1.6-standard | Kling | 720p@30fps | 1.6M |
| kling-v2.1 | Kling | 720p/1080p I2V | 3.9M |
| modify-video | Luma | 风格迁移编辑 | 10K |
| ray-2-540p | Luma | 5s/9s 540p | 11.6K |
| ray-2-720p | Luma | 5s/9s 720p | 40.1K |
| ray-flash-2-720p | Luma | 快速版 | 48.5K |

---

## 🔧 其他AI能力集合

### Video Editing（视频编辑）

| 模型 | 功能 |
|------|------|
| luma/reframe-video | 重构图、裁剪调整 |
| luma/modify-video | 风格迁移、提示词编辑 |
| wan-2.7-videoedit | 视频编辑 |
| kling-o1 | 自然语言修改视频 |

### Lipsync（口型同步）

| 模型 | 功能 |
|------|------|
| pixverse/lipsync | 口型同步 |
| bytedance/omni-human | 全人动画 |
| heygen/lipsync-precision | 精准口型 |

### Video Enhancement（视频增强）

| 模型 | 功能 |
|------|------|
| topazlabs/video-upscale | 视频放大 |
| xai/grok-imagine-video-extension | 视频续写 |
| philz1337x/crystal-video-upscaler | 晶体视频放大 |

### 3D Models（3D内容）

| 模型 | 功能 |
|------|------|
| tencent/hunyuan-3d-3.1 | 3D对象生成 |
| hyper3d/rodin | 3D网格 |
| fishwowater/trellis2 | 3D纹理 |

---

## 💡 Replicate官方FAQ精华

### 最快模型？

```
🚀 最快选择：
- Wan fast variants（最便宜最快）
- Grok Imagine Video（~30s含音频）
- PrunaAI p-video（草稿模式快4×）
- Seedance 2.0 Fast / Seedance 1 Pro Fast
```

### 成本质量平衡？

```
💰 最佳性价比：
- Hailuo 2.3（标准/专业双档）
- PixVerse v5.6（按单位计价）
- Wan开源模型（最便宜）
```

### 最真实视频？

```
🏆 真实感巅峰：
- Runway Gen-4.5 (#1 Artificial Analysis)
- Google Veo 3.1 (原生音频)
```

### 原生音频支持？

```
🔊 音频生成模型：
- Kling Video 3.0
- Seedance 2.0
- Veo 3.1
- Grok Imagine Video
- Vidu Q3 Pro
- Wan 2.5 T2V
- PrunaAI p-video
```

### 多镜头叙事？

```
🎭 叙事能力：
- Kling 3.0（最多6场景）
- Seedance 2.0（视频续写）
```

### 视频时长？

```
⏱️ 时长范围：
- 大多数：5-15秒
- Kling/Seedance：最长15秒
- Vidu Q3 Pro：最长16秒
- 续写：Grok Imagine Video Extension
```

---

## 🎯 提示词技巧（Replicate官方建议）

### 三条核心技巧

```
✅ 具体描述 → 包含镜头运动、灯光、场景细节
✅ 低分辨率迭代 → 快速测试后全质量生成
✅ 角色一致 → 使用Kling 3.0 Omni或Seedance 2.0
```

---

## 📊 fal.ai旗舰视频模型

### Marquee Video Models

```
- Seedance 2.0（ByteDance旗舰）
- Kling Video v3
- PixVerse V6
- Nano Banana 2 / Nano Banana Pro
```

---

## 🔗 GitHub AI视频生成项目（120+仓库）

### 重磅项目

| 项目 | 特点 |
|------|------|
| **Open-Generative-AI** | 200+模型、Flux/MJ/Kling/Sora/Veo、无内容过滤 |
| **forge-film** | DAG驱动并行生成、场景依赖调度 |
| **Seedance-2.0-API** | Python wrapper |
| **seedance2-comfyui** | ComfyUI节点 |
| **timeline-studio** | 视频编辑+AI |
| **TwitCanva-Video-Workflow** | Gemini 3 + Veo 3.1 + LangGraph |
| **ai-video-generation-workflow** | 脚本+幻灯片+TTS+字幕+FFmpeg |
| **VideoGraphAI** | YouTube Shorts自动化 |
| **story-shot-agent** | 剧本→分镜→Prompt（中文） |
| **daihuo-jianshou** | 电商带货视频（中文） |
| **muapi-comfyui** | 100+模型ComfyUI节点 |
| **MaxVideoAi** | Sora/Veo/Kling/Seedance对比生成 |
| **seedance-2-prompt-library** | 500+提示词+示例 |
| **ai-ad-creative-strategist** | 企业级广告策略管线 |
| **video-notation-schema** | JSON视频提示词架构 |

---

## 📈 Artificial Analysis排行榜

### 排名查看

```
🌐 https://artificialanalysis.ai/text-to-video/arena?tab=Leaderboard

实时更新：
- 文生视频排名
- 质量对比
- 用户投票
```

---

## 🔧 DramaForge集成建议

### 模型选择策略

```python
# 根据需求选择模型

def select_video_model(requirement):
    if requirement == "cinematic_realism":
        return "runwayml/gen-4.5"  # #1排名
    elif requirement == "multi_shot_narrative":
        return "kwaivgi/kling-v3-video"  # 6场景
    elif requirement == "multimodal_reference":
        return "bytedance/seedance-2.0"  # 9图+3视频+3音频
    elif requirement == "fast_iteration":
        return "prunaai/p-video"  # 草稿快4×
    elif requirement == "cost_effective":
        return "wan-video/wan-2.2-i2v-fast"  # 最便宜
    elif requirement == "social_media":
        return "xai/grok-imagine-video"  # ~30s多比例
    else:
        return "google/veo-3.1"  # 通用高质量
```

### API集成示例

```python
import replicate

# 文生视频
output = replicate.run(
    "bytedance/seedance-2.0",
    input={
        "prompt": "电影开场镜头...",
        "duration": 15,
        "aspect_ratio": "16:9"
    }
)

# 图生视频
output = replicate.run(
    "wan-video/wan-2.5-i2v",
    input={
        "image": "https://...",
        "prompt": "角色开始说话...",
        "duration": 10
    }
)

# 多场景叙事
output = replicate.run(
    "kwaivgi/kling-v3-video",
    input={
        "shots": [
            {"prompt": "场景1...", "duration": 5},
            {"prompt": "场景2...", "duration": 5},
            {"prompt": "场景3...", "duration": 5}
        ],
        "audio": True
    }
)
```

---

## 📝 资源链接汇总

### Replicate官方资源

| 资源 | URL |
|------|-----|
| 模型集合 | https://replicate.com/collections |
| 文生视频 | https://replicate.com/collections/text-to-video |
| 图生视频 | https://replicate.com/collections/image-to-video |
| 视频编辑 | https://replicate.com/collections/video-editing |
| 口型同步 | https://replicate.com/collections/lipsync |

### fal.ai资源

| 资源 | URL |
|------|-----|
| 模型探索 | https://fal.ai/explore |
| 旗舰视频模型 | https://fal.ai/explore/marquee-video-models |

### GitHub仓库

| 仓库 | URL |
|------|-----|
| ai-video-generation | https://github.com/topics/ai-video-generation |
| storyboard | https://github.com/topics/storyboard |
| comfyui-workflow | https://github.com/topics/comfyui-workflow |

### 排行榜

| 资源 | URL |
|------|-----|
| Artificial Analysis | https://artificialanalysis.ai/text-to-video/arena |

---

**整理完成时间**：2026-04-23
**数据来源**：Replicate官方推荐指南 + fal.ai + GitHub Topics
**用途**：DramaForge视频生成模块设计参考