# AI动画工作流完整指南
> 收集整理：2026-04-23 | 用于DramaForge项目

## 🎬 动画制作完整工作流

### 标准AI动画生产流程

```
┌─────────────┐
│  1. 剧本输入 │
└─────────────┘
      ↓
┌─────────────┐
│  2. 场景分割 │
└─────────────┘
      ↓
┌─────────────┐
│  3. 分镜设计 │
└─────────────┘
      ↓
┌─────────────┐
│  4. 提示词生成 │
└─────────────┘
      ↓
┌─────────────┐
│  5. 图像生成 │
└─────────────┘
      ↓
┌─────────────┐
│  6. 图像优化 │
└─────────────┘
      ↓
┌─────────────┐
│  7. 视频合成 │
└─────────────┘
      ↓
┌─────────────┐
│  8. 音效配音 │
└─────────────┘
      ↓
┌─────────────┐
│  9. 最终输出 │
└─────────────┘
```

---

## 🔧 ComfyUI工作流节点详解

### 基础图像生成工作流

```yaml
工作流名称: basic_text2image_workflow

节点序列:
1. EmptyLatentImage - 创建空白潜空间
   参数:
   - width: 1024
   - height: 576 (16:9比例)
   - batch_size: 1
   
2. CheckpointLoaderSimple - 加载模型
   参数:
   - ckpt_name: "sdxl_base_1.0.safetensors"
   
3. CLIPTextEncode (Positive) - 正向提示词
   参数:
   - text: "[正向提示词内容]"
   - clip: [来自CheckpointLoader]
   
4. CLIPTextEncode (Negative) - 负向提示词
   参数:
   - text: "[负向提示词内容]"
   - clip: [来自CheckpointLoader]
   
5. KSampler - 采样器
   参数:
   - seed: 123456789
   - steps: 20-30
   - cfg: 7.5
   - sampler_name: "euler_ancestral"
   - scheduler: "normal"
   - denoise: 1.0
   
6. VAEDecode - VAE解码
   参数:
   - samples: [来自KSampler]
   - vae: [来自CheckpointLoader]
   
7. SaveImage - 保存图像
   参数:
   - filename_prefix: "storyboard_shot"
```

### 批量分镜生成工作流

```yaml
工作流名称: batch_storyboard_workflow

扩展节点:
1. LoadTextFile - 加载提示词文件
   参数:
   - path: "prompts/storyboard_prompts.txt"
   
2. StringSplit - 分割提示词行
   参数:
   - delimiter: "\n"
   
3. BatchCount - 设置批量数量
   参数:
   - count: [场景数量]
   
4. SeedIncrement - 种子递增(保持一致性)
   参数:
   - seed_start: 1000000
   - increment: 100
   
5. ForLoopStart - 循环开始
   
6. [基础生成工作流节点]
   
7. ForLoopEnd - 循环结束
   
8. ImageBatchToList - 批量图像输出

关键优化:
- 使用相同Seed基础 + 固定增量保持风格一致
- 批量处理减少手动操作
- 可添加IPAdapter节点保持角色面部一致
```

### 角色一致性工作流

```yaml
工作流名称: character_consistency_workflow

核心节点:
1. IPAdapterModelLoader - 加载IPAdapter模型
   参数:
   - model_name: "ip-adapter-plus_sd15"
   
2. LoadImage - 加载角色参考图
   参数:
   - image: "reference/character_ref.png"
   
3. IPAdapterApply - 应用IPAdapter
   参数:
   - weight: 0.6-0.8 (保持一致性的权重)
   - start_at: 0.0
   - end_at: 1.0
   
4. FaceIDModelLoader - 面部ID模型(可选)
   参数:
   - model_name: "faceid-plus"
   
替代方案:
- InstantID节点组 (更精确的面部控制)
- LoRA加载节点 (角色专用微调模型)
- ControlNet Reference节点 (参考图控制)
```

### 视频生成工作流

```yaml
工作流名称: image_to_video_workflow

视频节点组:
1. LoadImage - 加载起始帧
   参数:
   - image: "storyboard/shot_001.png"
   
2. VideoLinearCFGGuidance - 视频线性CFG引导
   
3. AnimateDiffModelLoader - 加载动画模型
   参数:
   - model_name: "mm_sd_v15_v2.ckpt"
   
4. AnimateDiffSampler - 动画采样器
   参数:
   - frame_count: 16-24
   - fps: 8-12
   - motion_scale: 1.0
   
5. VAEVideoDecode - 视频VAE解码
   
6. SaveVideo/SaveAnimation - 保存视频
   参数:
   - format: "gif" / "mp4" / "webm"
   - fps: 8

替代方案:
- Stable Video Diffusion (SVD)节点
- Runway Gen-2 API节点
- 可灵AI/Kling API节点
```

---

## 🎥 视频模型对比

| 模型 | 分辨率 | 时长 | 特点 | 推荐场景 |
|------|--------|------|------|---------|
| SVD | 1024x576 | 4秒 | 图生视频，高清 | 单镜头动画 |
| AnimateDiff | 512x512 | 可变 | ComfyUI集成，灵活 | 批量动画 |
| Runway Gen-3 | 最高1080p | 10秒 | 高质量，角色控制 | 专业制作 |
| 可灵AI | 最高1080p | 5秒+ | 中文友好，运动控制 | 国产首选 |
| 海螺视频 | 720p+ | 可变 | MiniMax出品，免费额度 | 快速原型 |
| Pika | 1080p | 3秒 | 简单易用 | 快速测试 |

---

## 📐 分镜到视频的转换策略

### 静态分镜 → 动态视频

```markdown
策略一: 图生视频 (Image-to-Video)
- 输入: 单张分镜图
- 输出: 短片段视频(3-5秒)
- 工具: SVD / Runway / 可灵AI
- 适用: 单镜头补充动效

策略二: 序列合成 (Sequence Compositing)
- 输入: 多张分镜图序列
- 输出: 完整场景视频
- 工具: FFmpeg / Premiere
- 适用: 快速预览/草稿

策略三: 关帧插值 (Keyframe Interpolation)
- 输入: 关键帧分镜图
- 输出: 平滑过渡动画
- 工具: EBSynth / FILM
- 适用: 细节动作动画

策略四: 完全AI生成 (Full AI Generation)
- 输入: 文字描述/参考图
- 输出: 完整视频片段
- 工具: Runway Gen-3 / 可灵AI
- 适用: 高质量完整场景
```

### 运镜效果实现

| 运镜 | 实现方法 | 提示词关键词 |
|------|---------|-------------|
| 推镜 | SVD zoom参数 | `zoom in, push in camera` |
| 拉镜 | SVD zoom反向 | `zoom out, pull out camera` |
| 摇镜 | Motion参数调整 | `pan left/right, horizontal pan` |
| 移镜 | 轨迹控制 | `tilt up/down, vertical tilt` |
| 跟拍 | Runway Motion Brush | `tracking shot, following subject` |
| 环绕 | 360度参数 | `orbit shot, circular movement` |

---

## 🎨 风格一致性控制

### 跨镜头风格统一

```yaml
风格控制参数:
1. 固定Seed系列
   - 使用seed递增: 1000000, 1000100, 1000200...
   - 保持基础风格不变
   
2. 固定模型配置
   - checkpoint: 同一基础模型
   - vae: 同一VAE解码器
   - lora: 同一风格LoRA
   
3. 固定采样参数
   - steps: 固定步数
   - cfg: 固定CFG值
   - sampler: 同一采样器
   
4. 固定提示词模板
   - 风格部分: 完全相同
   - 变量部分: 只修改场景/动作
   
示例配置:
base_seed: 1000000
model: "sdxl_base_1.0"
vae: "sdxl_vae"
lora: "anime_style_v1"
style_prompt: "anime art style, cinematic lighting, detailed, high quality 8k"
variable_prompt: "[场景描述], [动作描述]"
```

### 角色一致性方案对比

| 方案 | 一致性程度 | 复杂度 | 适用场景 |
|------|-----------|--------|---------|
| 固定Seed + 描述 | 中 | 低 | 简单场景 |
| IPAdapter | 高 | 中 | 一般角色 |
| InstantID | 极高 | 高 | 专业制作 |
| LoRA微调 | 最高 | 最高 | 长期项目 |
| Nano Banana + IPAdapter | 高 | 中 | 推荐组合 |

---

## 🔄 自动化批量处理

### Python自动化脚本模板

```python
# batch_storyboard_generator.py

import json
import os
from pathlib import Path

class BatchStoryboardGenerator:
    """批量分镜生成器"""
    
    def __init__(self, config_path):
        self.config = self.load_config(config_path)
        self.template = self.load_prompt_template()
        
    def load_config(self, path):
        with open(path, 'r') as f:
            return json.load(f)
    
    def generate_scene_prompts(self, script_data):
        """从剧本生成场景提示词"""
        prompts = []
        for scene in script_data['scenes']:
            prompt = self.build_prompt(scene)
            prompts.append(prompt)
        return prompts
    
    def build_prompt(self, scene_data):
        """构建完整提示词"""
        # 五维架构
        subject = scene_data.get('subject', '')
        environment = scene_data.get('environment', '')
        action = scene_data.get('action', '')
        emotion = scene_data.get('emotion', '')
        technical = scene_data.get('technical', '')
        
        # 组合提示词
        full_prompt = f"""
        {subject}, {action}, {environment}, {emotion},
        {technical}, {self.template['style_suffix']}
        """
        return full_prompt.strip()
    
    def export_to_comfyui_format(self, prompts, output_path):
        """导出为ComfyUI可读格式"""
        with open(output_path, 'w') as f:
            for i, prompt in enumerate(prompts):
                f.write(f"{i+1}|{prompt}\n")

# 使用示例
generator = BatchStoryboardGenerator('config/storyboard_config.json')
prompts = generator.generate_scene_prompts(script_data)
generator.export_to_comfyui_format(prompts, 'output/storyboard_prompts.txt')
```

### 配置文件模板

```json
// storyboard_config.json
{
  "project_name": "DramaForge_Test",
  "base_settings": {
    "model": "sdxl_base_1.0",
    "vae": "sdxl_vae",
    "lora": ["anime_style_v1", "character_lora"],
    "resolution": {
      "width": 1024,
      "height": 576
    },
    "aspect_ratio": "16:9"
  },
  "generation_settings": {
    "steps": 25,
    "cfg": 7.5,
    "sampler": "euler_ancestral",
    "scheduler": "normal",
    "seed_base": 1000000,
    "seed_increment": 100
  },
  "style_settings": {
    "style_suffix": "anime art style, cinematic lighting, detailed background, high quality 8k, masterpiece",
    "negative_prompt": "low quality, blurry, distorted, bad anatomy, watermark, text"
  },
  "character_references": {
    "char_001": {
      "name": "主角A",
      "description": "short black hair, blue eyes, red hoodie",
      "reference_image": "ref/char_001.png",
      "ipadapter_weight": 0.7
    }
  }
}
```

---

## 📊 资源消耗与时间估算

### 各环节时间参考

| 环节 | 单次时间 | 批量(10个) | 备注 |
|------|---------|-----------|------|
| 提示词生成 | 1-2秒 | 10-20秒 | 自动化 |
| SD图像生成 | 15-30秒 | 150-300秒 | GPU依赖 |
| 图生视频 | 30-60秒 | 300-600秒 | 视频模型 |
| 后处理优化 | 5-10秒 | 50-100秒 | 可选 |
| 音效合成 | 10-20秒 | 100-200秒 | TTS+配乐 |

### GPU需求参考

| 任务 | 最小显存 | 推荐显存 | 优化方案 |
|------|---------|---------|---------|
| SD1.5图像 | 4GB | 8GB | xFormers加速 |
| SDXL图像 | 8GB | 12GB | 分块生成 |
| SVD视频 | 8GB | 16GB | 降低帧数 |
| AnimateDiff | 6GB | 10GB | 降低分辨率 |

---

## 🌐 推荐API替代方案

### 国内API推荐

| 服务 | 提供商 | 特点 | 价格参考 |
|------|--------|------|---------|
| 可灵AI视频 | 快手 | 中文友好，运动控制 | 免费额度+付费 |
| 海螺视频 | MiniMax | 免费额度充足 | 免费为主 |
| 智谱GLM-5 | 智谱AI | 专为Claw优化 | 免费API额度 |
| 百川模型 | 百川智能 | 中文能力强 | 免费额度 |
| Kimi K2 | Moonshot | 长文本理解 | 免费额度 |

### 国际API推荐

| 服务 | 提供商 | 特点 | 价格参考 |
|------|--------|------|---------|
| Replicate | Replicate | 多模型托管 | 按次付费 |
| Runway Gen-3 | Runway | 高质量视频 | 订阅制 |
| Stability AI | Stability | SD官方API | 按次付费 |

---

## 📚 工作流学习资源

### ComfyUI资源
- 官方文档: https://docs.comfy.org
- 工作流模板库: https://comfy.org/workflows
- GitHub仓库: https://github.com/Comfy-Org/ComfyUI
- 社区Discord: https://discord.com/invite/comfyorg

### 教程资源
- ComfyUI_examples: https://comfyanonymous.github.io/ComfyUI_examples/
- RunComfy教程: https://runcomfy.com
- Boords分镜教程: https://boords.com/how-to-storyboard

---

## 💡 最佳实践总结

### 工作流优化建议
1. **模板化** - 建立可复用的工作流模板
2. **自动化** - 使用脚本减少手动操作
3. **批量化** - 合理安排批量处理
4. **版本化** - 保存工作流版本便于迭代
5. **文档化** - 记录参数和效果对应关系

### 常见问题解决
1. **风格不一致** - 固定Seed/使用IPAdapter
2. **角色变形** - 添加InstantID/面部LoRA
3. **画质不足** - 增加steps/使用upscale节点
4. **生成速度慢** - 启用xFormers/降低分辨率
5. **内存不足** - 使用CPU offload/分块生成

---

*此工作流指南将持续更新，结合实际项目需求灵活调整*