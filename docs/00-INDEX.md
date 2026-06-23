# 00 — 文档总索引(导航地图)

> 不确定某内容在哪 → 先查本表,**不要凭记忆猜路径**(防漂移)。

## 顶层锚点
- [`/CLAUDE.md`](../CLAUDE.md) — 项目大脑入口,每会话必读
- [`00-INDEX.md`](00-INDEX.md) — 本文件,导航地图

## 调研与计划
- [`01-market-research.md`](01-market-research.md) — 竞品/市场深度调研(eFootball / 无尽冬日 / Last War / Kingshot)
- [`02-development-plan.md`](02-development-plan.md) — 开发计划书(愿景、约束、路线图、执行步骤)

## vision/ — 愿景与术语(很少变动)
- [`vision/vision.md`](vision/vision.md) — 北极星、产品支柱(改动需谨慎)
- [`vision/glossary.md`](vision/glossary.md) — **术语词典(命名唯一标准,防幻觉)**

## design/ — 游戏设计文档(GDD,按模块)
- [`design/match/README.md`](design/match/README.md) — 比赛模块(手感/球物理/比赛AI/规则)
- [`design/slg/README.md`](design/slg/README.md) — SLG 元层(俱乐部/球员抽卡/经济/联盟联赛/活动)

## architecture/ — 技术架构与决策
- [`architecture/tech-architecture.md`](architecture/tech-architecture.md) — 系统分层架构
- [`architecture/adr/`](architecture/adr/) — **架构决策记录(ADR,只增不改)**

## progress/ — 进度与连续性(防上下文错乱核心)
- [`progress/STATE.md`](progress/STATE.md) — **当前真实存在什么(事实源,防幻觉第一闸)**
- [`progress/ROADMAP.md`](progress/ROADMAP.md) — 阶段/里程碑/当前位置
- [`progress/CHANGELOG.md`](progress/CHANGELOG.md) — 已交付内容流水(只增)
- [`progress/session-log/`](progress/session-log/) — 每次会话交接日志

## conventions/ — 规范
- [`conventions/coding-standards.md`](conventions/coding-standards.md) — UE C++/蓝图命名与结构
- [`conventions/asset-naming.md`](conventions/asset-naming.md) — 资源命名
- [`conventions/git-workflow.md`](conventions/git-workflow.md) — 双仓库 Git/LFS 工作流

## _templates/ — 模板(新建文件请复制这些)
- [`_templates/module-spec.md`](_templates/module-spec.md) — 模块设计规格模板
- [`_templates/previz-gate.md`](_templates/previz-gate.md) — **效果审核闸门模板(每模块制作前用)**
- [`_templates/adr.md`](_templates/adr.md) — ADR 模板
- [`_templates/session-log.md`](_templates/session-log.md) — 会话交接模板

## ue-project/ — 独立 UE 工程的搭建规范
- [`ue-project/SETUP.md`](ue-project/SETUP.md) — UE5 独立仓库的目录结构、CLAUDE.md、.gitignore、LFS 配置
