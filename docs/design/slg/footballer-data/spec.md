# 模块设计规格 — 球员数据(Footballer Data)v1

> 域:MetaLayer / Track B,但**直接驱动 Track A 比赛**。状态:⬜ 规划。
> 这是连接养成(B)与比赛(A)的核心数据契约。

## 1. 球员属性(驱动比赛行为)
| 属性 | 代码 | 在比赛中影响 |
|---|---|---|
| 速度 | Pace | 跑动/冲刺速度、追球 |
| 盘带 | Dribbling | 触球精度、急停变向、护球 |
| 传球 | Passing | 传球精度/力度、直塞成功率 |
| 射门 | Shooting | 射门力量/精度 |
| 防守 | Defending | 抢断、拦截、站位 |
| 体能 | Physical | 对抗、体力上限 |
| 门将 | Goalkeeping | 仅 GK,扑救 |

> 比赛 AI 与玩家操作的结果,均由这些属性加权(SmartAssist 也参考属性)。

## 2. 位置(Position)
GK / DF(CB,LB,RB)/ MF(CDM,CM,CAM,LM,RM)/ FW(LW,RW,ST)。
- 球员有主位置 + 副位置;非适配位置有属性惩罚。

## 3. 稀有度(Rarity)与养成
| 稀有度 | 代码 | 初始强度 | 获取 |
|---|---|---|---|
| 普通 | N | 低 | 常驻抽卡 |
| 稀有 | R | 中低 | 抽卡 |
| 精英 | SR | 中高 | 抽卡/活动 |
| 史诗 | SSR | 高 | 限定抽卡 |
| 传奇 | UR | 最高 | 限定/复刻(对标 eFootball 巅峰卡) |

**养成维度**:
- **等级 Level**:消耗 TrainingPoints + Funds,提升基础属性。
- **突破 Star / Limit-Break**:消耗 Fragments,提升上限/解锁技能。
- **技能 Trait**:特定球员专属(如"弧线任意球""贴地直塞")。

## 4. 综合评分(OVR)
- `OVR = 按位置加权的属性均值`(GK 用 Goalkeeping 主导)。
- 阵容总战力 = 11 人 OVR + 阵型/位置适配 + 默契加成(后续)。

## 5. 数据表结构(DataTable: DT_FootballerStats)
| 字段 | 类型 | 说明 |
|---|---|---|
| FootballerId | Name | 唯一 ID |
| DisplayName | Text | 显示名 |
| Rarity | Enum | N/R/SR/SSR/UR |
| MainPosition | Enum | 主位置 |
| SubPositions | Array<Enum> | 副位置 |
| BasePace..BaseGoalkeeping | int | 七项基础属性 |
| GrowthCurveId | Name | 指向养成曲线 DataAsset |
| TraitIds | Array<Name> | 技能 |

## 6. 与 Track A 接口
- 比赛启动时,MetaLayer 把首发 11 人的"当前等级后属性"打包传给 MatchLayer。
- MatchLayer 不关心养成,只消费最终属性值 → 两轨解耦,可独立开发。

## 7. 验收(纸面)
- [ ] 属性 → 比赛行为映射清晰。
- [ ] 稀有度/养成/突破闭环与经济(`economy/spec.md`)对齐。
- [ ] DataTable 字段够用,可扩展。

## 8. 变更记录
| 日期 | 变更 | ADR |
|---|---|---|
| 2026-06-19 | v1 纸面规格 | — |
