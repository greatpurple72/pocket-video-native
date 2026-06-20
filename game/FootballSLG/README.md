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
4. 从 Place Actors 搜 **GoalZone**,在球场两端各放一个;选中其一在 Details 勾选 **bIsHomeGoal**(另一个不勾),作为两边球门。
5. World Settings → GameMode Override 设为 **MatchGameMode**(已在 DefaultEngine.ini 设为全局默认,通常无需手动设)。
6. 点 **Play**。系统会:自动附身一个 **Footballer**、生成一个**对手 AI(BotFootballer)**、左上/中显示**比分与计时 HUD**。

## 操作
- 移动/带球:WASD / 方向键 / 手柄左摇杆
- 冲刺:Shift / 手柄 RT(按住)——注意冲刺时球被推远,控球变松(风险)
- 射门:空格 / 手柄 □ —— 球起弧飞出
- 传球:E / 手柄 ○ —— 平传略带上抬
- 进球:球进入 GoalZone → 比分 +1、自动回中开球

## 一场比赛感(已含)
- **比分/计时 HUD**(`MatchHUD`,纯 C++ 画在屏幕,无需 UMG 资源)
- **队友 + 对手 AI**(`BotFootballer`,分主/客队):球近上抢、抢到球踢向对方门,球远回阵型站位;`MatchGameMode` 按阵型生成 3 名队友 + 5 名对手
- **进球判定 + 回中**(`GoalZone` + `MatchGameMode`)
- **出界回中**(球越边线/端线 → 回中开球;边界用 `HalfLength/HalfWidth` 调)
- **赛后结算**(到 `MatchDuration` 秒 → FULL TIME,按胜/平/负产出 Funds + 转会点,接经济设计)
- **触屏虚拟摇杆 + 按钮**(左半屏拖动移动,右下射门/传/冲)

## 球员属性 DataTable(养成→影响比赛)
1. 把 `Data/DT_FootballerStats.csv` 拖进编辑器 Content(建议 `Content/Data/`),导入时:
   - Import As → **DataTable**,Row Struct 选 **FootballerStatsRow**。
2. 选中场景里的 **MatchGameMode**(或在 World Settings 的 GameMode 实例)Details:
   - **StatsTable** 指向刚导入的 DT;**PlayerRowName** 填 `messi`/`zidane`/`ronaldo`/`generic`。
3. Play 时玩家球员会按该球员属性改写手感(速度/盘带触球/射门/传球力度)——**养成→影响比赛**跑通。
   - 数值映射见 `Footballer::ApplyStats()`,可继续细化。

## 赛季循环(跨场持久化)
- `FootballGameInstance`(已在 DefaultEngine.ini 设为 GameInstanceClass)跨场保存:**资金 / 转会点 / 场次 / 联赛积分 / 胜平负**。
- 一场结束(FULL TIME)→ 自动结算写入俱乐部数据;按 **Enter / 手柄 Start** 进入**下一场**(重载当前关卡)。
- **对手难度随场次递增**(`MatchIndex` → 对手速度提升)。
- 各队带一名**守门员**(站门前大脚解围)。
- HUD 顶部显示赛季信息(场次/积分/资金/战绩)。
> 这条把"打比赛→赢资源→变强→打更强的下一场"的核心循环在引擎里跑通(单机版)。

## 移动端/触屏测试
- 编辑器测试触屏:Project Settings → Engine - Input 勾选 **Use Mouse for Touch**(或在设备上运行)。
- 触屏:左半屏拖动=移动/带球;右下三键=射门/传/冲。

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
