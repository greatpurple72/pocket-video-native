# 交接:云端 → 本地(2026-06-19)

> 用途:把项目"搬"到本地继续(编译 UE + 跑起来 + 后续开发)。云端这个会话继续负责设计/调研/美术/文档。

## 现状(交接点)
- 设计/文档 + 概念图 + PV 包 + UE 起步工程,全部已在 GitHub 仓库 `greatpurple72/pocket-video-native`,分支 **`claude/football-slg-game-design-6fj69j`**。
- UE5 工程在 **`game/FootballSLG/`**(C++,未在引擎编译过)。已实现:可控带球/冲刺/射门/传球、跟随镜头、进球判定、比分计时 HUD、队友+对手 AI+阵型、守门员、出界回中、触屏摇杆、球员属性 DataTable(养成→影响比赛)、赛后结算、赛季循环+俱乐部持久化、一键下一场。
- 当前一切 = "代码就绪,待本地编译验收"(见 `docs/progress/STATE.md`)。

## 本地准备(一次)
1. 装:**UE 5.4**、**Visual Studio 2022**(勾「使用 C++ 的游戏开发」)、**Git**、**Git LFS**、**Claude Code**(本地 CLI/桌面版)。
2. 克隆并切到开发分支:
   ```bash
   git clone https://github.com/greatpurple72/pocket-video-native.git
   cd pocket-video-native
   git lfs install
   git checkout claude/football-slg-game-design-6fj69j
   ```

## 编译并跑起来
3. 进 `game/FootballSLG/`,右键 `FootballSLG.uproject` →「Generate Visual Studio project files」→ 打开 `.sln` 或双击 uproject 编译(首次会 build C++)。
4. 按 `game/FootballSLG/README.md`:新建 `Match01` 关卡 → 放地面 + 一个 MatchBall + 两端各一个 GoalZone → 导入 `Data/DT_FootballerStats.csv` 为 DataTable(行结构 FootballerStatsRow)→ MatchGameMode 指 StatsTable + PlayerRowName → Play。

## 本地 Claude Code 的第一条指令(直接粘)
> 在 `pocket-video-native` 目录运行 `claude`,然后贴:
```
读 CLAUDE.md 和 docs/progress/STATE.md 了解现状。
目标:编译 game/FootballSLG 这个 UE5 工程,修复所有编译错误,
按 game/FootballSLG/README.md 建好 Match01 关卡并能 Play。
编译报错就逐个修,改完同步更新 docs/progress/STATE.md。
```

## 仓库结构(可选优化)
- 现在 UE 工程放在设计仓库的 `game/` 下,能直接用。
- 长期建议把 `game/FootballSLG/` 迁到**独立 UE 仓库 + Git LFS**(见 `docs/ue-project/SETUP.md`、ADR-0002),设计仓库保持轻量。迁的时候带上 `.gitattributes`。

## 分工(搬家后)
- **本地 Claude Code**:UE 编译/调试/建关卡/接美术资源/跑手感。
- **云端这个会话**:继续设计文档、调研、AI 出概念图/PV、数值配置。
- 两边共享同一仓库 + STATE/CHANGELOG/glossary,改动同步回设计文档。
