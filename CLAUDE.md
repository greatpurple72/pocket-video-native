# CLAUDE.md — 项目大脑入口(每个会话开工必读)

> 本文件是整个项目的**上下文锚点**。任何 Claude Code 会话(云端或本地)开工前**先读本文件**,再按指示读其余文件。
> 目的:在**数年、上百次会话**的持续开发中,杜绝"上下文不够 / 记忆混乱 / 幻觉出不存在的功能"。

---

## 0. 这是什么项目

一款**跨平台足球题材 SLG**(PC/手游先行,主机后续):
- **比赛层**:类 eFootball 的**实时可控 3D 标准 11v11 比赛**(玩家亲手踢)。
- **元层(SLG)**:融合无尽冬日 / Last War / Kingshot 的**俱乐部养成 + 球员抽卡 + 联盟/联赛 PvP + 跨服 + 活动运营**。
- **差异化**:把"亲手踢的实时比赛"做成 SLG 的战斗结算层(头部 SLG 都没有)。

## 1. 双仓库结构(务必分清你在哪)

| 仓库 | 角色 | 谁维护 |
|---|---|---|
| **本仓库(pocket-video-native)** | **设计 / 调研 / 文档 / 上下文大脑**。不放 UE 大文件。 | 云端 Claude Code 会话 |
| **(独立)UE5 工程仓库** | 实际游戏工程(C++/蓝图/资源),Git LFS。 | 本地 Claude Code |
| 衔接 | 两仓库共享术语、规范、ROADMAP;UE 仓库的 `CLAUDE.md` 指回本仓库的设计文档。 | 两边 |

> ⚠️ 当前会话运行在**云端临时容器**,**无 GPU、无 UE、碰不到本地磁盘**。云端只产出文档/代码/配置并 push。真实 UE 运行与录屏在本地完成。

## 2. 开工读取顺序(START HERE,每次)

1. 本文件 `CLAUDE.md`(你正在读)
2. `docs/progress/STATE.md` ← **现在真实存在什么(防幻觉的第一道闸)**
3. `docs/progress/session-log/`(最新一篇)← 上次会话交接
4. `docs/progress/ROADMAP.md` ← 当前在哪个阶段、下一步是什么
5. `docs/00-INDEX.md` ← 全部文档的导航地图(需要细节时按图索骥)
6. 涉及命名时 → `docs/vision/glossary.md`(术语以它为准)

## 3. 铁律(Prime Directives,违反即制造混乱)

1. **STATE.md 是事实源**:描述"已实现功能"前必须核对 `STATE.md`。**不在里面 = 还不存在,不许当成已做。**
2. **文档与代码同 commit**:改了系统/数值就在同一提交更新对应 `docs/design/...` 与 `STATE.md`。现实与记忆不许分叉。
3. **决策进 ADR**:任何"为什么这么做"的重大选择 → 在 `docs/architecture/adr/` 新增一篇(只增不改旧的)。
4. **术语以 glossary 为准**:不自创同义词。新概念先进 glossary 再使用。
5. **效果审核闸门(用户要求)**:每个模块**实际制作前**,先产出"效果图/分镜 + previz/效果视频"交用户审核通过,再进入制作。见 `docs/_templates/previz-gate.md`。
6. **会话收尾**:结束前更新 `STATE.md` + `CHANGELOG.md`,并在 `docs/progress/session-log/` 写当日交接。

## 4. 当前状态速览(每次会话收尾时手动更新此处)

- **阶段**:Phase 0 进行中。
- **最近完成**:调研报告、计划书 v1.1、上下文架构;**美术风格定调通过 = 全局卡通 chibi(ADR-0004)**,买量小游戏=踢球类。
- **下一步**:下一个 PrevizGate = **球物理 + 带球手感**;并行创建独立 UE5 工程仓库(`docs/ue-project/SETUP.md`)。
- **当前定位**:街机/休闲向、全球、卡通画风、实时可控足球 SLG。

> ⚠️ 注:美术方向后续已改为**写实+头略大**(ADR-0005 取代 ADR-0004);UE 灰盒已写到 Phase 1(`game/FootballSLG/`,待本地编译)。**交接到本地见 `docs/progress/session-log/2026-06-19-handoff-to-local.md`**。详细实时状态以 `docs/progress/STATE.md` 为准。

> 详细实时状态以 `docs/progress/STATE.md` 为准,本节仅为速览。
