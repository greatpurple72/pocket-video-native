# PrevizGate — 球物理 + 带球手感(手感地基)

> 遵循 `_templates/previz-gate.md`。Phase 0 / Track A 核心。**这是整个项目的生死点:手感不过关一切免谈。**
> 风格基准:卡通 chibi(ADR-0004),但手感追求"实时可控、跟手、有爽感"。

## 模块:Ball Physics + Dribbling Feel
- 关联:`design/match/README.md`(子模块 ball-physics + footballer-control)
- 状态:✅ **设计已批准**(2026-06-19,引擎手感验收待 UE 灰盒)
- 审核日期:2026-06-19 / 结论:速度越快控球越松(风险回报)认同;手柄全手动+触屏 SmartAssist 映射认同;手机可玩 previz 见 `feel-prototype.html`。
- 在线可玩(固定网址,自动更新):https://greatpurple72.github.io/pocket-video-native/

## 1. 目标
让玩家"带球跑动、急停变向、射门入网"这一串操作**跟手、有重量感、有爽感**。卡通画风,但操作反馈是核心。

## 2. 球物理参数(起始值,引擎内再调)
> 单位以 UE 默认(cm)。这些是 previz 起点,灰盒里反复试调。

| 参数 | 起始值 | 说明 |
|---|---|---|
| 球半径 | 11 cm | 真实足球;卡通可放大到 13~15 |
| 球质量 | 0.43 kg | 真实;太轻会飘 |
| 滚动摩擦 | 中 | 草皮上自然减速,别像冰面 |
| 弹性 | 0.6~0.7 | 落地弹跳手感 |
| 最大滚速 | ~高于球员冲刺速 | 强力射门/长传时 |
| 旋转/弧线 | Phase 0 暂不做 | 后续香蕉球再加(Magnus) |

## 3. 带球(Dribbling)模型
- **触球距离(loose touch)**:慢走时球贴脚(~30cm),冲刺时推远一步(~80~120cm)——速度越快控球越松(风险回报,参考 eFootball)。
- **触球频率**:每 0.4~0.6s 一次触球节奏感。
- **两种带球**:
  - 贴身控球(close control):慢、球贴脚、易变向。
  - 加速带球(speed dribble):快、球推远、变向迟钝。
- **急停变向**:松杆/反向输入 → 急停;有短暂减速惩罚。
- **finesse 盘带**:细微摇杆输入做小幅贴身变向。
- **体力影响**:体力下降 → 冲刺速、触球精度、急停反应变差(后段疲劳,Phase 1 接入)。

## 4. 操作映射(见 `control-layout.svg`)
| 动作 | 手柄(全手动) | 触屏(SmartAssist) |
|---|---|---|
| 移动/带球 | 左摇杆 | 左虚拟摇杆 |
| 加速冲刺 | R2/RT 长按 | 右下冲刺键 |
| 射门 | □/X(长按蓄力) | 射门键(力度自动辅助) |
| 传球 | ✕/A(短/长) | 传球键(目标自动吸附) |
| 急停/护球 | L2/LT | 长按摇杆原地 |

## 5. 灰盒 previz 方案(本地实现 → 你跑+录屏审核)
> 云端我写好规格 + 任务清单,本地 Claude Code 在 UE 里实现,你跑起来体感。
**灰盒内容(最小)**:
1. 一块灰盒球场(带边线 + 一个空门)。
2. 胶囊体球员(占位,无美术)。
3. 球(带上面物理参数的 sphere)。
4. 跟随摄像机(球员后上方)。
5. 手柄/键盘控制:移动、冲刺、带球、射门入空门。
**录屏审核要点**:带球跟不跟手?急停变向爽不爽?射门入网有没有打击感?冲刺时球推远的"风险感"对不对?

## 6. 验收标准(Fun-gate)
- [ ] 带球跟手,不黏不飘。
- [ ] 急停变向有反馈、不僵硬。
- [ ] 冲刺 vs 贴身控球的差异能明显感到(风险回报)。
- [ ] 射门入空门有爽感。
- [ ] 你愿意"再多踢两下"——这是手感及格线。

## 7. AI 绘图提示词(卡通基准)
```
cute chibi football player character, 3-4 heads tall, dynamic dribbling pose with ball at feet, bright saturated kit, clean stylized 3D, mobile game render, simple greybox pitch background --ar 2:3
```

## 8. 批准后
→ 登记 `STATE.md` → 本地按"灰盒任务清单"实现 → 你录屏体感验收 → 迭代调参 → 进入 passing/shooting/match-ai 的下一轮。
