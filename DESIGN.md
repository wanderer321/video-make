# DramaForge — AI 驱动的本地漫剧创作工作站

> 设计文档 v1.0 | 2026-04-21

---

## 一、产品定位

**DramaForge**（剧锻工坊）是一款面向个人创作者与小型工作室的跨平台桌面应用，实现从小说/剧本到完整漫剧成片的全链路 AI 辅助创作流程。

与在线平台的核心差异：
- 本地数据，无需上传隐私内容到第三方
- 用户自持 API Key，自主控制成本
- 离线核心功能，联网仅用于调用 AI 接口
- 无订阅费，买断或免费开源皆可

---

## 二、功能模块总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        DramaForge                               │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ 项目管理 │ 剧本工坊 │ 资产库   │ 分镜画板 │ 生成中心 │ 后期合成 │
│ Project  │ Script   │ Assets   │ Board    │ Generate │ Compose  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
              ↑ 横贯所有模块 ↑
┌─────────────────────────────────────────────────────────────────┐
│              设置中心（API 配置 / 本地模型 / 偏好设置）          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、各模块详细设计

### 3.1 项目管理（Project Manager）

**功能清单：**
- 创建项目：填写剧名、类型（2D漫剧 / 3D漫剧 / 真人剧）、风格标签
- 项目列表：卡片展示，含封面、进度条、最近修改时间
- 项目导入/导出：打包为 `.dfp`（DramaForge Project）格式，含所有资产
- 集数管理：每个项目下可建多集，每集独立分镜序列

**数据结构：**
```
Project
  ├── id, name, type, style, cover, created_at, updated_at
  ├── episodes[]
  │     ├── id, episode_no, title, status
  │     ├── script_id
  │     ├── boards[]
  │     └── videos[]
  └── assets (characters, scenes, props)
```

---

### 3.2 剧本工坊（Script Studio）

**功能清单：**

| 功能 | 说明 |
|------|------|
| 文档导入 | 支持 .txt / .docx / .pdf，最大支持 100 万字符 |
| AI 剧本拆解 | 调用 LLM 提取人物表、世界观、主线/支线剧情 |
| 分集成稿 | AI 按集数自动切分内容，生成分集梗概 |
| 分镜脚本转化 | 每集梗概 → 标准镜头脚本（场景/人物/动作/台词/镜头语言） |
| 手动编辑器 | 富文本编辑器，支持标注角色/场景标签 |
| 一句话生剧本 | 输入题材关键词，AI 从零生成完整剧本 |
| 版本管理 | 每次 AI 生成结果可保存为版本，支持回退 |

**分镜脚本标准格式（内部 JSON）：**
```json
{
  "episode": 1,
  "scene": 3,
  "shots": [
    {
      "shot_id": "EP01-SC03-SH01",
      "shot_type": "特写",
      "location": "皇宫大殿",
      "characters": ["凌霄", "太后"],
      "action": "凌霄跪地，太后居高临下俯视",
      "dialogue": "你以为跪下就能免罪？",
      "camera": "仰拍 45°",
      "duration_sec": 4,
      "mood": "紧张压迫"
    }
  ]
}
```

---

### 3.3 资产库（Asset Library）

**资产类型：**
- **角色资产**：主形态 + 多子形态（表情、服装变体）
- **场景资产**：室内/室外、时间段变体（白天/夜晚）
- **道具资产**：武器、物品、特效元素
- **音色资产**：每个角色绑定 TTS 音色配置

**功能清单：**

| 功能 | 说明 |
|------|------|
| AI 自动提取 | 从剧本中识别所有人物/场景/道具，生成提取列表 |
| 批量生成 | 批量调用图像生成 API，一键生成所有资产图 |
| 资产编辑 | 局部重绘（inpainting）、风格重生成 |
| 一致性锁定 | 为角色设置参考图（IP Adapter 参数），保持跨镜头一致 |
| 资产标签 | 为资产打标，便于分镜时快速关联 |
| 资产导入 | 支持从本地导入自己绘制的图片作为资产 |

**资产数据结构：**
```
Asset
  ├── id, name, type (character/scene/prop)
  ├── description (prompt 描述)
  ├── reference_image_path
  ├── variants[] (子形态图片列表)
  ├── tts_config (角色音色设置)
  └── tags[]
```

---

### 3.4 分镜画板（Storyboard Canvas）

**核心概念：** 可视化拖拽画板，每张卡片代表一个镜头。

**功能清单：**

| 功能 | 说明 |
|------|------|
| AI 自动排镜 | 从分镜脚本自动生成分镜卡片序列 |
| 分镜图生成 | 每张卡片调用图像 API 生成对应画面 |
| 卡片编辑 | 修改提示词、关联资产、调整镜头参数后重新生成 |
| 多视角衍生 | 同一场景生成 3-5 个不同机位版本供选择 |
| 拖拽排序 | 拖拽调整镜头顺序 |
| 批注模式 | 给分镜卡片添加导演备注 |
| 时间轴视图 | 切换为时间轴展示，预估集数时长 |

**分镜卡片数据结构：**
```
Board Card
  ├── id, shot_id (关联脚本)
  ├── image_path (生成的分镜图)
  ├── prompt (图像生成提示词)
  ├── characters[] (关联角色资产 id)
  ├── scene_id (关联场景资产 id)
  ├── camera_angle, shot_size (景别)
  ├── duration_sec
  ├── dialogue
  └── notes (导演备注)
```

---

### 3.5 生成中心（Generation Hub）

**这是整个工具最核心的模块，统一管理所有 AI 生成任务。**

#### 3.5.1 图像生成（用于资产 & 分镜图）

支持的接口：

| 接口 | 类型 | 说明 |
|------|------|------|
| Stability AI（SDXL/SD3） | 云端 API | 通用高质量图像 |
| Kling 图像 API | 云端 API | 快手可灵图像 |
| 即梦（Jimeng） | 云端 API | 字节图像生成 |
| Flux.1 API（fal.ai） | 云端 API | 高质量写实 |
| ComfyUI 本地 | 本地 | 完全本地，支持 ControlNet/IP-Adapter |
| Stable Diffusion WebUI | 本地 | 本地 SDXL/SD1.5 |

#### 3.5.2 视频生成（用于最终成片）

支持的接口：

| 接口 | 类型 | 能力 |
|------|------|------|
| Kling Video API（可灵） | 云端 API | 图生视频、文生视频，口型同步 |
| Vidu API（生数科技） | 云端 API | 漫剧专属模型，角色一致性强 |
| Runway Gen-3/4 API | 云端 API | 高质量视频，海外主流 |
| Pika API | 云端 API | 快速生成，性价比高 |
| 即梦视频（Jimeng Video） | 云端 API | 字节视频生成 |
| Wan2.1 本地（阿里开源） | 本地 | 本地部署视频生成，免费 |
| CogVideoX 本地 | 本地 | 智谱开源视频生成 |

#### 3.5.3 文本/剧本 AI（用于剧本模块）

| 接口 | 类型 |
|------|------|
| Claude API（Anthropic） | 云端 API |
| OpenAI GPT-4o | 云端 API |
| Gemini 1.5 Pro | 云端 API |
| DeepSeek API | 云端 API |
| 通义千问 API | 云端 API |
| 文心一言 API | 云端 API |
| Ollama（Qwen/Llama 等） | 本地 |

#### 3.5.4 音频/配音/字幕

| 接口 | 类型 | 功能 |
|------|------|------|
| ElevenLabs API | 云端 API | 高质量多语言 TTS + 克隆音色 |
| Fish Audio API | 云端 API | 中文专属，音色丰富 |
| Azure TTS | 云端 API | 稳定，多语言 |
| 讯飞 TTS API | 云端 API | 中文顶级质量 |
| Edge-TTS | 本地 | 免费，微软神经网络 TTS |
| CosyVoice 本地 | 本地 | 阿里开源，可克隆音色 |
| Whisper（本地字幕） | 本地 | 语音转文字，生成字幕 |

**生成任务队列设计：**
- 支持批量任务并发（可配置并发数）
- 任务状态：pending / running / done / failed
- 支持失败重试
- 显示预估费用（根据 API 单价计算）
- 支持闲时模式（低峰期自动执行队列）

---

### 3.6 后期合成（Compose Studio）

**功能清单：**

| 功能 | 说明 |
|------|------|
| 简易时间轴 | 将分镜视频按顺序排入时间轴 |
| 配音轨道 | AI 配音自动对齐视频时间轴 |
| 字幕轨道 | 自动生成 SRT 字幕，支持手动调整 |
| 音效轨道 | 背景音乐 + 音效叠加 |
| 转场效果 | 简单转场（淡入淡出、切换等） |
| 导出 | 导出 MP4（H.264/H.265），支持 1080p/2K/4K |
| 外部编辑 | 导出 XML/EDL 至剪映、PR 二次编辑 |

---

### 3.7 设置中心（Settings）

**这是单机软件区别于在线平台的核心入口。**

#### API 配置（分组管理）

```
设置 > API 配置
├── 文本生成
│   ├── Claude API Key + Base URL
│   ├── OpenAI API Key + Base URL（支持代理/中转）
│   ├── DeepSeek API Key
│   ├── 通义千问 API Key
│   └── Ollama 地址（默认 localhost:11434）
├── 图像生成
│   ├── Stability AI API Key
│   ├── Kling 图像 API Key + Secret
│   ├── 即梦 API Key
│   ├── fal.ai API Key
│   ├── ComfyUI 地址（默认 localhost:8188）
│   └── SD WebUI 地址（默认 localhost:7860）
├── 视频生成
│   ├── Kling Video API Key + Secret
│   ├── Vidu API Key
│   ├── Runway API Key
│   ├── Pika API Key
│   ├── 即梦视频 API Key
│   └── 本地视频模型地址
└── 音频/TTS
    ├── ElevenLabs API Key
    ├── Fish Audio API Key
    ├── Azure TTS Key + Region
    ├── 讯飞 AppID + API Key + Secret
    └── CosyVoice 地址（默认 localhost:9880）
```

#### 模型偏好设置
- 剧本生成默认使用哪个 LLM
- 分镜图默认使用哪个图像模型
- 视频生成默认使用哪个视频模型
- TTS 默认使用哪个配音服务

#### 生成参数设置
- 图像默认分辨率
- 视频默认时长/帧率
- API 并发请求数
- 代理设置（HTTP/SOCKS5）

#### 本地模型管理
- 检测已安装的 Ollama 模型列表
- 检测 ComfyUI / SD WebUI 连接状态
- 一键测试所有 API 连通性

---

## 四、技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                   Tauri Application                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │           React + TypeScript (前端 UI)             │  │
│  │   shadcn/ui + Tailwind CSS + Zustand + React DnD  │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │ Tauri IPC (invoke/emit)          │
│  ┌────────────────────┴──────────────────────────────┐  │
│  │              Rust Core (Tauri 后端)                │  │
│  │  文件读写 / 窗口管理 / 系统托盘 / SQLite 桥接      │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │ HTTP / 子进程                    │
│  ┌────────────────────┴──────────────────────────────┐  │
│  │         Python FastAPI (本地 AI 服务)              │  │
│  │  端口 17321（随机避冲突）                          │  │
│  │  ├── 剧本解析 & LLM 调用                          │  │
│  │  ├── 图像/视频 API 调用 & 队列管理                │  │
│  │  ├── TTS & 字幕处理                               │  │
│  │  ├── FFmpeg 媒体处理                              │  │
│  │  └── 本地模型连接（Ollama/ComfyUI/SD）            │  │
│  └────────────────────┬──────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────┘
                        │
        ┌───────────────┴──────────────┐
        │                              │
   本地存储                        外部 API
   SQLite + 文件系统          (Kling/Vidu/Claude/...)
```

### 4.2 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.x | 桌面壳 + 系统调用 |
| React | 19.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| shadcn/ui | latest | UI 组件库 |
| Tailwind CSS | 4.x | 样式系统 |
| Zustand | 5.x | 全局状态管理 |
| TanStack Query | 5.x | 异步数据 & 缓存 |
| React DnD Kit | latest | 拖拽交互（分镜画板）|
| Tiptap | 2.x | 富文本编辑器（剧本）|
| Konva.js | latest | Canvas 渲染（时间轴）|
| React Router | 7.x | 路由 |
| Lucide Icons | latest | 图标库 |

### 4.3 Python 后端技术栈

| 技术 | 用途 |
|------|------|
| FastAPI | Web 框架 |
| SQLAlchemy | ORM |
| SQLite | 本地数据库 |
| httpx | 异步 HTTP 客户端（调用各 API）|
| Celery + Redis / ARQ | 异步任务队列（可选）|
| Pydantic | 数据验证 |
| FFmpeg-python | 视频/音频处理 |
| Pillow | 图像处理 |
| openai SDK | OpenAI/DeepSeek/兼容接口 |
| anthropic SDK | Claude API |
| edge-tts | 免费本地 TTS |
| faster-whisper | 本地语音识别转字幕 |
| PyInstaller | 打包为可执行文件 |

### 4.4 数据存储设计

**数据库：SQLite（位于用户数据目录）**

```sql
-- 项目表
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,          -- manga_2d / manga_3d / live_action
    style TEXT,
    cover_path TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- 集数表
CREATE TABLE episodes (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    episode_no INTEGER,
    title TEXT,
    status TEXT         -- draft / storyboard / generating / done
);

-- 剧本表
CREATE TABLE scripts (
    id TEXT PRIMARY KEY,
    episode_id TEXT REFERENCES episodes(id),
    content TEXT,       -- 原始文本
    structured JSON,    -- AI 解析后的结构化数据
    version INTEGER,
    created_at DATETIME
);

-- 资产表
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    type TEXT,          -- character / scene / prop
    name TEXT,
    description TEXT,
    prompt TEXT,
    reference_image_path TEXT,
    tts_config JSON,
    tags TEXT,          -- JSON array
    created_at DATETIME
);

-- 资产变体表（子形态）
CREATE TABLE asset_variants (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES assets(id),
    label TEXT,         -- 默认/愤怒/夜晚版本等
    image_path TEXT,
    prompt TEXT
);

-- 分镜卡片表
CREATE TABLE boards (
    id TEXT PRIMARY KEY,
    episode_id TEXT REFERENCES episodes(id),
    shot_id TEXT,
    order_index INTEGER,
    image_path TEXT,
    prompt TEXT,
    characters JSON,    -- 关联资产 id 列表
    scene_id TEXT,
    camera_angle TEXT,
    shot_size TEXT,
    duration_sec REAL,
    dialogue TEXT,
    notes TEXT
);

-- 生成任务表
CREATE TABLE gen_tasks (
    id TEXT PRIMARY KEY,
    type TEXT,          -- image / video / tts / script
    status TEXT,        -- pending / running / done / failed
    provider TEXT,      -- kling / vidu / claude / etc.
    input_params JSON,
    output_path TEXT,
    error_msg TEXT,
    cost_estimate REAL,
    created_at DATETIME,
    finished_at DATETIME
);

-- API 配置表（加密存储）
CREATE TABLE api_configs (
    id TEXT PRIMARY KEY,
    provider TEXT UNIQUE,
    config JSON         -- 加密后的 JSON（含 api_key 等）
);
```

### 4.5 文件目录结构

```
{用户数据目录}/DramaForge/
├── database.db                 # SQLite 数据库
├── projects/
│   └── {project_id}/
│       ├── cover.jpg
│       ├── episodes/
│       │   └── {episode_id}/
│       │       ├── script_v1.json
│       │       ├── boards/
│       │       │   ├── board_001.png
│       │       │   └── ...
│       │       └── videos/
│       │           ├── shot_001.mp4
│       │           └── ...
│       └── assets/
│           ├── characters/
│           ├── scenes/
│           └── props/
├── exports/                    # 导出的成片
├── cache/                      # API 响应缓存
└── logs/                       # 运行日志
```

---

## 五、API 接入规避风险方案

### 规避版权/功能抄袭风险的设计差异化

| 方面 | 万兴剧厂 | DramaForge 差异化设计 |
|------|---------|----------------------|
| 商业模式 | SaaS 订阅 + 积分 | 用户自持 API Key，无平台抽成 |
| 数据 | 云端存储 | 完全本地，无数据上传 |
| AI 接入 | 平台直采 API | 用户填写自己的 Key，支持任意兼容接口 |
| 团队协同 | 在线多人协同 | 本地单机（v2 可加局域网协同）|
| 资产一致性 | 自研算法 | 通过 IP-Adapter / 参考图机制实现 |
| 界面语言 | 中文在线平台风格 | 独立设计系统，暗色主题工作站风格 |
| 功能（流程） | 功能本身不受版权保护 | 自主实现，代码完全独立 |

### API Key 安全存储
- 使用 Tauri 的 `keyring` 插件或 SQLite AES 加密存储 API Key
- 不明文写入任何配置文件
- 内存中使用后即清除

---

## 六、本地模型集成方案

### 为什么支持本地模型？
- 用户可以零费用运行，完全免 API 成本
- 创作内容不离开本机，隐私最高
- 网络不稳定时依然可用

### 本地模型支持清单

| 模型类型 | 推荐方案 | 接入方式 |
|---------|---------|---------|
| 本地 LLM（剧本） | Ollama（Qwen2.5/Llama3/DeepSeek-R2） | HTTP API localhost:11434 |
| 本地图像生成 | ComfyUI（Flux/SDXL） | HTTP API localhost:8188 |
| 本地图像生成备选 | SD WebUI A1111 | HTTP API localhost:7860 |
| 本地视频生成 | Wan2.1（需 GPU 12GB+） | HTTP API 自定义端口 |
| 本地 TTS | Edge-TTS（免费）/ CosyVoice | 子进程调用 / HTTP API |
| 本地语音识别 | faster-whisper（Whisper 加速版）| Python 直调 |

### GPU 要求说明
- **无 GPU**：仅可用文本 API（Ollama CPU 模式 + 全部云端 API）
- **4GB VRAM**：可运行 SD1.5 本地图像生成
- **8GB VRAM**：可运行 SDXL、Flux.1-schnell
- **12GB+ VRAM**：可运行 Wan2.1 本地视频生成
- **24GB+ VRAM**：可运行 CogVideoX-5b 等大型视频模型

---

## 七、开发阶段规划

### Phase 1 — 基础框架 + 项目管理（2周）
- [ ] Tauri + React + TypeScript 项目初始化
- [ ] Python FastAPI 后端初始化
- [ ] SQLite 数据库初始化
- [ ] 项目管理 CRUD（创建、列表、删除）
- [ ] 设置中心：API Key 配置界面
- [ ] API 连通性测试功能
- [ ] 应用打包脚本（含 Python 内嵌）

### Phase 2 — 剧本工坊（2周）
- [ ] 文件导入（txt/docx/pdf 解析）
- [ ] LLM 调用封装（支持多模型切换）
- [ ] AI 剧本拆解（角色/世界观/分集）
- [ ] 分镜脚本生成
- [ ] 富文本编辑器
- [ ] 版本管理

### Phase 3 — 资产库（2周）
- [ ] AI 资产提取（从剧本）
- [ ] 图像生成 API 封装（多提供商）
- [ ] 资产管理界面（CRUD + 变体管理）
- [ ] 资产标签与搜索
- [ ] ComfyUI / SD WebUI 本地接入

### Phase 4 — 分镜画板（2周）
- [ ] 拖拽看板 UI
- [ ] 分镜卡片 AI 批量生成
- [ ] 多视角衍生功能
- [ ] 卡片编辑与重生成
- [ ] 时间轴视图

### Phase 5 — 视频生成 + 生成中心（2周）
- [ ] 视频 API 封装（Kling/Vidu/Runway/Pika）
- [ ] 任务队列管理 UI
- [ ] 批量生成 + 并发控制
- [ ] 费用预估显示
- [ ] 本地视频模型接入

### Phase 6 — 音频 + 后期合成（2周）
- [ ] TTS API 封装（多提供商）
- [ ] 字幕自动生成（Whisper）
- [ ] 简易时间轴编辑器
- [ ] FFmpeg 合成导出
- [ ] 导出 SRT 字幕文件

### Phase 7 — 打磨 + 打包（1周）
- [ ] 全平台打包（Windows / macOS / Linux）
- [ ] 首次运行引导（配置 API Key）
- [ ] 错误处理 & 用户友好提示
- [ ] 性能优化

**总计预估开发时长：约 13 周（单人全栈）**

---

## 八、目录结构设计

```
dramaforge/
├── apps/
│   ├── desktop/                    # Tauri + React
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Projects/       # 项目管理
│   │   │   │   ├── Script/         # 剧本工坊
│   │   │   │   ├── Assets/         # 资产库
│   │   │   │   ├── Storyboard/     # 分镜画板
│   │   │   │   ├── Generate/       # 生成中心
│   │   │   │   ├── Compose/        # 后期合成
│   │   │   │   └── Settings/       # 设置中心
│   │   │   ├── components/         # 共用组件
│   │   │   ├── stores/             # Zustand 状态
│   │   │   ├── hooks/              # 自定义 Hook
│   │   │   └── lib/                # 工具函数
│   │   └── src-tauri/              # Rust 核心
│   └── backend/                    # Python FastAPI
│       ├── api/
│       │   ├── routes/
│       │   │   ├── projects.py
│       │   │   ├── scripts.py
│       │   │   ├── assets.py
│       │   │   ├── boards.py
│       │   │   ├── generate.py
│       │   │   └── settings.py
│       │   └── models/
│       ├── services/
│       │   ├── llm/                # LLM 调用服务
│       │   ├── image_gen/          # 图像生成服务
│       │   ├── video_gen/          # 视频生成服务
│       │   ├── tts/                # 配音服务
│       │   └── media/              # FFmpeg 处理
│       ├── db/                     # SQLAlchemy 模型
│       └── main.py
└── scripts/
    ├── build.sh                    # 构建脚本
    └── dev.sh                      # 开发启动脚本
```

---

*DramaForge 设计文档 v1.0 — 所有功能均为独立实现，不使用万兴科技任何代码或资产*
