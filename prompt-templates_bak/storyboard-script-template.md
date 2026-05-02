# 分镜脚本完整模板库
> 收集整理：2026-04-23 | 用于DramaForge项目

## 📋 标准分镜脚本格式

### YAML格式分镜脚本

```yaml
# storyboard_script.yaml

project:
  title: "项目名称"
  episode: "EP01"
  total_shots: 24
  aspect_ratio: "16:9"
  style: "anime"

scenes:
  - scene_id: "SC01"
    scene_name: "开场-城市清晨"
    location: "城市天台"
    time: "清晨"
    mood: "宁静"
    shots:
      - shot_id: "SC01_SH001"
        type: "establishing_shot"
        angle: "high_angle"
        movement: "static"
        duration: "3s"
        description: "城市全景，晨光初现"
        dialogue: null
        notes: "建立场景氛围"
        
      - shot_id: "SC01_SH002"
        type: "wide_shot"
        angle: "eye_level"
        movement: "slow_push_in"
        duration: "5s"
        description: "主角站在天台边缘，望向远方"
        dialogue: null
        character: "CHAR_001"
        notes: "人物出场，逆光效果"

  - scene_id: "SC02"
    scene_name: "相遇-街道"
    location: "城市街道"
    time: "白天"
    mood: "活泼"
    shots:
      - shot_id: "SC02_SH001"
        type: "medium_shot"
        angle: "eye_level"
        movement: "tracking"
        duration: "4s"
        description: "主角A从左侧走入画面"
        dialogue: null
        character: "CHAR_001"
        
      - shot_id: "SC02_SH002"
        type: "medium_shot"
        angle: "eye_level"
        movement: "static"
        duration: "3s"
        description: "主角B从右侧走入画面"
        dialogue: null
        character: "CHAR_002"
        
      - shot_id: "SC02_SH003"
        type: "two_shot"
        angle: "eye_level"
        movement: "static"
        duration: "5s"
        description: "两人面对面站立"
        dialogue: 
          - speaker: "CHAR_001"
            line: "你好，很高兴见到你"
          - speaker: "CHAR_002"
            line: "我也是，好久不见"

characters:
  - id: "CHAR_001"
    name: "主角A"
    description: "短发黑色，蓝色眼睛，红色卫衣"
    reference_image: "ref/char_001.png"
    
  - id: "CHAR_002"
    name: "主角B"
    description: "长发棕色，绿色眼睛，蓝色外套"
    reference_image: "ref/char_002.png"
```

### JSON格式分镜脚本

```json
{
  "project": {
    "title": "项目名称",
    "episode": "EP01",
    "total_shots": 24,
    "aspect_ratio": "16:9",
    "style": "anime"
  },
  "scenes": [
    {
      "scene_id": "SC01",
      "scene_name": "开场-城市清晨",
      "location": "城市天台",
      "time": "清晨",
      "mood": "宁静",
      "shots": [
        {
          "shot_id": "SC01_SH001",
          "type": "establishing_shot",
          "angle": "high_angle",
          "movement": "static",
          "duration": "3s",
          "description": "城市全景，晨光初现",
          "dialogue": null,
          "notes": "建立场景氛围",
          "prompt": {
            "subject": "city skyline at dawn",
            "environment": "urban rooftop, morning light",
            "action": "static establishing shot",
            "emotion": "peaceful, serene",
            "technical": "wide shot, high angle, 16:9, cinematic"
          }
        }
      ]
    }
  ],
  "characters": [
    {
      "id": "CHAR_001",
      "name": "主角A",
      "description": "短发黑色，蓝色眼睛，红色卫衣",
      "reference_image": "ref/char_001.png",
      "locked_prompt": "short black hair, blue eyes, wearing red hoodie, anime style character"
    }
  ]
}
```

---

## 📐 分镜镜头类型库

### 景别完整列表

```markdown
## 景别分类 (Shot Types)

### 远景系列
| 类型 | 英文 | 描述 | 用途 |
|------|------|------|------|
| 大远景 | extreme wide shot (XWS) | 展现宏大环境 | 地理建立 |
| 远景 | wide shot (WS) | 主体+环境关系 | 场景建立 |
| 全景 | full shot (FS) | 主体完整可见 | 人物出场 |

### 中景系列
| 类型 | 英文 | 描述 | 用途 |
|------|------|------|------|
| 中远景 | medium wide shot (MWS) | 膝盖以上 | 行走/站立 |
| 中景 | medium shot (MS) | 腰部以上 | 对话互动 |
| 中近景 | medium close up (MCU) | 胸部以上 | 情绪表达 |

### 近景系列
| 类型 | 英文 | 描述 | 用途 |
|------|------|------|------|
| 近景 | close up (CU) | 头肩特写 | 情绪强调 |
| 特写 | extreme close up (ECU) | 极近距离 | 细节展示 |
| 大特写 | insert shot | 局部细节 | 物品强调 |

### 特殊镜头
| 类型 | 英文 | 描述 | 用途 |
|------|------|------|------|
| 过肩镜头 | over the shoulder (OTS) | 背对视角 | 对话切换 |
| 双人镜头 | two shot | 两人同框 | 互动展示 |
| 三人镜头 | three shot | 三人同框 | 群体关系 |
| 主观镜头 | POV shot | 第一人称 | 代入感 |
| 反应镜头 | reaction shot | 情绪反应 | 情感反馈 |
```

### 角度完整列表

```markdown
## 角度分类 (Camera Angles)

### 基础角度
| 类型 | 英文 | 描述 | 情感效果 |
|------|------|------|---------|
| 平视 | eye level | 正常高度 | 真实/中性 |
| 俯视 | high angle | 从上往下 | 压迫/渺小 |
| 仰视 | low angle | 从下往上 | 崇高/强大 |
| 侧视 | side angle | 侧面视角 | 轮廓展示 |

### 特殊角度
| 类型 | 英文 | 描述 | 情感效果 |
|------|------|------|---------|
| 斜角 | dutch angle / tilted | 斜构图 | 不安/混乱 |
| 鸟瞰 | bird's eye view | 极高俯视 | 全局视角 |
| 蜗牛视角 | worm's eye view | 极低仰视 | 极端强调 |
| 俯拍 | overhead shot | 正上方 | 平面展示 |
```

### 运镜完整列表

```markdown
## 运镜分类 (Camera Movements)

### 镜头移动
| 类型 | 英文 | 描述 | 效果 |
|------|------|------|------|
| 推镜 | push in / dolly in | 镜头前移 | 强调/聚焦 |
| 拉镜 | pull out / dolly out | 镜头后退 | 信息扩展 |
| 摇镜 | pan (L/R) | 水平旋转 | 场景扫描 |
| 移镜 | tilt (U/D) | 垂直旋转 | 高度展示 |

### 轨道移动
| 类型 | 英文 | 描述 | 效果 |
|------|------|------|------|
| 跟拍 | tracking shot | 沿轨跟随 | 动态跟随 |
| 环绕 | orbit shot | 围绕主体 | 全面展示 |
| 曲线 | curved dolly | 曲线轨迹 | 流动感 |
| 直线 | linear dolly | 直线移动 | 简洁推进 |

### 特殊运镜
| 类型 | 英文 | 描述 | 效果 |
|------|------|------|------|
| 手持 | handheld | 模拟抖动 | 真实感 |
| 斯坦尼康 | steadicam | 平稳跟随 | 流畅动感 |
| 升降 | crane shot | 垂直升降 | 空间展示 |
| 组合 | combined movement | 多种组合 | 复杂叙事 |
```

---

## 🎬 场景模板库

### 开场场景模板

```yaml
# 开场模板 - establishing_scene.yaml

scene_template:
  name: "标准开场"
  purpose: "建立场景氛围，引入观众"
  
  shot_sequence:
    - shot_1:
      type: "extreme_wide_shot"
      angle: "high_angle"
      movement: "static_or_slow_pan"
      duration: "3-5s"
      focus: "环境全景"
      notes: "建立地理位置和时间"
      
    - shot_2:
      type: "wide_shot"
      angle: "eye_level"
      movement: "slow_push_in"
      duration: "4-6s"
      focus: "主要场景"
      notes: "聚焦故事发生地"
      
    - shot_3:
      type: "medium_shot"
      angle: "eye_level"
      movement: "static"
      duration: "3-4s"
      focus: "人物引入"
      notes: "主角首次出现"
      
  emotional_arc: "好奇 → 关注 → 代入"
  lighting: "自然光为主，配合时间设定"
  sound: "环境音效，建立空间感"
```

### 对话场景模板

```yaml
# 对话模板 - conversation_scene.yaml

scene_template:
  name: "A/B对话"
  purpose: "两人对话互动"
  
  shot_sequence:
    - shot_1:
      type: "two_shot"
      angle: "eye_level"
      movement: "static"
      duration: "2-3s"
      notes: "建立对话关系"
      
    - shot_2:
      type: "over_the_shoulder_A"
      angle: "eye_level"
      movement: "static"
      duration: "对话长度"
      speaker: "A"
      notes: "A发言，看向B"
      
    - shot_3:
      type: "over_the_shoulder_B"
      angle: "eye_level"
      movement: "static"
      duration: "对话长度"
      speaker: "B"
      notes: "B发言，看向A"
      
    - shot_4:
      type: "close_up_A"
      angle: "eye_level"
      movement: "static"
      duration: "关键时刻"
      notes: "A情绪特写"
      
    - shot_5:
      type: "close_up_B"
      angle: "eye_level"
      movement: "static"
      duration: "关键时刻"
      notes: "B情绪特写"
      
    - shot_6:
      type: "two_shot"
      angle: "eye_level"
      movement: "pull_out"
      duration: "2-3s"
      notes: "对话结束，关系总结"
      
  180_degree_rule: "严格遵守轴线原则"
  cutting_pattern: "A-B交替，情绪点特写插入"
```

### 动作场景模板

```yaml
# 动作模板 - action_scene.yaml

scene_template:
  name: "战斗/运动"
  purpose: "动态动作展示"
  
  shot_sequence:
    - shot_1:
      type: "medium_shot"
      angle: "low_angle"
      movement: "static"
      duration: "1-2s"
      notes: "准备姿态，强调力量"
      
    - shot_2:
      type: "wide_shot"
      angle: "eye_level"
      movement: "tracking"
      duration: "动作时长"
      notes: "动作全景，跟随运动"
      
    - shot_3:
      type: "close_up"
      angle: "dynamic_angle"
      movement: "fast_push"
      duration: "0.5-1s"
      notes: "关键动作瞬间"
      
    - shot_4:
      type: "extreme_close_up"
      angle: "eye_level"
      movement: "static"
      duration: "0.5s"
      notes: "细节强调（拳头/眼神）"
      
    - shot_5:
      type: "medium_shot"
      angle: "low_angle"
      movement: "static"
      duration: "1-2s"
      notes: "结果展示，胜利姿态"
      
  cutting_speed: "快速剪辑，节奏紧凑"
  camera_energy: "与动作同步，动态角度"
  sound_design: "音效强化，节奏配合"
```

### 情绪场景模板

```yaml
# 情绪模板 - emotional_scene.yaml

scene_template:
  name: "情感表达"
  purpose: "人物内心情感展示"
  
  shot_sequence:
    - shot_1:
      type: "medium_shot"
      angle: "eye_level"
      movement: "static"
      duration: "3-4s"
      notes: "情绪建立，姿态展示"
      
    - shot_2:
      type: "close_up"
      angle: "eye_level"
      movement: "slow_push_in"
      duration: "5-8s"
      notes: "情绪聚焦，面部表情"
      
    - shot_3:
      type: "extreme_close_up"
      angle: "eye_level"
      movement: "static"
      duration: "2-3s"
      focus: "眼睛特写"
      notes: "情感深处"
      
    - shot_4:
      type: "medium_close_up"
      angle: "eye_level"
      movement: "slow_pull_out"
      duration: "4-6s"
      notes: "情绪释放，回归环境"
      
  camera_speed: "缓慢平滑，情绪同步"
  lighting: "配合情绪色调（暖色积极/冷色消极）"
  depth_of_field: "浅景深，聚焦人物"
```

---

## 🎭 角色描述模板库

### 角色档案模板

```yaml
# 角色模板 - character_profile.yaml

character:
  id: "CHAR_001"
  name: "角色名称"
  
  # 外观特征
  appearance:
    age: "18-25岁"
    gender: "女性"
    height: "中等"
    body_type: "纤细"
    
    face:
      hair_color: "黑色"
      hair_style: "短发"
      eye_color: "蓝色"
      eye_shape: "圆形"
      skin_tone: "浅色"
      features: [樱花发夹]
      
    clothing:
      main: "红色卫衣"
      secondary: "黑色牛仔裤"
      accessories: "白色运动鞋"
      
  # 性格特征
  personality:
    traits: ["活泼", "开朗", "勇敢"]
    mood_default: "愉快"
    mood_range: ["开心", "焦虑", "悲伤"]
    
  # 锁定提示词
  locked_prompt:
    visual: "short black hair, blue eyes, red hoodie, black jeans, white sneakers, sakura hair clip, anime style, 18 years old female"
    expression_happy: "cheerful expression, bright smile, energetic pose"
    expression_sad: "sad expression, tears in eyes, melancholic pose"
    expression_angry: "angry expression, intense eyes, determined pose"
    
  # 参考图
  reference_images:
    main: "ref/char_001_main.png"
    expressions: "ref/char_001_expressions.png"
    outfits: "ref/char_001_outfits.png"
```

### 角色表情库

```markdown
## 表情关键词对照表

| 表情 | 英文提示词 | 中文描述 |
|------|-----------|---------|
| 快乐 | happy, joyful, cheerful, smiling | 开心微笑 |
| 大笑 | laughing, big smile, beaming | 大笑灿烂 |
| 悲伤 | sad, melancholic, sorrowful | 悲伤忧郁 |
| 哭泣 | crying, tears, weeping | 泪流满面 |
| 愤怒 | angry, furious, enraged | 愤怒激动 |
| 惊讶 | surprised, shocked, amazed | 惊讶震惊 |
| 恐惧 | fearful, scared, terrified | 惊恐害怕 |
| 平静 | calm, peaceful, serene | 平静安宁 |
| 思考 | thoughtful, contemplating, pondering | 沉思思考 |
| 害羞 | shy, embarrassed, blushing | 害羞脸红 |
| 坚定 | determined, resolute, firm | 坚定果决 |
| 疲惫 | tired, exhausted, weary | 疲惫劳累 |
```

---

## 🌅 环境场景模板库

### 时间氛围模板

```yaml
# 时间模板 - time_settings.yaml

time_settings:
  dawn:
    english: "dawn, sunrise, early morning"
    lighting: "金色柔光，逆光效果"
    mood: "希望，新生"
    color_palette: ["金色", "粉色", "淡蓝"]
    
  morning:
    english: "morning, mid-morning, bright daylight"
    lighting: "明亮自然光"
    mood: "清新，活力"
    color_palette: ["白色", "浅蓝", "绿色"]
    
  afternoon:
    english: "afternoon, midday, noon"
    lighting: "强烈阳光"
    mood: "热情，活跃"
    color_palette: ["黄色", "橙色", "白色"]
    
  sunset:
    english: "sunset, golden hour, dusk"
    lighting: "金橙色暖光"
    mood: "浪漫，温情"
    color_palette: ["金色", "橙色", "红色"]
    
  evening:
    english: "evening, twilight, dusk"
    lighting: "柔和暮光"
    mood: "温馨，宁静"
    color_palette: ["紫色", "深蓝", "橙色"]
    
  night:
    english: "night, midnight, dark"
    lighting: "月光，人造光"
    mood: "神秘，浪漫"
    color_palette: ["深蓝", "黑色", "霓虹"]
```

### 天气氛围模板

```yaml
# 天气模板 - weather_settings.yaml

weather_settings:
  clear:
    english: "clear sky, sunny, bright"
    lighting: "明亮均匀"
    mood: "开朗，积极"
    
  cloudy:
    english: "cloudy, overcast, gray sky"
    lighting: "柔和漫射"
    mood: "中性，平静"
    
  rainy:
    english: "rainy, raining, storm"
    lighting: "暗淡，水光反射"
    mood: "忧郁，紧张"
    
  snowy:
    english: "snowy, snowfall, winter"
    lighting: "明亮冷色"
    mood: "宁静，纯净"
    
  stormy:
    english: "stormy, thunder, dramatic sky"
    lighting: "戏剧性闪电"
    mood: "紧张，危机"
```

### 地点场景库

```markdown
## 场地类型关键词

### 城市场景
| 类型 | 英文提示词 | 中文描述 |
|------|-----------|---------|
| 街道 | city street, urban road | 城市街道 |
| 天台 | rooftop, urban rooftop | 建筑天台 |
| 公园 | city park, urban park | 城市公园 |
| 地铁 | subway station, metro | 地铁车站 |
| 商场 | shopping mall, commercial area | 商业区域 |
| 学校 | school, classroom, campus | 学校校园 |

### 自然场景
| 类型 | 英文提示词 | 中文描述 |
|------|-----------|---------|
| 森林 | forest, woods, woodland | 森林树林 |
| 山脉 | mountain, mountain range | 山峦 |
| 海滩 | beach, seaside, ocean | 海边沙滩 |
| 河流 | river, stream, creek | 河流溪流 |
| 草原 | meadow, grassland, field | 草原田野 |
| 沙漠 | desert, sandy landscape | 沙漠 |

### 室内场景
| 类型 | 英文提示词 | 中文描述 |
|------|-----------|---------|
| 客厅 | living room, home interior | 家庭客厅 |
| 咖啡馆 | cafe, coffee shop | 咖啡店 |
| 餐厅 | restaurant, dining room | 餐厅 |
| 办公室 | office, workplace | 工作场所 |
| 医院 | hospital, medical room | 医院病房 |
| 工厂 | factory, industrial building | 工业建筑 |
```

---

## 📊 分镜输出格式

### PDF分镜表格式

```
┌────────────────────────────────────────────────────┐
│ 项目: [项目名称]  场次: SC01  镜号: SC01_SH001    │
├────────────────────────────────────────────────────┤
│                                                    │
│    [分镜图预览区域 - 16:9比例]                     │
│                                                    │
├────────────────────────────────────────────────────┤
│ 景别: [远景/中景/近景]                             │
│ 角度: [平视/俯视/仰视]                             │
│ 运镜: [固定/推/拉/摇]                              │
│ 时长: [秒数]                                       │
├────────────────────────────────────────────────────┤
│ 描述: [画面描述内容]                               │
│                                                    │
│ 对话: [对话内容(如有)]                             │
│                                                    │
│ 备注: [特殊说明]                                   │
└────────────────────────────────────────────────────┘
```

### 表格格式导出

| 镜号 | 景别 | 角度 | 运镜 | 时长 | 描述 | 对话 | 备注 |
|------|------|------|------|------|------|------|------|
| SC01_SH001 | 远景 | 俯视 | 固定 | 3s | 城市全景 | - | 建立场景 |
| SC01_SH002 | 全景 | 平视 | 推镜 | 5s | 主角出场 | - | 人物引入 |
| SC02_SH001 | 中景 | 平视 | 固定 | 4s | 两人对话 | "你好" | 对话开始 |

---

## 📚 分镜资源推荐

### 专业分镜工具
- **Boords** (https://boords.com) - 11年经验，1M+用户
- **StudioBinder** (https://www.studiobinder.com) - 电影级协作
- **Storyboard That** (https://www.storyboardthat.com) - 教育市场首选

### 学习资源
- StudioBinder分镜教程: https://www.studiobinder.com/blog/how-to-make-storyboard
- Boords分镜指南: https://boords.com/how-to-storyboard
- StudioBinder50+案例库: https://www.studiobinder.com/examples/storyboard-examples

---

## 💡 最佳实践

### 分镜设计原则
1. **叙事清晰** - 每个镜头服务于故事
2. **节奏合理** - 镜头长短配合叙事节奏
3. **情感连贯** - 角度和运镜配合情绪
4. **技术可行** - 考虑实际拍摄可能性
5. **成本控制** - 合理安排复杂镜头数量

### 常见问题避免
1. **轴线穿越** - 严格遵守180度原则
2. **跳接** - 相邻镜头景别差异明显
3. **信息冗余** - 避免无意义的重复镜头
4. **节奏混乱** - 保持剪辑节奏一致
5. **忽视声音** - 记录对话和音效需求

---

*此模板库可根据项目需求灵活调整和扩展*