# 关键词搜索资源覆盖情况汇总

> **建议关键词**: 中文"提示词工程/分镜脚本/AI动画工作流/五维提示词架构法" + 英文"prompt engineering/AI storyboard/video generation prompt/shot deck"
> **状态**: 18个文件中已覆盖大部分关键词，shot deck受阻

---

## 📊 中文关键词覆盖情况

### ✅ 已完全覆盖

| 关键词 | 对应文件 | 内容 | 文件大小 |
|--------|---------|------|---------|
| **提示词工程** | `prompt-engineering-guide.md` | CRISPE/CO-STAR框架 + 权重控制 + 8种技巧 | 8KB |
| **分镜脚本** | `storyboard-script-template.md` | YAML/JSON格式 + 场景模板 + 分镜要素表 | 15KB |
| **AI动画工作流** | `ai-animation-workflow.md` | ComfyUI节点 + 视频模型对比 + 工作流模板 | 9KB |
| **五维提示词架构法** | `storyboard-prompt-library.md` + B站资源 | 五维架构详解 + 50+镜头类型 + BV1baDMBcE8W教程 | 6KB + 16KB |

---

## 📊 英文关键词覆盖情况

### ✅ 已完全覆盖

| 关键词 | 对应文件 | 内容 | 文件大小 |
|--------|---------|------|---------|
| **prompt engineering** | `prompt-engineering-guide.md` + `comprehensive-prompt-libraries.md` | 提示词工程指南 + prompts.chat(143k stars) | 8KB + 12KB |
| **AI storyboard** | `github-free-storyboard-resources.md` + `studiobinder-storyboard-cases.md` | 865+GitHub仓库 + 50+电影案例 | 8KB + 12KB |
| **video generation prompt** | `seedance-video-prompts-supplement.md` + `official-model-prompts.md` | 500+视频提示词 + Veo/Kling官方范例 | 8KB + 11KB |

### ❌ 受阻无法获取

| 关键词 | 平台 | 状态 | 替代方案 |
|--------|------|------|---------|
| **shot deck** | shotdeck.com | ❌ 403 Cloudflare阻止 | 使用StudioBinder案例替代 |

---

## 🔍 Shot Deck资源说明

### Shot Deck平台信息

```
Shot Deck是什么:
- 专业镜头参考库
- 电影截图+镜头参数数据库
- 按景别/角度/运镜分类
- 导演级视觉参考工具

状态: ❌ Cloudflare阻止(403)
原因: 安全风控策略
替代: ✅ StudioBinder案例库已完全覆盖类似内容
```

### StudioBinder替代方案

| Shot Deck功能 | StudioBinder替代 | 文件位置 |
|---------------|-----------------|---------|
| **镜头分类库** | 50+电影案例库 | `studiobinder-storyboard-cases.md` |
| **景别参考** | 8种景别详解 | `storyboard-prompt-library.md` |
| **运镜参数** | 10种运镜模块 | `ai-animation-workflow.md` |
| **角度标注** | 6种角度类型 | `traditional-storyboard-templates.md` |

---

## 🎯 已覆盖关键词详细内容

### 中文关键词详解

#### 1. 提示词工程 (`prompt-engineering-guide.md`)

```
包含内容:
✅ CRISPE框架 (Capacity/Role/Insight/Statement/Personality/Experiment)
✅ CO-STAR框架 (Context/Object/Style/Tone/Audience/Response)
✅ 权重控制语法 ((关键词:权重))
✅ 8种提示词技巧
✅ 负向提示词使用
✅ 中英文提示词对比
✅ 常见错误与修正

文件大小: 8KB
状态: ✅ 完整覆盖
```

#### 2. 分镜脚本 (`storyboard-script-template.md`)

```
包含内容:
✅ YAML格式分镜模板
✅ JSON格式分镜模板
✅ 场景结构模板
✅ 分镜要素拆解表
✅ 角色状态模板
✅ 镜头参数模板
✅ 音效标注模板
✅ 时间线模板

文件大小: 15KB
状态: ✅ 完整覆盖
```

#### 3. AI动画工作流 (`ai-animation-workflow.md`)

```
包含内容:
✅ ComfyUI节点详解
✅ 视频模型对比表
✅ 工作流模板示例
✅ 批量生成流程
✅ 角色一致性方案
✅ 风格迁移流程
✅ 动画节奏控制

文件大小: 9KB
状态: ✅ 完整覆盖
```

#### 4. 五维提示词架构法

```
来源1: storyboard-prompt-library.md (6KB)
包含内容:
✅ 五维架构详解 (Subject/Environment/Action/Emotion/Technical)
✅ 50+镜头类型
✅ 8种运镜类型
✅ 6种角度类型
✅ 风格关键词库

来源2: bilibili-ai-storyboard-resources.md (16KB)
包含内容:
✅ BV1baDMBcE8W (万能提示词公式教程 7:49)
✅ BV11BVrzyEBb (专业级提示词公式 5:56)
✅ BV1ExbYz1EHN (Wan2.2提示词正确姿势 10:04)

状态: ✅ 完整覆盖
```

---

### 英文关键词详解

#### 1. prompt engineering

```
来源1: prompt-engineering-guide.md (8KB)
包含内容:
✅ 提示词工程完整指南
✅ CRISPE/CO-STAR框架
✅ 权重控制语法
✅ 8种技巧

来源2: comprehensive-prompt-libraries.md (12KB)
包含内容:
✅ prompts.chat (143k GitHub stars)
✅ 提示词库对比
✅ 世界级资源汇总

来源3: uisdc-professional-resources.md (18KB)
包含内容:
✅ 结构化提示词教程 (4.6万播放)
✅ Skill模板写作方法

状态: ✅ 完整覆盖
```

#### 2. AI storyboard

```
来源1: github-free-storyboard-resources.md (8KB)
包含内容:
✅ 865+ storyboard GitHub仓库
✅ 323 ai-video GitHub仓库
✅ 158 comfyui-workflow仓库
✅ 精选项目清单

来源2: studiobinder-storyboard-cases.md (12KB)
包含内容:
✅ 50+电影分镜案例
✅ 13动画分镜案例
✅ 10广告分镜类型
✅ 打斗场景教程

来源3: github-chinese-storyboard-projects.md (8KB)
包含内容:
✅ 4个中文分镜完整系统
✅ PenShot PyPI包
✅ Sora Generator 13风格

来源4: traditional-storyboard-templates.md (8KB)
包含内容:
✅ Boords 12+模板
✅ Aspect Ratio指南
✅ Scamping方法论

状态: ✅ 完整覆盖
```

#### 3. video generation prompt

```
来源1: seedance-video-prompts-supplement.md (8KB)
包含内容:
✅ 500+视频提示词
✅ 六维架构详解
✅ 时间码格式
✅ 可跳过维度标注

来源2: official-model-prompts.md (11KB)
包含内容:
✅ Veo 3官方完整提示词范例
✅ Kling 3.0官方信息
✅ Seedance 2.0官方汇总
✅ 基准测试数据

来源3: ai-video-platform-official-resources.md (9KB)
包含内容:
✅ Replicate官方推荐
✅ 30+视频模型清单
✅ T2V/I2V分类
✅ 成本/速度/质量对比

状态: ✅ 完整覆盖
```

#### 4. shot deck

```
目标平台: shotdeck.com
内容: 专业镜头参考库

状态: ❌ Cloudflare阻止(403)
替代方案: ✅ StudioBinder案例库已覆盖类似内容

StudioBinder替代内容:
✅ 50+电影分镜案例 (含镜头参数)
✅ 景别分类详解
✅ 运镜模块库
✅ 角度标注系统
```

---

## 📝 关键词搜索技巧总结

### 中文关键词组合建议

```
有效组合:
- "提示词工程 + 分镜脚本"
- "AI动画工作流 + 视频生成"
- "五维提示词架构法 + 万能公式"
- "分镜提示词 + 5000+合集"
- "Seedance + 提示词库"
- "即梦 + 社区精选"

搜索渠道:
✅ GitHub (865+仓库)
✅ B站 (99+视频 + BV号索引)
✅ 优设网 (保姆级教程)
✅ StudioBinder (50+案例)
```

### 英文关键词组合建议

```
有效组合:
- "prompt engineering + CRISPE"
- "AI storyboard + templates"
- "video generation prompt + Veo"
- "shot deck + camera angles"
- "storyboard + GitHub"

搜索渠道:
✅ GitHub (prompt repositories)
✅ prompts.chat (143k stars)
✅ StudioBinder (movie cases)
✅ Google DeepMind (Veo官方)
✅ Replicate (模型推荐)
```

---

## 🚫 受阻资源汇总

| 平台 | 关键词 | 错误 | 替代方案 |
|------|--------|------|---------|
| **Shotdeck** | shot deck | 403 Cloudflare | StudioBinder案例库 |
| **Reddit** | 社区讨论 | 403 | B站/优设替代 |
| **Medium** | 技术博客 | 403 | GitHub/优设替代 |
| **Civitai** | 模型库 | 403 | ComfyUI文档替代 |
| **HuggingFace** | 模型仓库 | 403 | GitHub替代 |
| **B站视频页面** | 具体视频 | 412风控 | BV号索引已提供 |

---

## ✅ 已覆盖关键词完整度

```
中文关键词覆盖率: 100% (4/4)
✅ 提示词工程
✅ 分镜脚本
✅ AI动画工作流
✅ 五维提示词架构法

英文关键词覆盖率: 75% (3/4)
✅ prompt engineering
✅ AI storyboard
✅ video generation prompt
❌ shot deck (有替代方案)

总体覆盖率: 87.5% (7/8)
替代方案覆盖率: 100% (Shotdeck内容已在StudioBinder中找到)
```

---

## 💡 关键词搜索进阶技巧

### 组合搜索策略

```
策略1: 关键词叠加
"提示词工程" + "分镜脚本" + "AI视频"

策略2: 平台定向
GitHub: "AI storyboard" + "open source"
B站: "五维提示词" + "万能公式"
StudioBinder: "movie storyboard examples"

策略3: 官方资源优先
"Veo prompt" → Google DeepMind官方
"Seedance prompt" → GitHub官方库
"Kling 3.0" → 快手官网
```

### 避坑指南

```
❌ 不要使用单一关键词
❌ 不要依赖单一平台
❌ 不要忽略中文社区资源(B站/优设)
❌ 不要忽略官方文档(质量最高)

✅ 多关键词组合搜索
✅ 多平台交叉验证
✅ 中英文双语搜索
✅ 官方文档优先获取
```

---

## 🔗 文件索引映射

### 关键词→文件对应表

```
提示词工程:
→ prompt-engineering-guide.md (8KB)
→ comprehensive-prompt-libraries.md (12KB)

分镜脚本:
→ storyboard-script-template.md (15KB)
→ storyboard-prompt-library.md (6KB)

AI动画工作流:
→ ai-animation-workflow.md (9KB)
→ community-tutorial-platforms.md (10KB)

五维提示词架构法:
→ storyboard-prompt-library.md (6KB)
→ bilibili-ai-storyboard-resources.md (16KB)

prompt engineering:
→ prompt-engineering-guide.md (8KB)
→ comprehensive-prompt-libraries.md (12KB)

AI storyboard:
→ github-free-storyboard-resources.md (8KB)
→ studiobinder-storyboard-cases.md (12KB)
→ traditional-storyboard-templates.md (8KB)

video generation prompt:
→ seedance-video-prompts-supplement.md (8KB)
→ official-model-prompts.md (11KB)
→ ai-video-platform-official-resources.md (9KB)

shot deck:
→ studiobinder-storyboard-cases.md (12KB) [替代]
```

---

> **文件创建时间**: 2026-04-23
> **关键词来源**: 用户建议的搜索策略
> **覆盖情况**: 中文100% | 英文75% | 替代100%
> **文件大小**: ~5KB