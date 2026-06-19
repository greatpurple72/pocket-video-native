# FootballSLG — Phase 0 灰盒(可控带球 + 射门 + 跟随镜头)

> 这是 UE5 工程的**起步代码**(C++)。设计依据见设计仓库 `docs/design/match/previz/feel-previz.md`、`docs/ue-project/phase0-greybox-tasklist.md`。
> 云端无法编译 UE,本工程由**你本地 UE5 + 本地 Claude Code** 构建运行。

## 前置
- UE 5.4(其他 5.x 改 `.uproject` 的 EngineAssociation 与 Target 的 IncludeOrderVersion 即可)
- Visual Studio 2022(含「使用 C++ 的游戏开发」工作负载)
- Git + Git LFS

## 首次构建(本地)
1. 把整个 `FootballSLG/` 目录放到你本地独立 UE 仓库根(或直接在此打开)。
2. 右键 `FootballSLG.uproject` →「Generate Visual Studio project files」。
3. 双击 `FootballSLG.uproject`(或在 VS 里 Build),首次会编译 C++。提示重新构建模块就点「是」。

## 进编辑器后(创建关卡,约 2 分钟)
代码已写好玩法,但**关卡(.umap)是二进制资源需你在编辑器里建**:
1. File → New Level → Basic(自带地面光照)。保存为 `Match01`。
2. 放一块大地面(默认 Floor 即可,作球场)。
3. 从 Place Actors 搜 **MatchBall**,拖一个到地面上方一点(让它落到地面)。
4. World Settings → GameMode Override 设为 **MatchGameMode**(已在 DefaultEngine.ini 设为全局默认,通常无需手动设)。
5. 点 **Play**。系统会自动生成并附身一个 **Footballer**。

## 操作
- 移动/带球:WASD / 方向键 / 手柄左摇杆
- 冲刺:Shift / 手柄 RT(按住)——注意冲刺时球被推远,控球变松(风险)
- 射门:空格 / 手柄 □ —— 球起弧飞出

## 调手感(无需改代码)
选中场景里的 Footballer(或打开其蓝图/默认),在 Details 的 **Feel** 分类里实时调:
`WalkSpeed / SprintSpeed / ControlRadius / WalkPush / SprintPush / 触球间隔 / ShootSpeed / ShootLift`。
调出满意的"想再踢两下"的手感后,把数值回填到设计仓库 `feel-previz.md`,并更新 `STATE.md`。

## 代码结构(`Source/FootballSLG/`)
- `MatchBall` — 物理球(施加冲量带球/射门)
- `Footballer` — 可控球员:移动/带球节奏/冲刺/射门 + 跟随镜头(手感参数全 EditAnywhere)
- `MatchGameMode` — 默认 Pawn=Footballer

## 下一步(Phase 1)
传球 + 队友/对手 AI + 进球判定 + 标准 11v11。见设计仓库 ROADMAP。
