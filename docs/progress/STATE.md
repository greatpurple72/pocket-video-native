# STATE.md — 当前真实状态(事实源 / Source of Truth)

> **本文件回答唯一一个问题:"现在到底真实存在什么?"**
> 任何会话在声称某功能"已实现"前,必须以本文件为准。**不在本文件 = 不存在。**
> 每次会话结束、每次功能交付,必须同步更新本文件(与代码同 commit)。

最后更新:2026-06-19 ｜ 更新者:云端会话

---

## 1. 仓库与环境
- ✅ 设计/文档仓库(本仓库)已建立,含调研、计划、上下文架构、概念图。
- 🚧 UE5 工程:**Phase 0 起步代码已写**(`game/FootballSLG/`,C++:MatchBall/Footballer/MatchGameMode + 配置 + LFS + 构建说明)。待本地编译 + 建关卡 + 体感验收;建议迁入独立仓库。
- 环境:云端会话无 UE/GPU;UE 编译运行在用户本地。

## 2. 比赛层(MatchLayer)
- 🚧 UE5 工程骨架 — 起步代码已写(`game/FootballSLG/`),待本地编译
- 🚧 球物理 + 带球手感 — 设计批准;**C++ 已实现**(MatchBall/Footballer),待引擎内体感验收+调参
- 🚧 射门 / 传球 — C++ 已实现(Shoot 起弧 / Pass 平传),待验收
- 🚧 进球判定 + 比分/计时 HUD — C++ 已实现(GoalZone + MatchGameMode + MatchHUD 纯代码HUD),待验收
- 🚧 队友+对手 AI + 阵型 + 抢断 + 出界 — C++ 已实现(BotFootballer 分队/站位/上抢,MatchGameMode 生成阵型+出界回中),待验收
- 🚧 触屏虚拟摇杆+按钮 — C++ 已实现(Footballer 触屏 + MatchHUD 绘制),待验收
- 🚧 球员属性 DataTable + 养成影响比赛 + 赛后结算 — C++ 已实现(FootballerStatsRow + DT_FootballerStats.csv + ApplyStats + EndMatch 结算 Funds/转会点),待验收
- ⬜ 标准 11v11 / 越位等完整规则 / 动画 / 接 SLG 完整元层(Phase 1+ 继续)

## 3. 元层(MetaLayer / SLG)
- ⬜ 俱乐部基地
- ✅ 球员数据系统 — **纸面规格 v1 批准**(2026-06-19);五档稀有度 N/R/SR/SSR/UR
- ✅ 养成 / 经济 — **纸面规格 v1 批准**(2026-06-19);6 种资源;付费门控 Phase 3+
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
