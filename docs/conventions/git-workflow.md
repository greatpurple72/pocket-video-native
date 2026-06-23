# Git 工作流(双仓库 + LFS)

## 仓库
- **设计仓库**(本仓库):轻量,文档/调研/规划。云端会话主战场。
- **UE 工程仓库**(独立):UE5 工程 + Git LFS。本地 Claude Code 主战场。

## 分支
- 设计仓库当前开发分支:`claude/football-slg-game-design-6fj69j`。
- 约定:功能分支 `claude/<topic>`;合并前自查文档与 STATE 同步。

## 提交纪律(防记忆/现实分叉)
1. **文档与代码同 commit**:改系统/数值 → 同提交更新 `docs/design/...` + `STATE.md`。
2. 决策 → 新增 ADR。
3. 会话收尾 → 更新 `STATE.md` + `CHANGELOG.md` + 写 `session-log/<date>.md`。
4. commit message 清晰描述"做了什么 + 为什么"。

## Git LFS(仅 UE 仓库)
跟踪二进制资源:
```
git lfs track "*.uasset" "*.umap" "*.png" "*.fbx" "*.wav" "*.mp4"
```
详见 `docs/ue-project/SETUP.md`。

## 推送
- `git push -u origin <branch>`;网络失败按指数退避重试(2s/4s/8s/16s)。
- **不主动创建 PR**,除非用户明确要求。
