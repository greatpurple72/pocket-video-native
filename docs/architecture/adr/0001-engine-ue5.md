# ADR-0001 — 选用 Unreal Engine 5

- 状态:已采纳(Accepted)
- 日期:2026-06-19

## 背景
需要实时可控 3D 标准 11v11 足球 + 跨 PC/主机,引擎是地基级决策。

## 决策
采用 **Unreal Engine 5**。

## 理由
- eFootball 本身从 Fox Engine 转 UE4 并规划迁 UE5,验证 UE 适配实时 3D 足球与主机。
- UE5 在 3D 表现、物理、动画、主机适配上业界领先。
- 内建网络复制(replication)与角色移动同步,为后期实时 PvP 打底。

## 权衡 / 代价
- SLG 长线运营/热更新生态弱于 Unity 系(无尽冬日/Last War/Kingshot 多为 Unity)。→ 通过数据驱动配置 + 后端配置化缓解。
- 学习曲线与工程体积较大。→ 用 Git LFS + 独立仓库,见 ADR-0002。

## 影响
- UE 工程独立仓库;C++ + Blueprint 混合开发;美术用 Fab/Mixamo/商城资源起步。
