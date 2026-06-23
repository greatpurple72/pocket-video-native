# START HERE — 项目总纲(新会话/本地 Claude Code 读这一篇就够开工)

> 你(Claude Code)接手了一个进行中的项目。**先读完本文件**,再按"下一步"行动。
> 更细的实时状态以 `docs/progress/STATE.md` 为准;导航见 `docs/00-INDEX.md`。

---

## 1. 这是什么项目
一款**跨平台(PC/手游先行,主机后续)足球题材 SLG**:
- **比赛层**:类 eFootball 的**实时可控 3D 标准 11v11 比赛**(玩家亲手踢)。
- **元层(SLG)**:融合无尽冬日 / Last War / Kingshot 的**俱乐部养成 + 球员抽卡 + 联盟/联赛 PvP + 跨服 + 活动运营**。
- **差异化**:把"亲手踢的实时比赛"做成 SLG 的战斗结算层(头部 SLG 都没有)。
- **目标市场**:全球;**开发者**:1 人(项目所有者)+ Claude Code。

## 2. 仓库与协作结构(两层)
| 层 | 位置 | 谁做 |
|---|---|---|
| **设计/调研/文档/美术/上下文大脑** | 本仓库(`docs/`、`scripts/`、概念图) | 云端 Claude Code 会话 |
| **UE5 游戏工程** | 本仓库 `game/FootballSLG/`(C++) | **本地 Claude Code(就是你)** |

> 本仓库 = 设计仓库 + 暂存 UE 工程。长期可把 `game/FootballSLG/` 迁到独立 UE 仓库 + Git LFS(见 `docs/ue-project/SETUP.md`、ADR-0002)。

## 3. 已锁定的关键决策(别推翻,要改先开 ADR)
- 引擎 **UE5**(ADR-0001);双仓库(ADR-0002);双轨并行(手感+SLG)+ **PrevizGate 效果审核闸门**(ADR-0003)。
- **美术风格 = 写实向次世代足球(实机截图观感)+ 头略大(约 6 头身,非卡通/非大头)**(**ADR-0005 取代了早期卡通方向 ADR-0004**)。
  - 概念图用 fal.ai/FLUX 生成(`scripts/gen_fal.py`),UI 用 PIL 合成(`scripts/compose_*.py`),成品在 `docs/design/art/generated/`。
- 比赛规模:**标准 11v11**;付费门控放 Phase 3+;球员属性五档 N/R/SR/SSR/UR。
- 世界大地图 = 真实世界地理 + 足球化 GvG(Capital Clash 式争夺"世界冠军球场"),设计见 `docs/design/slg/world-map/spec.md`。

## 4. 现在真实做到哪了(交接点)
**设计/美术**:调研报告、开发计划书、上下文架构、全套核心界面实机概念图、SeeDance PV 制作包——都在 `docs/`。
**UE 工程**(`game/FootballSLG/`,C++,**尚未在引擎编译过**)已写到 Phase 1:
- 可控球员:带球(冲刺时控球变松=风险回报)、射门起弧、传球、eFootball 式跟随镜头;手感参数全 `EditAnywhere`。
- 比赛:进球判定(GoalZone)、比分/计时 HUD(纯 C++ 免 UMG)、出界回中、赛后结算。
- AI:队友+对手分队+阵型站位+上抢(抢断)、守门员;难度随赛季场次递增。
- SLG:球员属性 DataTable(`Data/DT_FootballerStats.csv`)→ 养成影响比赛手感;赛季循环 + 俱乐部持久化(`FootballGameInstance`:资金/转会点/积分/战绩)、一键下一场。
> 逐项真实状态见 `docs/progress/STATE.md`(🚧=代码就绪待引擎验收)。

## 5. UE 工程怎么跑(关键)
1. UE 5.4 + VS2022(C++)+ Git LFS。
2. `game/FootballSLG/` 右键 `.uproject` →「Generate Visual Studio project files」→ 编译。
3. 建关卡 `Match01`:地面 + 1×MatchBall + 两端各 1×GoalZone(其一勾 `bIsHomeGoal`);导入 `Data/DT_FootballerStats.csv` 为 DataTable(行结构 `FootballerStatsRow`);MatchGameMode 设 `StatsTable` + `PlayerRowName=messi`。
4. Play:WASD/手柄移动带球,Shift 冲刺,Space 射门,E 传球,Enter 下一场。
- 详见 `game/FootballSLG/README.md`。

## 6. 工作铁律(上下文不乱的关键,务必遵守)
1. **`docs/progress/STATE.md` 是事实源**:声称"已实现"前先核对它;不在里面=不存在。
2. **代码与文档同提交**:改系统/数值 → 同步更新对应 `docs/design/...` + `STATE.md`。
3. **重大决策进 ADR**(`docs/architecture/adr/`,只增不改)。
4. **术语以 `docs/vision/glossary.md` 为准**(球员=Footballer、比赛=Match、联盟=Alliance…)。
5. **命名遵循 `docs/conventions/coding-standards.md`**(UE 的 A/U/F 前缀等)。
6. **每模块制作前过 PrevizGate**(`docs/_templates/previz-gate.md`)。
7. **会话收尾**更新 `STATE.md` + `docs/progress/CHANGELOG.md` + 写 `docs/progress/session-log/<日期>.md`。

## 7. 你的下一步(按顺序)
1. 读 `docs/progress/STATE.md` 和最新 `docs/progress/session-log/`。
2. **编译 `game/FootballSLG/`,逐个修复编译错误**(这批代码云端未编译,可能有少量需按 UE 版本/API 调整的地方)。
3. 按 README 建 `Match01` 关卡,Play 跑通;**体感验收带球/射门手感**,在 Footballer 的 `Feel` 分类调参,满意后把数值回填 `docs/design/match/previz/feel-previz.md`。
4. 之后按 `docs/progress/ROADMAP.md` 继续(动画接入/越位等规则/俱乐部 UMG 界面/存档 SaveGame…)。
5. 每步改动同步 `STATE.md` + `CHANGELOG.md`。

## 8. 当前分支
开发分支:**`claude/football-slg-game-design-6fj69j`**(确保已 checkout)。
