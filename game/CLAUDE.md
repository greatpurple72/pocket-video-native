# CLAUDE.md — FootballSLG(UE5 工程)

> 本目录是足球 SLG 的 **UE5 工程起步代码**。设计/调研/路线图/术语以**设计仓库**为准。
> 长期建议:把本 `FootballSLG/` 迁到**独立 UE 仓库 + Git LFS**(见设计仓库 `docs/ue-project/SETUP.md`、ADR-0002)。此处放在 `game/` 仅为云端会话把起步代码交付给你。

## 开工读取顺序(本地 Claude Code)
1. 设计仓库 `docs/progress/STATE.md` — 现在真实存在什么
2. 设计仓库 `docs/progress/ROADMAP.md` — 当前阶段
3. 设计仓库 `docs/design/match/previz/feel-previz.md` — 手感规格与参数
4. 设计仓库 `docs/ue-project/phase0-greybox-tasklist.md` — Phase 0 任务清单
5. 本目录 `FootballSLG/README.md` — 构建/运行/调参

## 铁律
- 改系统/数值 → 同步更新设计仓库对应 `spec` + `STATE.md`(同一工作单元)。
- 模块制作前先过 PrevizGate(设计仓库 `_templates/previz-gate.md`)。
- 术语以设计仓库 `vision/glossary.md` 为准(球员=Footballer,比赛=Match…)。
- 命名遵循设计仓库 `conventions/coding-standards.md`(A/U/F 前缀等)。
- 会话收尾更新 STATE/CHANGELOG/session-log。

## 当前状态
Phase 0 灰盒代码已就绪(MatchBall / Footballer / MatchGameMode),待本地编译 + 建关卡 + 体感验收。
