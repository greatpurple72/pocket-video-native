# 足球 SLG 手游 —— 竞品与市场深度调研报告

> 版本:v1.0 ｜ 日期:2026-06-19 ｜ 用途:作为开发计划书的决策依据
> 范围:eFootball(实时 3D 比赛标杆) + 无尽冬日 / Last War / Kingshot(SLG 变现标杆)

---

## 0. 一句话结论(给决策者)

这四款产品分属两个完全不同的"物种":
- **eFootball** 是一台**实时 3D 物理体育引擎**,核心壁垒是**操作手感 + 球员养成(Dream Team 抽卡)**;
- **无尽冬日 / Last War / Kingshot** 是**长线 4X/SLG 数值与社交机器**,核心壁垒是**元循环养成 + 联盟 PvP + 买量素材 + 活动运营**。

本项目的**真正机会与最大风险都在同一处**:把"你能亲手踢的实时 3D 比赛"当作 SLG 里的"战斗结算层"。
没有任何一款头部 SLG 让你**真正操作战斗**——这是潜在的差异化王牌;但实时 3D 足球的研发难度,是普通 SLG 战斗的 1~2 个数量级,这对"单人 + AI"是核心约束(见开发计划书)。

---

## 1. eFootball(Konami)—— 实时 3D 比赛 + 球员抽卡标杆

### 1.1 引擎与技术
- 2021 年从自研 Fox Engine 转向 **Unreal Engine 4**,是系列首次用 UE;Konami 已规划向 **UE5 迁移**以提升画质。**→ 直接验证了我们选 UE5 的方向正确。**
- 主机版 **60 FPS**、跨世代匹配;移动版为缩水画质但与 Dream Team 进度互通(**跨平台账号/进度同步**是体育游戏标配预期)。
- F2P + 微交易,免费下载、跨端进度共享。

### 1.2 操作手感(这是体育游戏的命门)
- **精细盘带(finesse dribbling)**:用摇杆细微输入做贴身控球、急停变向过人。
- **传球风险/回报**:直塞球(through ball)讲究时机与力度,踢得准能撕开防线,时机错了被断。
- **体力/疲劳系统**:比赛后段速度与精度下降,需要换人,带来战术深度。
- **Smart Assist(智能辅助)**:让手残党也能打出像样的过人/传球/射门——**这是触屏/手柄双端可玩性的关键平衡设计**。
- 操作分**手动/辅助**多档,适配手柄与触屏。

### 1.3 养成与变现:Dream Team = 足球版抽卡
- **Dream Team** 是核心模式:通过 **Contract(签约)** 抽球员和教练,组建自己的梦之队。
- **eFootball League**:分段位/赛季的排位联赛,赢取 GP(软货币)与 coin。
- 变现:gacha 风格的**随机球包**(randomized packs),用 eFootball Coins 抽稀有球员;球员有"巅峰表现卡"等版本强化。
- **关键洞察**:eFootball 的元循环本质上已经是"抽卡养成 + 排位 PvP"——**与 SLG 的"英雄收集 + 联盟 PvP"在结构上同源**。这正是本项目融合的天然接缝。

### 1.4 对本项目的可借鉴点
| 维度 | 借鉴 |
|---|---|
| 引擎 | UE5,印证选型 |
| 手感 | finesse 盘带 + 风险传球 + 体力系统 + 智能辅助多档 |
| 养成 | 球员抽卡 = SLG 英雄抽卡,可直接映射 |
| 双端 | 触屏需"智能辅助 + 一键操作",手柄需"全手动" |

---

## 2. 无尽冬日(Whiteout Survival,Century Games)—— SLG 变现天花板

### 2.1 体量(为什么要学它)
- 生命周期累计收入 **约 34 亿美元**,2025 年单年约 **14.9 亿美元**(峰值月 ~2.06 亿,2025-03);截至 2025-12 累计破 **40 亿美元**。
- **每次下载收入 ~$18**、**DAU/MAU > 24%**——粘性极强,核心用户登录管理基地成习惯。
- 纯 **IAP、无广告**(游戏内不投广告,只靠付费加速进度/抽英雄/赢竞技)。

### 2.2 核心循环
- **末世生存主题 + 城建 + 联盟战 + 大众化可达性**。
- 四套装备养成系统(酋长装备、英雄装备、宠物、专家),用高级资源升级;**加速道具**移除一切建造/训练/研究的等待。
- **VIP 体系 + 联盟竞争 + 限时战力爆发**,推动鲸鱼持续付费保持领先。
- **Social Prestige / State Transfer(跨服迁移 + 社交声望)**:把联盟对抗游戏化,给赢家专属皮肤——利用 SLG 最强心理触发器:**联盟竞争**。

### 2.3 留存优化
- QoL(如 Bear Hunt 自动报名)减少机械操作疲劳,让鲸鱼把时间/金钱聚焦在竞技活动而非琐事。
- 事件循环(event loop)在"从核心用户榨取价值"上比竞品更高效。

---

## 3. Last War: Survival(Funfly)—— Hybrid-Casual 买量 + SLG 深度

### 3.1 体量
- 累计约 **35 亿美元**(2025 单年 ~16.5 亿,其最高年);截至 2025-12 下载近 **1.6 亿**、收入破 26 亿(口径不同源略有差异)。
- 2025 多月登顶全球手游收入榜(9 月 ~$1.8 亿,12 月 ~$1.4 亿)。纯 IAP、无广告。

### 3.2 玩法结构(本项目最该学的"漏斗")
- **广告里的超休闲"跑酷/数学射击/左右分兵合并"小游戏**,与真实的基地建造 4X 几乎无关——但**制作便宜、受众极广**,在 TikTok/IG/Snap/FB 病毒式传播。
- **进入游戏后**:超休闲 → 引导建造要塞 → 资源采集/基地建设/聚落管理 → 逐步沉淀为有复杂机制和长线目标的**中核 4X**。
- chibi 3D 卡通画风,融合 runner-shooter + 放置卡牌,**降低策略游戏入门门槛**。

### 3.3 变现
- 纯 IAP。几乎所有维度都可付费:进度、扩张、技能、货币。
- **首充诱导**:$1~$3 低价首单,常含"额外建造队列 + UR 英雄"等高价值内容,撬动首次付费。

### 3.4 对本项目的关键启示
> **"广告小游戏 ≠ 真实玩法"** 是这一代 SLG 买量的核心打法。
> 足球题材天然拥有大量"爽点小游戏"素材库(点球大战、任意球、过人挑战、射门 timing),是**极佳的买量钩子**,而真实产品是 SLG+实时比赛。这是本项目相对纯 SLG 的**买量优势**。

---

## 4. Kingshot(Century Games)—— 最快增长的新王

### 4.1 体量
- 2025-02-24 全球上线,**9 个月破 5 亿**(无尽冬日用了 14 个月达此里程碑),**首年收入超 8.11 亿美元**。
- 月峰值:2025-11 约 **$96.7M**,2026-01 峰值约 **$102M**。与无尽冬日 2026-01 各约 $140M 净收入并列头部。
- 买量:**每天约 2000 条 AI 生成素材**,统治美/日/韩榜单。

### 4.2 玩法
- **4X/SLG + 放置 + 生存 + 塔防**混合,拓宽受众、改善早期留存、创造更多变现入口。
- 玩家重建中世纪王国:资源采集 → 战略建造升级 → **早期就引入可操作的实时塔防战斗**(部署英雄、实时管理) → 后期沉淀为经典 4X(联盟、地图扩张、练兵、PvP)。
- 与无尽冬日同源 4X 地基(基地建造、资源管理、英雄收集、联盟、PvP),但**早期战斗更"可玩"**——印证了"战斗可操作性"是新一代差异化方向(对本项目是强信号)。

---

## 5. 横向对比

| 维度 | eFootball | 无尽冬日 | Last War | Kingshot |
|---|---|---|---|---|
| 品类 | 实时 3D 体育 | 4X SLG | Hybrid-casual 4X | 4X + 塔防/放置 |
| 引擎 | UE4→UE5 | Unity 系 | Unity 系 | Unity 系 |
| 核心壁垒 | 操作手感 + 球员抽卡 | 元循环 + 联盟 PvP + 活动 | 买量漏斗 + 中核深度 | 混合玩法 + AI 买量 |
| 战斗 | **玩家实时操作** | 数值自动结算 | 数值自动结算 | 半实时塔防 |
| 变现 | gacha 球包 | 纯 IAP 付费加速 | 纯 IAP 首充漏斗 | 纯 IAP 混合入口 |
| 量级 | 头部体育 F2P | $40 亿+ | $35 亿+ | 首年 $8 亿+ |

---

## 6. 提炼:头部 SLG 成功的 6 根支柱

1. **元循环养成无底洞**:建造/研究/练兵/装备全部可"加速"付费,时间即金钱。
2. **联盟社交 PvP**:最强留存与付费触发器,跨服迁移/声望放大对抗。
3. **混合玩法降门槛**:塔防/放置/休闲小游戏作为早期"可玩"入口,改善早期留存。
4. **Hybrid-casual 买量漏斗**:廉价、病毒式的小游戏素材引流,真实产品是中核 SLG。
5. **纯 IAP + 首充诱导 + VIP/鲸鱼运营**:低价首单撬动,VIP 体系绑定高价值用户。
6. **高频活动运营(event loop)**:限时活动持续榨取核心用户价值,QoL 降低疲劳。

---

## 7. 对本项目的战略启示(写给计划书)

**机会(Why this could work):**
- 足球题材 = 全球最大体育 IP,自带**情感投入 + 部落归属(俱乐部/国家队)**,天然适配 SLG 的"联盟 = 联赛/足球俱乐部"框架。
- **"可亲手踢的比赛"作为 SLG 战斗层**是头部产品都没有的差异化。Kingshot 用"半实时塔防"就吃到了增长红利,足球实时比赛是更强的钩子。
- 足球自带海量**买量爽点小游戏**(点球/任意球/过人/射门 timing),完美契合 Last War 式 hybrid-casual 漏斗。
- 球员抽卡(eFootball Dream Team)与 SLG 英雄收集**结构同源**,可统一为一套"球员=英雄"养成经济。

**风险(What will kill it if ignored):**
- **实时 3D 足球的研发成本极高**(物理、动画、AI、网络同步),对"单人 + AI"是头号风险 → 计划书必须用**原型优先 + 垂直切片 + 渐进式 scope**化解。
- SLG 的真正壁垒在**后端长线运营**(服务器、跨服、活动配置、反作弊、数据驱动),不是单机原型能验证的 → 必须分阶段,先验证"比赛手感"这一最难且最差异化的核心。
- 实时 PvP 网络同步(UE5 replication / 回滚)对独立开发是公认难点 → 早期应以**异步 PvP / 单机 vs AI** 验证乐趣,**实时联机后置**。

---

## 来源(Sources)

- [Udonis — Whiteout Survival Statistics](https://www.blog.udonis.co/statistics/whiteout-survival)
- [PocketGamer.biz — Whiteout Survival $3bn](https://www.pocketgamer.biz/whiteout-survival-hits-3bn-in-player-spending-in-under-25-years/)
- [FoxData — Whiteout Survival $1.5B monetization](https://foxdata.com/en/blogs/how-whiteout-survival-generated-15-billion-through-creative-monetization-strategies/)
- [MAF — Last War $2.6B](https://maf.ad/en/blog/last-war-survival/)
- [FoxData — Last War $1.6B in 18 months](https://foxdata.com/en/blogs/how-last-war-survival-raked-in-16-billion-in-a-mere-18-months/)
- [PocketGamer.biz — Last War surpasses $2bn](https://www.pocketgamer.biz/last-war-survival-surpasses-2bn-after-record-player-spending-in-early-2025/)
- [Appfigures — Kingshot $500M](https://appfigures.com/resources/insights/kingshot-500m-revenue-century-games)
- [GAMES.GG — Kingshot first-year $811M](https://games.gg/news/kingshot-first-year-revenue-tops-811m-amid-player-backlash/)
- [Naavik — Century Games 4X portfolio](https://naavik.co/digest/century-games-4x-portfolio-strategy/)
- [Wikipedia — eFootball](https://en.wikipedia.org/wiki/EFootball)
- [Konami — eFootball Overview / Controls](https://www.konami.com/efootball/en/page/overview)
- [Epic — UE5 Networking & Multiplayer Docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine)
