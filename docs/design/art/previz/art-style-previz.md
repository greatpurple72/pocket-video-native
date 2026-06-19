# PrevizGate — 美术风格定调

> 本闸门遵循 `_templates/previz-gate.md`。这是 Phase 0 的第一个、也是优先级最高的效果审核。
> 一旦定调,影响:买量素材、性能预算、所有后续 UI/角色/球场效果图、Fab 资源选型。

## 模块:美术风格(Art Direction)
- 关联 Phase / Track:Phase 0 / 贯穿全项目
- 状态:⬜ **待审**(等你选定)
- 审核日期:
- 审核结论:

## 1. 目标
为"实时 11v11 比赛 + SLG 元层 + 全球买量"定一套**统一、可量产(单人+AI)、跨端可跑、买量有竞争力**的视觉基调。

## 2. 候选方向(可视化见 `style-board.svg`)

| 维度 | A 写实/转播级 | **B 风格化半写实(推荐)** | C 卡通/chibi |
|---|---|---|---|
| 参考 | eFootball / EA FC | 略夸张比例 + 干净 PBR | Last War / Kingshot |
| 头身比 | 1:7.5 真实 | 1:6 略夸张更上镜 | 1:3 大头萌 |
| 真足球代入感 | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| 买量/病毒力 | ★★☆☆☆ | ★★★☆☆ | ★★★★★ |
| 跨端性能 | ★★☆☆☆ | ★★★★☆ | ★★★★★ |
| 美术成本 | 最高 | 中 | 最低 |
| **单人+AI 可行性** | ★☆☆☆☆ | **★★★★☆** | ★★★★☆ |

## 3. 推荐方案(及理由)
**核心比赛 = B 风格化半写实;买量小游戏/广告素材 = C chibi(两者解耦)。**

- **为什么核心选 B**:你要的是"亲手踢的实时比赛"代入感,但 A 的拟真度对单人+AI 不现实(动画/材质/捕捉成本极高,移动端跑不动)。B 保留"这是真足球"的观感,同时比例略夸张、色彩更干净饱和 → 更上镜、性能更友好、Fab/Mixamo 现成资源更易适配。
- **为什么买量用 C**:调研显示 Last War 的杀手锏正是 **"广告≠游戏"**——用廉价、爽、病毒化的 chibi/超休闲小游戏素材引流,真实产品是中核 SLG。足球的点球/任意球/过人天然适合做成 chibi 爽点广告。**用 C 做 HookMinigame 与买量素材,不影响核心 B 的体育调性。**
- 这套"核心半写实 + 买量 chibi"的组合,等于**同时拿到 B 的代入感和 C 的买量力**,且都在单人+AI 可达范围内。

## 4. 给你的 AI 绘图工具的提示词(生成真实概念图用)
> 云端我出不了渲染图,这些提示词请丢进 Midjourney/SDXL/你惯用工具,生成后把图放到本目录,我们据此对齐。

**B 核心比赛 - 球员特写**
```
stylized semi-realistic male football player, slightly exaggerated athletic proportions (6 heads tall), clean PBR shading, vibrant but grounded team kit (emerald green + white), modern stadium pitch, soft cinematic rim light, mobile AAA game character render, neutral pose, full body, high detail face but stylized, Unreal Engine 5 look --ar 2:3
```
**B 核心比赛 - 比赛镜头**
```
stylized semi-realistic football match, broadcast camera angle, 11v11, vibrant green pitch, packed stadium bokeh background, dynamic player running with ball, clean readable silhouettes, cinematic lighting, Unreal Engine 5, high fidelity mobile game --ar 16:9
```
**C 买量 chibi - 爽点广告**
```
cute chibi football player, big head 3 heads tall, candy colored kit, exaggerated funny kick animation pose, bright saturated background, hyper-casual mobile ad style, clean vector-like 3D, playful, TikTok ad aesthetic --ar 9:16
```
**SLG 元层 - 俱乐部界面基调(B 风格延伸)**
```
football club management UI hero scene, stylized semi-realistic, modern stadium and training facility, warm prestige lighting, gold and emerald accents, mobile SLG main screen composition, clean readable, Unreal Engine 5 --ar 16:9
```

## 5. 验收标准(你看风格板/概念图时确认)
- [ ] 核心比赛方向:认同 B(还是想偏 A 更写实 / 偏 C 更卡通)?
- [ ] 买量/小游戏用 C chibi 解耦:认同还是想统一一种风格?
- [ ] 色彩基调:emerald green + 干净高饱和,是否 OK?
- [ ] 头身比 1:6 的"略夸张"幅度可接受?

## 6. 用户反馈记录
| 日期 | 反馈 | 处理 |
|---|---|---|

## 7. 批准后
→ 更新 `progress/STATE.md` 的 PrevizGate 段(登记"美术风格已定:核心B/买量C")→ 写入 `design/art/README.md` 作为后续所有美术的基准 → 进入下一个 PrevizGate(球物理+带球手感)。
