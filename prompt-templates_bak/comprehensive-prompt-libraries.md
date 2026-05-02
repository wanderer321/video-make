# 综合性提示词库资源汇总
> 收集整理：2026-04-23 | "拿来主义"直接可用渠道

---

## 🌟 世界级提示词库 (推荐直接使用)

### 1. prompts.chat (⭐ 143k+ GitHub Stars)

| 特点 | 详情 |
|------|------|
| **地位** | 世界最大的开源提示词库 |
| **历史** | 第一个提示词库 (Dec 2022) |
| **认证** | GitHub Staff Pick、哈佛/哥伦比亚引用 |
| **支持** | ChatGPT、Claude、Gemini、Llama、Mistral等 |
| **格式** | CSV、MD、Hugging Face Dataset |

**直接获取地址：**
```
官网浏览：https://prompts.chat/prompts
GitHub Raw：https://raw.githubusercontent.com/f/prompts.chat/main/PROMPTS.md
CSV格式：https://github.com/f/prompts.chat/blob/main/prompts.csv
HuggingFace：https://huggingface.co/datasets/fka/prompts.chat
```

**特色内容：**
- 角色扮演提示词 (Linux Terminal、English Translator、Job Interviewer等)
- 技术开发提示词 (Ethereum Developer、JavaScript Console等)
- 创意生成提示词 (Storyteller、Stand-up Comedian、Composer等)
- 教育辅助提示词 (Math Teacher、Philosophy Teacher等)

**集成方式：**
```bash
# MCP Server集成
{
  "mcpServers": {
    "prompts.chat": {
      "url": "https://prompts.chat/api/mcp"
    }
  }
}

# Claude插件
/plugin marketplace add f/prompts.chat
/plugin install prompts.chat@prompts.chat

# 本地部署
npx prompts.chat new my-prompt-library
```

---

### 2. WayToAGI 中文提示词库 (🇨🇳)

| 特点 | 详情 |
|------|------|
| **定位** | 中文社区精选提示词 |
| **特色** | Deep Research深度研究系列 |
| **入口** | https://www.waytoagi.com/prompts |

**精选提示词列表：**

#### 🔬 Deep Research 系列 (深度研究)
| 提示词 | 用途 |
|--------|------|
| `Writing a Novel` | 小说创作研究 |
| `News Integration` | 新闻整合爬取 |
| `Product Comparison` | 产品对比分析 |
| `Social Opinion Analysis` | 社交舆情分析 |
| `Learning Route Planning` | 学习路线规划 |
| `Fact-checking` | 事实核查辟谣 |
| `Historical Events` | 历史事件研究 |
| `Equity Investment` | 股权投资研究 |
| `Academic Literature` | 学术文献综述 |
| `Competitive Market Analysis` | 竞品市场分析 |

#### 🎨 可视化设计系列
| 提示词 | 用途 |
|--------|------|
| `Generate Charts` | 数据可视化图表 |
| `Generate Presentation PPT` | RevealJS演示文稿 |
| `SVG Poster Design` | SVG海报设计 |
| `Visualization Pages v3` | 可视化网页 |
| `Article Concept Cards` | 文章概念卡片 |
| `Turn document to visual page` | 文档可视化网页 |

#### 🧠 思维分析系列 (李继刚)
| 提示词 | 用途 |
|--------|------|
| `The Cone of Doubt` | 七武器-怀疑锥 |
| `Blades of Logic` | 逻辑刃解码 |
| `Particulars` | 细节描述 |
| `Indulge in flights of fancy` | 想象力放飞 |
| `Meta-Claude` | 元思考 |
| `First Principle` | 第一性原理 |
| `Programmer's Calendar` | 程序员日历 |
| `Weekly Reports` | 心里话转周报 |
| `Divine using trigrams` | 稳定输出八卦 |
| `Sketch Artist` | 苦中作乐画师 |
| `Branching of disciplines` | 学科分支介绍 |
| `Conceptualization` | 三公理十内核 |
| `The Bow of Analogy` | 复杂表象类比 |
| `The Spear of Definition` | 定义之矛 |
| `The Mirror of Perspective` | 视角之镜 |

---

### 3. Awesome ChatGPT (sindresorhus/awesome-chatgpt)

**资源分类：**

#### 📱 Apps 应用
| 类别 | 推荐 |
|------|------|
| **Native macOS** | QuickGPT、MacGPT、Chatterbox、WriteMage、PaletteBrain |
| **Native iOS** | Petey、Ask AI、Chat Answer |
| **Native Android** | ChatGPT Android、ChatBoost |
| **Cross-platform** | Chatbox、ChatGPT Desktop (Electron) |

#### 🌐 Web Apps
| 名称 | 特点 |
|------|------|
| ShareGPT | 分享对话链接 |
| Anse | 替代Web UI |
| chatbot-ui | 替代Web UI |
| ChatGPT Next Web | 替代Web UI |
| DocsGPT | 文档助手 |
| AgentGPT | 自主AI Agent |
| OpenAgents | 开源ChatGPT Plus复刻 |
| TypingMind | 替代Web UI |

#### 🔌 Extensions 扩展
| 类别 | 工具 |
|------|------|
| **Browser** | ChatGPT for Google、ChatGPT Box、Superpower ChatGPT |
| **VSCode** | mpociot/chatgpt-vscode、gencay/vscode-chatgpt |
| **Vim/Neovim** | vim-chatgpt、ChatGPT.nvim |
| **JetBrains** | ChatGPT Jetbrains |
| **Google Docs** | DocGPT |
| **Microsoft Word** | WordGPT |
| **Unity** | AICommand、AI Shader |

#### 🤖 Bots 机器人
| 平台 | 项目 |
|------|------|
| Twitter | chatgpt-twitter-bot |
| Telegram | chatgpt-telegram-bot、chatgpt_telegram_bot |
| Slack | myGPTReader、ChatGPTSlackBot |
| Discord | ChatGPT Discord Bot、chatgpt-discord |
| WeChat | wechat-chatgpt |
| Kubernetes | kubernetes-chatgpt-bot |
| GitHub Actions | CodeReview Bot、openai-pr-reviewer |

---

## 📋 Awesome ChatGPT Prompts 热门提示词精选

### 🎭 角色扮演类 (直接复制使用)

```markdown
## Linux Terminal
I want you to act as a linux terminal. I will type commands and you will reply 
with what the terminal should show. I want you to only reply with the terminal 
output inside one unique code block, and nothing else. do not write explanations. 
do not type commands unless I instruct you to do so. when i need to tell you 
something in english, i will do so by putting text inside curly brackets {like this}. 
my first command is pwd

---

## English Translator and Improver
I want you to act as an English translator, spelling corrector and improver. 
I will speak to you in any language and you will detect the language, translate 
it and answer in the corrected and improved version of my text, in English. 
I want you to replace my simplified A0-level words and sentences with more 
beautiful and elegant, upper level English words and sentences. Keep the 
meaning same, but make them more literary. I want you to only reply the 
correction, the improvements and nothing else, do not write explanations. 
My first sentence is "istanbulu cok seviyom burada olmak cok guzel"

---

## Job Interviewer
I want you to act as an interviewer. I will be the candidate and you will ask 
me the interview questions for the ${Position:Software Developer} position. 
I want you to only reply as the interviewer. Do not write all the conversation 
at once. I want you to only do the interview with me. Ask me the questions 
and wait for my answers. Do not write explanations. Ask me the questions 
one by one like an interviewer does and wait for my answers. My first sentence is "Hi"

---

## Storyteller
I want you to act as a storyteller. You will come up with entertaining stories 
that are engaging, imaginative and captivating for the audience. It can be 
fairy tales, educational stories or any other type of stories which has the 
potential to capture people's attention and imagination. Depending on the 
target audience, you may choose specific themes or topics for your storytelling 
session e.g., if it's children then you can talk about animals; If it's adults 
then history-based tales might engage them better etc. My first request is 
"I need an interesting story on perseverance."

---

## Stand-up Comedian
I want you to act as a stand-up comedian. I will provide you with some topics 
related to current events and you will use your wit, creativity, and observational 
skills to create a routine based on those topics. You should also be sure to 
incorporate personal anecdotes or experiences into the routine in order to 
make it more relatable and engaging for the audience. My first request is 
"I want an humorous take on politics."

---

## Motivational Coach
I want you to act as a motivational coach. I will provide you with some 
information about someone's goals and challenges, and it will be your job 
to come up with strategies that can help this person achieve their goals. 
This could involve providing positive affirmations, giving helpful advice 
or suggesting activities they can do to reach their end goal. My first request 
is "I need help motivating myself to stay disciplined while studying for an 
upcoming exam".

---

## Travel Guide
I want you to act as a travel guide. I will write you my location and you 
will suggest a place to visit near my location. In some cases, I will also 
give you the type of places I will visit. You will also suggest me places 
of similar type that are close to my first location. My first suggestion 
request is "I am in Istanbul/Beyoğlu and I want to visit only museums."

---

## Advertiser
I want you to act as an advertiser. You will create a campaign to promote 
a product or service of your choice. You will choose a target audience, 
develop key messages and slogans, select the media channels for promotion, 
and decide on any additional activities needed to reach your goals. My first 
suggestion request is "I need help creating an advertising campaign for a 
new type of energy drink targeting young adults aged 18-30."
```

---

## 🔧 技术开发类提示词

```markdown
## Ethereum Developer
Imagine you are an experienced Ethereum developer tasked with creating a 
smart contract for a blockchain messenger. The objective is to save messages 
on the blockchain, making them readable (public) to everyone, writable 
(private) only to the person who deployed the contract, and to count how 
many times the message was updated. Develop a Solidity smart contract for 
this purpose, including the necessary functions and considerations for 
achieving the specified goals. Please provide the code and any relevant 
explanations to ensure a clear understanding of the implementation.

---

## JavaScript Console
I want you to act as a javascript console. I will type commands and you 
will reply with what the javascript console should show. I want you to 
only reply with the terminal output inside one unique code block, and 
nothing else. do not write explanations. do not type commands unless I 
instruct you to do so. when i need to tell you something in english, i 
will do so by putting text inside curly brackets {like this}. my first 
command is console.log("Hello World");

---

## Math Teacher
I want you to act as a math teacher. I will provide some mathematical 
equations or concepts, and it will be your job to explain them in 
easy-to-understand terms. This could include providing step-by-step 
instructions for solving a problem, demonstrating various techniques 
with visuals or suggesting online resources for further study. My first 
request is "I need help understanding how probability works."

---

## UX/UI Developer
I want you to act as a UX/UI developer. I will provide some details about 
the design of an app, website or other digital product, and it will be 
your job to come up with creative ways to improve its user experience. 
This could involve creating prototyping prototypes...

---

## AI Writing Tutor
I want you to act as an AI writing tutor. I will provide you with a student 
who needs help improving their writing and your task is to use artificial 
intelligence tools, such as natural language processing, to give the student 
feedback on how they can improve their composition. You should also use 
your rhetorical knowledge and experience about effective writing techniques...
```

---

## 📊 资源价值对比

| 资源库 | Stars | 特点 | 直接可用 | 推荐度 |
|--------|-------|------|----------|--------|
| **prompts.chat** | 143k+ | 世界最大开源库 | ✅ 完整CSV/MD | ⭐⭐⭐⭐⭐ |
| **WayToAGI** | - | 中文精选、Deep Research | ✅ 可复制 | ⭐⭐⭐⭐⭐ |
| **awesome-chatgpt-prompts** | - | 角色扮演全覆盖 | ✅ Raw MD | ⭐⭐⭐⭐⭐ |
| **awesome-chatgpt** | - | 应用/工具汇总 | ✅ GitHub列表 | ⭐⭐⭐⭐ |
| **Awesome (总目录)** | 300k+ | 所有Awesome列表 | ✅ 导航用 | ⭐⭐⭐⭐ |

---

## 🚀 快速使用指南

### 方式一：直接下载使用
```bash
# 下载完整提示词CSV
curl -O https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv

# 下载Markdown格式
curl -O https://raw.githubusercontent.com/f/prompts.chat/main/PROMPTS.md
```

### 方式二：MCP Server集成
```json
{
  "mcpServers": {
    "prompts.chat": {
      "url": "https://prompts.chat/api/mcp"
    }
  }
}
```

### 方式三：本地部署
```bash
# 创建自己的提示词库
npx prompts.chat new my-prompt-library
cd my-prompt-library
npm install && npm run setup
```

### 方式四：Claude Code插件
```bash
/plugin marketplace add f/prompts.chat
/plugin install prompts.chat@prompts.chat
```

---

## 💡 与DramaForge整合建议

### 短剧/分镜相关提示词提取

从prompts.chat提取可用于DramaForge的提示词：

| 提示词类型 | DramaForge应用 |
|------------|---------------|
| **Storyteller** | 故事脚本生成 |
| **Screenwriter** | 剧本创作 |
| **Novel Writer** | 小说改编短剧 |
| **Character** | 角色扮演对话生成 |
| **Travel Guide** | 场景描述参考 |
| **Advertiser** | 广告植入创意 |

### 推荐整合步骤
```
1. 下载prompts.csv → 筛选创作类提示词
2. WayToAGI Deep Research → 剧本研究分析
3. 可视化提示词 → 分镜板视觉设计
4. 本地部署prompts.chat → 自定义短剧提示词库
```

---

## 📚 相关链接

| 资源 | 链接 |
|------|------|
| **prompts.chat官网** | https://prompts.chat |
| **GitHub仓库** | https://github.com/f/prompts.chat |
| **HuggingFace Dataset** | https://huggingface.co/datasets/fka/prompts.chat |
| **WayToAGI提示词** | https://www.waytoagi.com/prompts |
| **WaytoAGI Wiki** | https://waytoagi.feishu.cn/wiki/QPe5w5g7UisbEkkow8XcDmOpn8e |
| **Awesome ChatGPT** | https://github.com/sindresorhus/awesome-chatgpt |
| **Awesome总目录** | https://github.com/sindresorhus/awesome |
| **提示词工程书籍** | https://fka.gumroad.com/l/art-of-chatgpt-prompting |

---

*本文件整理了可直接"拿来使用"的世界级提示词库资源*

*收集时间：2026-04-23*