# 编码规范(UE5 C++ / Blueprint)

> 目标:命名一致、可被 AI 跨会话稳定理解。遵循 Epic 官方规范 + 本项目约定。

## C++ 命名(Epic 规范)
- 类前缀:`A`(Actor)、`U`(UObject/Component)、`F`(struct)、`E`(enum)、`I`(interface)。
- 本项目类名以域 + 概念,使用 glossary 术语。例:
  - `AFootballer`(球员单位)、`AMatchBall`、`AMatchGameMode`、`UClubComponent`、`USigningSubsystem`。
- 布尔变量 `b` 前缀:`bIsDribbling`。
- 函数动词开头:`TryPass()`、`ApplySmartAssist()`。

## Blueprint
- 蓝图资产前缀 `BP_`:`BP_Footballer`。
- 逻辑尽量下沉 C++,蓝图做组装/调参/可视化。

## 模块划分(对应 MatchLayer / MetaLayer)
- C++ Module:`Match`、`Meta`、`Core`(共享)、`UIRuntime`。解耦,降低跨域耦合。

## 数据驱动
- 数值走 DataTable / DataAsset,不硬编码。表结构在对应 `docs/design/.../spec.md` 第 3 节登记。

## 注释与文档
- 复杂系统在类头注释里指向其 `docs/design/...` 规格路径,保持代码↔文档可追溯。

> 术语一律以 `docs/vision/glossary.md` 为准。
