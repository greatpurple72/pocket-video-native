# SLG 元层(MetaLayer)— 设计总览

> Track B 并行。目标:融合无尽冬日/Last War/Kingshot 的长线养成与社交对抗,足球化。
> 先以占位数据驱动单机开发,待比赛可玩后接入。

## 系统映射(详见 `docs/01-market-research.md` 第 3 节)
| SLG | 足球化 |
|---|---|
| 主城 | Club 俱乐部基地(球场/训练中心/青训营/医疗室/商业区) |
| 英雄抽卡 | Footballer Signing(球员抽卡) |
| 练兵养成 | 球员训练/成长(体能/技术/战术) |
| 资源 | Funds/TrainingPoints/TransferPoints/Prestige/Gems |
| 自动战斗 | **实时比赛(MatchLayer)** ← 差异化 |
| 联盟 | Alliance(足协/俱乐部联盟) |
| 联盟战/跨服 | League 跨服联赛/杯赛/德比 + 升降级 |
| 限时活动 | 赛季/转会窗/点球大战/传奇复刻 |
| 买量小游戏 | HookMinigame(点球/任意球/过人) |

## 子模块清单
1. **club** — 俱乐部基地与建筑升级。
2. **footballer-data** — 球员属性/位置/稀有度数据系统。
3. **signing-gacha** — 抽卡/转会。
4. **progression-economy** — 养成曲线与经济(资源产出/消耗闭环)。
5. **squad** — 阵容编辑(输出给 MatchLayer)。
6. **alliance-league** — 联盟/联赛/赛季/升降级。
7. **liveops-events** — 活动配置化、首充、每日、VIP。
8. **hook-minigame** — 买量爽点小游戏。

## 核心循环
打比赛 → 赢资源/球员碎片 → 养成+升级俱乐部 → 阵容更强 → 打更高级别比赛/联赛 PvP → 联盟协作对抗 → 赛季结算与活动。

## 当前状态
全部 ⬜ 未开始。第一步:footballer-data + economy 的纸面规格 + 经济闭环 PrevizGate(可用表格/示意 UI)。
