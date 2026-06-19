# 术语词典(Glossary)—— 命名唯一标准

> **铁律**:所有文档、代码、配置中的概念命名以本表为准。需要新概念时,**先在此登记再使用**。
> 目的:防止同一概念出现多个叫法(如"球员/球星/英雄"混用)导致跨会话漂移与幻觉。

| 中文 | 英文/代码标识 | 定义 | 备注 |
|---|---|---|---|
| 比赛 | Match | 一场实时可控的 11v11 足球对局 | 不叫 game/battle |
| 比赛层 | MatchLayer | 实时 3D 比赛相关的全部系统 | |
| 元层 | MetaLayer | 比赛之外的 SLG 养成/社交/经济 | 不叫 lobby |
| 球员 | Player(实体)/ Footballer | 可收集、可养成的足球运动员单位 | 统一用 `Footballer`,避免与"玩家 User"混淆 |
| 玩家(用户) | User | 真人玩家 | 与 Footballer 严格区分 |
| 球员抽卡 | Signing / Gacha | 通过签约/抽卡获得 Footballer | 对标 eFootball Contract |
| 俱乐部 | Club | 用户的主基地(= SLG 主城) | |
| 俱乐部建筑 | ClubBuilding | 球场/训练中心/青训营/医疗室等 | |
| 资源-资金 | Funds | 软货币 | |
| 资源-训练点 | TrainingPoints | 球员养成消耗 | |
| 资源-转会点 | TransferPoints | 抽卡/转会消耗 | |
| 资源-声望 | Prestige | 社交/排名货币 | |
| 硬通货 | Gems | 付费货币 | |
| 联盟 | Alliance | 玩家社交组织(= 足协/俱乐部联盟) | |
| 联赛 | League | 分级/赛季制 PvP 竞争 | 含升降级 |
| 跨服 | CrossServer | 跨服务器对抗/迁移 | |
| 活动 | Event / LiveOps | 限时运营活动 | |
| 买量小游戏 | HookMinigame | 点球/任意球/过人等独立爽点小游戏 | hybrid-casual 引流 |
| 智能辅助 | SmartAssist | 触屏友好的传球/射门辅助档位 | 对标 eFootball Smart Assist |
| 效果审核闸门 | PrevizGate | 模块制作前的效果图/视频审核流程 | 见 _templates/previz-gate.md |
| 垂直切片 | VerticalSlice | 一条完整可玩的核心体验 | |
| 走骨架 | WalkingSkeleton | 端到端跑通的最小骨架 | Phase 0 产物 |

> 修改/新增请在同一 commit 更新引用处。删除术语需在 ADR 说明。
