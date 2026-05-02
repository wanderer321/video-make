# 传统分镜模板：夯实基础的框架文件

> 来源：Boords (500,000+专业用户) + StudioBinder + 行业标准实践
> 整理时间：2026-04-23

---

## 📚 什么是分镜模板？

**定义**：分镜模板是预先格式化的文档，包含按顺序排列的空白面板。每个面板代表场景或镜头，用于：

- 绘制视觉草图
- 编写对话和旁白
- 标注镜头方向
- 记录时间码

**核心作用**：模板处理布局，你专注创意。

---

## 🎬 分镜模板核心要素

### 必备字段

| 字段 | 作用 | 示例 |
|------|------|------|
| **Frame Number** | 面板编号 | 010, 020, 030 |
| **Visual Panel** | 画面区域 | 绘制草图 |
| **Action Notes** | 动作描述 | "角色从左侧进入" |
| **Dialogue** | 对话内容 | "你好，请问..." |
| **Camera Direction** | 镜头方向 | PAN, TILT, ZOOM |
| **Duration** | 时长 | 3s, 5s |
| **Scene/Shot ID** | 场景镜头号 | Scene 1, Shot 2 |

### 核心术语表

| 术语 | 定义 |
|------|------|
| **Aspect Ratio** | 宽高比，定义画面形状（16:9, 2.39:1） |
| **Frame** | 单个面板，代表一个时刻 |
| **Shot** | 一系列连续动作，由多个Frame组成 |
| **Scamps** | 初期草图，粗糙、原始 |
| **Script** | 剧本，分镜的起点 |
| **Shot List** | 镜头清单，详细描述每个镜头 |
| **Voiceover** | 旁白，非画中人朗读 |
| **Dialogue** | 对话，角色之间的交谈 |
| **Style Frame** | 定色帧，确立整体视觉风格 |
| **Sound Effects** | 音效，增强现实感的声音 |
| **Animatic** | 动态分镜，图片序列+音轨 |

---

## 📐 比例与面板选择指南

### Aspect Ratio（宽高比）

| 比例 | 最佳用途 | 模板特点 |
|------|----------|----------|
| **16:9** (Widescreen) | YouTube、电视、企业视频 | 水平面板，最常用 |
| **2.39:1** (Cinemascope) | 电影、大片 | 超宽面板，镜头注释空间大 |
| **9:16** (Vertical) | TikTok、Reels、Shorts | 竖向面板，竖屏内容 |
| **1:1** (Square) | Instagram、社媒广告 | 方形面板，紧凑易打印 |

### Panel Count（面板数量）

| 面板数 | 适用场景 | 特点 |
|--------|----------|------|
| **4 panels** | 快速概览、简单序列 | 大面板，草图空间充足 |
| **6 panels** | 标准选择，大多数项目 | 平衡细节与页面效率 |
| **8-12 panels** | 详细序列、动画、快切 | 小面板，一页完整场景 |

**建议**：
- 新手 → 4或6面板
- 进阶 → 8-12面板

---

## 🎥 电影分镜模板

### 特点

- 宽比例（2.39:1 或 16:9）
- 详细镜头描述空间
- 摄影机运动注释
- 场景/镜头编号匹配拍摄剧本

### 必备内容

```
每个电影分镜面板包含：

┌─────────────────────────────────┐
│  Scene: 1  │  Shot: 010         │
│  Duration: 4s                    │
├─────────────────────────────────┤
│                                  │
│      [画面绘制区域]              │
│                                  │
│                                  │
├─────────────────────────────────┤
│  Shot Type: Wide establishing    │
│  Camera: Slow push-in            │
│  Angle: Eye level                │
├─────────────────────────────────┤
│  Action: 角色从左侧走进画面      │
│                                  │
│  Dialogue: "好久不见..."         │
└─────────────────────────────────┘
```

### 镜头类型标注

| Shot Type | 中文 | 用途 |
|-----------|------|------|
| Wide Shot | 远景 | 确立场景 |
| Full Shot | 全景 | 展示全身 |
| Medium Shot | 中景 | 胸部以上 |
| Close Shot | 近景 | 脸部为主 |
| Close-up | 特写 | 细节情感 |
| Extreme Close-up | 大特写 | 眼睛/物品 |
| POV | 主观视角 | 角色视角 |
| Over-the-shoulder | 过肩镜头 | 对话场景 |

---

## 📹 视频分镜模板

### 适用项目

- YouTube内容
- 企业宣传片
- 社交媒体广告
- 解释性视频

### 特点

**比例灵活**：
- 16:9 → YouTube/演示
- 9:16 → TikTok/Reels
- 1:1 → Instagram

### 核心功能

```
视频分镜模板帮助你：

1. 提前规划镜头 → 减少废片和重拍
2. 团队视觉方向一致 → 制作前确认
3. 客户审批 → 清晰的共享文档
4. 屏幕文字/图形 → 规划叠加内容
```

### 示例结构

```yaml
Video Storyboard Panel:
  frame_id: "VID_001"
  duration: "5s"
  aspect_ratio: "16:9"
  content:
    visual: "产品展示在桌面"
    text_overlay: "品牌Logo + 功能说明"
    b_roll: "使用场景切换"
  audio:
    narration: "这款产品改变了..."
    music: "轻快背景音乐"
  camera:
    type: "Medium close-up"
    movement: "Static"
```

---

## 🎨 动画分镜模板

### 为什么需要更多细节？

> **动画每一帧都是绘制/渲染的，没有摄影机可以指向现场。**

### 必备规划内容

| 内容 | 说明 |
|------|------|
| **Key Poses** | 关键姿势，定义动作节点 |
| **In-between Frames** | 过渡帧，连接姿势 |
| **Timing/Frame Counts** | 时间/帧数，每个镜头的帧数 |
| **Motion Paths** | 运动路径，元素移动轨迹 |
| **Expression Notes** | 表情注释，角色表情变化 |
| **Background Details** | 背景细节，环境元素 |

### 动画分镜标注系统

```
┌─────────────────────────────────┐
│  Frame: 24-48 (2s @ 24fps)      │
├─────────────────────────────────┤
│                                  │
│      [角色姿势A]                 │
│         ↓                        │
│      [运动路径箭头]              │
│         ↓                        │
│      [角色姿势B]                 │
│                                  │
├─────────────────────────────────┤
│  Key Pose: 举起手臂              │
│  Motion: 手臂向上移动90°         │
│  Expression: 微笑 → 惊讶         │
│  BG: 城市背景，黄昏              │
├─────────────────────────────────┤
│  Timing: 0-12帧手臂上升          │
│          13-24帧表情变化         │
│          25-48帧镜头过渡         │
└─────────────────────────────────┘
```

---

## 🖌️ Scamping（草图阶段）

### 定义

> **Scamping = 粗糙、凌乱、原始的分镜形式**
> 目标：快速表达想法，不考虑视觉风格

### Scamping指南

```
✅ DO:
- 选择比例（16:9/9:16）
- 保持粗糙（这是给自己看的）
- 快速迭代（修改脚本，确保连贯）
- 检查连贯性（上一个镜头的泥裤，下一个也要脏）

❌ DON'T:
- 过度精细（不是艺术品）
- 停滞不前（发现问题就修改脚本）
- 忽略时间逻辑（时间跳跃/逻辑断层）
```

### 剪影检查法

```
方法：去掉所有细节线稿，只看剪影

目的：检查动作是否清晰易懂

如果剪影看不懂 → 说明动作构图有问题
```

---

## 🎛️ 镜头运动标注系统

### 6种基础镜头运动

| 运动 | 英文 | 图示 | 效果 |
|------|------|------|------|
| **Zoom** | 推拉 | ↔ | 移近/远离主体 |
| **Pan** | 横摇 | ⟷ | 水平移动 |
| **Tilt** | 纵摇 | ↕ | 上下移动 |
| **Dolly** | 移镜头 | ➡ | 轨道前进/后退 |
| **Truck** | 横移 | ⇔ | 水平横向移动 |
| **Pedestal** | 升降 | ⇵ | 上下升降 |

### 标注符号

```
标准镜头运动符号：

Zoom In:  →⊗ (箭头指向中心)
Zoom Out: ⊗← (箭头远离中心)
Pan Left: ⟸
Pan Right: ⟹
Tilt Up: ↿
Tilt Down: ⇂
Dolly In: ➡
Dolly Out: ⬅
Truck Left: ⇤
Truck Right: ⇥
Pedestal Up: ⤒
Pedestal Down: ⤓
```

---

## 📄 传统纸质模板 vs 数字化工具

### 对比表

| 特性 | 纸质模板 | 数字工具 |
|------|----------|----------|
| **可访问性** | ✅ 高，无需设备 | ❌ 需电脑/手机 |
| **成本** | ✅ 低，纸+笔 | ❌ 需订阅费 |
| **修改** | ❌ 困难，几乎不可能 | ✅ 拖放、重排 |
| **协作** | ❌ 无 | ✅ 实时协作、评论 |
| **分享** | ❌ 需扫描 | ✅ 链接分享 |
| **存档** | ❌ 纸质易损 | ✅ 云端永久 |
| **动画预览** | ❌ 无 | ✅ Animatics自动生成 |

### 建议

```
快速头脑风暴 → 纸质模板
团队协作项目 → 数字工具
客户审批流程 → 数字工具（共享链接）
现场参考 → 纸质打印版
```

---

## 📦 标准模板下载格式

### 文件格式

| 格式 | 用途 |
|------|------|
| **PDF** | 打印版，手绘首选 |
| **Word/Pages** | 可编辑版，文字密集 |
| **PowerPoint/Keynote** | 演示版，客户展示 |
| **JSON/YAML** | 程序化，API集成 |

---

## 🔧 DramaForge集成建议

### 数据模型设计

```python
# 分镜面板数据模型

class StoryboardFrame:
    frame_id: str          # "FRAME_001"
    scene_id: str          # "SCENE_01"
    shot_id: str           # "SHOT_010"
    
    # 视觉内容
    visual_prompt: str     # AI生成提示词
    reference_image: str   # 参考图路径
    
    # 镜头信息
    shot_type: str         # "wide", "medium", "close-up"
    camera_angle: str      # "eye-level", "high", "low"
    camera_movement: str   # "static", "push-in", "pan-left"
    
    # 时间信息
    duration: float        # 秒数
    frame_count: int       # 帧数（动画）
    
    # 内容描述
    action: str            # 动作描述
    dialogue: str          # 对话
    voiceover: str         # 旁白
    sound_effects: str     # 音效
    
    # 连续性
    continuity_notes: str  # 连续性注释
    previous_frame: str    # 前一个面板ID
    next_frame: str        # 下一个面板ID
```

### UI模板选择器

```tsx
// React组件示例

interface TemplateSelectorProps {
  aspectRatio: '16:9' | '2.39:1' | '9:16' | '1:1';
  panelCount: 4 | 6 | 8 | 12;
  projectType: 'film' | 'video' | 'animation';
}

const TemplatePresets = [
  { name: '电影标准', ratio: '2.39:1', panels: 6, type: 'film' },
  { name: 'YouTube横屏', ratio: '16:9', panels: 6, type: 'video' },
  { name: 'TikTok竖屏', ratio: '9:16', panels: 8, type: 'video' },
  { name: '动画详细', ratio: '16:9', panels: 12, type: 'animation' },
];
```

---

## 📚 Boords 12+免费模板清单

### 模板类型

| 模板 | 比例 | 面板数 | 用途 |
|------|------|--------|------|
| Basic 4-Panel | 16:9 | 4 | 快速概览 |
| Standard 6-Panel | 16:9 | 6 | 通用项目 |
| Cinemascope | 2.39:1 | 6 | 电影制作 |
| Vertical 9:16 | 9:16 | 8 | 社媒竖屏 |
| Square 1:1 | 1:1 | 6 | Instagram |
| Animation 12-Panel | 16:9 | 12 | 动画详细 |
| Music Video | 16:9 | 8 | MV节奏 |
| Commercial | 16:9 | 6 | 广告宣传 |
| Documentary | 16:9 | 6 | 纪录片 |
| Corporate | 16:9 | 4 | 企业视频 |
| Explainer | 16:9 | 8 | 解释视频 |
| Presentation | 16:9 | 6 | 演示文稿 |

### 下载地址

```
Boords免费模板：
https://boords.com/storyboard-template

Boords分镜指南：
https://boords.com/how-to-storyboard

Boords镜头案例：
https://boords.com/storyboard-examples
```

---

## 🎯 分镜创建四步骤

### Step 1: 选择媒介

```
纸质 → 简单、无设备需求
数字 → 易编辑、可协作、可分享
```

### Step 2: 绘制草图（Scamping）

```
✅ 选择比例
✅ 保持粗糙
✅ 快速迭代
✅ 检查连贯性
```

### Step 3: 编辑完善

```
• 时间设定（早晨乐观/夜晚紧迫）
• 剪影检查（动作是否清晰）
• 角色突出（不要被背景抢镜）
• 镜头变化（避免重复）
• 层次构建（前景/中景/背景）
```

### Step 4: 镜头运动标注

```
添加镜头运动类型：
- Zoom: 推/拉
- Pan: 横摇
- Tilt: 纵摇
- Dolly: 移镜头
- Truck: 横移
- Pedestal: 升降
```

---

## 💡 最佳实践

### 分镜成功的10条法则

```
1. 先写剧本，再画分镜
2. 每个面板讲述一个时刻
3. 草图不等于艺术品
4. 镜头类型要有变化
5. 检查时间/逻辑连贯性
6. 用剪影验证动作清晰度
7. 角色是主角，背景不抢镜
8. 前中背景层次分明
9. 镜头运动标注准确
10. 与团队共享并迭代
```

---

## 📊 资源汇总

### 外部链接

| 资源 | URL | 内容 |
|------|-----|------|
| Boords模板库 | https://boords.com/storyboard-template | 12+免费PDF |
| Boords教程 | https://boords.com/how-to-storyboard | 完整指南 |
| Boords案例 | https://boords.com/storyboard-examples | 50+电影案例 |
| Template.net | https://www.template.net/storyboard | 可编辑模板 |
| StudioBinder | https://www.studiobinder.com | 专业工具 |

---

**整理完成时间**：2026-04-23
**来源**：Boords (500,000+用户) + 行业标准实践
**用途**：DramaForge分镜模板系统设计参考