# 主流AI视频模型官方提示词范例汇编

> **来源**: Seedance/可灵/Veo官方文档与博客
> **特色**: 高质量官方范例 + 性能对比数据
> **状态**: 🆓🇺🇸🇨🇳✅ (官方权威资源)

---

## 📊 三大模型官方总览

| 模型 | 公司 | 官网 | 特色 |
|------|------|------|------|
| **Veo 3** | Google DeepMind | deepmind.google/models/veo | 原生音频+扩展视频+最高评分 |
| **Kling 3.0** | 快手 | klingai.com | 视频3.0系列+多模态深度解析 |
| **Seedance 2.0** | 字节跳动 | 即梦/豆包/火山方舟 | 音画同步+中文+方言 |

---

## 🎬 Veo 3 官方提示词范例 (Google DeepMind)

### 官方完整提示词示例

```
Veo 3 官方范例:

Prompt: A medium shot opens on a seasoned, grey-bearded man in sunglasses 
and a paisley shirt, his gaze fixed off-camera with a contemplative 
expression. His gold chain glints subtly. Beside him, a younger man in 
a tank top, also looking forward, suggests a shared moment of observation 
or reflection. The camera slowly pushes in, subtly emphasizing their 
quiet focus. In the background, a vibrant mural splashes across a wall, 
hinting at an urban setting. Faint city murmurs and distant chatter 
drift in, accompanied by a mellow, soulful hip-hop beat that adds a 
contemplative yet grounded atmosphere. "The city always got a story," 
the older man murmurs, a slight nod of his head. "Just gotta listen."
```

#### 提示词结构分析

| 要素 | 内容 | 位置 |
|------|------|------|
| **景别** | Medium shot | 开头明确 |
| **主体** | Grey-bearded man + younger man | 详细描述 |
| **服装** | Sunglasses + paisley shirt + gold chain + tank top | 视觉细节 |
| **动作** | Gaze fixed off-camera + contemplative expression | 情绪表达 |
| **运镜** | Camera slowly pushes in | 动态控制 |
| **背景** | Vibrant mural + urban setting | 环境设定 |
| **音频** | City murmurs + distant chatter + hip-hop beat | 原生音频 |
| **台词** | "The city always got a story..." | 对白设计 |

---

### Veo 3 核心能力

| 能力 | 描述 | 优势 |
|------|------|------|
| **原生音频生成** | Sound effects + ambient noise + dialogue | 音画同步 |
| **扩展视频** | Extended videos | 更长时长 |
| **真实物理** | Real world physics | 更高真实度 |
| **提示词遵循** | Improved prompt adherence | 更精准响应 |
| **创意控制** | New levels of control + consistency | 更高可控性 |

---

### Veo 3 性能数据 (官方基准测试)

#### Text-to-Video (T2V)

| 指标 | Veo 3.1表现 | 对比 |
|------|------------|------|
| **Overall Preference** | Best on MovieGenBench | 1003 prompts |
| **Text Alignment** | Best prompt following | 1003 prompts |
| **Visual Quality** | Best visual quality | 1003 prompts |
| **Visually Realistic Physics** | Best physics | Physics subset |

#### Image-to-Video (I2V)

| 指标 | Veo 3表现 | 对比 |
|------|----------|------|
| **Overall Preference** | Preferred overall | 355 pairs (VBench I2V) |
| **Text Alignment** | Best capturing intent | 355 pairs |
| **Visual Quality** | Best visual quality | 355 pairs |

#### Text-to-Video-and-Audio (T2VA)

| 指标 | Veo 3.1表现 | 对比 |
|------|------------|------|
| **Audio Visual Overall Preference** | Preferred overall | 527 prompts |
| **Audio-Video Alignment** | Best synchronized | 527 prompts |

#### Ingredients-to-Video

| 能力 | Veo表现 | 数据 |
|------|--------|------|
| **Overall Preference** | State-of-the-art | 80 examples |
| **Visual Quality** | State-of-the-art | 80 examples |
| **Scene Extension** | Best Overall/Alignment/Quality | 106 examples |
| **First & Last Frame** | Best Overall/Alignment/Quality | 124 examples |
| **Object Insertion** | Best Overall/Quality | 124 examples |

---

### Veo 3 官方应用案例

| 公司 | 应用 | 描述 |
|------|------|------|
| **Promise Studios** | MUSE Platform | Generative storyboarding + previs |
| **Volley** | Wit's End RPG | Static cinematics + dynamic assets |
| **OpusClip** | Agent Opus | Motion graphics + promotional videos |

---

### Veo 3 使用平台

```
官方接入渠道:
- Gemini (Google AI)
- Flow (AI filmmaking tool)
- Google Vids (AI-powered video creation)
- Google AI Studio (prompt to production)
- Gemini API (building with cutting-edge AI)
- Vertex AI Studio (enterprise generative AI)
```

---

## 🎨 可灵 (Kling) 3.0 官方信息

### 官网核心描述

```
视频 3.0 系列模型:

基于全面升级的底层架构，视频 3.0 和 视频 3.0 Omni 
原生支持多模态指令的深度解析与跨任务融合，
重构光影与声音的叙事逻辑。

核心能力:
- 超长视频的精准分镜
- 音画同步的特征解耦
- 视觉主体与听觉音色的双重绑定
- 复杂场景的跨时空调度
- 高自由度、高一致性的创作体验
```

### Kling 3.0 特点

| 能力 | 描述 |
|------|------|
| **多模态深度解析** | 跨任务融合 |
| **光影重构** | 声音叙事逻辑 |
| **精准分镜** | 超长视频支持 |
| **音画同步** | 特征解耦技术 |
| **双重绑定** | 视觉主体+听觉音色 |
| **跨时空调度** | 复杂场景处理 |

---

## 📹 Seedance 2.0 官方信息

### 已收集的官方资源回顾

| 来源 | 文件位置 | 内容 |
|------|---------|------|
| **GitHub官方库** | `seedance-video-prompts-supplement.md` | 500+提示词 |
| **GitHub项目** | `github-chinese-storyboard-projects.md` | seedance-2-prompt-library |
| **优设网实测** | `uisdc-professional-resources.md` | Seedance 1.5 Pro实测 |
| **火山方舟** | `platform-specific-templates.md` | 官方平台信息 |

### Seedance 2.0 官方特色 (汇总)

| 能力 | 描述 | 来源 |
|------|------|------|
| **六维提示架构** | Input/Content/Style/Camera/Structure/Edit | GitHub库 |
| **音画同步** | 唇形一致+多分镜同步 | 优设实测 |
| **中文+方言** | 粤语/四川/上海/东北/台湾腔 | 优设实测 |
| **情感表现力** | 嘴角颤抖/冷哼/眼神变化 | 优设实测 |
| **时间码格式** | Shot 1/Shot 2结构 | GitHub库 |
| **可跳过维度** | 非必要维度标注 | GitHub库 |

---

## 🔥 官方提示词对比分析

### 三模型提示词风格对比

| 模型 | 提示词风格 | 优势 |
|------|-----------|------|
| **Veo 3** | 电影级详细描述+音频+台词 | 原生音频+最高评分 |
| **Kling 3.0** | 多模态融合+光影重构 | 超长视频+分镜 |
| **Seedance 2.0** | 六维架构+中文方言 | 中文创作+音画同步 |

### 提示词结构差异

```
Veo 3 官方风格:
- 景别明确开头
- 主体详细描述 (服装/表情/动作)
- 运镜控制
- 环境设定 (背景/氛围)
- 音频描述 (环境音+音乐+台词)
- 对白内容完整
→ 电影级完整叙事

Kling 3.0 官方风格:
- 多模态指令融合
- 光影+声音叙事
- 分镜精准控制
- 跨时空调度
→ 超长视频创作

Seedance 2.0 官方风格:
- 六维架构标注
- 中文+方言优势
- 时间码分镜结构
- 可跳过维度标注
→ 中文创作友好
```

---

## 📝 官方提示词模板提取

### Veo 3 模板结构

```yaml
# Veo 3 官方提示词模板

景别: Medium shot (中景)
主体: 
  - 人物1: seasoned, grey-bearded man
  - 人物2: younger man
服装:
  - sunglasses
  - paisley shirt
  - gold chain
  - tank top
表情:
  - contemplative expression
  - gaze fixed off-camera
运镜: Camera slowly pushes in
背景: 
  - vibrant mural
  - urban setting
音频:
  - faint city murmurs
  - distant chatter
  - mellow, soulful hip-hop beat
台词:
  - "The city always got a story..."
  - "Just gotta listen."
动作: slight nod of his head
```

### Seedance 2.0 六维模板 (回顾)

```yaml
# Seedance 2.0 六维架构

Input: @Image1 as first frame (可选)
Content: 女孩街头跳舞，轻松活力
Style: 吉卜力风格，暖色调
Camera: 中景，慢推，平视
Structure: 0-3s开始，3-6s旋转 (时间码)
Edit: 把猫换成狗 (可选修改)

注: 非必要维度可跳过标注
```

### Kling 3.0 多模态模板 (推测)

```yaml
# Kling 3.0 多模态融合模板

文本指令: 分镜描述
图像指令: 参考图风格
音频指令: 光影叙事逻辑
融合策略: 跨任务融合
时长控制: 超长视频分镜
一致性控制: 视觉主体+听觉音色双重绑定
```

---

## 🔗 官方资源链接汇总

### Veo 3 (Google DeepMind)

```
官网: https://deepmind.google/models/veo/
性能数据: 官网Showcase部分
使用平台:
  - Gemini: gemini.google.com
  - Flow: flow.google.com
  - Google AI Studio: aistudio.google.com
  - Vertex AI: cloud.google.com/vertex-ai
```

### Kling 3.0 (快手)

```
官网: https://klingai.com
文档: https://klingai.com/docs
模型: 视频 3.0 + 视频 3.0 Omni
特色: 多模态指令深度解析
```

### Seedance 2.0 (字节跳动)

```
平台接入:
- 即梦: jimeng.jianying.com
- 豆包: doubao.com
- 火山方舟: volcengine.com/docs/6791/1341667

GitHub官方库:
- seedance-2-prompt-library (500+提示词)

API预约: volcengine.com/ark/vision?launch=seedance
```

---

## 🎯 DramaForge集成建议

### 🔴 高优先级参考

1. **Veo 3提示词结构** → 电影级提示词模板设计
2. **Veo 3原生音频** → 音画同步系统设计
3. **Veo 3性能基准** → 质量评估标准参考
4. **Seedance六维架构** → 中文提示词模板

### 🟡 中优先级参考

5. **Kling多模态融合** → 多输入融合方案
6. **Kling超长视频分镜** → 分镜切割算法
7. **Seedance方言能力** → 中文配音方案
8. **官方应用案例** → 商业化路径参考

### 🟢 低优先级参考

9. **Veo 3台词设计** → 对白系统参考
10. **Kling光影叙事** → 视觉风格参考
11. **官方平台接入** → API集成参考

---

## 💡 官方提示词价值总结

### Veo 3 官方范例价值

**最高评分模型**:
- MovieGenBench 1003 prompts测试
- VBench I2V 355 pairs测试
- Overall Preference最佳
- Text Alignment最佳
- Visual Quality最佳

**提示词结构完整**:
- 景别+主体+服装+表情+运镜+背景+音频+台词
- 电影级叙事逻辑
- 原生音频生成能力

### Kling 3.0 官方特色

**技术突破**:
- 多模态指令深度解析
- 光影声音叙事重构
- 超长视频精准分镜
- 视觉听觉双重绑定

### Seedance 2.0 官方优势

**中文创作独一档**:
- 六维架构标准化
- 中文+方言能力
- 音画同步影视级
- 500+官方提示词库

---

## 📊 官方基准数据汇总

| 模型 | 基准测试 | 数据量 | 排名 |
|------|---------|--------|------|
| **Veo 3.1** | MovieGenBench | 1003 prompts | #1 Overall |
| **Veo 3** | VBench I2V | 355 pairs | #1 Overall |
| **Veo 3.1** | T2VA | 527 prompts | #1 Audio Sync |
| **Veo 3.1** | Physics | Subset | #1 Realistic Physics |
| **Veo 3** | Ingredients-to-Video | 80 examples | SOTA |
| **Veo 3** | Scene Extension | 106 examples | SOTA |
| **Veo 3** | First & Last Frame | 124 examples | SOTA |

---

> **文件创建时间**: 2026-04-23
> **数据来源**: Veo/Kling/Seedance官方文档与博客
> **文件大小**: ~11KB
> **状态标注**: 🆓官方免费 | 🇺🇸🇨🇳双语 | ✅权威来源