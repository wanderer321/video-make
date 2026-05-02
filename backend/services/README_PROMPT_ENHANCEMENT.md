# DramaForge - 动态提示词增强系统

> **最后更新**: 2026-04-24  
> **版本**: v1.0

---

## 功能概述

本系统在剧本生成、剧集拆解、分镜拆解等LLM调用流程中，动态加载`prompt-templates`目录下风格特定的规则知识和例子，增强提示词质量，帮助AI生成更符合风格要求的剧本和分镜。

### 核心特性

1. **风格特定增强**: 根据用户指定的风格（如"逆袭爽剧"、"都市甜宠"），自动加载对应的叙事规则、分镜规则、例子参考
2. **智能策略判断**: 根据镜头内容判断分镜生成策略（单套提示词 vs 多套提示词 vs 直接视频）
3. **向后兼容**: 未指定风格或风格未匹配时，回退到基础提示词
4. **缓存优化**: 加载的文件内容缓存在模块级，避免重复IO

---

## 目录结构

```
backend/
├── services/
│   ├── prompts.py           # 基础提示词加载 + 增强加载函数
│   ├── prompt_enhancer.py   # 动态增强核心模块
│   └── llm.py               # LLM调用服务
│
├── api/routes/
│   └── scripts.py           # 剧本/分镜相关API端点
│
└── prompts/                 # 基础提示词模板
    ├── generate_script.txt
    ├── breakdown.txt
    ├── storyboard_script.txt
    ...

prompt-templates/            # 风格知识库（外部）
├── 分镜生成方式详解.md       # 全局镜头策略规则
├── 风格-历史权谋/
│   ├── 剧本-生成剧本&分集%%分片段-规则知识方法.md
│   ├── 剧本-例子.md
│   ├── 动画/分镜-规则知识方法.md
│   ├── 动画/分镜-例子.md
│   ├── 动画/参考图-规则知识方法.md
│   ├── 动画/参考图-例子.md
│   └── 真人视频/...（同结构）
├── 风格-古风玄幻/
├── 风格-悬疑推理/
├── 风格-灵异惊悚/
├── 风格-科幻末世/
├── 风格-逆袭爽剧/
├── 风格-都市甜宠/
├── 风格-青春校园/
...
```

---

## 使用方式

### API调用示例

```python
# 在 scripts.py 中使用增强加载
from services.prompts import load_enhanced_prompt

# 剧本生成
prompt = load_enhanced_prompt(
    "generate_script.txt",
    style="逆袭爽剧",           # 风格名
    project_type="manga_2d",    # 项目类型（决定动画/真人视频）
    context={"task": "generate_script"},
    topic="魂穿古代，开局被打脸",
    total_episodes=12,
)

# 分镜拆解（最复杂）
prompt = load_enhanced_prompt(
    "storyboard_script.txt",
    style="逆袭爽剧",
    project_type="manga_2d",
    context={"task": "storyboard", "characters": ["沈秋", "萧蘅"]},
    episode_outline="第1集梗概...",
    shots_per_episode=30,
)
```

### 风格匹配机制

风格匹配采用**关键词匹配 + 语义近似匹配**的分层策略：

1. **精确匹配**: 用户输入完全匹配风格名（如"逆袭爽剧"）
2. **部分匹配**: 输入是风格名的一部分（如"爽剧" → "逆袭爽剧"）
3. **关键词映射**: 常见别名映射（如"都市" → "都市甜宠", "古风" → "古风玄幻"）

**注**: 用户建议使用Skills进行更智能的语义近似匹配，当前实现保留了基础关键词匹配作为fallback。

---

## 增强内容注入

### 剧本生成 (generate_script.txt)

```
[原始模板内容]

--- 风格增强（逆袭爽剧）---

【叙事规则参考】
{三幕结构映射、救猫咪节拍、角色原型规则}

【剧本例子参考】
{1-2个该风格爆款剧例子}

请严格遵循逆袭爽剧风格的叙事规则、节奏控制和角色设定原则来生成剧本。
```

### 剧集拆解 (breakdown.txt)

```
[原始模板内容]

--- 风格增强（逆袭爽剧）---

【分集节奏规则】
{三集定生死公式、钩子设计规则}

请在拆解时特别关注逆袭爽剧风格的节奏特点、"三集定生死"公式和结尾钩子设计。
```

### 分镜拆解 (storyboard_script.txt)

```
[原始模板内容]

--- 风格增强（逆袭爽剧/动画）---

【分镜核心规则 - 必须遵守】
- Director's Formula: [Subject] + [Action] + [Scene] + [Camera] + [Style]
- One-Move Rule: 每镜头只指定一个主要运镜
- Camera Contract: {该风格的运镜预设表}
- 灯光设计规则: {该风格的光影语言}

【分镜生成策略判断规则】
- 运镜变化/表情变化 → 单套提示词（时间码）
- 景别变化/角度变化/场景转换 → 多套提示词

【分镜例子参考】
{2-3个该风格分镜例子}

请为每个镜头在JSON中添加"generation_strategy"字段。
```

---

## 镜头生成策略判断

根据`分镜生成方式详解.md`的决策规则，系统自动判断每个镜头的生成策略：

| 条件 | 策略 | 说明 |
|---|---|---|
| 同场景 + 连续运镜（推/拉/摇） | `single_prompt` | 时间码分段描述 |
| 同场景 + 角色表情连续变化 | `single_prompt` | 一次生成多张连续图 |
| 同场景 + 角色移动 | `single_prompt` | 保持连贯性 |
| 景别变化（远→中→特） | `multi_prompt` | 独立生成每张图 |
| 角度变化（平→俯→仰） | `multi_prompt` | 构图完全不同 |
| 场景转换 | `multi_prompt` | 环境完全不同 |
| 角色切换 | `multi_prompt` | 主体不同 |
| `gen_mode="video"` | `direct_video` | 直接生成视频 |

---

## 核心类说明

### StyleRegistry

风格发现与管理：
- 启动时扫描`prompt-templates/风格-*`目录
- 提供`match_style_semantic()`进行风格匹配
- 提供`get_media_type()`将项目类型映射到动画/真人视频

### StyleKnowledgeLoader

风格知识加载：
- `load_script_rules()` - 加载剧本叙事规则
- `load_storyboard_rules()` - 加载分镜规则（Camera Contract、灯光等）
- `load_shot_strategy_rules()` - 加载全局镜头策略决策规则
- 所有加载结果缓存在模块级，避免重复IO

### PromptEnhancer

增强编排器：
- 根据模板名路由到对应增强方法
- 控制增强内容长度（防止prompt过长）
- 处理风格未找到的优雅降级

### ShotStrategyDecider

镜头策略判断器：
- 基于镜头内容分析（camera_type, shot_size, action等）
- 与前一镜头比较判断连续性
- 返回`single_prompt`/`multi_prompt`/`direct_video`

---

## 前端UI改进

本次实现同时改进了分镜表格的UI样式：

### 提示词Cell

- 左对齐显示
- 使用`line-clamp-2`显示2行预览
- 添加"提示词"小标签
- hover时微妙渐变背景效果

### gen_mode分段控制

改为分段控制（Pill/Segmented Control）替代原始toggle：
- 每个模式独立按钮（图/视）
- 图标+文字双重提示
- 紫色表示"图片模式"，橙色表示"视频模式"
- 点击区域更大，操作更方便

### 表格Header

- 更深背景色区分header与body
- `font-bold uppercase tracking-wide`强调语义
- 底部accent边框
- sticky固定在滚动时可见

---

## 验证方式

1. 创建"逆袭爽剧"风格项目，生成剧本 → 验证输出包含爽剧节奏特点
2. 拆解剧本 → 验证分集梗概包含"三集定生死"节奏
3. AI拆分镜 → 验证：
   - Camera Contract规则注入（一镜一运镜）
   - generation_strategy字段正确输出
   - 打脸场景使用multi_prompt，表情变化使用single_prompt
4. 对比"都市甜宠"与"悬疑推理"风格输出差异

---

## 注意事项

1. **Prompt长度控制**: 增强内容控制在8000字符内
2. **优雅降级**: 风格未找到时回退到基础prompt
3. **缓存机制**: 文件内容缓存避免重复IO
4. **日志记录**: 风格匹配、增强注入记录DEBUG日志

---

## 后续扩展方向

1. **Skills语义匹配**: 使用Skills进行更智能的风格语义匹配
2. **用户自定义风格**: 支持用户上传自定义风格知识库
3. **动态补充请求**: 支持`enhancement_request`参数，动态加载用户请求的特定内容
4. **多风格混合**: 支持混合多种风格的规则

---

> **核心设计原则**: 规则文件做骨架指引 → 例子文件做素材参考 → 最终输出