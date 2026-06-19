# 资源命名规范(UE 内容)

> 前缀_域_名称_变体。便于检索、防重名漂移。

| 类型 | 前缀 | 例 |
|---|---|---|
| Blueprint | `BP_` | `BP_Footballer` |
| 材质 | `M_` / 实例 `MI_` | `M_PitchGrass` |
| 贴图 | `T_` | `T_Footballer_Albedo` |
| 静态网格 | `SM_` | `SM_GoalNet` |
| 骨骼网格 | `SK_` | `SK_Footballer` |
| 动画序列 | `AS_` / 蓝图 `ABP_` | `ABP_Footballer` |
| 数据表 | `DT_` | `DT_FootballerStats` |
| 数据资产 | `DA_` | `DA_EconomyCurve` |
| 音效 | `S_` | `S_CrowdCheer` |
| UI 控件 | `WBP_` | `WBP_ClubMain` |

## 目录(UE Content/)
```
Content/
├── Match/    (球场/球员/球/比赛UI)
├── Meta/     (俱乐部/抽卡/养成/联赛UI)
├── Shared/   (通用材质/音效/字体)
└── ThirdParty/ (Fab/Mixamo 等外部资源,保留来源说明)
```
