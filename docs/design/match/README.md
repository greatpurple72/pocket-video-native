# 比赛模块(MatchLayer)— 设计总览

> Track A 主轴。目标:类 eFootball 的实时可控**标准 11v11**手感。
> 每个子模块用 `_templates/module-spec.md`,制作前过 `_templates/previz-gate.md`。

## 子模块清单(Phase 0→1 推进顺序)
1. **ball-physics** — 球的物理(滚动/弹跳/旋转/摩擦)。手感地基。
2. **footballer-control** — 球员移动、带球、急停变向、finesse 盘带、体力。
3. **passing** — 地传/直塞/长传 + 风险回报 + SmartAssist 辅助档。
4. **shooting** — 射门(力度/角度/timing)。
5. **match-ai** — 队友跑位/接应 + 对手防守/抢断/站位。
6. **rules-flow** — 开球/进球/界外/计时/比分;越位等可后置。
7. **camera-input** — 摄像机 + 手柄(全手动)/触屏(SmartAssist)/键鼠输入抽象。

## 设计基调(来自调研)
- 手感第一:finesse 盘带 + 风险传球 + 体力疲劳(参考 eFootball)。
- 双端可玩:触屏靠 SmartAssist 多档辅助,手柄全手动。
- 与 MetaLayer 接口:**输入**=赛前阵容(Footballer 属性);**输出**=赛后结果(比分/数据/产出)。

## 当前状态
全部 ⬜ 未开始(以 `progress/STATE.md` 为准)。第一步:ball-physics 的 PrevizGate。
