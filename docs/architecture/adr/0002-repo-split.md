# ADR-0002 — 双仓库拆分(设计仓库 / UE 工程仓库)

- 状态:已采纳(Accepted)
- 日期:2026-06-19

## 背景
UE 工程体积大、二进制多;设计/文档需轻量、可被云端会话高效读写。两者生命周期与读写频率不同。

## 决策
- **设计/文档/上下文大脑** → 当前仓库(pocket-video-native),保持轻量,无 UE 大文件。
- **UE5 游戏工程** → **独立新仓库 + Git LFS**,由用户本地 Claude Code 开发。
- 两仓库通过术语表、规范、ROADMAP 衔接;UE 仓库的 `CLAUDE.md` 指回设计仓库。

## 理由
- 云端会话无 GPU/UE,适合做设计/文档;本地适合跑 UE。Git 仓库作桥。
- 避免文档仓库被 UE 二进制污染、体积膨胀,保证上下文读取高效(防上下文不足)。

## 权衡
- 跨两仓库需保持一致性。→ 通过共享 glossary/conventions 与每会话 STATE/CHANGELOG 同步纪律缓解。

## 影响
- 见 `docs/ue-project/SETUP.md` 获取 UE 仓库的结构、.gitignore、LFS 配置。
