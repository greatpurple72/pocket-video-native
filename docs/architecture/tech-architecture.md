# 技术架构(分层,逐步建设)

> 详见 `docs/02-development-plan.md` 第 4 节。本文件维护架构的"当前形态",随实现演进。

## 分层
```
客户端 (Unreal Engine 5, C++ / Blueprint)
├── MatchLayer  比赛: 球员控制器 / 球物理 / 动画 / 比赛AI / 裁判规则
├── MetaLayer   SLG: 俱乐部 / 球员养成 / 抽卡 / 经济 / 联赛 / UMG UI
├── InputAbstraction  手柄(全手动) + 触屏(SmartAssist) + 键鼠
└── PlatformLayer  PC(Win) 首发 → Android → 主机后置

在线服务 (后期, 先用本地存档)
├── 账号 / 存档 / 经济校验(服务器权威)
├── 异步 PvP(先) → 实时 PvP(后, UE5 replication)
└── Alliance / League / Event 配置化(live-ops)
```

## 关键架构原则
1. **MatchLayer 与 MetaLayer 解耦**:两者通过"赛前阵容输入 / 赛后结果输出"的明确接口通信,可独立开发(支撑双轨并行)。
2. **数据驱动**:Footballer 属性、养成曲线、经济数值全部走 DataTable/配置表,便于快速迭代平衡。
3. **存档先本地**:早期本地 SaveGame,后端推迟到玩法验证之后。
4. **PvP 演进**:本地 vs AI → 异步 PvP → 实时联机(网络同步最后做)。
5. **服务器权威经济**:上线后所有经济结算服务器校验,防本地篡改。

## 重大决策索引
所有架构决策见 `architecture/adr/`。当前已记录:
- ADR-0001 选用 UE5
- ADR-0002 双仓库拆分(设计仓库 / UE 工程仓库)
- ADR-0003 双轨并行 + PrevizGate 效果审核闸门
