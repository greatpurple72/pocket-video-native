# UE5 独立工程仓库 —— 搭建规范

> 本文件指导**在你本地**用 local Claude Code 创建独立的 UE5 工程仓库。
> 设计/文档仍在本(设计)仓库维护;UE 仓库的 `CLAUDE.md` 指回本仓库。

## 1. 创建步骤(本地执行)
1. 安装确认:UE5(建议 5.4+)、Visual Studio(C++ 工作负载)、Git、Git LFS。
2. 新建 UE5 **C++ 工程**(模板:Third Person 起步),命名建议 `FootballSLG`。
3. `git init` + 首个提交;在 GitHub 新建独立私有仓库并推送。
4. 初始化 Git LFS(见下)。
5. 放入下方 `.gitignore` 与 `.gitattributes`。
6. 在工程根放 `CLAUDE.md`(模板见第 4 节),指回本设计仓库。

## 2. 目录结构(UE 工程)
```
FootballSLG/
├── CLAUDE.md                 # 指回设计仓库 + 工程专属约定
├── FootballSLG.uproject
├── Config/                   # DefaultEngine.ini 等
├── Source/                   # C++(模块: Match / Meta / Core / UIRuntime)
│   ├── Match/
│   ├── Meta/
│   ├── Core/
│   └── FootballSLG/          # 主模块
├── Content/                  # 资源(见 asset-naming.md)
│   ├── Match/  Meta/  Shared/  ThirdParty/
├── .gitignore
└── .gitattributes            # Git LFS 跟踪
```

## 3. .gitignore(UE 关键忽略)
```
Binaries/
DerivedDataCache/
Intermediate/
Saved/
.vs/
*.sln
*.VC.db
*.opensdf
*.sdf
```

## 4. .gitattributes(Git LFS)
```
*.uasset filter=lfs diff=lfs merge=lfs -text
*.umap   filter=lfs diff=lfs merge=lfs -text
*.fbx    filter=lfs diff=lfs merge=lfs -text
*.png    filter=lfs diff=lfs merge=lfs -text
*.tga    filter=lfs diff=lfs merge=lfs -text
*.wav    filter=lfs diff=lfs merge=lfs -text
*.mp4    filter=lfs diff=lfs merge=lfs -text
```

## 5. UE 工程 CLAUDE.md 模板(放工程根)
```md
# CLAUDE.md — FootballSLG(UE5 工程)

本工程是足球 SLG 的实际 UE5 实现。**设计/调研/路线图/术语以设计仓库为准**:
<设计仓库 URL 或本地路径>/docs/

开工读取顺序:
1. 设计仓库 docs/progress/STATE.md(当前真实状态)
2. 设计仓库 docs/progress/ROADMAP.md(当前阶段)
3. 设计仓库 docs/design/<相关模块>/spec.md
4. 本工程 conventions(命名见设计仓库 conventions/)

铁律:
- 改系统/数值 → 同步更新设计仓库对应 spec + STATE.md。
- 模块制作前先过 PrevizGate(设计仓库 _templates/previz-gate.md)。
- 术语以设计仓库 glossary.md 为准。
- 会话收尾更新 STATE/CHANGELOG/session-log。
```

## 6. 跨仓库一致性纪律
- 每次在 UE 仓库实现/改动功能,**同步回设计仓库**更新 `STATE.md` 与对应 `spec.md`(可分别提交,但同一工作单元内完成)。
- 这是防止"代码现实"与"文档记忆"分叉的关键。
