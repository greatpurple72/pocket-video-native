# STATE.md — 当前真实状态(事实源 / Source of Truth)

> **本文件回答唯一一个问题:"现在到底真实存在什么?"**
> 任何会话在声称某功能"已实现"前,必须以本文件为准。**不在本文件 = 不存在。**
> 每次会话结束、每次功能交付,必须同步更新本文件(与代码同 commit)。

最后更新:2026-06-19 ｜ 更新者:云端会话

---

## 1. 仓库与环境
- ✅ 设计/文档仓库(本仓库)已建立,含调研、计划、上下文架构。
- ⬜ 独立 UE5 工程仓库:**尚未创建**(待用户本地创建,见 `docs/ue-project/SETUP.md`)。
- 环境:云端会话无 UE/GPU;UE 实际开发在用户本地。

## 2. 比赛层(MatchLayer)
- ⬜ UE5 工程骨架
- 🚧 球物理 + 带球手感 — **PrevizGate 待审**(`design/match/previz/feel-previz.md` + `control-layout.svg`)
- ⬜ 传球 / 射门
- ⬜ 队友/对手比赛 AI
- ⬜ 比赛流程与规则

## 3. 元层(MetaLayer / SLG)
- ⬜ 俱乐部基地
- 🚧 球员数据系统 — **纸面规格 v1 完成,待审**(`design/slg/footballer-data/spec.md`)
- 🚧 养成 / 经济 — **纸面规格 v1 完成,待审**(`design/slg/economy/spec.md` + `economy-loop.svg`)
- ⬜ 抽卡 Signing(实现)
- ⬜ 联盟 / 联赛
- ⬜ 活动 / LiveOps

## 4. 平台 / 后端
- ⬜ PC 打包 / Android 打包 / 主机
- ⬜ 后端账号/存档/经济校验
- ⬜ 异步 PvP / 实时 PvP

## 5. PrevizGate(效果审核)状态
> 每个模块的效果图/视频审核状态在此登记。
- ✅ **美术风格定调**(2026-06-19 通过)— **全局卡通 chibi(C)**;买量小游戏=踢球类爽点。定位=街机/休闲向足球 SLG。归档 ADR-0004,基准 `design/art/README.md`。

---

### 图例
✅ 已实现并验收 ｜ 🚧 进行中 ｜ ⬜ 未开始 ｜ ⛔ 已废弃(注明 ADR)
