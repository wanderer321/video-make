# 分镜提示词模板库
> 收集整理：2026-04-23 | 用于DramaForge项目

## 🎬 核心分镜提示词架构

### 五维提示词架构法 (5-Dimensional Prompt Architecture)

**五维模型：**
1. **主体维度 (Subject)** - 人物/角色描述
2. **环境维度 (Environment)** - 场景/背景设定
3. **动作维度 (Action)** - 动态行为/运动轨迹
4. **情感维度 (Emotion)** - 氛围/情绪基调
5. **技术维度 (Technical)** - 镜头语言/构图参数

---

## 📐 分镜脚本提示词模板

### 标准分镜模板结构

```yaml
shot:
  id: "SC01_SH001"
  type: "wide_shot" | "medium_shot" | "close_up" | "extreme_close_up"
  angle: "high_angle" | "low_angle" | "eye_level" | "dutch_angle"
  movement: "static" | "pan" | "tilt" | "dolly" | "tracking" | "crane"
  duration: "3s" | "5s" | "10s"
  
  # 五维描述
  subject:
    character: "角色名称"
    pose: "站立/坐姿/奔跑"
    expression: "表情描述"
    clothing: "服装细节"
  
  environment:
    location: "场景地点"
    time: "白天/夜晚/黄昏"
    weather: "晴朗/雨天/雪天"
    lighting: "自然光/人造光/混合"
  
  action:
    primary: "主要动作"
    secondary: "次要动作"
    camera_motion: "镜头运动描述"
  
  emotion:
    mood: "氛围基调"
    tension: "紧张程度 (0-10)"
    color_palette: "色彩倾向"
  
  technical:
    aspect_ratio: "16:9" | "2.39:1" | "9:16" | "1:1"
    depth_of_field: "deep" | "shallow"
    focus_point: "焦点位置"
```

---

## 🎥 镜头类型提示词库

### 景别提示词

| 景别 | 英文提示词 | 中文描述 | 适用场景 |
|------|-----------|---------|---------|
| 远景 | `extreme wide shot, establishing shot` | 建立场景，展示环境 | 场景开场 |
| 全景 | `full shot, wide shot` | 全身可见，环境为主 | 人物出场 |
| 中景 | `medium shot, waist up` | 半身镜头 | 对话场景 |
| 近景 | `close up shot, head and shoulders` | 头肩特写 | 情绪表达 |
| 特写 | `extreme close up, detail shot` | 极近距离 | 细节强调 |
| 过肩 | `over the shoulder shot, OTS` | 背对观众视角 | 对话切换 |

### 角度提示词

| 角度 | 英文提示词 | 中文描述 | 情感效果 |
|------|-----------|---------|---------|
| 平视 | `eye level angle, neutral angle` | 正常视角 | 真实感 |
| 俯视 | `high angle, overhead shot, bird's eye view` | 从上往下 | 压迫感 |
| 仰视 | `low angle, upward shot` | 从下往上 | 崇高感 |
| 斜角 | `dutch angle, tilted angle` | 斜构图 | 不安定感 |
| 第一人称 | `POV shot, point of view` | 主观视角 | 代入感 |

### 运镜提示词

| 运镜 | 英文提示词 | 中文描述 | 技术要点 |
|------|-----------|---------|---------|
| 推镜 | `push in, zoom in, dolly in` | 镜头靠近 | 情绪强化 |
| 拉镜 | `pull out, zoom out, dolly out` | 镜头远离 | 信息扩展 |
| 摇镜 | `pan left/right, horizontal pan` | 水平旋转 | 场景扫描 |
| 移镜 | `tilt up/down, vertical tilt` | 垂直旋转 | 高度展示 |
| 跟拍 | `tracking shot, follow shot` | 跟随移动 | 动态跟随 |
| 环绕 | `orbit shot, circular dolly` | 围绕主体 | 360度展示 |
| 手持 | `handheld shot, shaky cam` | 模拟手持 | 真实感/紧张 |

---

## 🖼️ 图像生成提示词模板

### SD/Midjourney风格分镜提示词

```
[主体描述], [动作状态], [场景环境], [光线时间], [镜头参数], [艺术风格], [画质参数]

示例模板：
"A young woman with flowing red hair, standing at the edge of a cliff, 
windy stormy sky with dramatic clouds, golden hour sunset lighting,
wide establishing shot, cinematic composition, 2.39:1 aspect ratio,
anime art style, high quality, detailed, 8k"
```

### 宫格式分镜提示词

```
# 4宫格分镜
Panel 1: [开场镜头] - establishing shot, wide angle
Panel 2: [人物介绍] - medium shot, character introduction  
Panel 3: [动作展示] - action shot, dynamic pose
Panel 4: [情绪收尾] - close up, emotional expression

# 6宫格分镜 (完整场景)
Panel 1: 场景建立 - establishing the location
Panel 2: 人物出场 - character enters frame
Panel 3: 互动开始 - interaction begins
Panel 4: 冲突/高潮 - conflict/climax moment  
Panel 5: 反应镜头 - reaction shot
Panel 6: 场景收尾 - scene conclusion

# 8宫格分镜 (详细叙事)
Panel 1-2: 场景铺垫 + 人物引入
Panel 3-4: 动作展开 + 冲突建立
Panel 5-6: 高潮展示 + 情绪渲染
Panel 7-8: 结局 + 转场提示
```

---

## 🎭 角色一致性提示词技巧

### 保持角色一致的提示词结构

```
[固定角色描述] + [可变场景/动作]

固定部分示例：
"Same character: a young girl with short black hair, 
blue eyes, wearing a red hoodie, anime style"

可变部分：
- Scene 1: "standing in a classroom, medium shot"
- Scene 2: "running through a rainy street, action shot"
- Scene 3: "crying at sunset, close up emotional shot"

技术方案：
- 使用Seed固定 + LoRA角色模型
- 使用IP-Adapter / InstantID面部一致性
- 使用Reference Image作为控制参考
```

---

## 🌟 情绪氛围提示词库

### 基础情绪关键词

| 情绪 | 英文提示词 | 中文关键词 | 色调倾向 |
|------|-----------|---------|---------|
| 快乐 | `joyful, happy, cheerful, bright, sunny` | 欢快/明媚 | 明亮暖色 |
| 悲伤 | `sad, melancholic, sorrowful, gloomy` | 悲伤/忧郁 | 冷色/灰色 |
| 紧张 | `tense, suspenseful, nervous, anxious` | 紧张/不安 | 暗色/高对比 |
| 恐惧 | `fearful, scary, horror, eerie` | 恐怖/诡异 | 暗色/冷调 |
| 激动 | `exciting, thrilling, energetic, dynamic` | 激动/活力 | 高饱和 |
| 平静 | `peaceful, calm, serene, tranquil` | 平静/安宁 | 柔和色 |
| 愤怒 | `angry, furious, rage, intense` | 愤怒/激烈 | 红色/橙色 |

### 时间氛围关键词

| 时间 | 英文提示词 | 中文描述 | 光线特征 |
|------|-----------|---------|---------|
| 清晨 | `early morning, dawn, sunrise` | 清晨/黎明 | 金色柔光 |
| 正午 | `midday, noon, bright daylight` | 正午/白天 | 强烈阳光 |
| 黄昏 | `golden hour, sunset, dusk` | 黄昏/日落 | 金橙暖光 |
| 夜晚 | `night, midnight, dark` | 夜晚/深夜 | 月光/人造光 |
| 雨天 | `rainy, stormy, overcast` | 雨天/阴天 | 柔和漫射 |

---

## 🔧 ComfyUI/SD工作流节点模板

### 基础文生图工作流

```
节点链路：
CLIPTextEncode (Positive) → 
CLIPTextEncode (Negative) → 
KSampler → 
VAEDecode → 
SaveImage

关键参数：
- Steps: 20-50 (SDXL推荐20-30)
- CFG Scale: 7-15 (默认7-8)
- Sampler: euler_ancestral / dpmpp_2m
- Scheduler: normal / karras
```

### 分镜批量生成工作流

```
批量生成节点：
1. LoadPromptsFromFile - 从文件加载提示词列表
2. IterateBatch - 批量迭代
3. SeedIncrement - 种子递增保持一致性
4. ParallelExecution - 并行执行加速

优化建议：
- 使用EmptyLatentImage预设分辨率
- 使用LoraLoader加载风格/角色模型
- 使用IPAdapter保持面部一致性
```

---

## 📚 推荐资源链接

### 分镜模板下载
- Boords模板: https://boords.com/storyboard-template
- StudioBinder: https://www.studiobinder.com/blog/downloads/storyboard-template/

### 提示词工程学习
- Prompting Guide: https://promptingguide.ai
- DeepLearning.AI课程: https://learn.deeplearning.ai/courses/prompt-engineering
- WayToAGI中文提示词库: https://www.waytoagi.com/prompts

### AI图像生成平台
- ComfyUI官方文档: https://docs.comfy.org
- Stable Diffusion GitHub: https://github.com/CompVis/stable-diffusion
- AUTOMATIC1111 WebUI: https://github.com/AUTOMATIC1111/stable-diffusion-webui

### 分镜专业工具
- Boords (11年经验, 1M+故事板): https://boords.com
- StudioBinder (电影级协作): https://www.studiobinder.com
- Storyboard That (3000+教案): https://www.storyboardthat.com

---

## 📝 快速使用指南

### 从剧本生成分镜提示词的流程

1. **解析剧本** - 提取场景、人物、动作、对话
2. **场景分割** - 按叙事节奏划分镜头
3. **景别分配** - 根据情节需要选择镜头类型
4. **五维填充** - 完成主体/环境/动作/情感/技术描述
5. **提示词生成** - 组合成完整提示词
6. **批量生成** - 使用工作流批量产出分镜图

### 提示词优化技巧

- 使用`(emphasis:1.2)`增强关键词权重
- 使用`[from:to:when]`实现动态切换
- 使用`AND`组合多个概念
- 使用Negative Prompt排除不需要的元素
- 使用Seed+ControlNet保持一致性

---

*此模板库将持续更新，建议定期同步最新资源*