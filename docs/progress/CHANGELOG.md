# CHANGELOG —— 交付流水(只增不改)

> 记录"实际交付了什么",倒序。每次会话有产出就追加一条。区别于 ROADMAP(计划)与 STATE(当前快照)。

## 2026-06-19
- 新增竞品/市场深度调研报告 `docs/01-market-research.md`。
- 新增开发计划书 `docs/02-development-plan.md`。
- 搭建项目上下文架构:`CLAUDE.md`、`docs/00-INDEX.md`、vision(愿景+术语)、progress(STATE/ROADMAP/CHANGELOG/session-log)、architecture(ADR)、conventions、_templates、design 模块种子、ue-project 搭建规范。
- 确立双仓库结构(设计仓库 + 独立 UE5 仓库)与本地/云端协作模式。
- 确立三项关键决策:标准 11v11 demo、双轨并行(手感+SLG)、PrevizGate 效果审核闸门。

## 2026-06-19 (cont.)
- Phase 0 approved. Produced first PrevizGate: Art Style Direction (art-style-previz.md + style-board.svg). Recommendation: core match = stylized semi-realistic (B), UA minigames = chibi (C). Awaiting user review.
- 美术风格 PrevizGate 通过:全局卡通 chibi(ADR-0004),买量小游戏=踢球类爽点;定位调整为街机/休闲向足球 SLG。更新 art README、STATE、vision、ADR 索引。
- 双轨并行产出:A轨 球物理+带球手感 PrevizGate(feel-previz.md + control-layout.svg);B轨 SLG 经济闭环 + 球员数据 v1 纸面规格(economy/spec.md + footballer-data/spec.md + economy-loop.svg)。均待审。
- A轨手感 PrevizGate 设计批准;新增手机可玩 previz `feel-prototype.html`(HTML5 2D 近似:虚拟摇杆带球/冲刺控球变松/急停/射门入网)。B轨 经济(6资源)+ 球员数据(五档稀有度,付费门控Phase3+)纸面规格批准。STATE 同步标 ✅。
- previz 在线托管打通:GitHub Pages 自动部署工作流(.github/workflows/deploy-previz.yml),固定网址 https://greatpurple72.github.io/pocket-video-native/(手感 previz 为首页,自动随 docs/design 更新)。
- 用户反馈 2D demo 不够,要 3D。决策:维持卡通画风(ADR-0004),手感/动画/镜头对标 eFootball 流畅度;双线并行。产出:① 网页 3D previz `feel-3d.html`(Three.js:卡通占位球员+透视球场+eFootball式跟随镜头+带球/冲刺/射门),设为 Pages 首页(2D 移到 /feel2d.html);② 真 UE5 灰盒任务清单 `docs/ue-project/phase0-greybox-tasklist.md`。
- 用户不在电脑前,产出"最终效果图+效果视频"(云端可行形态):5 张核心界面卡通效果图(club-home/match-hud/gacha/minigame/league mockup SVG)+ 自动播放愿景预告片 vision-trailer.html(分镜+运镜+文案,手机可看,卡通占位非成片)。部署到 /trailer.html。
- 用户要 EA/Konami 级效果图,且有即梦会员。澄清:云端无法直接操作即梦/出照片级图。决策:维持卡通但质量基线升级为"顶级渲染"。产出即梦提示词包 `docs/design/art/jimeng-prompt-pack.md`(6 场景图 + 图生视频运镜 + 一致性方案),供用户用即梦生成 AAA 卡通效果图/概念视频。更新 art README 基准。
- 用 fal.ai(FLUX/flux-dev)经脚本直接生成 6 张顶级卡通渲染效果图,存 docs/design/art/generated/(01比赛/02球星卡/03俱乐部/04抽卡/05小游戏/06联盟)。脚本 scripts/gen_fal.py(密钥走环境变量,未入库)。
- 美术方向变更:卡通(ADR-0004)审核不合格(太Q),改为写实向次世代足球"实机截图"风(ADR-0005,成熟约5.5头身、HUD+转播镜头+写实球场)。用 fal.ai/FLUX 重出 6 张写实实机效果图(generated/01-06)。更新 art README、ADR 索引、ADR-0004 标记被取代。
- 美术再修正:回写实渲染、头仅微放大(~6.5头身,非卡通,正常球衣);SLG大地图改真实地球设定(真实大陆/城市基地/跨洲行军全球GvG)。fal出图:r6-01比赛/r6-02球员、earth-01地球/earth-02欧洲区域/earth-03基地。更新 ADR-0005。
- 美术锁定:角色=写实成年大头漫画比例(匹配用户参考图,c-02-player);GvG大地图改为参考无尽冬日/Last War 的"实机SLG地图界面"风(map-02-war 达成:顶部UI条/等距基地/行军虚线/中央要塞),按真实世界地理+足球设定;下一步把地图建筑足球化(体育场要塞)。脚本 CHAR/MAP 双风格提示词。
- 世界大地图定稿(设计师综合):写实世界地图(可辨认大陆)+各足协领地着色+各大洲玩家俱乐部基地(队徽+名字+联盟标签)+中央"世界冠军球场"赛季争夺(=Capital Clash)+跨洲行军+完整SLG UI。新增设计文档 docs/design/slg/world-map/spec.md;map-terrain 出写实世界地图底图,compose_map_ui 叠足球化UI/基地/目标/行军。
