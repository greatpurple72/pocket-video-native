# Phase 0 灰盒任务清单 — 真 UE5 工程(给本地 Claude Code 执行)

> 目标:在**真 UE5 引擎**里做出"卡通 3D、可控球员带球+冲刺+射门入网、eFootball 式跟随镜头"的灰盒。
> 这是通往真正 3D 手感的路径;网页 previz 只是过渡示意。
> 风格基准:卡通(ADR-0004)。参数对齐 `docs/design/match/previz/feel-previz.md`。
> 用法:在本地用 Claude Code 打开 UE5 工程仓库,按下列任务逐条实现;每完成一步回写设计仓库 `STATE.md`。

## 前置(按 `docs/ue-project/SETUP.md`)
- [ ] UE5(5.4+)+ VS(C++)+ Git LFS 就绪
- [ ] 创建 C++ 工程 `FootballSLG`(Third Person 模板),独立仓库 + LFS

## 任务 A — 灰盒球场与镜头
- [ ] A1 一块 64×104(m)灰盒草地(StaticMesh Plane + 绿色材质 + 简单线条贴花),两端各一个球门(BoxMesh 拼:两立柱+横梁,门宽~12)。
- [ ] A2 `SpringArm + Camera` 跟随臂:臂长 ~11、抬高 ~6、看向球员前方 ~6;开启 Camera Lag(滞后)做 eFootball 式平滑跟随。

## 任务 B — 可控球员(卡通占位)
- [ ] B1 `AFootballer : ACharacter`。占位模型先用引擎胶囊 + 简单 Mesh(或 Mixamo 免费角色;卡通模型后续替换)。
- [ ] B2 输入(Enhanced Input):左摇杆/WASD 移动,RT/Shift 冲刺,□/空格 射门,✕ 传球(占位)。
- [ ] B3 移动:走速 ~6.5 m/s,冲刺 ~13 m/s(`CharacterMovement->MaxWalkSpeed` 切换);朝向跟随移动方向(`bOrientRotationToMovement`)。
- [ ] B4 动画:先用 Mixamo Idle/Run 套 Retarget;跑动随速度混合(后续做 BlendSpace)。

## 任务 C — 球与带球手感(核心)
- [ ] C1 `AMatchBall`:`StaticMesh Sphere(半径~0.11~0.15m)+ 物理(Simulate Physics)`,质量 ~0.43kg,合适的线性/角阻尼与弹性。
- [ ] C2 带球:球员脚前设一个"控球点";当球在控球半径内且在移动 → 每 0.13~0.16s 给球一个向前冲量(impulse),**冲刺时冲量更大(球推远=控球变松,风险回报)**。
- [ ] C3 停球:无输入时球缓动回贴脚(close control)。
- [ ] C4 射门:□ 给球 `朝朝向 + 抬升` 的冲量(力度可后续做蓄力);球起弧。

## 任务 D — 规则与反馈
- [ ] D1 进球检测:球越过球门线且在门框内 → 计分 + 重置开球。
- [ ] D2 边界:出界重置(越位等后置)。
- [ ] D3 简单 UI(UMG):比分 + 计时。

## 任务 E — 手感打磨(达"eFootball 级流畅"的关键,反复调)
- [ ] E1 镜头滞后/FOV/抬高微调,做到平滑不眩晕。
- [ ] E2 触球节奏、推远幅度、急停减速:反复试,达"跟手 + 想再踢两下"。
- [ ] E3 动画过渡(Idle↔走↔跑↔带球↔射门)用 AnimBlueprint 平滑混合,消除"滑步"。

## 验收(Fun-gate)
- [ ] 真 3D 卡通画面,跟随镜头流畅。
- [ ] 带球跟手,冲刺有"控球变松"的风险感。
- [ ] 急停变向干脆,射门起弧入网有打击感。
- [ ] 你愿意"再来一局"。

## 免费资源建议(卡通向、先占位后替换)
- 角色/动作:**Mixamo**(免费,自带跑/带球/射门近似动作)。
- 球场/球门/球:**Fab / UE 商城**搜 "stylized stadium / soccer"。
- 卡通角色:Fab 搜 "stylized / toon character";或后续做风格化角色。

> 每完成一个任务,在设计仓库 `docs/progress/STATE.md` 的 MatchLayer 段把对应项标 🚧→✅,并在 `feel-previz.md` 回填实际参数。
